import { recipes } from "./recipes";
import { translator, type Language } from "./i18n";
import script from "virtual:report-script";
import type { Report } from "./model";
export function standalone(r: Report, language: Language): string {
  const t = translator(language);
  const data = JSON.stringify(r)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return (
    '<!doctype html><html lang="' +
    language +
    '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';script-src \'unsafe-inline\';style-src \'unsafe-inline\';img-src data:;base-uri \'none\';form-action \'none\'"><title>' +
    t(recipes[r.recipe ?? "sales"].title) +
    ' · One Page BI</title><style>*{box-sizing:border-box}body{margin:0;background:#e6ebe4;color:#1a342a;font:15px system-ui,sans-serif}main{max-width:1200px;margin:22px auto;padding:0 14px}header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}strong{margin-right:auto;letter-spacing:1px}select,button{font:inherit;padding:6px 9px;background:white;border:1px solid #879c8e;border-radius:3px}button{cursor:pointer}#png{background:#264e40;color:white}canvas{display:block;width:100%;height:auto;box-shadow:0 3px 16px #1d32241a}p{font-size:14px}label{display:flex;align-items:center;gap:5px}@media print{header,p{display:none}main{padding:0;margin:0}}</style></head><body><main><header><strong>ONE PAGE BI</strong><label><span id="month-label"></span><select id="month"><option value=""></option></select></label><label><span id="category-label"></span><select id="category"><option value=""></option></select></label><button id="reset"></button><button id="png"></button><button id="language"></button></header><canvas role="img" aria-describedby="summary"></canvas><p id="summary" aria-live="polite"></p></main><script type="application/json" id="dataset">' +
    data +
    "</script><script>" +
    script.replace(/<\/script/gi, "<\\/script") +
    "</script></body></html>"
  );
}
