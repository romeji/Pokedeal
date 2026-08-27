import { prisma } from "@/lib/database/prisma";
import type { MarketplaceProvider,RawListing,SearchListingsParams } from "@/lib/marketplace/types";

/** Provider de lecture des annonces normalisées reçues du worker Go Vintrack. */
export class VintrackMarketplaceProvider implements MarketplaceProvider {
  readonly name="vintrack-vinted";
  async searchListings(params:SearchListingsParams):Promise<RawListing[]>{const rows=await prisma.listing.findMany({where:{marketplace:"vinted",title:{contains:params.query,mode:"insensitive"},price:{gte:params.minPrice,lte:params.maxPrice},status:{notIn:["SOLD","REMOVED","EXPIRED"]}},include:{images:true},orderBy:{firstSeenAt:"desc"},take:params.maxResults??50});return rows.map(row=>({marketplace:row.marketplace,externalId:row.externalId,url:row.url,title:row.title,description:row.description,price:Number(row.price),currency:row.currency,imageUrls:row.images.map(image=>image.url),postedAt:row.firstSeenAt}))}
  async getListing(externalId:string):Promise<RawListing|null>{const row=await prisma.listing.findUnique({where:{marketplace_externalId:{marketplace:"vinted",externalId}},include:{images:true}});return row?{marketplace:row.marketplace,externalId:row.externalId,url:row.url,title:row.title,description:row.description,price:Number(row.price),currency:row.currency,imageUrls:row.images.map(image=>image.url),postedAt:row.firstSeenAt}:null}
}
