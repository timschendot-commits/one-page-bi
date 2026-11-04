import type {Brief} from "./executive";
type Cell=string|number|null;
type DataType="string"|"int64"|"double";
interface DataTable{name:string;columns:[string,DataType][];rows:Cell[][];measures?:{name:string;expression:string;formatString?:string}[];}
const schema=(path:string)=>"https://developer.microsoft.com/json-schemas/fabric/item/"+path+"/schema.json";
function encoded(value:unknown){const bytes=new TextEncoder().encode(JSON.stringify(value));let text="";for(let i=0;i<bytes.length;i+=16000)text+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(text);}
function modelTable(table:DataTable){const expr="let rows = Json.Document(Binary.FromText(\""+encoded(table.rows)+"\", BinaryEncoding.Base64)), result = Table.FromRows(rows, type table ["+table.columns.map(([name,type])=>'#"'+name.replaceAll('"','""')+'" = nullable '+(type==="string"?"text":"number")).join(", ")+"]) in result";
return {name:table.name,columns:table.columns.map(([name,dataType])=>({name,dataType,sourceColumn:name,summarizeBy:"none"})),partitions:[{name:table.name,mode:"import",source:{type:"m",expression:expr}}],measures:table.measures??[]};}
const field=(table:string,col:string,measure=false)=>({field:{[measure?"Measure":"Column"]:{Expression:{SourceRef:{Entity:table}},Property:col}},queryRef:table+"."+col,nativeQueryRef:col});
function visual(id:string,type:string,pos:number[],roles:Record<string,ReturnType<typeof field>[]>,title:string){return {$schema:schema("report/definition/visualContainer/2.1.0"),name:id,position:{x:pos[0],y:pos[1],z:pos[4],width:pos[2],height:pos[3],tabOrder:pos[4]},visual:{visualType:type,query:{queryState:Object.fromEntries(Object.entries(roles).map(([k,v])=>[k,{projections:v}]))},visualContainerObjects:{title:[{properties:{show:{expr:{Literal:{Value:"true"}}},text:{expr:{Literal:{Value:"'"+title.replaceAll("'","''")+"'"}}}}}]},drillFilterOtherVisuals:true}};}
export function powerProject(brief:Brief,processed:{rows?:Record<string,unknown>[];cases?:Record<string,unknown>[];reusable?:{headers:string[];rows:string[][]}},recipe:string){
 const files:Record<string,string>={};function put(name:string,value:unknown){files[name]=JSON.stringify(value,null,2);}
 put("Workbench.pbip",{$schema:"https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",version:"1.0",artifacts:[{report:{path:"Workbench.Report"}}],settings:{enableAutoRecovery:true}});
 const rep="Workbench.Report/",model="Workbench.SemanticModel/";
 put(rep+"definition.pbir",{$schema:schema("report/definitionProperties/2.0.0"),version:"4.0",datasetReference:{byPath:{path:"../Workbench.SemanticModel"}}});
 put(model+"definition.pbism",{$schema:schema("semanticModel/definitionProperties/1.0.0"),version:"1.0",settings:{}});
 const prefix=rep+"definition/", page="ExecutiveOverview", base=prefix+"pages/"+page+"/";
 put(prefix+"version.json",{$schema:schema("report/definition/versionMetadata/1.0.0"),version:"2.0.0"});
 put(prefix+"report.json",{$schema:schema("report/definition/report/2.0.0"),themeCollection:{}});
 put(prefix+"pages/pages.json",{$schema:schema("report/definition/pagesMetadata/1.0.0"),pageOrder:[page],activePageName:page});
 put(base+"page.json",{$schema:schema("report/definition/page/1.4.0"),name:page,displayName:brief.title+" · "+brief.unit,displayOption:"FitToPage",height:720,width:1280});
 const tables:DataTable[]=[];
 const rows:Record<string,unknown>[]=processed.rows??(processed.cases??[]).flatMap(c=>["settlement","bank"].flatMap(role=>((c[role] as Record<string,unknown>[])??[]).map(x=>({...x,role,status:c.status}))));
 const attributes=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>rows.every(r=>r[k]==null||["string","number"].includes(typeof r[k]))&&rows.some(r=>r[k]!=null));
 const cols:[string,DataType][]=attributes.map(k=>[k,rows.every(r=>r[k]==null||typeof r[k]==="number")?"int64":"string"]);
 const facts:DataTable={name:"Facts",columns:[...cols,["Metric value","double"],["Month","string"]],rows:rows.map(r=>[...attributes.map(k=>(r[k]??null) as Cell),typeof r.cents==="number"?r.cents/100:null,String(r.date??"").slice(0,7)]),measures:[]};tables.push(facts);
 if(processed.reusable?.rows.length){const {headers,rows}=processed.reusable;tables.push({name:"Material",columns:headers.map(h=>[h,"string"]),rows});}
 const overview:DataTable={name:"Overview",columns:brief.cards.map((_,i)=>["Value "+(i+1),"string"]),rows:[brief.cards.map(c=>c[1])],measures:[]};tables.push(overview);
 const sales=recipe==="sales"||recipe==="orders";
 const salesMeasures=[["Net sales","SUM('Facts'[Metric value])","#,0.00"],["Orders","DISTINCTCOUNTNOBLANK('Facts'[order])","#,0"],["Average order","DIVIDE([Net sales],[Orders])","#,0.00"],["Sales lines","COUNTROWS('Facts')","#,0"]];
 if(sales&&attributes.includes("order"))facts.measures!.push({name:"Multi-line orders",expression:"COUNTROWS(FILTER(VALUES(\u0027Facts\u0027[order]), CALCULATE(COUNTROWS(\u0027Facts\u0027)) >= 2))",formatString:"#,0"});
 if(sales){for(const [name,expr,formatString] of salesMeasures)facts.measures!.push({name,expression:!attributes.includes("order")&&(name==="Orders"||name==="Average order")?"BLANK()":expr,formatString});}
 brief.cards.forEach(([label],i)=>{const key="KPI "+(i+1);overview.measures!.push({name:key,expression:"SELECTEDVALUE('Overview'[Value "+(i+1)+"])"});
 const dynamic=recipe==="sales"?salesMeasures[i]?.[0]:recipe==="orders"?["Orders","Average order",attributes.includes("order")?"Multi-line orders":null,"Net sales"][i]:null;
 const id="KpiTile"+(i+1);put(base+"visuals/"+id+"/visual.json",visual(id,"card",[16+i*316,22,300,144,i],{Values:[dynamic?field("Facts",dynamic,true):field("Overview",key,true)]},label));
 });
 brief.figures.forEach((f,i)=>{const name="Plot"+(i+1),measure="Chart value "+(i+1);tables.push({name,columns:[["Label","string"],["Value","double"],["Sequence","int64"]],rows:f.items.map(([v,n],j)=>[v,n,j+1]),measures:[{name:measure,expression:"SUM('"+name+"'[Value])",formatString:f.count?"#,0":"#,0.00"}]});const dyn=sales&&(i===0||i===1&&attributes.includes(recipe==="orders"?"order":"category"));const fields=dyn?{Category:[field("Facts",i===0?"Month":recipe==="orders"?"order":"category")],Y:[field("Facts",i===0&&recipe==="orders"?"Orders":"Net sales",true)]}:{Category:[field(name,"Label")],Y:[field(name,measure,true)]};const id="PlotVisual"+(i+1);put(base+"visuals/"+id+"/visual.json",visual(id,f.time?"lineChart":"clusteredBarChart",[16+i*632,194,brief.figures.length===1?1248:616,490,4+i],fields,f.title));});
 put(model+"model.bim",{name:"Workbench",compatibilityLevel:1600,model:{culture:"en-US",defaultPowerBIDataSourceVersion:"powerBI_V3",sourceQueryCulture:"en-US",tables:tables.map(modelTable)}});
 return files;
}
