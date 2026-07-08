-- Add per-feature counters to smart_fill_daily_usage.
-- import_count remains the total (all features combined) used for the daily limit check.

ALTER TABLE smart_fill_daily_usage
  ADD COLUMN IF NOT EXISTS facebook_count integer NOT NULL DEFAULT 0 CHECK (facebook_count >= 0),
  ADD COLUMN IF NOT EXISTS text_count     integer NOT NULL DEFAULT 0 CHECK (text_count >= 0),
  ADD COLUMN IF NOT EXISTS image_count    integer NOT NULL DEFAULT 0 CHECK (image_count >= 0);

-- Replace the function to accept an optional feature label and increment its counter.
CREATE OR REPLACE FUNCTION consume_smart_fill_import(
  p_user_id    uuid,
  p_daily_limit integer DEFAULT 7,
  p_feature    text    DEFAULT NULL  -- 'facebook' | 'text' | 'image' | NULL (legacy)
)
RETURNS TABLE(allowed boolean, remaining integer, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count     integer;
  v_new_count integer;
  v_today     date := (now() AT TIME ZONE 'UTC')::date;
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
  SET
    import_count   = import_count + 1,
    facebook_count = facebook_count + CASE WHEN p_feature = 'facebook' THEN 1 ELSE 0 END,
    text_count     = text_count     + CASE WHEN p_feature = 'text'     THEN 1 ELSE 0 END,
    image_count    = image_count    + CASE WHEN p_feature = 'image'    THEN 1 ELSE 0 END
  WHERE user_id = p_user_id
    AND usage_date = v_today
  RETURNING import_count INTO v_new_count;

  RETURN QUERY SELECT true, GREATEST(p_daily_limit - v_new_count, 0), v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION consume_smart_fill_import(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_smart_fill_import(uuid, integer, text) TO service_role;
