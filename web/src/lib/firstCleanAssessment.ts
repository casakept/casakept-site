// The condition questions asked before a customer's first standard clean at
// a home, and how the answers turn into a "we'd recommend a deep clean
// first" suggestion. Points are summed; at or above the threshold we
// recommend a deep clean. Tune the options/threshold here.

type Option = { value: string; label: string; points: number };

export const LAST_CLEAN_OPTIONS: Option[] = [
  { value: "under_3_months", label: "Within the last 3 months", points: 0 },
  { value: "3_to_6_months", label: "3 to 6 months ago", points: 1 },
  { value: "6_to_12_months", label: "6 to 12 months ago", points: 2 },
  { value: "over_12_months", label: "Over a year ago, or never", points: 3 },
];

export const PETS_OPTIONS: Option[] = [
  { value: "no", label: "No pets, or pets that don't shed much", points: 0 },
  { value: "yes", label: "Pets that shed", points: 1 },
];

export const BUILDUP_OPTIONS: Option[] = [
  { value: "light", label: "Light — wiped down regularly", points: 0 },
  { value: "moderate", label: "Moderate — some buildup", points: 1 },
  { value: "heavy", label: "Heavy — grease, soap scum, or hard-water buildup", points: 2 },
];

export const CLUTTER_OPTIONS: Option[] = [
  { value: "light", label: "Light — surfaces and floors are mostly clear", points: 0 },
  { value: "moderate", label: "Moderate — some things to move around", points: 1 },
  { value: "heavy", label: "Heavy — a lot to move before cleaning", points: 2 },
];

export type ConditionAnswers = {
  last_clean: string;
  pets: string;
  buildup: string;
  clutter: string;
};

export const DEEP_RECOMMEND_THRESHOLD = 3;

const QUESTIONS: { key: keyof ConditionAnswers; options: Option[] }[] = [
  { key: "last_clean", options: LAST_CLEAN_OPTIONS },
  { key: "pets", options: PETS_OPTIONS },
  { key: "buildup", options: BUILDUP_OPTIONS },
  { key: "clutter", options: CLUTTER_OPTIONS },
];

export function answersComplete(a: Partial<ConditionAnswers>): a is ConditionAnswers {
  return QUESTIONS.every((q) => q.options.some((o) => o.value === a[q.key]));
}

export function conditionScore(a: ConditionAnswers): number {
  return QUESTIONS.reduce(
    (sum, q) => sum + (q.options.find((o) => o.value === a[q.key])?.points ?? 0),
    0
  );
}

export function recommendsDeep(a: ConditionAnswers): boolean {
  return conditionScore(a) >= DEEP_RECOMMEND_THRESHOLD;
}

// Server-side: read the answers from the booking form. Null if any are
// missing or not one of the allowed values.
export function parseConditionAnswers(formData: FormData): ConditionAnswers | null {
  const candidate: Partial<ConditionAnswers> = {
    last_clean: String(formData.get("cond_last_clean") ?? ""),
    pets: String(formData.get("cond_pets") ?? ""),
    buildup: String(formData.get("cond_buildup") ?? ""),
    clutter: String(formData.get("cond_clutter") ?? ""),
  };
  return answersComplete(candidate) ? candidate : null;
}

// One line for the crew/admin: "Last cleaned 6 to 12 months ago · pets that
// shed · heavy buildup · moderate clutter".
export function describeConditionAnswers(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<ConditionAnswers>;
  if (!answersComplete(a)) return null;
  const label = (opts: Option[], v: string) => opts.find((o) => o.value === v)!.label.split(" — ")[0];
  return [
    `Last cleaned: ${label(LAST_CLEAN_OPTIONS, a.last_clean).toLowerCase()}`,
    a.pets === "yes" ? "pets that shed" : "no shedding pets",
    `${label(BUILDUP_OPTIONS, a.buildup).toLowerCase()} kitchen/bath buildup`,
    `${label(CLUTTER_OPTIONS, a.clutter).toLowerCase()} clutter`,
  ].join(" · ");
}
