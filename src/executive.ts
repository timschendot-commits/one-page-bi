import {dashboard,recipes} from "./recipes";
import {money,type Report} from "./model";
import {payoutTotals,statusLabels,type PayoutReport} from "./payout-model";
import {translator,sourceUnit,type Language} from "./i18n";
export interface Figure {title:string;items:[string,number][];count?:boolean;empty:string;time:boolean;}
export interface Brief {title:string;unit:string;start:string;end:string;created:string;cards:[string,string][];figures:Figure[];}
export function executive(r:Report|PayoutReport,lang:Language):Brief{
 const t=translator(lang);let dates:string[],cards:[string,string][],figures:Figure[],title:string,unit:string;
 if("rows" in r){const d=dashboard(r,r.rows,lang);cards=d.cards;title=t(recipes[r.recipe??"sales"].title);unit=sourceUnit(r.unit,lang);dates=r.rows.map(x=>x.date);
 figures=d.panels.map(p=>({title:p.title,count:!!p.count,empty:p.empty,time:[t("Monthly amount"),t("Monthly sales"),t("Orders by month"),t("Monthly net movement")].includes(p.title)&&p.items.length>0&&p.items.every(([s])=>/^\d{4}-\d{2}$/.test(s)),items:p.items.map(([k,n])=>[k,p.count?n:n/100])}));
 }else{title=t("Payout check");unit=r.currency;const v=payoutTotals(r.cases);cards=[[t("Confirmed receipts"),money(v.confirmed,lang)],[t("Expected positive payouts"),money(v.expected,lang)],[t("Payout exceptions"),String(v.issues)],[t("Unlinked bank rows"),String(v.bankOnly)]];
 dates=r.cases.flatMap(c=>[...c.bank,...c.settlement].map(x=>x.date));figures=[{title:t("Case status"),time:false,count:true,empty:"—",items:(Object.keys(statusLabels) as (keyof typeof statusLabels)[]).map(s=>[t(statusLabels[s]),r.cases.filter(c=>c.status===s).length])}];}
 dates.sort();return {title,unit,start:dates[0]??"",end:dates.at(-1)??"",created:r.created,cards,figures};
}
