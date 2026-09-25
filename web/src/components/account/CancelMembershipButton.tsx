"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from "@/lib/actions/membership";

export default function CancelMembershipButton({
  cancelAt,
  effectiveCancelPreview,
}: {
  // Non-null once a cancellation is actually scheduled with Stripe (see
  // cancelSubscriptionAction) -- the real date access ends.
  cancelAt: string | null;
  // What effectiveCancelPreview would become if they cancel right now --
  // computed server-side the same way cancelSubscriptionAction does, so
  // this button can preview it before they confirm (for a monthly
  // membership still inside its minimum term, that's the end of the term,
  // not the next renewal).
  effectiveCancelPreview: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    const result = await cancelSubscriptionAction();
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  async function handleResume() {
    setSubmitting(true);
    setError(null);
    const result = await resumeSubscriptionAction();
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (cancelAt) {
    return (
      <div style={{ marginTop: 14 }}>
        <p style={{ color: "#a15c00" }}>
          Your membership is set to end on{" "}
          {new Date(cancelAt).toLocaleDateString()}.
        </p>
        {error && (
          <p className="form-msg error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        <button
          className="btn ghost"
          type="button"
          onClick={handleResume}
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? "Working…" : "Keep my membership"}
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div style={{ marginTop: 14 }}>
        <p>
          Cancel your membership? You&apos;ll keep access through{" "}
          {new Date(effectiveCancelPreview).toLocaleDateString()}, then it will end.
        </p>
        {error && (
          <p className="form-msg error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            className="btn ghost"
            type="button"
            onClick={handleCancel}
            disabled={submitting}
          >
            {submitting ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setConfirming(false)}
            disabled={submitting}
          >
            Never mind
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {error && (
        <p className="form-msg error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
      <button
        className="btn ghost"
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        Cancel membership
      </button>
    </div>
  );
}
