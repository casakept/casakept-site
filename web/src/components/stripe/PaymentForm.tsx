"use client";

import { useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function StripePaymentForm({
  clientSecret,
  onSuccess,
  submitLabel = "Pay now",
}: {
  clientSecret: string;
  onSuccess: () => void;
  submitLabel?: string;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm onSuccess={onSuccess} submitLabel={submitLabel} />
    </Elements>
  );
}

function InnerForm({
  onSuccess,
  submitLabel,
}: {
  onSuccess: () => void;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    setSubmitting(false);
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Try another card.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <PaymentElement />
      {error && (
        <p className="form-msg error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <button
        className="btn"
        type="submit"
        disabled={!stripe || submitting}
        style={{ marginTop: 16 }}
      >
        {submitting ? "Processing…" : submitLabel}
      </button>
    </form>
  );
}
