-- claim_entitlement_usage originally declared `returns public.entitlement_usage`
-- (a single composite row) and returned a NULL variable when the
-- entitlement was exhausted. PostgREST expands a NULL composite via
-- `(row).*` in its single-row response path, which yields one row of
-- all-NULL fields instead of an actual JSON null -- so callers could not
-- tell "exhausted" apart from "claimed" by checking the response for
-- null/truthiness (confirmed live: both cases returned a non-null object).
--
-- Switching to `returns setof` fixes this: "no claim" becomes a genuine
-- empty array, and callers check `data.length === 0` / `data[0]` instead.
drop function if exists public.claim_entitlement_usage(
  uuid, public.service_type, timestamptz, timestamptz, integer
);

create or replace function public.claim_entitlement_usage(
  p_subscription_id uuid,
  p_service_type public.service_type,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_included_count integer
)
returns setof public.entitlement_usage
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlement_usage
    (subscription_id, service_type, billing_period_start, billing_period_end, included_count, used_count)
  values
    (p_subscription_id, p_service_type, p_period_start, p_period_end, p_included_count, 0)
  on conflict (subscription_id, service_type, billing_period_start) do nothing;

  return query
    update public.entitlement_usage
    set used_count = used_count + 1
    where subscription_id = p_subscription_id
      and service_type = p_service_type
      and billing_period_start = p_period_start
      and used_count < included_count
    returning *;
end;
$$;

revoke all on function public.claim_entitlement_usage(
  uuid, public.service_type, timestamptz, timestamptz, integer
) from public;
grant execute on function public.claim_entitlement_usage(
  uuid, public.service_type, timestamptz, timestamptz, integer
) to service_role;
