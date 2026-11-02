import type { Table } from "./input";
import { LocalizedError } from "./i18n";
// Tokenize flat objects, retaining the spelling of numbers before any JS Number conversion.
const stringToken = String.raw`"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
const numberToken = String.raw`-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?`;
export function jsonRows(text: string): { table: Table; blanks: number[] } {
  const pair = new RegExp(
    "(" +
      stringToken +
      ")[ \\t]*:[ \\t]*(" +
      stringToken +
      "|" +
      numberToken +
      "|true|false|null)[ \\t]*",
    "y",
  );
  const keys = new Set<string>(),
    rows: { n: number; data: Map<string, string> }[] = [],
    blanks: number[] = [];
  for (const [i, line] of text.split(/\r\n|\r|\n/).entries()) {
    const n = i + 1,
      s = line.trim();
    function invalid(why: string, zh: string): never {
      throw new LocalizedError((l) =>
        l === "en" ? "Row " + n + " · " + why : "第 " + n + " 行 · " + zh,
      );
    }
    if (n > 10100 || s.length > 100000)
      invalid("Record limit exceeded.", "记录超过上限。");
    if (!s) {
      blanks.push(n);
      continue;
    }
    if (s[0] !== "{")
      invalid(
        "Expected one flat JSON object per line.",
        "每行须为一个扁平 JSON 对象。",
      );
    const data = new Map<string, string>();
    let at = 1;
    while (true) {
      while (s[at] === " " || s[at] === "\t") at++;
      pair.lastIndex = at;
      const match = pair.exec(s);
      if (!match)
        invalid(
          "Invalid field or nested JSON. Export flat records.",
          "字段无效或有嵌套，请导出扁平记录。",
        );
      const name: string = JSON.parse(match[1]);
      if (!name.trim() || data.has(name))
        invalid("Empty or duplicate JSON key.", "键名为空或重复。");
      const token = match[2],
        v = token.startsWith('"')
          ? JSON.parse(token)
          : token === "null"
            ? ""
            : token;
      if (name.includes("\0") || v.includes("\0"))
        invalid("NUL is not valid in a material.", "材料中不能含空字符。");
      data.set(name, v);
      keys.add(name);
      if (keys.size > 80) invalid("More than 80 fields.", "字段超过 80 个。");
      at = pair.lastIndex;
      if (s.slice(at) === "}") break;
      if (s[at++] !== ",")
        invalid("Malformed JSON object.", "JSON 对象格式无效。");
    }
    if (!Array.from(data.values()).some((v) => v.trim()))
      invalid("Record has no values.", "记录内没有有效值。");
    rows.push({ n, data });
    if (rows.length > 10000)
      invalid("More than 10,000 records.", "数据超过 10,000 行。");
  }
  const headers = [...keys];
  if (!rows.length)
    throw new LocalizedError((l) =>
      l === "en" ? "No JSON records." : "文件里没有 JSON 记录。",
    );
  return {
    table: {
      sheet: "JSON Lines",
      date1904: false,
      headers,
      lines: rows.map((r) => ({
        n: r.n,
        cells: headers.map((k) => r.data.get(k) ?? ""),
      })),
    },
    blanks,
  };
}
