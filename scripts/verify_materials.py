"""Read-only independent reconstruction of version 0.5 delimited materials.
Usage: python scripts/verify_materials.py <archive-directory> (requires pandas).
"""
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path
import pandas as pd

def numbered_records(stream, audit):
    if audit.get("format") == "jsonl":
        def fields(pairs):
            result = dict(pairs)
            if len(result) != len(pairs):
                raise ValueError("Duplicate JSON key")
            return result
        for n, line in enumerate(stream, 1):
            if not line.strip():
                continue
            obj = json.loads(line, object_pairs_hook=fields, parse_int=str, parse_float=str)
            if not isinstance(obj, dict) or any(isinstance(v, (list, dict)) for v in obj.values()):
                raise ValueError("Expected flat object")
            def render(val):
                if val is None: return ""
                if isinstance(val, bool): return str(val).lower()
                return val
            yield n, [render(obj.get(k)) for k in audit["original"]]
    else:
        reader = csv.reader(stream, delimiter=audit["delimiter"], strict=True)
        previous = 0
        for row in reader:
            n, previous = previous + 1, reader.line_num
            yield n, row

def verify(folder):
    folder = Path(folder).resolve(strict=True)
    def file(name):
        result = (folder / name).resolve(strict=True)
        if not result.is_relative_to(folder):
            raise ValueError("Path outside archive")
        return result
    def read_json(name):
        return json.loads(file(name).read_text(encoding="utf-8-sig"))
    for name, expected in read_json("checksums.json").items():
        if hashlib.sha256(file(name).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Changed archive file: {name}")
    meta, config = read_json("metadata.json"), read_json("template.json")
    for index, (item, source) in enumerate(zip(meta["sources"], config["sources"], strict=True), 1):
        raw = file("inputs/" + ("" if item["role"] == "main" else item["role"] + "/") + item["name"])
        if hashlib.sha256(raw.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"Wrong input: {raw.name}")
        audit = source["preparation"]
        if not audit["delimiter"] and audit.get("format") != "jsonl":
            raise ValueError("Independent CSV verification requires delimited inputs. Use the desktop replay for workbooks and embedded reports.")
        encoding = audit["encoding"] if audit["encoding"] != "utf-8" else "utf-8-sig"
        stream = io.StringIO(raw.read_bytes().decode(encoding).lstrip("\ufeff"), newline="")
        lines = []
        fields = source["mapping"]
        frame = pd.read_csv(file(f"data/material-{index}.csv"), dtype=str, keep_default_na=False, encoding="utf-8-sig")
        columns = source["exportFields"]
        indices = [audit["columnOrder"][audit["headers"].index(fields[key])] for key in columns]
        for n, row in numbered_records(stream, audit):
            if n < audit["start"] or (n == audit["start"] and not audit["noHeader"]):
                continue
            if not row or not any(cell.strip() for cell in row):
                continue
            if not audit["noHeader"] and [v.strip() for v in row] == [v.strip() for v in audit["original"]]:
                continue
            if len(row) != len(audit["original"]):
                raise ValueError(f"Uneven source row {n}")
            values = [row[j].strip() for j in indices]
            if source.get("decimalComma"):
                for j, k in enumerate(columns):
                    if k in ("amount", "debit", "credit", "discount", "quantity", "price") and values[j]:
                        if not re.fullmatch(r"[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?", values[j]):
                            raise ValueError(f"Invalid decimal-comma amount at row {n}")
                        values[j] = values[j].replace(".", "").replace(",", ".")
            values = [("'" + v) if re.match(r"^[=+@\-\t\r]", v) and not re.fullmatch(r"[-+]?\d+(?:\.\d+)?",v) else v for v in values]
            lines.append([str(n), *values])
        rebuilt = pd.DataFrame(lines, columns=["source_row", *source["exportLabels"]], dtype=str)
        pd.testing.assert_frame_equal(frame, rebuilt, check_dtype=False)
        print(f"PASS {raw.name}: {len(frame)} source rows and {len(indices)} fields")
if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    verify(sys.argv[1])
