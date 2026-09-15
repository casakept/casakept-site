-- Atomically claims one unit of a subscription's per-period entitlement
-- (e.g. "1 of 2 grocery runs included this billing period"), creating the
-- entitlement_usage row on first use if it doesn't exist yet.
--
-- Doing the "create row if missing" + "used_count < included_count check" +
-- "increment" as a single SQL statement (not a select-then-update round
-- trip from application code) is what makes this safe against two
-- concurrent bookings both reading used_count before either write lands
-- and over-claiming the entitlement.
--
-- Returns the updated row if the claim succeeded, or null if the
-- entitlement is already exhausted for this period.
create or replace function public.claim_entitlement_usage(
  p_subscription_id uuid,
  p_service_type public.service_type,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_included_count integer
)
returns public.entitlement_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entitlement_usage;
begin
  insert into public.entitlement_usage
    (subscription_id, service_type, billing_period_start, billing_period_end, included_count, used_count)
  values
    (p_subscription_id, p_service_type, p_period_start, p_period_end, p_included_count, 0)
  on conflict (subscription_id, service_type, billing_period_start) do nothing;

  update public.entitlement_usage
  set used_count = used_count + 1
  where subscription_id = p_subscription_id
    and service_type = p_service_type
    and billing_period_start = p_period_start
    and used_count < included_count
  returning * into v_row;

  return v_row;
end;
$$;

-- Only trusted backend code (the service-role client) should be able to
-- claim entitlement usage, same pattern as the entitlement_usage table
-- itself having no customer-facing RLS insert/update policy.
revoke all on function public.claim_entitlement_usage(
  uuid, public.service_type, timestamptz, timestamptz, integer
) from public;
grant execute on function public.claim_entitlement_usage(
  uuid, public.service_type, timestamptz, timestamptz, integer
) to service_role;
