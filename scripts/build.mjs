import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
execFileSync(process.execPath, [
  "--import",
  "tsx",
  "scripts/build-profiles.ts",
]);
const bundle = (entry) =>
  build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2022",
    write: false,
    legalComments: "inline",
  });
const [report, payout] = await Promise.all([
  bundle("src/report-entry.ts"),
  bundle("src/payout-entry.ts"),
]);
await build({
  entryPoints: ["src/app.tsx"],
  external: ["fs", "path", "crypto"],
  outfile: "dist/app.js",
  bundle: true,
  minify: true,
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "inline",
  plugins: [
    {
      name: "standalone-report",
      setup(b) {
        b.onResolve({ filter: /^virtual:(report|payout)-script$/ }, (args) => ({
          path: args.path,
          namespace: "embedded",
        }));
        b.onLoad({ filter: /.*/, namespace: "embedded" }, (args) => ({
          contents: (args.path === "virtual:payout-script" ? payout : report)
            .outputFiles[0].text,
          loader: "text",
        }));
      },
    },
  ],
});
await copyFile("node_modules/sql.js/dist/sql-wasm.wasm", "dist/sql-wasm.wasm");
await copyFile("index.html", "dist/index.html");
