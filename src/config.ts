export type Config = {
  token: string,
  subscriptionService: {
    base: URL,
    webhook: string
  },
  freePlacesNotifications?: {
    criticalShare: number,
    webhook: string
  }
}

export const loadConfig = (): Config => {
  const {
    TELEGRAM_BOT_TOKEN,
    SUBSCRIPTION_SERVICE_BASE_URL,
    SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH,
    FREE_PLACES_NOTIFICATIONS_PATH,
    FREE_PLACES_CRITICAL_SHARE
  } = process.env
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
  if (!SUBSCRIPTION_SERVICE_BASE_URL) throw new Error('SUBSCRIPTION_SERVICE_BASE_URL is undefined')
  if (!SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH) throw new Error('SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH is undefined')
  const optionalPart: Partial<Config> = FREE_PLACES_NOTIFICATIONS_PATH
    ? {
      freePlacesNotifications: {
        criticalShare: +(FREE_PLACES_CRITICAL_SHARE || '0.5'),
        webhook: FREE_PLACES_NOTIFICATIONS_PATH
      }
    }
    : {}
  return {
    token: TELEGRAM_BOT_TOKEN,
    subscriptionService: {
      base: new URL(SUBSCRIPTION_SERVICE_BASE_URL),
      webhook: SUBSCRIPTION_SERVICE_WEBHOOK_UPDATE_PATH
    },
    ...optionalPart
  }
}
