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
        if not audit["delimiter"]:
            raise ValueError("Independent CSV verification requires delimited inputs. Use the desktop replay for workbooks and embedded reports.")
        encoding = audit["encoding"] if audit["encoding"] != "utf-8" else "utf-8-sig"
        stream = io.StringIO(raw.read_bytes().decode(encoding).lstrip("\ufeff"), newline="")
        reader = csv.reader(stream, delimiter=audit["delimiter"], strict=True)
        lines, previous = [], 0
        fields = source["mapping"]
        frame = pd.read_csv(file(f"data/material-{index}.csv"), dtype=str, keep_default_na=False, encoding="utf-8-sig")
        columns = source["exportFields"]
        indices = [audit["columnOrder"][audit["headers"].index(fields[key])] for key in columns]
        for row in reader:
            n, previous = previous + 1, reader.line_num
            if n < audit["start"] or (n == audit["start"] and not audit["noHeader"]):
                continue
            if not row or not any(cell.strip() for cell in row):
                continue
            if not audit["noHeader"] and [v.strip() for v in row] == [v.strip() for v in audit["original"]]:
                continue
            if len(row) != len(audit["original"]):
                raise ValueError(f"Uneven source row {n}")
            values = [row[j].strip() for j in indices]
            values = [("'" + v) if re.match(r"^[=+@\-\t\r]", v) and not re.fullmatch(r"[-+]?\d+(?:\.\d+)?",v) else v for v in values]
            lines.append([str(n), *values])
        rebuilt = pd.DataFrame(lines, columns=["source_row", *source["exportLabels"]], dtype=str)
        pd.testing.assert_frame_equal(frame, rebuilt, check_dtype=False)
        print(f"PASS {raw.name}: {len(frame)} source rows and {len(indices)} fields")
if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    verify(sys.argv[1])
