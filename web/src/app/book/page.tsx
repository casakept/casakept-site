import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Booking now happens self-serve in the logged-in /account area instead of
// via a "request a free walkthrough" lead form; this route just routes
// visitors to the right next step based on auth state.
export default async function BookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/account/book" : "/login?next=/account/book");
}
