import { config } from "dotenv";

config({ quiet: true });

type TelegramChat = {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
  title?: string;
};

type TelegramUpdate = {
  message?: { chat: TelegramChat };
  edited_message?: { chat: TelegramChat };
  channel_post?: { chat: TelegramChat };
  edited_channel_post?: { chat: TelegramChat };
};

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

async function telegramRequest<T>(token: string, method: string): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`);
  const payload = (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(payload.description ?? `Erreur Telegram HTTP ${response.status}`);
  }

  return payload.result;
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN n'est pas configuré dans .env");
  }

  const webhook = await telegramRequest<{ url: string }>(token, "getWebhookInfo");
  if (webhook.url) {
    throw new Error(
      "Un webhook Telegram est actif : getUpdates ne peut pas récupérer les messages. " +
        "Supprime d'abord ce webhook uniquement si tu ne l'utilises plus.",
    );
  }

  const updates = await telegramRequest<TelegramUpdate[]>(token, "getUpdates");
  const chats = new Map<number, TelegramChat>();

  for (const update of updates) {
    const chat =
      update.message?.chat ??
      update.edited_message?.chat ??
      update.channel_post?.chat ??
      update.edited_channel_post?.chat;
    if (chat) chats.set(chat.id, chat);
  }

  if (chats.size === 0) {
    console.log("Aucun message reçu par le bot.");
    console.log("Dans Telegram : ouvre le bot, appuie sur Démarrer, puis envoie /start et test.");
    console.log("Relance ensuite cette commande.");
    return;
  }

  console.log("Conversations Telegram trouvées :");
  for (const chat of chats.values()) {
    const label = chat.username ? `@${chat.username}` : chat.first_name ?? chat.title ?? "sans nom";
    console.log(`- Chat ID : ${chat.id} | type : ${chat.type} | ${label}`);
  }
  console.log("Copie l'identifiant voulu dans TELEGRAM_CHAT_ID de ton fichier .env.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
