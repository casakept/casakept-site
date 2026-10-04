-- An admin's judgment of a crew member's "this home needs a deep clean"
-- call, made from the arrival photos and reasons on the request. It is
-- about whether the call was sound, not about whether the customer paid, so
-- an approved, declined, or withdrawn request can each be judged either way.
--   accurate     - the photos support a deep clean
--   not_accurate - a standard clean was enough
--   unclear      - the photos don't show enough to tell (coaching signal for
--                  better photos; left out of the accuracy percentage)
alter table public.upgrade_requests
  add column review_verdict text
    check (review_verdict in ('accurate', 'not_accurate', 'unclear')),
  add column review_notes text,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index upgrade_requests_staff_reviewed_idx
  on public.upgrade_requests (staff_id, review_verdict);
