"use client";

import {
  BUILDUP_OPTIONS,
  CLUTTER_OPTIONS,
  LAST_CLEAN_OPTIONS,
  PETS_OPTIONS,
  type ConditionAnswers,
} from "@/lib/firstCleanAssessment";
import { formatDollars } from "@/lib/homePricing";

const QUESTIONS: { key: keyof ConditionAnswers; prompt: string; options: { value: string; label: string }[] }[] = [
  { key: "last_clean", prompt: "When was this home last professionally cleaned?", options: LAST_CLEAN_OPTIONS },
  { key: "pets", prompt: "Do you have pets that shed?", options: PETS_OPTIONS },
  { key: "buildup", prompt: "How are the kitchen and bathrooms right now?", options: BUILDUP_OPTIONS },
  { key: "clutter", prompt: "How much clutter is on the surfaces and floors?", options: CLUTTER_OPTIONS },
];

// Shown before a customer's first standard clean at a home: a few condition
// questions, a deep-clean recommendation when the answers point that way,
// and the up-front agreement about a possible on-arrival upgrade.
export default function FirstCleanCondition({
  answers,
  onAnswer,
  complete,
  recommendDeep,
  deepPriceCents,
  onSwitchToDeep,
  upgradeMaxCents,
  consent,
  onConsent,
}: {
  answers: Partial<ConditionAnswers>;
  onAnswer: (key: keyof ConditionAnswers, value: string) => void;
  complete: boolean;
  recommendDeep: boolean;
  deepPriceCents: number | null;
  onSwitchToDeep: () => void;
  upgradeMaxCents: number | null;
  consent: boolean;
  onConsent: (value: boolean) => void;
}) {
  return (
    <div style={{ marginTop: 8, maxWidth: 560 }}>
      <p style={{ fontSize: 13, color: "#6a746c", marginBottom: 18 }}>
        This will be the first clean at this home. A few quick questions help us send the right visit.
      </p>

      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="field" style={{ border: "none", padding: 0, margin: "0 0 18px" }}>
          <legend
            style={{
              marginBottom: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--verde)",
            }}
          >
            {q.prompt}
          </legend>
          <div style={{ display: "grid", gap: 6 }}>
            {q.options.map((o) => (
              <div key={o.value} className="form-check" style={{ margin: 0 }}>
                <input
                  id={`cond_${q.key}_${o.value}`}
                  type="radio"
                  name={`cond_${q.key}`}
                  value={o.value}
                  checked={answers[q.key] === o.value}
                  onChange={() => onAnswer(q.key, o.value)}
                />
                <label htmlFor={`cond_${q.key}_${o.value}`} style={{ margin: 0 }}>
                  {o.label}
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {complete && recommendDeep && (
        <div className="card" style={{ marginBottom: 18, borderColor: "var(--marigold)" }}>
          <strong style={{ color: "var(--verde)" }}>We recommend a Deep clean for your first visit.</strong>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            From what you&apos;ve told us, a deep clean will get this home to a true starting point, so every regular
            clean after it stays quick and easy to keep up.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {deepPriceCents != null && (
              <button type="button" className="btn" onClick={onSwitchToDeep}>
                Switch to Deep clean — {formatDollars(deepPriceCents)}
              </button>
            )}
            <span style={{ fontSize: 13, color: "#6a746c", alignSelf: "center" }}>
              or keep the Standard clean below.
            </span>
          </div>
        </div>
      )}
      {complete && !recommendDeep && (
        <p className="form-msg" style={{ marginBottom: 18 }}>
          Sounds like a good fit for a Standard clean.
        </p>
      )}

      <div className="form-check" style={{ alignItems: "flex-start" }}>
        <input
          id="upgrade_consent_box"
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsent(e.target.checked)}
        />
        <label htmlFor="upgrade_consent_box">
          I understand that on arrival the crew will check the home&apos;s condition. If it needs a deep clean to be done
          properly, they&apos;ll contact me first and I can approve an upgrade
          {upgradeMaxCents != null ? ` for up to ${formatDollars(upgradeMaxCents)} more` : ""} or keep the standard
          clean as booked. Nothing extra is charged without my approval.
        </label>
      </div>
    </div>
  );
}
