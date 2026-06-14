// Lightweight health/uptime endpoint for monitors (UptimeRobot/Checkly/etc.).
// Public by design — returns no sensitive data. See docs/operations/monitoring.md.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from "../_shared/http.ts";

serve((req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const body = {
    ok: true,
    service: "solarsage",
    time: new Date().toISOString(),
    // Report which required secrets are present (booleans only — never the values).
    config: {
      openai: Boolean(Deno.env.get("OPENAI_API_KEY")),
      supabaseUrl: Boolean(Deno.env.get("SUPABASE_URL")),
      serviceRole: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
