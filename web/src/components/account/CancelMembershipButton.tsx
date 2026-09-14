"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from "@/lib/actions/membership";

export default function CancelMembershipButton({
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
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

  if (cancelAtPeriodEnd) {
    return (
      <div style={{ marginTop: 14 }}>
        <p style={{ color: "#a15c00" }}>
          Your membership is set to end on{" "}
          {new Date(currentPeriodEnd).toLocaleDateString()}.
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
          {new Date(currentPeriodEnd).toLocaleDateString()}, then it will end.
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
