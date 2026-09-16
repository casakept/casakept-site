"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminStaffActionState = {
  error?: string;
  success?: boolean;
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Creating an auth user (the invite step) can only be done with the
// service-role key -- there's no RLS policy that could ever allow it, it's
// a Supabase Auth admin API call. Everything after that (setting role and
// inserting the staff row) deliberately goes through the *calling admin's*
// own RLS-scoped session instead of the service client: profiles.role
// updates are guarded by a trigger (prevent_role_self_escalation) that
// checks is_admin() via auth.uid(), which is null for the service-role key
// -- only a genuine admin session can flip role to 'staff'. Because of
// that, we do need an explicit admin check up front here, unlike most other
// actions in this app that just lean on RLS to no-op for the wrong caller.
export async function inviteStaffAction(
  _prevState: AdminStaffActionState,
  formData: FormData
): Promise<AdminStaffActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") return { error: "Not authorized." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const referredByStaffId = String(formData.get("referred_by_staff_id") ?? "") || null;
  if (!fullName || !email) return { error: "Name and email are required." };

  const serviceClient = createServiceClient();
  const { data: invited, error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent("/auth/set-password")}`,
  });
  if (inviteErr) return { error: inviteErr.message };

  const newUserId = invited.user.id;

  // handle_new_user runs on the auth.users insert trigger asynchronously
  // relative to this request -- poll briefly for the profile row to exist
  // before trying to update it.
  let profileExists = false;
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from("profiles").select("id").eq("id", newUserId).maybeSingle();
    if (data) {
      profileExists = true;
      break;
    }
    await sleep(300);
  }
  if (!profileExists) {
    return { error: "Invite sent, but the profile record hasn't synced yet. Refresh in a moment." };
  }

  const { error: roleErr } = await supabase
    .from("profiles")
    .update({ role: "staff" })
    .eq("id", newUserId);
  if (roleErr) return { error: roleErr.message };

  const { error: staffErr } = await supabase
    .from("staff")
    .insert({ id: newUserId, active: true, referred_by_staff_id: referredByStaffId });
  if (staffErr) return { error: staffErr.message };

  revalidatePath("/admin/staff");
  return { success: true };
}

export async function setStaffActiveAction(staffId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ active }).eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}
