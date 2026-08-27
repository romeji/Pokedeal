import { prisma } from "@/lib/database/prisma";

export type FilterAction = "ALLOW" | "REVIEW" | "REJECT";
export type FilterDecision = { action:FilterAction; flags:string[]; reasons:string[] };

const BUILTIN = [
  { category:"COUNTERFEIT", action:"REJECT" as const, label:"Contrefaçon déclarée", terms:["carte fausse","cartes fausses","fake card","proxy card","carte proxy","replique","reproduction","non officiel","custom card"] },
  { category:"PACKAGING_ONLY", action:"REJECT" as const, label:"Emballage seul", terms:["boite vide","emballage seul","uniquement la boite","boite uniquement","empty box","sans cartes","sans booster"] },
  { category:"OPENED", action:"REVIEW" as const, label:"Produit ouvert", terms:["deja ouvert","booster ouvert","display ouverte","descele","non scelle","loose pack","contenu incomplet"] },
];

const normalize=(text:string)=>text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();

export async function evaluateListing(title:string,description?:string|null):Promise<FilterDecision>{
  const text=normalize(`${title} ${description??""}`);const reasons:string[]=[];const flags:string[]=[];let action:FilterAction="ALLOW";
  for(const rule of BUILTIN){if(rule.terms.some(term=>text.includes(normalize(term)))){flags.push(rule.category);reasons.push(rule.label);if(rule.action==="REJECT")action="REJECT";else if(action==="ALLOW")action="REVIEW";}}
  const manual=await prisma.listingFilter.findMany({where:{enabled:true},orderBy:{priority:"asc"}});
  for(const rule of manual){let matches=false;try{matches=rule.isRegex?new RegExp(rule.pattern,"i").test(`${title} ${description??""}`):text.includes(normalize(rule.pattern));}catch{continue}if(!matches)continue;flags.push(rule.category);reasons.push(rule.label);if(rule.action==="ALLOW")return{action:"ALLOW",flags:[...new Set(flags)],reasons};if(rule.action==="REJECT")action="REJECT";else if(action==="ALLOW")action="REVIEW";}
  return{action,flags:[...new Set(flags)],reasons};
}
