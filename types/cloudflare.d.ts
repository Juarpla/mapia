/* Minimal worker bindings used by the Vinext adapter. Runtime implementations are injected by Cloudflare. */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

// Drizzle consumes the runtime D1 object; keeping this declaration permissive avoids coupling the app to Wrangler internals.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Blob,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    EVIDENCE?: R2Bucket;
    [binding: string]: unknown;
  };
}
