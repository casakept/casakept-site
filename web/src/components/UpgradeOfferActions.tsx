"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { declineUpgradeAction, startUpgradePaymentAction } from "@/lib/actions/upgrade-offers";
import { StripePaymentForm } from "@/components/stripe/PaymentForm";
import { formatDollars } from "@/lib/homePricing";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// The customer's approve/decline controls, with the countdown to when the
// offer closes. When it hits zero the page refreshes into the closed state.
export default function UpgradeOfferActions({
  token,
  amountCents,
  expiresAt,
}: {
  token: string;
  amountCents: number;
  expiresAt: string;
}) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, router]);

  async function handleApprove() {
    setWorking(true);
    setError(null);
    const result = await startUpgradePaymentAction(token);
    setWorking(false);
    if ("error" in result) {
      setError(result.error);
      router.refresh();
      return;
    }
    setClientSecret(result.clientSecret);
  }

  async function handleDecline() {
    setWorking(true);
    setError(null);
    const result = await declineUpgradeAction(token);
    setWorking(false);
    if ("error" in result) setError(result.error);
    router.refresh();
  }

  if (paid) {
    return (
      <p className="form-msg success">
        Payment received — your crew is starting the deep clean. You can close this page.
      </p>
    );
  }

  return (
    <div>
      {remaining != null && remaining > 0 && (
        <p style={{ fontSize: 13, color: "#6a746c", marginBottom: 14 }}>
          This offer closes in <b>{formatRemaining(remaining)}</b>.
        </p>
      )}
      {error && <p className="form-msg error">{error}</p>}

      {clientSecret ? (
        <StripePaymentForm
          clientSecret={clientSecret}
          onSuccess={() => setPaid(true)}
          submitLabel={`Pay ${formatDollars(amountCents)} and upgrade`}
        />
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={handleApprove} disabled={working}>
            {working ? "One moment…" : `Upgrade for ${formatDollars(amountCents)}`}
          </button>
          <button className="btn ghost" type="button" onClick={handleDecline} disabled={working}>
            Keep my standard clean
          </button>
        </div>
      )}
    </div>
  );
}
