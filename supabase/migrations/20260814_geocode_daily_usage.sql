-- Daily cap for authenticated Google geocode / Places proxy calls.
-- Service-role RPC only; RLS on with no policies so the Data API cannot read or write.

CREATE TABLE IF NOT EXISTS geocode_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Sofia')::date),
  call_count integer NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE geocode_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_geocode_call(
  p_user_id uuid,
  p_daily_limit integer DEFAULT 80
)
RETURNS TABLE(allowed boolean, remaining integer, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_new_count integer;
  v_today date := (now() AT TIME ZONE 'Europe/Sofia')::date;
BEGIN
  IF p_daily_limit < 1 THEN
    RAISE EXCEPTION 'p_daily_limit must be at least 1';
  END IF;

  INSERT INTO geocode_daily_usage (user_id, usage_date, call_count)
  VALUES (p_user_id, v_today, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT call_count INTO v_count
  FROM geocode_daily_usage
  WHERE user_id = p_user_id
    AND usage_date = v_today
  FOR UPDATE;

  IF v_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, 0, v_count;
    RETURN;
  END IF;

  UPDATE geocode_daily_usage
  SET call_count = call_count + 1
  WHERE user_id = p_user_id
    AND usage_date = v_today
  RETURNING call_count INTO v_new_count;

  RETURN QUERY SELECT true, GREATEST(p_daily_limit - v_new_count, 0), v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION consume_geocode_call(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_geocode_call(uuid, integer) TO service_role;

-- Session-level advisory lock so overlapping admin backfills cannot double-call Google.
CREATE OR REPLACE FUNCTION try_lock_geocode_upcoming()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_lock(20260814, 21);
END;
$$;

CREATE OR REPLACE FUNCTION unlock_geocode_upcoming()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_advisory_unlock(20260814, 21);
END;
$$;

REVOKE ALL ON FUNCTION try_lock_geocode_upcoming() FROM PUBLIC;
REVOKE ALL ON FUNCTION unlock_geocode_upcoming() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION try_lock_geocode_upcoming() TO service_role;
GRANT EXECUTE ON FUNCTION unlock_geocode_upcoming() TO service_role;
