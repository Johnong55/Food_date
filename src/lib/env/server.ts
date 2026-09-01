import "server-only";

import { z } from "zod";

const supabasePublicEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

const supabaseAdminEnvSchema = supabasePublicEnvSchema.extend({
  serviceRoleKey: z
    .string()
    .min(20)
    .refine(
      (value) => !value.startsWith("your-"),
      "Placeholder service role key is not configured.",
    ),
});

const googlePlacesApiKeyEnvSchema = z.object({
  authMode: z.literal("api_key"),
  apiKey: z
    .string()
    .min(20)
    .refine((value) => !value.startsWith("your-"), "Placeholder API key is not configured."),
});

const googlePlacesAdcEnvSchema = z
  .object({
    authMode: z.literal("adc"),
    projectId: z
      .string()
      .regex(
        /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
        "Google Cloud project ID is invalid.",
      ),
    serviceAccountEmail: z.email().optional(),
    serviceAccountPrivateKey: z.string().min(100).optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.serviceAccountEmail) !== Boolean(value.serviceAccountPrivateKey)) {
      context.addIssue({
        code: "custom",
        message:
          "Service account email and private key must be configured together.",
      });
    }
  });

const googlePlacesEnvSchema = z.union([
  googlePlacesApiKeyEnvSchema,
  googlePlacesAdcEnvSchema,
]);

const upstashEnvSchema = z.object({
  url: z.url().refine((value) => value.startsWith("https://"), "Upstash URL must use HTTPS."),
  token: z
    .string()
    .min(20)
    .refine((value) => !value.startsWith("your-"), "Placeholder token is not configured."),
});

function readSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasSupabaseEnv() {
  return supabasePublicEnvSchema.safeParse(readSupabasePublicEnv()).success;
}

export function getSupabasePublicEnv() {
  return supabasePublicEnvSchema.parse(readSupabasePublicEnv());
}

export function getSupabaseAdminEnv() {
  return supabaseAdminEnvSchema.parse({
    ...getSupabasePublicEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function hasSupabaseAdminEnv() {
  return supabaseAdminEnvSchema.safeParse({
    ...readSupabasePublicEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).success;
}

export function getGooglePlacesEnv() {
  return googlePlacesEnvSchema.parse(readGooglePlacesEnv());
}

export function hasGooglePlacesEnv() {
  return googlePlacesEnvSchema.safeParse(readGooglePlacesEnv()).success;
}

export function getGooglePlacesAuthMode() {
  const parsed = googlePlacesEnvSchema.safeParse(readGooglePlacesEnv());
  return parsed.success ? parsed.data.authMode : "invalid";
}

function readGooglePlacesEnv() {
  const authMode = process.env.GOOGLE_PLACES_AUTH_MODE || "api_key";
  if (authMode === "adc") {
    return {
      authMode,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      serviceAccountEmail:
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
      serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
    };
  }

  return {
    authMode,
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  };
}

export function getOptionalUpstashEnv() {
  const candidate = {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  if (!candidate.url && !candidate.token) return null;
  return upstashEnvSchema.parse(candidate);
}

export function getSiteUrl() {
  return z
    .url()
    .parse(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}
