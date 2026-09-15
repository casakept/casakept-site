"use client";

import { deleteTimeOffAction } from "@/lib/actions/staff-availability";

export default function DeleteTimeOffButton({ timeOffId }: { timeOffId: string }) {
  const action = deleteTimeOffAction.bind(null, timeOffId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Remove this time off?")) e.preventDefault();
      }}
    >
      <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
        Remove
      </button>
    </form>
  );
}
