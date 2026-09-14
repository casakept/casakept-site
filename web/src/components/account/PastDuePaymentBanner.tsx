"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryPastDuePaymentAction } from "@/lib/actions/membership";
import { StripePaymentForm } from "@/components/stripe/PaymentForm";

export default function PastDuePaymentBanner() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpdatePayment() {
    setStarting(true);
    setError(null);
    const result = await retryPastDuePaymentAction();
    setStarting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setClientSecret(result.clientSecret);
  }

  function handleSuccess() {
    setDone(true);
    setTimeout(() => router.refresh(), 2000);
  }

  return (
    <div
      className="card"
      style={{ marginTop: 14, maxWidth: 480, borderColor: "#c0392b" }}
    >
      <strong style={{ color: "#c0392b" }}>Payment failed</strong>
      <p style={{ marginTop: 8 }}>
        We couldn&apos;t process your last membership payment. Update your
        payment method to keep your membership active.
      </p>

      {done ? (
        <p className="form-msg" style={{ marginTop: 12, color: "var(--verde)" }}>
          Payment received — updating your membership…
        </p>
      ) : clientSecret ? (
        <StripePaymentForm
          clientSecret={clientSecret}
          onSuccess={handleSuccess}
          submitLabel="Pay and update card"
        />
      ) : (
        <>
          {error && (
            <p className="form-msg error" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
          <button
            className="btn"
            type="button"
            onClick={handleUpdatePayment}
            disabled={starting}
            style={{ marginTop: 8 }}
          >
            {starting ? "Loading…" : "Update payment method"}
          </button>
        </>
      )}
    </div>
  );
}
