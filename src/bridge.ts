interface Native {postMessage:(request:unknown)=>void;addEventListener:(name:"message",fn:(e:MessageEvent)=>void)=>void}
declare global {interface Window {chrome?:{webview?:Native}}}
const pending=new Map<string,{resolve:(value:any)=>void;reject:(err:Error)=>void}>();
const native=window.chrome?.webview;
native?.addEventListener("message",e=>{const msg=e.data,p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);if(msg.ok)p.resolve(msg.result);else p.reject(Error(msg.error));});
export function call<T>(method:string,args:Record<string,unknown>={}):Promise<T>{
  if(!native)return Promise.reject(Error("请用 OnePageBI.exe 启动桌面工作台。"));
  const id=crypto.randomUUID();return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});try{native.postMessage({id,method,...args})}catch(e){pending.delete(id);reject(e)}});
}
export interface Inventory {folder:string;files:{name:string;size:number;modified:string}[]}
export interface Snapshot {name:string;bytes:string;token:string}
export interface History {folder:string;skipped:number;items:{id:string;source:string;created:string;rows:number;sheet:string}[]}

