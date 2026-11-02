import {build} from "esbuild";
import {mkdir,copyFile} from "node:fs/promises";
await mkdir("dist",{recursive:true});
const report=await build({entryPoints:["src/report-entry.ts"],bundle:true,minify:true,format:"iife",target:"es2022",write:false,legalComments:"inline"});
await build({entryPoints:["src/app.tsx"],outfile:"dist/app.js",bundle:true,minify:true,target:"es2022",define:{"process.env.NODE_ENV":'"production"'},legalComments:"inline",plugins:[{name:"standalone-report",setup(b){
  b.onResolve({filter:/^virtual:report-script$/},()=>({path:"report",namespace:"embedded"}));
  b.onLoad({filter:/.*/,namespace:"embedded"},()=>({contents:report.outputFiles[0].text,loader:"text"}));
}}]});
await copyFile("index.html","dist/index.html");

