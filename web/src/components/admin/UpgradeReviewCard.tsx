"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { reviewUpgradeRequestAction } from "@/lib/actions/admin-upgrade-reviews";
import { REVIEW_VERDICTS, verdictLabel } from "@/lib/upgradeReview";
import { reasonLabel } from "@/lib/upgradeRequests";
import { formatDollars } from "@/lib/homePricing";

export type UpgradeReviewData = {
  id: string;
  status: string;
  reasons: string[];
  notes: string | null;
  amountCents: number;
  photoUrls: string[];
  crewName: string;
  customerName: string;
  address: string;
  scheduledDate: string;
  conditionSummary: string | null;
  customerAnswersPointedToDeep: boolean | null;
  verdict: string | null;
  reviewNotes: string | null;
};

const OUTCOME: Record<string, string> = {
  approved: "Customer approved and paid",
  declined: "Customer declined",
  expired: "Customer didn't respond in time",
  cancelled: "Crew withdrew it",
};

export default function UpgradeReviewCard({ call }: { call: UpgradeReviewData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(call.verdict == null);

  // Submitted by hand so the verdict and note stay put if the server
  // rejects them (React would otherwise clear the form).
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await reviewUpgradeRequestAction(call.id, formData);
      if (result.error) setError(result.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>{call.crewName}</strong>
          <p>
            {call.customerName} · {call.address}
          </p>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            {new Date(`${call.scheduledDate}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            · {OUTCOME[call.status] ?? call.status}
            {call.status === "approved" ? ` (${formatDollars(call.amountCents)})` : ""}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, marginTop: 10 }}>
        <b>Crew&apos;s reasons:</b> {call.reasons.map(reasonLabel).join("; ")}
      </p>
      {call.notes && <p style={{ fontSize: 13, marginTop: 4 }}>&ldquo;{call.notes}&rdquo;</p>}

      {call.photoUrls.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {call.photoUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              <Image
                src={url}
                alt="Arrival photo"
                width={96}
                height={96}
                unoptimized
                style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
              />
            </a>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 8 }}>No photos on file.</p>
      )}

      {call.conditionSummary && (
        <p style={{ fontSize: 12, color: "#6a746c", marginTop: 10 }}>
          Customer&apos;s own description: {call.conditionSummary}
          {call.customerAnswersPointedToDeep != null &&
            (call.customerAnswersPointedToDeep ? " (their answers pointed to a deep clean)" : " (their answers pointed to a standard clean)")}
        </p>
      )}

      {!editing && call.verdict ? (
        <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--sand)", borderRadius: 10, fontSize: 13 }}>
          <b style={{ color: "var(--verde)" }}>{verdictLabel(call.verdict)}.</b>{" "}
          {call.reviewNotes}
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{ marginLeft: 10, background: "none", border: "none", color: "#6a746c", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
          >
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
            Was this call sound?
          </p>
          {error && (
            <p className="form-msg error" style={{ padding: "6px 12px", fontSize: 12, marginTop: 8 }}>
              {error}
            </p>
          )}
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {REVIEW_VERDICTS.map((v) => (
              <div key={v.value} className="form-check" style={{ margin: 0 }}>
                <input
                  id={`verdict_${call.id}_${v.value}`}
                  type="radio"
                  name="verdict"
                  value={v.value}
                  defaultChecked={call.verdict === v.value}
                />
                <label htmlFor={`verdict_${call.id}_${v.value}`} style={{ margin: 0 }}>
                  <b>{v.label}</b> — {v.help}
                </label>
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10, maxWidth: 520 }}>
            <label htmlFor={`review_notes_${call.id}`}>Note (required for &ldquo;Not accurate&rdquo;)</label>
            <textarea id={`review_notes_${call.id}`} name="notes" rows={2} maxLength={500} defaultValue={call.reviewNotes ?? ""} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit" disabled={pending} style={{ padding: "8px 18px", fontSize: 13 }}>
              {pending ? "Saving…" : "Save review"}
            </button>
            {call.verdict && (
              <button className="btn ghost" type="button" onClick={() => setEditing(false)} style={{ padding: "8px 18px", fontSize: 13 }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
