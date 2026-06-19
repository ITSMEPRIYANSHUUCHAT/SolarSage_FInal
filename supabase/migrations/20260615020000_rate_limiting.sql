-- Rate limiting backend (Phase 15). Fixed-window counters in Postgres so limits
-- hold across stateless edge-function instances. Called via RPC from the
-- functions using the service-role key (function is SECURITY DEFINER).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket       text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- RLS on, with NO policies → direct client access is denied; only the
-- SECURITY DEFINER function (service role) can touch it.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

-- Atomically increment the counter for the current fixed window and report
-- whether the caller is still within the limit. Returns TRUE = allowed.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window timestamptz := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Housekeeping: drop expired windows (older than 1 day). Schedule with pg_cron
-- if available, else call periodically. Safe to run anytime.
CREATE OR REPLACE FUNCTION public.prune_rate_limits() RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
$$;

-- If pg_cron is enabled, uncomment to prune hourly:
-- SELECT cron.schedule('prune-rate-limits', '0 * * * *', 'SELECT public.prune_rate_limits();');
