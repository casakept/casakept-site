"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ACK_TERMS,
  CONDITION_CATEGORIES,
  QTY_SERVICE_TYPES,
  sizeAdjustmentCents,
  type EstimateServiceLine,
} from "@/lib/estimateForm";
import type { Database } from "@/lib/supabase/database.types";

export type EstimateActionState = {
  error?: string;
};

// No explicit role check -- estimates_all_admin RLS policy is the real
// gate, same pattern as the other admin write actions (admin-cocina.ts,
// admin-scores.ts). A non-admin session hitting this would be rejected by
// RLS on the insert.
export async function createEstimateAction(
  _prevState: EstimateActionState,
  formData: FormData
): Promise<EstimateActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const contactName = String(formData.get("contact_name") ?? "").trim();
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!contactName || !addressLine1 || !city) {
    return { error: "Name, address, and city are required." };
  }

  const approxSqFt = numberOrNull(formData.get("approx_sq_ft"));
  const conditionValues: Record<string, number | null> = {};
  for (const category of CONDITION_CATEGORIES) {
    const raw = numberOrNull(formData.get(category.key));
    if (raw !== null && (raw < 1 || raw > 5)) {
      return { error: `${category.label} rating must be between 1 and 5.` };
    }
    conditionValues[category.key] = raw;
  }

  // --- Membership pricing (server-computed, not trusted from the client) ---
  const selectedPlanId = String(formData.get("plan_id") ?? "") || null;
  let planPriceCents = 0;
  if (selectedPlanId) {
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("monthly_price_cents")
      .eq("id", selectedPlanId)
      .maybeSingle();
    if (!plan) return { error: "Selected membership plan wasn't found." };
    planPriceCents = plan.monthly_price_cents;
  }

  const sizeAdjCents = sizeAdjustmentCents(approxSqFt);

  const onboardingDeepClean = formData.get("onboarding_deep_clean") === "on";
  let onboardingDeepCleanCents = 0;
  if (onboardingDeepClean) {
    const { data: deepClean } = await supabase
      .from("services")
      .select("base_price_cents")
      .eq("service_type", "deep_clean")
      .limit(1)
      .maybeSingle();
    if (deepClean) {
      onboardingDeepCleanCents = selectedPlanId
        ? Math.round(deepClean.base_price_cents / 2)
        : deepClean.base_price_cents;
    }
  }

  const monthlyTotalCents = planPriceCents + sizeAdjCents + onboardingDeepCleanCents;

  // --- One-time worksheet lines (validated against the real catalog) ---
  const { data: catalog } = await supabase.from("services").select("id, service_type, name, base_price_cents");
  const oneTimeLines: EstimateServiceLine[] = [];
  for (const svc of catalog ?? []) {
    if (formData.get(`svc_${svc.id}`) !== "on") continue;
    const qty = QTY_SERVICE_TYPES.has(svc.service_type)
      ? Math.max(1, numberOrNull(formData.get(`qty_${svc.id}`)) ?? 1)
      : 1;
    const unitPriceCents = Math.max(0, numberOrNull(formData.get(`price_${svc.id}`)) ?? svc.base_price_cents);
    oneTimeLines.push({
      service_id: svc.id,
      service_type: svc.service_type,
      name: svc.name,
      qty,
      unit_price_cents: unitPriceCents,
      total_cents: unitPriceCents * qty,
    });
  }
  const oneTimeTotalCents = oneTimeLines.reduce((sum, line) => sum + line.total_cents, 0);

  const acks: Record<string, boolean> = {};
  for (const term of ACK_TERMS) {
    acks[term.key] = formData.get(term.key) === "on";
  }

  const signature = String(formData.get("customer_signature") ?? "").trim() || null;
  const signedAt = signature ? new Date().toISOString() : null;

  const preferredDays = formData.getAll("preferred_days").map(String);
  const preferredWindow =
    (String(formData.get("preferred_window") ?? "") as Database["public"]["Enums"]["schedule_window"] | "") || null;
  const targetStartDate = String(formData.get("target_start_date") ?? "") || null;

  const { data: inserted, error } = await supabase
    .from("estimates")
    .insert({
      estimator_id: user.id,
      contact_name: contactName,
      contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      address_line1: addressLine1,
      city,
      zip: String(formData.get("zip") ?? "").trim() || null,
      approx_sq_ft: approxSqFt,
      bedrooms: numberOrNull(formData.get("bedrooms")),
      bathrooms: numberOrNull(formData.get("bathrooms")),
      stories: numberOrNull(formData.get("stories")),
      has_pets: formData.get("has_pets") === "on",
      pets_notes: String(formData.get("pets_notes") ?? "").trim() || null,
      has_alarm: formData.get("has_alarm") === "on",
      gate_code_needed: formData.get("gate_code_needed") === "on",
      preferred_entry: String(formData.get("preferred_entry") ?? "").trim() || null,
      product_preference:
        (String(formData.get("product_preference") ?? "standard") as Database["public"]["Enums"]["product_preference"]) ??
        "standard",
      ...conditionValues,
      condition_notes: String(formData.get("condition_notes") ?? "").trim() || null,
      selected_plan_id: selectedPlanId,
      size_adjustment_cents: sizeAdjCents,
      onboarding_deep_clean: onboardingDeepClean,
      onboarding_deep_clean_cents: onboardingDeepCleanCents,
      monthly_total_cents: monthlyTotalCents,
      one_time_services: oneTimeLines,
      one_time_total_cents: oneTimeTotalCents,
      preferred_days: preferredDays,
      preferred_window: preferredWindow,
      target_start_date: targetStartDate,
      ...acks,
      customer_signature: signature,
      customer_signed_at: signedAt,
      estimator_signed_at: signedAt,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/estimates");
  redirect(`/admin/estimates/${inserted.id}`);
}

export async function setEstimateStatusAction(
  estimateId: string,
  status: Database["public"]["Enums"]["estimate_status"]
) {
  const supabase = await createClient();
  const { error } = await supabase.from("estimates").update({ status }).eq("id", estimateId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/estimates/${estimateId}`);
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) && String(value).trim() !== "" ? n : null;
}
