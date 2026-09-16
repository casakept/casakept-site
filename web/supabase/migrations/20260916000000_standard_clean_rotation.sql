-- Rotation-style detail schedule for Standard Clean, "Option A" (trimmed).
-- Competitive research (a rival's "Detail-Clean Rotation System") flagged
-- a real gap: outside Casa Completa's quarterly included deep clean,
-- Standard Clean visits never touch baseboards/oven/fridge/windows at
-- all -- those stay Deep-Clean-exclusive indefinitely. This rotates a
-- small subset of existing deep-only items into Standard Clean visits,
-- alternating by zone every other visit for a given property, so every
-- tier's recurring service gets some real detail work over time at no
-- extra cost.
--
-- Deliberately trimmed to 2 items/zone (existing items only, no new ones)
-- rather than the full 4/zone version -- the marketing-stated Standard
-- (~2-2.5hr) vs Deep (~4-6hr) duration gap implies the full version could
-- add ~75-85 min to a visit with no data yet to confirm that estimate
-- (pre-launch, no real bookings/check-ins exist). This trimmed version
-- estimates ~25-35 min added. "Light fixtures & ceiling fans (detail)"
-- (ladder work, the highest time-cost of the five existing deep-only
-- items) is deliberately left out of rotation for now. Once real
-- visit_checkins GPS elapsed-time data exists, this can widen to the
-- full 4/zone version (and new items) via a follow-up migration -- same
-- mechanism, just more rows tagged.

alter table public.checklist_items add column rotation_zone text
  check (rotation_zone in ('kitchen_bath', 'bed_living'));

comment on column public.checklist_items.rotation_zone is
  'For deep_clean_only items also eligible to rotate into Standard Clean visits: which of the two alternating zones this item belongs to. Null for items that are either always shown (deep_clean_only = false) or Deep-Clean-exclusive only (no rotation).';

update public.checklist_items set rotation_zone = 'kitchen_bath' where name in ('Inside oven', 'Inside refrigerator');
update public.checklist_items set rotation_zone = 'bed_living' where name in ('Baseboards', 'Interior windows');
