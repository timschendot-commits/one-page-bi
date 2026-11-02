import type {CSSProperties} from "react";
export type IconType="cube"|"book"|"file"|"chart"|"folder"|"tree"|"clock"|"map"|"arrow"|"check";
const patterns:Record<IconType,string[]> = {
 cube:["......aa......","....aaaabb....","..aaaaaabbbb..","aaaaaaaabbbbbb","ccaaaabbbbbbdd","ccccbbbbbbdddd","ccccccbbdddddd","ccccccdddddddd","ccccccdddddddd","..ccccdddddd..","....ccdddd....","......dd......"],
 book:["..aaaaaaaaaa..",".abbbbbbbbbbca",".abddddbbbbbca",".abdbbbdbbbbca",".abddddbbbbbca",".abdbbbdbbbbca",".abddddbbbbbca",".abbbbbbbbbbca",".aaaaaaaaaaaca",".aeeeeeeeeeeaa","..aaaaaaaaaaa."],
 file:["..aaaaaaaa....","..abbbbbaca...","..abbbbbacca..","..abbbbbaaaa..","..abbbbbbbba..","..abddddddba..","..abdbdbbdba..","..abddddddba..","..abdbdbbdba..","..abddddddba..","..abbbbbbbba..","..aaaaaaaaaa.."],
 chart:["..aaaaaaaaaa..","..abbbbbbbba..","..abbbbbbbba..","..abbbbbbdda..","..abbbccbd da..".replace(" ",""),"..abbbccbdd a..".replace(" ",""),"..abddccbdda..","..abddccbdda..","..abbbbbbbba..","..aaaaaaaaaa.."],
 folder:["..............",".aaaaaa.......",".abbbbaaaaaaa.",".abbbbbbbbbba.",".aaaaaaaaaaaa.",".acccccccccca.",".acccccccccca.",".acccccccccca.",".acccccccccca.",".aaaaaaaaaaaa."],
 tree:[".....aaaa.....",".....abba.....",".....aaaa.....","......aa......","...aaaaaaaa...","...a......a...","..aaaa..aaaa..","..abba..abba..","..aaaa..aaaa.."],
 clock:["....aaaaaa....","..aabbbbbbaa..",".abbbbdbbbbba.",".abbbbdbbbbba.",".abbbbdddbbba.",".abbbbbbbbbba.","..aabbbbbbaa..","....aaaaaa...."],
 map:["..aaaaaaaaaa..","..abbbbbbbba..","..abddbbddba..","..abbdbbdbba..","..abbddddbba..","..abbbbbbbba..","..aaaaaaaaaa.."],
 arrow:["......aa......","......aaaa....","..aaaaaaaaaa..","..aaaaaaaaaaaa","..aaaaaaaaaa..","......aaaa....","......aa......"],
 check:["..............","..........aa..",".........aaa..","..aa....aaa...","..aaa..aaa....","...aaaaaa.....","....aaaa......",".....aa......."]
};
export function Icon({kind,size=22,style}:{kind:IconType;size?:number;style?:CSSProperties}){
 const palette=kind==="cube"?["#b8e3a5","#86b78b","#3e8065","#255944"]:kind==="folder"?["#604b2e","#e5bd6a","#c8954f","#976b3c","#f2dead"]:["#254e41","#b5d8ae","#76a483","#4f866a","#ebead5"];
 return <svg aria-hidden="true" viewBox="0 0 14 14" width={size} height={size} shapeRendering="crispEdges" style={style}>{patterns[kind].flatMap((r,y)=>Array.from(r,(c,x)=>c==="."?null:<rect key={x+"-"+y} x={x} y={y+1} width="1" height="1" fill={palette[c.charCodeAt(0)-97]}/>))}</svg>
}

