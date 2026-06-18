-- Track daily smart-fill imports per user (photo, text, Facebook tabs).

CREATE TABLE IF NOT EXISTS smart_fill_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  import_count integer NOT NULL DEFAULT 0 CHECK (import_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE smart_fill_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_smart_fill_import(
  p_user_id uuid,
  p_daily_limit integer DEFAULT 7
)
RETURNS TABLE(allowed boolean, remaining integer, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_new_count integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF p_daily_limit < 1 THEN
    RAISE EXCEPTION 'p_daily_limit must be at least 1';
  END IF;

  INSERT INTO smart_fill_daily_usage (user_id, usage_date, import_count)
  VALUES (p_user_id, v_today, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT import_count INTO v_count
  FROM smart_fill_daily_usage
  WHERE user_id = p_user_id
    AND usage_date = v_today
  FOR UPDATE;

  IF v_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, 0, v_count;
    RETURN;
  END IF;

  UPDATE smart_fill_daily_usage
  SET import_count = import_count + 1
  WHERE user_id = p_user_id
    AND usage_date = v_today
  RETURNING import_count INTO v_new_count;

  RETURN QUERY SELECT true, GREATEST(p_daily_limit - v_new_count, 0), v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION consume_smart_fill_import(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_smart_fill_import(uuid, integer) TO service_role;
