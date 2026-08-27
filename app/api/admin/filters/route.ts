import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { isAdminRequest } from "@/lib/admin/auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!isAdminRequest(request))return NextResponse.json({error:"Accès refusé"},{status:401});return NextResponse.json(await prisma.listingFilter.findMany({orderBy:{priority:"asc"}}));}
export async function POST(request:Request){if(!isAdminRequest(request))return NextResponse.json({error:"Accès refusé"},{status:401});const b=await request.json() as Record<string,unknown>;if(!b.label||!b.pattern)return NextResponse.json({error:"Nom et motif obligatoires"},{status:400});const row=await prisma.listingFilter.create({data:{label:String(b.label),pattern:String(b.pattern),category:String(b.category||"CUSTOM"),action:["ALLOW","REVIEW","REJECT"].includes(String(b.action))?String(b.action):"REJECT",isRegex:Boolean(b.isRegex),priority:Number(b.priority)||100}});return NextResponse.json(row);}
export async function DELETE(request:Request){if(!isAdminRequest(request))return NextResponse.json({error:"Accès refusé"},{status:401});const id=new URL(request.url).searchParams.get("id");if(!id)return NextResponse.json({error:"ID manquant"},{status:400});await prisma.listingFilter.delete({where:{id}});return NextResponse.json({deleted:true});}
