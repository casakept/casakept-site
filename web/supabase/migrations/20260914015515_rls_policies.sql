-- Row Level Security policies for every table, matching the
-- customer / staff / admin role model.
--
-- Convention: customers only ever see their own data, staff see data tied
-- to bookings assigned to them, and admins see everything. Rows that are
-- normally written by backend/webhook code (payments, subscriptions,
-- entitlement usage) use the service_role key, which bypasses RLS
-- entirely, so no customer/staff write policies exist for them here.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_select_admin
  on public.profiles for select
  using (public.is_admin());

create policy profiles_select_staff_of_assigned_customers
  on public.profiles for select
  using (
    public.is_staff()
    and exists (
      select 1 from public.bookings b
      where b.customer_id = profiles.id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create policy properties_all_own
  on public.properties for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy properties_select_staff_assigned
  on public.properties for select
  using (
    public.is_staff()
    and exists (
      select 1 from public.bookings b
      where b.property_id = properties.id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy properties_all_admin
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- services / membership_plans / plan_entitlements (public catalog data)
-- ---------------------------------------------------------------------
create policy services_select_active
  on public.services for select
  using (active = true or public.is_admin());

create policy services_write_admin
  on public.services for insert
  with check (public.is_admin());

create policy services_update_admin
  on public.services for update
  using (public.is_admin());

create policy services_delete_admin
  on public.services for delete
  using (public.is_admin());

create policy membership_plans_select_active
  on public.membership_plans for select
  using (active = true or public.is_admin());

create policy membership_plans_write_admin
  on public.membership_plans for insert
  with check (public.is_admin());

create policy membership_plans_update_admin
  on public.membership_plans for update
  using (public.is_admin());

create policy membership_plans_delete_admin
  on public.membership_plans for delete
  using (public.is_admin());

create policy plan_entitlements_select_all
  on public.plan_entitlements for select
  using (true);

create policy plan_entitlements_write_admin
  on public.plan_entitlements for insert
  with check (public.is_admin());

create policy plan_entitlements_update_admin
  on public.plan_entitlements for update
  using (public.is_admin());

create policy plan_entitlements_delete_admin
  on public.plan_entitlements for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- subscriptions / entitlement_usage
-- (written by backend/Stripe-webhook code via service_role, not by users)
-- ---------------------------------------------------------------------
create policy subscriptions_select_own
  on public.subscriptions for select
  using (customer_id = auth.uid());

create policy subscriptions_all_admin
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy entitlement_usage_select_own
  on public.entitlement_usage for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = entitlement_usage.subscription_id
        and s.customer_id = auth.uid()
    )
  );

create policy entitlement_usage_all_admin
  on public.entitlement_usage for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- staff / staff_availability / staff_time_off
-- ---------------------------------------------------------------------
create policy staff_select_active_directory
  on public.staff for select
  using (active = true);

create policy staff_select_own
  on public.staff for select
  using (id = auth.uid());

create policy staff_all_admin
  on public.staff for all
  using (public.is_admin())
  with check (public.is_admin());

create policy staff_availability_all_own
  on public.staff_availability for all
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

create policy staff_availability_all_admin
  on public.staff_availability for all
  using (public.is_admin())
  with check (public.is_admin());

create policy staff_time_off_all_own
  on public.staff_time_off for all
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

create policy staff_time_off_all_admin
  on public.staff_time_off for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
create policy bookings_select_own
  on public.bookings for select
  using (customer_id = auth.uid());

create policy bookings_insert_own
  on public.bookings for insert
  with check (customer_id = auth.uid());

create policy bookings_update_own
  on public.bookings for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy bookings_select_assigned_staff
  on public.bookings for select
  using (assigned_staff_id = auth.uid());

create policy bookings_update_assigned_staff
  on public.bookings for update
  using (assigned_staff_id = auth.uid());

create policy bookings_all_admin
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- payments (written by backend/Stripe-webhook code via service_role)
-- ---------------------------------------------------------------------
create policy payments_select_own
  on public.payments for select
  using (customer_id = auth.uid());

create policy payments_all_admin
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- notifications_log (written by backend notification jobs via service_role)
-- ---------------------------------------------------------------------
create policy notifications_log_select_own
  on public.notifications_log for select
  using (customer_id = auth.uid());

create policy notifications_log_all_admin
  on public.notifications_log for all
  using (public.is_admin())
  with check (public.is_admin());
