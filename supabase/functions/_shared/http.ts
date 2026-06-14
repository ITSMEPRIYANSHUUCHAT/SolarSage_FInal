// Shared HTTP helpers for SolarSage edge functions.
// - CORS origin allow-list (set ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com").
//   If unset, falls back to "*" so local dev keeps working (tighten in production — SEC-04).
// - HttpError for correct status codes (400/401/413/...) instead of blanket 500s.

export function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers.get('origin') ?? '';
  let allowOrigin = '*';
  if (allowed.length > 0) {
    allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Read a required secret or throw a clear 500 (fail-fast instead of `?? ''`). SEC-07. */
export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, `Server misconfigured: ${name} is not set`);
  return v;
}

export function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/** Map a thrown error to (status, message). */
export function errorStatus(error: unknown): { status: number; message: string } {
  if (error instanceof HttpError) return { status: error.status, message: error.message };
  return { status: 500, message: error instanceof Error ? error.message : 'Unknown error' };
}
