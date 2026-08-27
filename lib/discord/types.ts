// Compatibilité avec les imports historiques. Le contrat commun ne dépend
// plus de Discord et peut être implémenté par Telegram ou un autre canal.
export type {
  NotificationProvider,
  NotificationResult,
  OpportunityNotificationPayload,
} from "@/lib/notifications/types";
