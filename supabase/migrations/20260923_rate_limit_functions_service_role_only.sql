-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default, and `revoke ... from public` does not remove those grants. These
-- functions take an arbitrary p_user_id and are only called with the service
-- role, so exposing them over PostgREST would let anyone burn or reset another
-- user's daily quota.
revoke execute on function public.consume_smart_fill_import(uuid, integer) from anon, authenticated;
revoke execute on function public.consume_smart_fill_import(uuid, integer, text) from anon, authenticated;
revoke execute on function public.refund_smart_fill_import(uuid, date, text) from anon, authenticated;
revoke execute on function public.consume_geocode_call(uuid, integer) from anon, authenticated;
