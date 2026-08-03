/**
 * Compatibility shim for the standard Next.js runtime on Vercel.
 *
 * Cloudflare injects D1/R2 through the virtual `cloudflare:workers` module.
 * Vercel has no equivalent binding, so storage-dependent operations degrade
 * safely until the production Supabase adapter is configured.
 */
export const env: {
  DB?: D1Database;
  EVIDENCE?: R2Bucket;
} = {};
