import {useState} from "react";
import {useLanguage} from "./language";import {call} from "./bridge";import {type Message} from "./i18n";
const palettes=["forest","ocean","plum"] as const;
export function restorePalette(){try{const color=localStorage.getItem("onepagebi.palette");if(palettes.some(x=>x===color))document.documentElement.dataset.theme=color!;}catch{/* defaults */}}
export function ShellControls(){const {t}=useLanguage();const [menu,setMenu]=useState(false),[color,setColor]=useState(document.documentElement.dataset.theme||"forest"),[pinned,pin]=useState(false);
 async function act(a:string){setMenu(false);const state=await call<{pinned:boolean}>("windowAction",{action:a});pin(state.pinned);}
 return <div className="chrome-controls"><button className="shell-toggle" title={t("Window and colors")} aria-label={t("Window and colors")} aria-expanded={menu} onClick={()=>{setMenu(!menu);if(!menu)void call<{pinned:boolean}>("windowAction",{action:"state"}).then(s=>pin(s.pinned));}}>◐</button>
 {menu&&<div className="shell-menu" onKeyDown={e=>{if(e.key==="Escape")setMenu(false)}}><span>{t("Color")}</span><div className="swatches">{palettes.map((p,i)=><button key={p} data-color={p} aria-label={t((["Forest","Ocean","Plum"] as Message[])[i])} aria-pressed={color===p} onClick={()=>{setColor(p);document.documentElement.dataset.theme=p;try{localStorage.setItem("onepagebi.palette",p)}catch{}}}>{color===p?"✓":""}</button>)}</div>
 <button onClick={()=>void act(matchMedia("(max-width:660px)").matches?"full":"compact")}>{t(matchMedia("(max-width:660px)").matches?"Full workbench":"Floating window")}</button><button aria-pressed={pinned} onClick={()=>void act("pin")}>{t("Keep on top")}</button><button onClick={()=>void act("tray")}>{t("Hide to tray")}</button></div>}
 <button className="window-min" aria-label={t("Minimize window")} onClick={()=>void act("minimize")}>−</button><button className="window-max" aria-label={t("Maximize or restore")} onClick={()=>void act("maximize")}>□</button><button className="window-close" aria-label={t("Exit application")} onClick={()=>void act("close")}>×</button></div>;
}
