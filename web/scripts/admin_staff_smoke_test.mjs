// Exercises the admin staff management feature's real security boundary:
// RLS + the prevent_role_self_escalation trigger, not app code. The
// inviteStaffAction itself calls the Supabase Auth admin API (which always
// sends a real invite email), so this test doesn't call it directly --
// instead it runs the exact follow-up queries the action performs after
// invite (promote role to 'staff', insert the staff row) as real user
// sessions, which is where the actual authorization logic lives.
//
// See admin_dashboard_smoke_test.mjs for the profiles.role bootstrapping
// note (DELETE + INSERT instead of UPDATE, due to prevent_role_self_escalation).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

let pass = 0;
let fail = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (ok) pass++;
  else fail++;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const stamp = Date.now();
const password = "Sm0keTest!23456";

async function createUser(label, role, fullName) {
  // Supabase lowercases email on signup -- lowercase here too so later
  // equality checks against the returned `email` match what's stored.
  const email = `staffadminsmoke+${label}+${stamp}@casakept.test`.toLowerCase();
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  const userId = data.user.id;
  await sleep(400); // let on_auth_user_created provision the default profile row

  if (role !== "customer") {
    await serviceClient.from("profiles").delete().eq("id", userId);
    const { error: insertErr } = await serviceClient
      .from("profiles")
      .insert({ id: userId, email, role, full_name: fullName });
    if (insertErr) throw insertErr;
  }

  const scoped = createClient(url, anonKey);
  const { error: signInErr } = await scoped.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { userId, email, client: scoped };
}

const userIds = [];
let staffCandidateId;

try {
  console.log("== provisioning test users ==");
  const admin = await createUser("admin", "admin", "Admin Smoke");
  const customerA = await createUser("customerA", "customer", "Customer A Smoke");
  const staffCandidate = await createUser("staffCandidate", "customer", "Staff Candidate Smoke");
  userIds.push(admin.userId, customerA.userId, staffCandidate.userId);
  staffCandidateId = staffCandidate.userId;
  console.log("admin:", admin.userId, "customerA:", customerA.userId, "staffCandidate:", staffCandidateId);

  console.log("\n== handle_new_user populates profiles.email ==");
  const { data: candidateProfile } = await serviceClient
    .from("profiles")
    .select("email")
    .eq("id", staffCandidateId)
    .single();
  check("new user's profile.email matches signup email", candidateProfile?.email === staffCandidate.email);

  console.log("\n== unrelated customer attempts self-escalation to staff ==");
  const { error: selfEscalateErr } = await customerA.client
    .from("profiles")
    .update({ role: "staff" })
    .eq("id", customerA.userId);
  check("self-escalation is blocked by the trigger", Boolean(selfEscalateErr));

  const { data: customerAAfter } = await serviceClient.from("profiles").select("role").eq("id", customerA.userId).single();
  check("customer A's role is unchanged", customerAAfter?.role === "customer");

  console.log("\n== inviteStaffAction equivalent: admin promotes the invited user to staff ==");
  const { error: promoteErr } = await admin.client
    .from("profiles")
    .update({ role: "staff" })
    .eq("id", staffCandidateId);
  check("admin can promote a profile to staff", !promoteErr);

  const { data: candidateAfterPromote } = await serviceClient.from("profiles").select("role").eq("id", staffCandidateId).single();
  check("staff candidate's role is now staff", candidateAfterPromote?.role === "staff");

  console.log("\n== unrelated customer attempts to self-provision a staff row ==");
  const { data: selfStaffInsert, error: selfStaffInsertErr } = await customerA.client
    .from("staff")
    .insert({ id: customerA.userId, active: true })
    .select("id")
    .maybeSingle();
  check("customer cannot insert their own staff row", Boolean(selfStaffInsertErr) || !selfStaffInsert);

  console.log("\n== admin inserts the staff row for the promoted candidate ==");
  const { error: staffInsertErr } = await admin.client.from("staff").insert({ id: staffCandidateId, active: true });
  check("admin can insert the staff row", !staffInsertErr);

  console.log("\n== staff directory query (as admin session) ==");
  const { data: directory, error: directoryErr } = await admin.client
    .from("staff")
    .select("id, active, hire_date, profile:profiles!staff_id_fkey(full_name, email, phone)")
    .order("active", { ascending: false });
  check("staff directory query succeeds", !directoryErr);
  const candidateRow = (directory ?? []).find((s) => s.id === staffCandidateId);
  check("new staff member appears in the directory", Boolean(candidateRow));
  check("directory row's joined email resolves", candidateRow?.profile?.email === staffCandidate.email);

  console.log("\n== unrelated customer attempts to deactivate the new staff member ==");
  const { data: rejectedDeactivate, error: rejectedDeactivateErr } = await customerA.client
    .from("staff")
    .update({ active: false })
    .eq("id", staffCandidateId)
    .select("id")
    .maybeSingle();
  check("customer cannot deactivate staff", !rejectedDeactivateErr && !rejectedDeactivate);

  console.log("\n== admin deactivates then reactivates the staff member ==");
  const { error: deactivateErr } = await admin.client.from("staff").update({ active: false }).eq("id", staffCandidateId);
  check("admin can deactivate staff", !deactivateErr);

  const { data: afterDeactivate } = await serviceClient.from("staff").select("active").eq("id", staffCandidateId).single();
  check("staff member is now inactive", afterDeactivate?.active === false);

  const { error: reactivateErr } = await admin.client.from("staff").update({ active: true }).eq("id", staffCandidateId);
  check("admin can reactivate staff", !reactivateErr);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (staffCandidateId) await serviceClient.from("staff").delete().eq("id", staffCandidateId);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds);
}
