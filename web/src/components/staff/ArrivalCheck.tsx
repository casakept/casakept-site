"use client";

import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  cancelUpgradeRequestAction,
  declineOnCallAction,
  flagDeepCleanAction,
  logUpgradeCallAction,
  sendUpgradeLinkAction,
  uploadArrivalPhotoAction,
  type UpgradeActionState,
} from "@/lib/actions/staff-upgrades";
import {
  MIN_ARRIVAL_PHOTOS,
  UPGRADE_REASONS,
  UPGRADE_RESPONSE_WINDOW_MINUTES,
  reasonLabel,
} from "@/lib/upgradeRequests";
import { upgradeOfferUrl } from "@/lib/siteUrl";
import { formatDollars } from "@/lib/homePricing";
import Image from "next/image";

export type UpgradeRequestView = {
  id: string;
  status: "flagged" | "link_sent" | "approved" | "declined" | "expired" | "cancelled";
  reasons: string[];
  token: string;
  called_at: string | null;
  call_outcome: string | null;
  expires_at: string | null;
  amount_cents: number;
};

const initialState: UpgradeActionState = {};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const ghost = { padding: "6px 14px", fontSize: 12 } as const;

// On a visit in progress: photos of how the home looked on arrival, and --
// for a first standard clean the customer agreed might be upgraded -- the
// path from "this needs a deep clean" to the customer's approval.
export default function ArrivalCheck({
  bookingId,
  staffId,
  photos,
  canRecommend,
  request,
  customerPhone,
}: {
  bookingId: string;
  staffId: string;
  photos: { id: string; url: string }[];
  canRecommend: boolean;
  request: UpgradeRequestView | null;
  customerPhone: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [smsUrl, setSmsUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Submitted by hand rather than through a form action: React clears an
  // action form after it runs, even when it fails, which would wipe the
  // reasons the crew member just ticked if they forgot a required note.
  const [flagPending, startFlag] = useTransition();
  const [flagError, setFlagError] = useState<string | null>(null);

  function handleFlag(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFlagError(null);
    startFlag(async () => {
      const result = await flagDeepCleanAction(bookingId, initialState, formData);
      if (result.error) setFlagError(result.error);
      else {
        setShowForm(false);
        router.refresh();
      }
    });
  }

  const live = request?.status === "flagged" || request?.status === "link_sent";

  // The crew screen is the one that has to notice the customer's answer (or
  // the window closing), so keep it fresh while a request is open.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [live, router]);

  const expiresAt = request?.status === "link_sent" ? request.expires_at : null;
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  function run(fn: () => Promise<UpgradeActionState | { error: string } | { url: string; expiresAt: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result && result.error) setError(result.error);
      if ("url" in result) setSmsUrl(buildSmsUrl(customerPhone, result.url));
      router.refresh();
    });
  }

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    run(() => uploadArrivalPhotoAction(bookingId, staffId, formData));
    e.target.value = "";
  }

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
        Arrival check
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        {photos.map((p) => (
          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
            <Image
              src={p.url}
              alt="Arrival photo"
              width={56}
              height={56}
              unoptimized
              style={{ objectFit: "cover", borderRadius: 6, border: "1.5px solid var(--line)" }}
            />
          </a>
        ))}
        <label className="btn ghost" style={{ ...ghost, cursor: "pointer" }}>
          {pending ? "Uploading…" : "Add arrival photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            disabled={pending}
            style={{ display: "none" }}
          />
        </label>
      </div>
      {canRecommend && !request && (
        <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 6 }}>
          {photos.length} photo{photos.length === 1 ? "" : "s"} · {MIN_ARRIVAL_PHOTOS} needed to recommend a deep clean.
        </p>
      )}
      {error && (
        <p className="form-msg error" style={{ margin: "8px 0 0", padding: "6px 12px", fontSize: 12 }}>
          {error}
        </p>
      )}

      {canRecommend && !request && !showForm && (
        <button
          className="btn ghost"
          type="button"
          style={{ ...ghost, marginTop: 10 }}
          onClick={() => setShowForm(true)}
          disabled={photos.length < MIN_ARRIVAL_PHOTOS}
        >
          This home needs a deep clean
        </button>
      )}

      {canRecommend && !request && showForm && (
        <form onSubmit={handleFlag} style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "#6a746c", marginBottom: 8 }}>
            What did you find? Only report what&apos;s really there — the customer sees your photos and these reasons.
          </p>
          {flagError && (
            <p className="form-msg error" style={{ padding: "6px 12px", fontSize: 12 }}>
              {flagError}
            </p>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            {UPGRADE_REASONS.map((r) => (
              <div key={r.value} className="form-check" style={{ margin: 0 }}>
                <input id={`reason_${bookingId}_${r.value}`} type="checkbox" name="reasons" value={r.value} />
                <label htmlFor={`reason_${bookingId}_${r.value}`} style={{ margin: 0 }}>
                  {r.label}
                </label>
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor={`notes_${bookingId}`}>Notes (required for &ldquo;Other&rdquo;)</label>
            <textarea id={`notes_${bookingId}`} name="notes" rows={2} maxLength={500} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit" disabled={flagPending} style={{ padding: "8px 18px", fontSize: 13 }}>
              {flagPending ? "Saving…" : "Recommend deep clean"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setShowForm(false)} style={ghost}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {request && (
        <RequestPanel
          request={request}
          customerPhone={customerPhone}
          remaining={remaining}
          smsUrl={smsUrl}
          pending={pending}
          run={run}
        />
      )}
    </div>
  );
}

function buildSmsUrl(phone: string | null, offerUrl: string): string | null {
  if (!phone) return null;
  const body = `Hi, it's your CasaKept crew at your home. We recommend a deep clean today -- see the photos and approve or decline here (open ${UPGRADE_RESPONSE_WINDOW_MINUTES} min): ${offerUrl}`;
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
}

function RequestPanel({
  request,
  customerPhone,
  remaining,
  smsUrl,
  pending,
  run,
}: {
  request: UpgradeRequestView;
  customerPhone: string | null;
  remaining: number | null;
  smsUrl: string | null;
  pending: boolean;
  run: (fn: () => Promise<UpgradeActionState | { error: string } | { url: string; expiresAt: string }>) => void;
}) {
  const box = { marginTop: 12, padding: "10px 14px", background: "var(--sand)", borderRadius: 10, fontSize: 13 } as const;

  if (request.status === "approved") {
    return (
      <div style={{ ...box, background: "#eaf0e7" }}>
        <b style={{ color: "var(--verde)" }}>Approved.</b> The customer paid {formatDollars(request.amount_cents)} — do the
        deep clean.
      </div>
    );
  }
  if (request.status === "declined") {
    return <div style={box}>The customer declined the upgrade — do the standard clean as booked.</div>;
  }
  if (request.status === "expired") {
    return (
      <div style={box}>
        No answer within {UPGRADE_RESPONSE_WINDOW_MINUTES} minutes — do the standard clean as booked.
      </div>
    );
  }
  if (request.status === "cancelled") {
    return <div style={box}>You withdrew the recommendation — do the standard clean as booked.</div>;
  }

  const reasons = request.reasons.map(reasonLabel).join("; ");
  const offerUrl = upgradeOfferUrl(request.token);
  const sms = smsUrl ?? buildSmsUrl(customerPhone, offerUrl);

  if (request.status === "flagged") {
    return (
      <div style={box}>
        <b style={{ color: "var(--verde)" }}>Contact the customer.</b> Call first.
        <p style={{ fontSize: 12, color: "#6a746c", marginTop: 4 }}>Recommending: {reasons}</p>

        {!request.called_at ? (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {customerPhone ? (
              <a className="btn" href={`tel:${customerPhone}`} style={{ padding: "8px 18px", fontSize: 13, textAlign: "center" }}>
                Call {customerPhone}
              </a>
            ) : (
              <p style={{ fontSize: 12 }}>No phone number on file — email the link below.</p>
            )}
            <p style={{ fontSize: 12, color: "#6a746c" }}>After you call, tell us how it went:</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn ghost"
                type="button"
                style={ghost}
                disabled={pending}
                onClick={() => run(() => logUpgradeCallAction(request.id, "no_answer"))}
              >
                No answer
              </button>
              <button
                className="btn ghost"
                type="button"
                style={ghost}
                disabled={pending}
                onClick={() => run(() => logUpgradeCallAction(request.id, "spoke"))}
              >
                I spoke with them
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#6a746c" }}>
              {request.call_outcome === "no_answer"
                ? "No answer. Send the link — they have 15 minutes to respond."
                : "Spoke with them. If they want the upgrade, send the link; they have 15 minutes to approve it."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                style={{ padding: "8px 18px", fontSize: 13 }}
                disabled={pending}
                onClick={() => run(() => sendUpgradeLinkAction(request.id))}
              >
                {pending ? "Sending…" : "Send the link"}
              </button>
              {request.call_outcome === "spoke" && (
                <button
                  className="btn ghost"
                  type="button"
                  style={ghost}
                  disabled={pending}
                  onClick={() => run(() => declineOnCallAction(request.id))}
                >
                  They declined
                </button>
              )}
            </div>
          </div>
        )}
        <WithdrawButton requestId={request.id} pending={pending} run={run} />
      </div>
    );
  }

  // link_sent
  return (
    <div style={box}>
      <b style={{ color: "var(--verde)" }}>Waiting for the customer.</b>{" "}
      {remaining != null && remaining > 0 ? `Closes in ${formatRemaining(remaining)}.` : "Closing…"}
      <p style={{ fontSize: 12, color: "#6a746c", marginTop: 4 }}>
        We emailed the link{sms ? ". Now text it from your phone:" : "."}
      </p>
      {sms && (
        <a className="btn" href={sms} style={{ padding: "8px 18px", fontSize: 13, marginTop: 8, display: "inline-block" }}>
          Open text message
        </a>
      )}
      <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 8 }}>
        Keep working on the standard checklist while you wait. This updates on its own when they respond.
      </p>
      <WithdrawButton requestId={request.id} pending={pending} run={run} />
    </div>
  );
}

function WithdrawButton({
  requestId,
  pending,
  run,
}: {
  requestId: string;
  pending: boolean;
  run: (fn: () => Promise<UpgradeActionState | { error: string } | { url: string; expiresAt: string }>) => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => cancelUpgradeRequestAction(requestId))}
      style={{ background: "none", border: "none", color: "#6a746c", fontSize: 12, textDecoration: "underline", cursor: "pointer", marginTop: 10, padding: 0 }}
    >
      Withdraw this recommendation
    </button>
  );
}
