"use client";

import Image from "next/image";
import { useActionState, useState, type ReactNode } from "react";
import { scoreVisitAction, type ScoreVisitActionState } from "@/lib/actions/admin-scores";
import { SCORE_CATEGORIES, VISIT_SCORE_EVENTS, type ScoreCategoryKey } from "@/lib/visitScoring";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

// The rubric assigns this one checklist item to Professionalism ("home
// secured on exit"), not Quality -- everything else on the checklist is
// Quality evidence. Matched by name since it's a fixed seeded catalog item,
// not a flag on the row.
const HOME_SECURED_ITEM_NAME = "Home secured on exit (doors, alarm, pets)";

export type ScorableBooking = {
  id: string;
  service_type: Database["public"]["Enums"]["service_type"];
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  assigned_staff_id: string;
  staff: { profile: { full_name: string | null } | null } | null;
  customer: { full_name: string | null } | null;
  visit_score: {
    quality_score: number;
    customer_score: number;
    timeliness_score: number;
    professionalism_score: number;
    total_score: number | null;
    notes: string | null;
    event_type: Database["public"]["Enums"]["visit_score_event"];
  } | null;
  visit_checkin: {
    check_in_at: string | null;
    check_in_lat: number | null;
    check_in_lng: number | null;
    check_out_at: string | null;
    check_out_lat: number | null;
    check_out_lng: number | null;
  } | null;
  checklist: {
    completed: boolean;
    photo_path: string | null;
    photo_url: string | null;
    item: { name: string; rotation_zone: string | null } | null;
  }[];
  csat: { rating: number | null; comment: string | null; responded_at: string | null } | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function mapLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

type LightboxPhoto = { url: string; caption: string };

// Captions name the exact item each photo is evidence for (e.g. "Inside
// oven", not a broad zone like "Kitchen") so there's no guessing what a
// thumbnail is supposed to show while scoring. Clicking a thumbnail opens
// it full-size in the shared lightbox (see PhotoLightbox) for a closer look.
function PhotoStrip({
  photos,
  onOpen,
}: {
  photos: { photo_url: string | null; item: { name: string } | null }[];
  onOpen: (photo: LightboxPhoto) => void;
}) {
  const withPhotos = photos.filter((c): c is typeof c & { photo_url: string } => !!c.photo_url);
  if (withPhotos.length === 0) return null;
  return (
    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
      {withPhotos.map((c, i) => {
        const caption = c.item?.name ?? "Checklist photo";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onOpen({ url: c.photo_url, caption })}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "zoom-in",
              textAlign: "center",
              width: 88,
            }}
          >
            <Image
              src={c.photo_url}
              alt={caption}
              width={88}
              height={88}
              unoptimized
              style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
            />
            <span style={{ display: "block", fontSize: 11, color: "#6a746c", marginTop: 3, lineHeight: 1.25 }}>
              {caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Full-size view with click-to-cycle zoom, for verifying photo evidence
// closely while scoring without leaving the page.
function PhotoLightbox({ photo, onClose }: { photo: LightboxPhoto; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 20, 18, 0.88)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{ maxWidth: "90vw", maxHeight: "78vh", overflow: "auto" }}
        onClick={(e) => {
          e.stopPropagation();
          setZoom((z) => (z >= 3 ? 1 : z + 1));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs free transform/scroll, not next/image's fixed-box layout */}
        <img
          src={photo.url}
          alt={photo.caption}
          style={{
            display: "block",
            maxWidth: "90vw",
            cursor: zoom >= 3 ? "zoom-out" : "zoom-in",
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
          }}
        />
      </div>
      <div
        style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ color: "#fff", fontSize: 13 }}>{photo.caption}</span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          style={{ padding: "4px 12px" }}
        >
          −
        </button>
        <span style={{ color: "#fff", fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          style={{ padding: "4px 12px" }}
        >
          +
        </button>
        <button type="button" className="btn ghost" onClick={onClose} style={{ padding: "4px 12px" }}>
          Close
        </button>
      </div>
    </div>
  );
}

const initialState: ScoreVisitActionState = {};

export default function ScoreBookingRow({ booking }: { booking: ScorableBooking }) {
  const action = scoreVisitAction.bind(null, booking.id, booking.assigned_staff_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const score = booking.visit_score;
  const checkin = booking.visit_checkin;
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);

  const homeSecuredEntry = booking.checklist.find((c) => c.item?.name === HOME_SECURED_ITEM_NAME);
  const qualityChecklist = booking.checklist.filter((c) => c.item?.name !== HOME_SECURED_ITEM_NAME);
  const qualityCompleted = qualityChecklist.filter((c) => c.completed).length;

  const evidenceByCategory: Record<ScoreCategoryKey, ReactNode> = {
    quality_score:
      qualityChecklist.length > 0 ? (
        <>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            Checklist: {qualityCompleted}/{qualityChecklist.length} completed
          </p>
          <PhotoStrip photos={qualityChecklist} onOpen={setLightbox} />
        </>
      ) : (
        <p style={{ fontSize: 12, color: "#9aa49d" }}>No checklist recorded for this visit type.</p>
      ),
    customer_score: booking.csat?.responded_at ? (
      <p style={{ fontSize: 12, color: "#9aa49d" }}>
        CSAT: {booking.csat.rating}/5{booking.csat.comment && ` — "${booking.csat.comment}"`}
      </p>
    ) : (
      <p style={{ fontSize: 12, color: "#9aa49d" }}>No CSAT response yet — treat as neutral, not negative.</p>
    ),
    timeliness_score: checkin?.check_in_at ? (
      <p style={{ fontSize: 12, color: "#9aa49d" }}>
        In: {formatTime(checkin.check_in_at)}
        {checkin.check_in_lat != null && checkin.check_in_lng != null && (
          <>
            {" "}
            (<a href={mapLink(checkin.check_in_lat, checkin.check_in_lng)} target="_blank" rel="noopener noreferrer">map</a>)
          </>
        )}
        {checkin.check_out_at && (
          <>
            {" · Out: "}
            {formatTime(checkin.check_out_at)}
            {checkin.check_out_lat != null && checkin.check_out_lng != null && (
              <>
                {" "}
                (<a href={mapLink(checkin.check_out_lat, checkin.check_out_lng)} target="_blank" rel="noopener noreferrer">map</a>)
              </>
            )}
            {" · Duration: "}
            {formatDuration(checkin.check_in_at, checkin.check_out_at)}
          </>
        )}
      </p>
    ) : (
      <p style={{ fontSize: 12, color: "#9aa49d" }}>No check-in recorded for this visit.</p>
    ),
    professionalism_score: (
      <>
        <p style={{ fontSize: 12, color: "#9aa49d" }}>
          Home secured on exit:{" "}
          {homeSecuredEntry ? (homeSecuredEntry.completed ? "Confirmed" : "Not confirmed") : "Not recorded"}
        </p>
        {homeSecuredEntry && <PhotoStrip photos={[homeSecuredEntry]} onOpen={setLightbox} />}
      </>
    ),
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[booking.service_type] ?? booking.service_type}
          </strong>{" "}
          {score && <span className="status-badge completed">Scored: {score.total_score}</span>}
          <p>
            {booking.staff?.profile?.full_name ?? "Unassigned"} · {booking.customer?.full_name ?? "Customer"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>
            {new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p>{WINDOW_LABELS[booking.time_window] ?? booking.time_window}</p>
        </div>
      </div>

      <form action={formAction} style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          {SCORE_CATEGORIES.map((category) => (
            <div
              key={category.key}
              style={{ padding: "10px 12px", background: "var(--sand)", borderRadius: 10 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13, color: "var(--verde)" }}>
                  {category.label} <span style={{ fontWeight: 400, color: "#9aa49d" }}>(max {category.max})</span>
                </strong>
                <input
                  type="number"
                  name={category.key}
                  min={0}
                  max={category.max}
                  step={1}
                  defaultValue={score?.[category.key] ?? ""}
                  required
                  style={{ width: 90 }}
                />
              </div>
              <p style={{ fontSize: 12, color: "#4a5450", marginTop: 4 }}>{category.criteria}</p>
              <p style={{ fontSize: 11, color: "#9aa49d", marginTop: 2, fontStyle: "italic" }}>
                Source: {category.source}
              </p>
              <div style={{ marginTop: 8 }}>{evidenceByCategory[category.key]}</div>
            </div>
          ))}
        </div>

        <label style={{ display: "block", fontSize: 12, color: "#6a746c", marginTop: 14 }}>
          Score event (forces bonus to $0 if not &quot;None&quot;)
          <select
            name="event_type"
            defaultValue={score?.event_type ?? "none"}
            style={{ display: "block", width: 220, marginTop: 4 }}
          >
            {VISIT_SCORE_EVENTS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", fontSize: 12, color: "#6a746c", marginTop: 10 }}>
          Notes
          <textarea
            name="notes"
            defaultValue={score?.notes ?? ""}
            rows={2}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {pending ? "Saving…" : score ? "Update score" : "Save score"}
          </button>
          {state.error && (
            <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
              {state.error}
            </span>
          )}
          {state.success && !state.error && (
            <span className="form-msg" style={{ margin: 0, padding: "6px 12px" }}>
              Saved.
            </span>
          )}
        </div>
      </form>

      {lightbox && <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
