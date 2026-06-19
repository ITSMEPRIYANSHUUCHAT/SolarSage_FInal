// Layered rate limiting for edge functions, backed by the Postgres
// check_rate_limit() RPC (see migration 20260615020000_rate_limiting.sql).
import { HttpError } from "./http.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface RateRule {
  /** stable name used in the bucket key, e.g. "process-pdf" */
  name: string;
  /** max requests allowed within the window */
  max: number;
  /** window length in seconds */
  windowSeconds: number;
  /** scope: per authenticated user or per client IP */
  scope: "user" | "ip";
}

/** Extract the client IP from proxy headers (Supabase sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || "unknown";
}

/**
 * Enforce one rate rule. Throws HttpError(429) when exceeded.
 * Fails OPEN on infra errors (logs and allows) so a DB hiccup can't lock
 * everyone out — except you can flip `failClosed` for cost-sensitive endpoints.
 */
export async function enforce(
  supabase: SupabaseClient,
  rule: RateRule,
  identity: string,
  opts: { failClosed?: boolean } = {},
): Promise<void> {
  const key = `${rule.name}:${rule.scope}:${identity}`;
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error(JSON.stringify({ level: "error", msg: "rate_limit_rpc_failed", rule: rule.name, error: error.message }));
      if (opts.failClosed) throw new HttpError(429, "Rate limiting unavailable, try again shortly");
      return; // fail-open
    }
    if (data === false) {
      throw new HttpError(429, `Rate limit exceeded for ${rule.name}. Please slow down and try again later.`);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.error(JSON.stringify({ level: "error", msg: "rate_limit_exception", rule: rule.name, error: String(e) }));
    if (opts.failClosed) throw new HttpError(429, "Rate limiting unavailable, try again shortly");
  }
}

// Route-specific limits (per the security spec, adapted to this app's endpoints).
export const RULES = {
  // Global per-IP guard applied first on every request.
  global: { name: "global", max: 100, windowSeconds: 60, scope: "ip" } as RateRule,
  // AI/cost-sensitive endpoint: 20/min per user.
  processPdf: { name: "process-pdf", max: 20, windowSeconds: 60, scope: "user" } as RateRule,
  // File upload: 10/hour per user.
  uploadPdf: { name: "upload-pdf", max: 10, windowSeconds: 3600, scope: "user" } as RateRule,
};
