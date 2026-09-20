-- Founding members: first 100 customers whose *initial* membership signup
-- payment succeeds. The flag lives on profiles (identity-level, not
-- subscription-level) specifically so it survives everything the product
-- decision says it should survive: later renewal payment failures,
-- cancelling, and resubscribing later. Once true, this migration never
-- flips it back to false anywhere -- that's what makes it "for life."
alter table public.profiles add column founding_member boolean not null default false;

-- Called from the Stripe webhook's syncSubscription() the moment a
-- customer's subscription is inserted for the very first time (see that
-- function's `if (existing) {...return}` guard -- the insert branch below
-- it only runs when this is a brand-new subscriptions row, which is the
-- one trustworthy "initial signup payment succeeded" signal in this app;
-- an initial payment failure never gets a subscriptions row at all, so it
-- never reaches here, and a later renewal failure re-uses the existing row
-- and never reaches here either).
--
-- Idempotent by design: if the customer is already a founding member (the
-- cancel-then-resubscribe case -- a resubscribe creates a new Stripe
-- subscription, and thus a new local subscriptions row, but profiles.
-- founding_member is untouched from before), this returns true immediately
-- without consuming another one of the 100 slots.
--
-- Address check: best-effort dedup against a customer creating a second
-- account (different email) at the same physical address specifically to
-- claim a second founding slot. Only blocks the *founding* tag, never the
-- membership itself -- and only catches it if the new customer has already
-- added a property by the time their first payment clears; a property
-- added afterward isn't retroactively checked, consistent with never
-- revoking founding status once granted.
create or replace function public.grant_founding_member(p_customer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
  v_granted_count integer;
  v_address_taken boolean;
begin
  -- Serializes concurrent grants so two signups confirming payment in the
  -- same instant can't both read "99 granted" and both get let through.
  perform pg_advisory_xact_lock(872341001);

  select founding_member into v_already from public.profiles where id = p_customer_id;
  if v_already then
    return true;
  end if;

  select count(*) into v_granted_count from public.profiles where founding_member;
  if v_granted_count >= 100 then
    return false;
  end if;

  select exists (
    select 1
    from public.properties p_new
    join public.properties p_existing
      on lower(trim(p_existing.address_line1)) = lower(trim(p_new.address_line1))
     and lower(trim(coalesce(p_existing.address_line2, ''))) = lower(trim(coalesce(p_new.address_line2, '')))
     and lower(trim(p_existing.zip)) = lower(trim(p_new.zip))
    join public.profiles pr on pr.id = p_existing.customer_id and pr.founding_member
    where p_new.customer_id = p_customer_id
  ) into v_address_taken;

  if v_address_taken then
    return false;
  end if;

  update public.profiles set founding_member = true where id = p_customer_id;
  return true;
end;
$$;

revoke all on function public.grant_founding_member(uuid) from public;
grant execute on function public.grant_founding_member(uuid) to service_role;
