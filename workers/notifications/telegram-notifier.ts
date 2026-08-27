import { TelegramNotificationProvider } from "@/lib/telegram/TelegramNotificationProvider";
import { runJob } from "@/lib/workers/runJob";
import { NotificationNotifierWorker } from "./discord-notifier";

export class TelegramNotifierWorker extends NotificationNotifierWorker {
  constructor(provider = new TelegramNotificationProvider()) {
    super(provider);
  }
}

if (require.main === module) {
  runJob("telegram-notifier", () => new TelegramNotifierWorker().runOnce())
    .then((summary) => console.log("Notification Telegram terminée :", summary))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
