import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/**
 * Stripe, only when STRIPE_API_KEY is set (Méridien's backend registers no payment provider: its
 * regions use Medusa's system provider, which takes no payment). The region must then list
 * `pp_stripe_stripe` (the seed adds it when the key is set at seed time; otherwise add it in the admin).
 */
const stripe = process.env.STRIPE_API_KEY?.trim()

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: stripe
    ? [
        {
          resolve: '@medusajs/medusa/payment',
          options: {
            providers: [
              {
                resolve: '@medusajs/medusa/payment-stripe',
                id: 'stripe',
                options: { apiKey: stripe, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET },
              },
            ],
          },
        },
      ]
    : [],
})
