import {parse} from "csv-parse/browser/esm/sync";
import * as XLSX from "xlsx";
import {fields,suggest,type Mapping,type Sale,type Report} from "./model";
type Cell = string | XLSX.CellObject | undefined;
type Line = {n:number; cells:Cell[]};
export interface Table {headers:string[]; lines:Line[]; sheet:string; date1904:boolean}
export interface Source {sheets:string[]; table:(sheet:string)=>Table}
const limit=10000, width=80;
function fail(msg:string):never {throw new Error(msg)}
const blank=(c:Cell)=> c===undefined || (typeof c==="string"? !c.trim(): !c.f && (c.v===undefined || String(c.v).trim()===""));
function raw(c:Cell):string {
  if(typeof c==="string") return c.trim();
  if(!c) return "";
  if(c.f || c.F) fail("公式单元格不能验证，请先粘贴为值");
  if(c.t==="e" || c.t==="b") fail("不支持错误值或布尔值");
  return String(c.v??"").trim();
}
function table(lines:Line[], sheet:string, date1904:boolean):Table {
  const first=lines[0];
  if (!first || first.n!==1 || !first.cells.length) fail("第一行必须是表头。");
  const headers=Array.from(first.cells,c=>raw(c));
  if(headers.some(h=>!h) || new Set(headers.map(h=>h.toLowerCase())).size!==headers.length) fail("表头有空白或重名，请修正第一行。");
  if(headers.length>width) fail("超过 80 列上限。");
  const records=lines.slice(1).filter(l=>l.cells.some(c=>!blank(c)));
  if(!records.length) fail("文件只有表头或空行。");
  if(records.length>limit) fail("超过 10,000 条明细上限。");
  return {headers,lines:records,sheet,date1904};
}
export function readSource(bytes:Uint8Array, name:string):Source {
  if(bytes.length>5*1024*1024) fail("文件超过 5 MiB 上限。");
  if(/\.csv$/i.test(name)) {
    let content:string;
    try {content=new TextDecoder("utf-8",{fatal:true}).decode(bytes)} catch {return fail("CSV 必须保存为 UTF-8 编码。")}
    if(content.includes("\0")) fail("CSV 含有空字符，请另存为 UTF-8。");
    let rows:{record:string[];info:{bytes:number}}[];
    try {rows=parse(content,{bom:true,info:true,skip_empty_lines:true,max_record_size:100000}) as unknown as typeof rows;}
    catch(e){return fail("CSV 行列数、引号或分隔符有误，请使用逗号分隔。"+(e as Error).message)}
    const data=bytes[0]===0xef && bytes[1]===0xbb && bytes[2]===0xbf ? bytes.subarray(3) : bytes;
    let offset=0, physicalLine=1;
    const lines=rows.map(({record,info})=>{
      let lastLine=physicalLine;
      while(offset<info.bytes){
        lastLine=physicalLine;
        const b=data[offset++];
        if(b===13 && data[offset]===10) offset++;
        if(b===13 || b===10) physicalLine++;
      }
      return {n:lastLine,cells:record};
    });
    const t=table(lines,"CSV",false);
    return {sheets:["CSV"],table:()=>t};
  }
  if(!/\.xlsx$/i.test(name) || bytes[0]!==80 || bytes[1]!==75) fail("仅支持真正的 .xlsx 工作簿或 UTF-8 CSV。");
  const wb=XLSX.read(bytes,{type:"array",cellNF:true,cellFormula:true,cellDates:false,cellText:true});
  const sheets=wb.SheetNames.filter((n,i)=>!wb.Workbook?.Sheets?.[i]?.Hidden && wb.Sheets[n]?.["!type"]!=="chart");
  if(!sheets.length) fail("没有可读取的可见工作表。");
  return {sheets,table:(sheet:string)=>{
    if(!sheets.includes(sheet)) fail("请选择可见工作表。");
    const ws=wb.Sheets[sheet], ref=ws["!ref"]; if(!ref) return fail("工作表为空。");
    const range=XLSX.utils.decode_range(ref);
    if(range.e.r>limit || range.e.c>=width) fail("工作表范围超过 10,001 行（含表头）或 80 列，请缩小范围。");
    if(ws["!merges"]?.length) fail("工作表含合并单元格，请先整理为单行表头的明细表。");
    const lines:Line[]=[];
    for(let r=0;r<=range.e.r;r++){
      const cells:Cell[]=[]; for(let c=0;c<=range.e.c;c++) cells.push(ws[XLSX.utils.encode_cell({r,c})]);
      lines.push({n:r+1,cells});
    }
    return table(lines,sheet,Boolean(wb.Workbook?.WBProps?.date1904));
  }};
}
function ymd(y:number,m:number,d:number):string {
  const date=new Date(Date.UTC(y,m-1,d));
  if(y<1900 || y>9999 || date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d) fail("日期不存在或不在支持范围内");
  return [y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
}
function dateValue(cell:Cell,date1904:boolean) {
  const s=raw(cell);
  if(typeof cell==="object" && cell.t==="n"){
    if(!Number.isInteger(cell.v) || (!date1904 && Number(cell.v)===60)) fail("日期序号无效或包含时间");
    const d=XLSX.SSF.parse_date_code(Number(cell.v),{date1904}); if(!d) return fail("Excel 日期序号无效");
    return ymd(d.y,d.m,d.d);
  }
  const match=/^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(s);
  if(!match) return fail("日期应为 YYYY-MM-DD 或 YYYY/MM/DD");
  return ymd(+match[1],+match[3],+match[4]);
}
function cents(cell:Cell) {
  const s=raw(cell);
  if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)) fail("金额须为数字且最多两位小数，不能为空或含货币符号");
  const [whole,fraction=""]=s.replace(/[+,\-]/g,"").split(".");
  const n=Number(whole+fraction.padEnd(2,"0"))*(s.startsWith("-")?-1:1);
  if(!Number.isSafeInteger(n)) fail("金额超出精度范围");
  return n;
}
export function cellLabel(c:Cell):string {
  return typeof c==="object" ? (c.f ? "="+c.f : (c.w??String(c.v??""))) : (c??"");
}
export function validate(t:Table,map:Mapping,name:string,unit:string):Report {
  for(const f of fields){
    const i=map[f.key];
    if(i===null){if(f.required) fail("请映射「"+f.title+"」。");}
    else if(!Number.isInteger(i) || i<0 || i>=t.headers.length) fail("映射的列不存在。");
  }
  const used=Object.values(map).filter(i=>i!==null);
  if(new Set(used).size!==used.length) fail("同一列不能映射到多个字段。");
  if(suggest(t.headers).currency!==null && map.currency===null) fail("检测到币种列，请映射币种以核对是否混币。");
  const rows:Sale[]=[], errors:string[]=[]; let magnitude=0, detected:string|undefined, errorCount=0;
  for(const {n,cells} of t.lines){
    let field="销售日期";
    try {
      const date=dateValue(cells[map.date!],t.date1904);
      field="行销售金额"; const amount=cents(cells[map.amount!]);
      field="订单编号"; let order=map.order===null?null:raw(cells[map.order]);
      if(order==="") fail("已映射的订单编号不能为空");
      if(map.order!==null){
        const c=cells[map.order];
        if(typeof c==="object" && c.t==="n"){
          if(!Number.isSafeInteger(c.v) || Math.abs(Number(c.v))>=1e15 || !/^\d+$/.test(c.w??String(c.v))) fail("编号格式不明确，请将编号保存为文本");
          order=c.w??String(c.v);
        }
      }
      field="销售品类"; const category=map.category===null?null:raw(cells[map.category])||null;
      field="币种代码";
      if(map.currency!==null){
        const currency=raw(cells[map.currency]).toUpperCase();
        if(!/^[A-Z]{3}$/.test(currency)) fail("币种应为三位字母代码，例如 CNY");
        if(detected && detected!==currency) fail("含多种币种，请先分开或统一换算");
        detected=currency;
      }
      magnitude+=Math.abs(amount);
      rows.push({row:n,date,cents:amount,order,category});
    } catch(e){errorCount++;if(errors.length<6) errors.push("第 "+n+" 行 · "+field+"："+(e as Error).message);}
  }
  if(errorCount) fail(errorCount+" 行未通过，已停止生成。\n"+errors.join("\n"));
  if(magnitude>1e14) fail("金额绝对值合计超出 V0.1 精度范围。");
  if(detected && unit!=="原表单位" && detected!==unit) fail("所选单位与原表币种 "+detected+" 不一致。");
  return {name,sheet:t.sheet,created:new Date().toISOString(),unit:detected??unit,rows,hasOrders:map.order!==null,hasCategories:map.category!==null};
}

