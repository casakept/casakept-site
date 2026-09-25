"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionAction, type BillingCadence } from "@/lib/actions/membership";
import { StripePaymentForm } from "@/components/stripe/PaymentForm";

export default function SubscribeButton({
  planId,
  cadence = "monthly",
}: {
  planId: string;
  cadence?: BillingCadence;
}) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleJoin() {
    setStarting(true);
    setError(null);
    const result = await startSubscriptionAction(planId, cadence);
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

  if (done) {
    return (
      <p className="form-msg" style={{ marginTop: 12, color: "var(--verde)" }}>
        Payment received — activating your membership…
      </p>
    );
  }

  if (clientSecret) {
    return (
      <StripePaymentForm
        clientSecret={clientSecret}
        onSuccess={handleSuccess}
        submitLabel="Confirm membership"
      />
    );
  }

  return (
    <>
      {error && (
        <p className="form-msg error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <button className="btn" type="button" onClick={handleJoin} disabled={starting}>
        {starting ? "Starting…" : "Join this plan"}
      </button>
    </>
  );
}
