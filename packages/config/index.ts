import { z } from "zod";

export const zEnv = z.object({
  // Public (browser) env
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string(),
  NEXT_PUBLIC_STRIPE_PK: z.string(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Server-only (API/server components)
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(), // base64 or raw JSON
  STRIPE_SK: z.string().optional()
});
export type Env = z.infer<typeof zEnv>;