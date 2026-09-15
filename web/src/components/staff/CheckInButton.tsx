"use client";

import { useState, useTransition } from "react";
import { recordCheckinAction } from "@/lib/actions/staff-checkins";

export default function CheckInButton({
  bookingId,
  staffId,
  type,
  label,
}: {
  bookingId: string;
  staffId: string;
  type: "check_in" | "check_out";
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        startTransition(async () => {
          const result = await recordCheckinAction(
            bookingId,
            staffId,
            type,
            position.coords.latitude,
            position.coords.longitude
          );
          if (result.error) setError(result.error);
        });
      },
      () => setError("Location permission was denied.")
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        className="btn ghost"
        onClick={handleClick}
        disabled={pending}
        style={{ padding: "6px 16px", fontSize: 13 }}
      >
        {pending ? "Saving…" : label}
      </button>
      {error && (
        <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
          {error}
        </span>
      )}
    </span>
  );
}
