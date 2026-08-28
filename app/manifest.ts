import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"Pokémon Deal Scanner", short_name:"PokéDeal", description:"Scanner d'opportunités Pokémon", start_url:"/dashboard", display:"standalone", background_color:"#262b36", theme_color:"#262b36", icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}] }; }
