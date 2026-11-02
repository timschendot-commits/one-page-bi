import { fieldHints } from "../src/field-hints";
import { writeFile } from "node:fs/promises";
import { openSQL, groups, normalizeHeading } from "../src/stage";
import { business, businessIds, fieldSpec } from "../src/catalog";
const sql = await openSQL(),
  db = new sql.Database();
db.run(
  "PRAGMA user_version=5; CREATE TABLE aliases(alias TEXT PRIMARY KEY,canonical TEXT NOT NULL); CREATE TABLE profiles(id TEXT PRIMARY KEY,title TEXT,fields TEXT,sector TEXT);",
);
const aliases = db.prepare("INSERT OR REPLACE INTO aliases VALUES(?,?)"),
  profiles = db.prepare("INSERT INTO profiles VALUES(?,?,?,?)");
for (const [field, names] of Object.entries(groups))
  for (const name of [field, ...names])
    aliases.run([normalizeHeading(name), field]);
for (const id of businessIds)
  profiles.run([
    id,
    business[id].title,
    JSON.stringify(fieldSpec(id)),
    id === "project"
      ? "services"
      : id === "stock"
        ? "trade / manufacturing"
        : id === "journal" || id === "ar" || id === "ap"
          ? "finance"
          : "operations",
  ]);
for (const [id, fields] of [
  ["sales", "date, amount"],
  ["orders", "date, order, amount"],
  ["cashflow", "date, signed amount or debit and credit"],
  ["payout", "settlement and bank reference, dates, amounts, currency"],
])
  profiles.run([id, id, fields, "operations"]);
db.run("CREATE TABLE recognition_hints(field TEXT, alias TEXT PRIMARY KEY)");
const hints = db.prepare("INSERT INTO recognition_hints VALUES(?,?)");
for (const [field, names] of Object.entries(fieldHints))
  for (const name of names) hints.run([field, name]);
hints.free();
aliases.free();
profiles.free();
await writeFile("dist/profiles.sqlite", db.export());
db.close();
