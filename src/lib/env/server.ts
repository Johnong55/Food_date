import "server-only";

import { z } from "zod";

const supabasePublicEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

const supabaseAdminEnvSchema = supabasePublicEnvSchema.extend({
  serviceRoleKey: z.string().min(20),
});

const googlePlacesEnvSchema = z.object({
  apiKey: z
    .string()
    .min(20)
    .refine((value) => !value.startsWith("your-"), "Placeholder API key is not configured."),
});

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

export function getGooglePlacesEnv() {
  return googlePlacesEnvSchema.parse({
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  });
}

export function hasGooglePlacesEnv() {
  return googlePlacesEnvSchema.safeParse({
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  }).success;
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
