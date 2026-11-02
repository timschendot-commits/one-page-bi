import React,{useState,useEffect,useRef,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {call,type History,type Inventory,type Snapshot} from "./bridge";
import {readSource,validate,cellLabel,type Source,type Table} from "./input";
import {fields,suggest,metrics,money,definitions,type Mapping,type Report} from "./model";
import {standalone} from "./report-html";
import {paint} from "./chart";
import {Icon} from "./icons";
import "./style.css";

const emptyMap:Mapping={date:null,amount:null,order:null,category:null,currency:null};
const dateTime=(s:string)=>new Date(s).toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal()},[]);
 return <dialog ref={ref} onCancel={onClose}><div className="modalhead"><h2>{title}</h2><button aria-label="关闭" onClick={onClose}>×</button></div>{children}</dialog>
}
function App(){
 const [tab,setTab]=useState("work"),[modal,setModal]=useState(""),[busy,setBusy]=useState(false),lock=useRef(false);
 const [inventory,setInv]=useState<Inventory>({folder:"",files:[]}),[history,setHistory]=useState<History>(),[search,setSearch]=useState("");
 const [snapshot,setSnap]=useState<{name:string;token:string}|null>(null),[source,setSource]=useState<Source|null>(null),[sheet,setSheet]=useState(""),[table,setTable]=useState<Table|null>(null);
 const [map,setMap]=useState<Mapping>(emptyMap),[unit,setUnit]=useState("原表单位"),[report,setReport]=useState<Report|null>(null),[id,setId]=useState(""),[thumb,setThumb]=useState("");
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[drag,setDrag]=useState(false);
 async function run(fn:()=>Promise<void>){
   if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
   try{await fn()}catch(e){setError((e as Error).message)}finally{lock.current=false;setBusy(false)}
 }
 const inv=async(method:string)=>{setInv(await call<Inventory>(method));setSearch("")};
 useEffect(()=>{void run(()=>inv("inventory"))},[]);
 const refreshHistory=async()=>setHistory(await call<History>("history"));
 function clearOutput(){setReport(null);setId("");setThumb("")}
 function selectSheet(s:Source,name:string){setSheet(name);setTable(null);setMap(emptyMap);clearOutput();const t=s.table(name);setTable(t);setMap(suggest(t.headers));}
 async function load(name?:string){
   const snap=await call<Snapshot|null>(name?"load":"selectFile",name?{name}:{});
   if(!snap)return;
   setSnap({name:snap.name,token:snap.token});setSource(null);setTable(null);setSheet("");setMap(emptyMap);setUnit("原表单位");clearOutput();
   if(!name)await inv("inventory");
   const bytes=Uint8Array.from(atob(snap.bytes),c=>c.charCodeAt(0));
   const src=readSource(bytes,snap.name);setSource(src);selectSheet(src,src.sheets[0]);setModal("mapping");
 }
 function confirmMap(){
   if(!table || !snapshot)return;
   const r=validate(table,map,snapshot.name,unit);
   const c=document.createElement("canvas");paint(c,r,r.rows);
   setReport(r);setThumb(c.toDataURL());setId("");setModal("");setNotice("字段已验证，可以合成并归档。");
 }
 async function craft(){
   if(!report || !snapshot || !table)return;
   const r={...report,created:new Date().toISOString()};
   const c=document.createElement("canvas");paint(c,r,r.rows);const png=c.toDataURL("image/png");
   const tpl={appVersion:"0.1.0",template:"sales",version:1,theme:"field-notes",sheet:r.sheet,unit:r.unit,grain:"一行一条销售明细",moneyScale:2,definitions,mapping:Object.fromEntries(fields.map(f=>[f.key,map[f.key]===null?null:{column:map[f.key]!+1,header:table.headers[map[f.key]!]}]))};
   const archiveId=await call<string>("archive",{token:snapshot.token,processed:JSON.stringify({schemaVersion:1,unit:r.unit,amountField:"cents",rows:r.rows}),template:JSON.stringify(tpl,null,2),html:standalone(r),png:png.split(",")[1],created:r.created,rows:r.rows.length,sheet:r.sheet});
   setReport(r);setThumb(png);setId(archiveId);setNotice("已归档原件、处理数据、交互报表、PNG 和配方。");
 }
 const action=(method:string,archiveId:string)=>run(async()=>{const ok=await call(method,{archiveId});if(method==="exportPng"&&ok)setNotice("已导出 PNG。")});
 const showHistory=()=>{setModal("");setTab("history");void run(refreshHistory)};
 const openMap=()=>{if(table){setError("");setModal("mapping")}};
 const files=inventory.files.filter(f=>f.name.toLowerCase().includes(search.toLowerCase()));
 const total=report?metrics(report.rows,report.hasOrders):null;
 const status=(error || notice)?<div className={error?"feedback bad":"feedback good"} role={error?"alert":"status"}>{error||notice}</div>:null;
 return <><header className="top"><div className="brand"><Icon kind="cube" size={35}/>One Page <b>BI</b><span>V0.1</span></div><nav><button className={tab==="work"?"active":""} onClick={()=>{setTab("work");setError("");setNotice("")}}>工作台</button><button className={tab==="history"?"active":""} onClick={showHistory}>历史记录</button></nav><small><i/> 本地工作空间</small></header>
 <main><div className="title"><div><div className="eyebrow">FIELDWORK SYSTEMS &nbsp;/&nbsp; {tab==="work"?"WORKBENCH":"ARCHIVE"}</div><h1>{tab==="work"?"报表合成台":"历史记录"}</h1><p>{tab==="work"?"选择销售明细，核对字段，把一份数据合成为一页报表。":"按生成时间找回报表，以及当时使用的原件和配置。"}</p></div><span className="station">LOCAL EDITION <b>◆</b> 01</span></div>
 {modal!=="mapping"&&status}
 {tab==="history"?<section className="panel history"><div className="panelhead"><span><Icon kind="clock"/> 报表档案库</span><button onClick={()=>run(refreshHistory)}>刷新</button></div><p className="path">{history?.folder}</p>{!!history?.skipped&&<p>有 {history.skipped} 条损坏的元数据未显示。</p>}
 {history?.items.length?history.items.map(h=><article className="histitem" key={h.id}><Icon kind="chart" size={35}/><div><strong>{h.source}</strong><small>{dateTime(h.created)} · {h.sheet} · {h.rows} 行</small></div><div className="actions"><button onClick={()=>action("report",h.id)}>打开报表</button><button onClick={()=>action("exportPng",h.id)}>导出 PNG</button><button onClick={()=>action("archiveFolder",h.id)}>归档目录</button></div></article>):<div className="empty">尚无生成记录。报表合成成功后会出现在这里。</div>}</section>:
 <div className="layout"><aside className="panel library"><div className="panelhead"><span><Icon kind="book"/> 业务模板</span><em>01</em></div><div className="sidebody"><div className="tiny">TEMPLATE LIBRARY</div><div className="template"><Icon kind="book" size={31}/><div><b>销售分析</b><small>Sales overview</small></div><i/></div><div className="sidecaption">当前配方</div><p>销售明细 × 1<br/>字段映射 × 1</p><div className="siderule"/><div className="tiny">REFERENCE</div><button className="sidebtn" onClick={()=>setModal("recipe")}><Icon kind="tree"/> 配方手册 <span>›</span></button><button className="sidebtn" onClick={()=>setModal("components")}><Icon kind="chart"/> 报表组件 <span>›</span></button></div></aside>
 <section className="panel bench"><div className="panelhead"><span><Icon kind="cube"/> 合成台</span><em>CRAFTING</em></div><div className="benchbody"><div className="step"><span>配方 01</span> 销售分析 <b>01 / 01</b></div><div className="slots"><button className={"slot "+(drag?"over ":"")+(snapshot?"filled":"")} onClick={()=>run(()=>load())} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const n=e.dataTransfer.getData("application/x-onepagebi");if(n)void run(()=>load(n));else setError("请从下方 Inventory 拖入，或点击槽位浏览本机文件。")}}><Icon kind="file" size={47}/><b>{snapshot?snapshot.name:"放入销售明细"}</b><small>01 · CSV / XLSX</small></button><strong className="plus">+</strong><button className={"slot "+(report?"filled":"")} disabled={!table} onClick={openMap}><Icon kind="map" size={47}/><b>{report?"字段已验证":"确认字段映射"}</b><small>02 · MAPPING</small></button></div>
 {source && source.sheets[0]!=="CSV"&&<label className="sheet">工作表 <select value={sheet} onChange={e=>run(async()=>{selectSheet(source,e.target.value);setModal("mapping")})}>{source.sheets.map(n=><option key={n}>{n}</option>)}</select></label>}
 <div className="craftfoot"><span className="matcount">{report?"材料就绪":snapshot?"等待字段验证":"等待材料"}<br/><small>{report?"2":snapshot?"1":"0"} / 2 个槽位</small></span><button className="primary" disabled={!report||busy} onClick={()=>run(craft)}><Icon kind="arrow" size={17}/>{busy?"处理中…":id?"再次合成并归档":"合成并归档"}</button></div></div></section>
 <section className="panel preview"><div className="panelhead"><span><Icon kind="chart"/> 成品预览</span><em>DASHBOARD</em></div><div className="previewbody"><div className="tiny">OUTPUT &nbsp;/&nbsp; SALES OVERVIEW</div><h2>一页销售报表</h2><div className="screen">{thumb?<button className="thumb" aria-label="放大报表预览" onClick={()=>setModal("preview")}><img src={thumb} alt="根据当前销售明细生成的一页报表"/></button>:<div className="screenempty"><Icon kind="chart" size={70}/><b>等待合成材料</b><small>验证字段后显示真实数据预览</small></div>}</div>
 <div className="peek"><div><small>销售额 {report?.unit}</small><b>{total?money(total.total):"—"}</b></div><div><small>订单数</small><b>{total?.count??"—"}</b></div></div>
 <div className="prevactions"><button disabled={!id} onClick={()=>action("report",id)}>打开交互报表 ↗</button><button disabled={!id} onClick={()=>action("exportPng",id)}>导出 PNG</button></div><small className="hint">{id?"已生成 · 可在历史记录中重新打开":"合成成功后可独立打开或导出"}</small></div></section>
 <section className="panel inventory"><div className="panelhead"><span><Icon kind="folder"/> 文件背包</span><em>INVENTORY</em></div><div className="invbody"><div className="invline"><div className="path" title={inventory.folder}><Icon kind="folder" size={18}/>{inventory.folder||"正在读取…"}</div><button onClick={()=>run(()=>inv("folder"))}>切换文件夹</button></div><div className="invtools"><button onClick={()=>run(()=>inv("desktop"))}>桌面</button><button onClick={()=>run(()=>inv("examples"))}>示例文件夹</button><button onClick={()=>run(()=>inv("inventory"))}>刷新</button><input aria-label="搜索文件名" placeholder="搜索文件名…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="filelist">{files.length?files.map(f=><button key={f.name} draggable onDragStart={e=>e.dataTransfer.setData("application/x-onepagebi",f.name)} className="filetile" onClick={()=>run(()=>load(f.name))}><Icon kind="file" size={31}/><div><b>{f.name}</b><small>{f.name.split(".").pop()?.toUpperCase()} · {Math.max(1,Math.ceil(f.size/1024))} KB</small></div></button>):<div className="empty">{search?"没有匹配的文件。":"当前文件夹没有可用销售文件。可切换文件夹，或打开示例文件夹试用。"}</div>}</div><div className="invnote">仅显示 CSV / XLSX · 点击或拖入合成台 <b>{files.length} 个文件</b></div></div></section></div>}
 <footer>ONE PAGE BI <span>本地处理 · 独立报表 · 自动归档</span><span>WORKBENCH / V0.1</span></footer></main>
 {modal==="mapping"&&table&&<Modal title="核对字段映射" onClose={()=>{setModal("");setError("")}}><p>每行应是一条销售明细。请确认建议列与实际含义一致。</p>{source&&source.sheets.length>1&&<label className="sheet">工作表 <select value={sheet} onChange={e=>run(async()=>{try{selectSheet(source,e.target.value)}catch(err){setModal("");throw err}})}>{source.sheets.map(n=><option key={n}>{n}</option>)}</select></label>}
 <small className="hint">{snapshot?.name} · {sheet} · {table.lines.length} 条明细</small>
 <div className="mapping">{fields.map(f=><label key={f.key}><span>{f.title} <small>{f.required?"必填":"选填"}</small></span><select aria-label={f.title} value={map[f.key]??""} onChange={e=>{setMap({...map,[f.key]:e.target.value===""?null:+e.target.value});clearOutput();setError("")}}><option value="">{f.required?"请选择列":"不使用"}</option>{table.headers.map((h,i)=><option value={i} key={i}>{h}</option>)}</select><small title="原表第一条明细">{map[f.key]===null?"—":cellLabel(table.lines[0].cells[map[f.key]!])||"（空白）"}</small></label>)}</div>
 <label className="sheet">金额单位 <select aria-label="金额单位" value={unit} onChange={e=>{setUnit(e.target.value);clearOutput()}}>{["原表单位","CNY","MYR","USD","SGD","EUR","GBP"].map(s=><option key={s}>{s}</option>)}</select></label><p className="help">有币种列时自动核对。无币种列时，请确认全表使用同一单位。金额须为行金额，导入前请移除小计和合计行。</p>{status}<div className="modalactions"><button className="primary" onClick={()=>run(async()=>confirmMap())}>确认映射并验证</button></div></Modal>}
 {(modal==="components"||modal==="recipe")&&<Modal title={modal==="recipe"?"销售分析配方":"报表组件"} onClose={()=>setModal("")}>{modal==="recipe"?<><p>① 选择一份 UTF-8 CSV 或 XLSX 销售明细，第一行为列名。</p><p>② 映射日期、行销售金额，可补充订单编号、品类和币种。软件不会推算缺失字段。</p><p>③ 验证全部行后合成。每次生成独立档案，原始文件可以从归档取回。</p></>:<><p>销售额、不同订单数、平均订单额、有效明细行数。</p><p>月度销售额显示最近 6 个有记录的月份；品类按净销售额展示前 6 类。独立报表支持月份与品类组合筛选。</p></>}<p className="help">V0.1 仅支持单表、单币种。利润、预测、多表关联与 Power BI PBIP 导出尚未提供。</p></Modal>}
 {modal==="preview"&&<Modal title="销售分析总览" onClose={()=>setModal("")}><img className="largepreview" src={thumb} alt="一页销售分析报表"/></Modal>}</>
}
createRoot(document.getElementById("root")!).render(<App/>);

