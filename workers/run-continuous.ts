import { config } from "dotenv";
import { ListingAnalyzer } from "@/workers/ai/listing-analyzer";
import { OpportunityScoringWorker } from "@/workers/pricing/opportunity-scorer";
import { DiscordNotifierWorker } from "@/workers/notifications/discord-notifier";
import { TelegramNotifierWorker } from "@/workers/notifications/telegram-notifier";
config({quiet:true});
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){const visionConfigured=Boolean(process.env.GEMINI_API_KEY&&process.env.GEMINI_MODEL);console.log(`Processeur Pokedeal continu actif${visionConfigured?"":" (Gemini en attente de configuration)"}.`);for(;;){try{const analyzed=visionConfigured?await new ListingAnalyzer().runOnce(20):{analyzed:0,ignored:0,errors:0};const scored=await new OpportunityScoringWorker().runOnce(20);const discord=await new DiscordNotifierWorker().runOnce(20);const telegram=process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID?await new TelegramNotifierWorker().runOnce(20):null;if(analyzed.analyzed||scored.scored||discord.sent||telegram?.sent)console.log({analyzed,scored,discord,telegram});}catch(error){console.error("Cycle continu en erreur:",error)}await delay(10_000)}}
main().catch(error=>{console.error(error);process.exit(1)});
