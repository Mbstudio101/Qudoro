
export const NURSING_DOMAINS = [
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological Therapies",
  "Reduction of Risk Potential",
  "Physiological Adaptation"
] as const;

export const QUESTION_STYLES = [
  "Clinical Judgment",
  "Recognize Cues",
  "Analyze Cues",
  "Prioritize Hypotheses",
  "Generate Solutions",
  "Take Action",
  "Evaluate Outcomes"
] as const;

export type NursingDomain = typeof NURSING_DOMAINS[number];
export type QuestionStyle = typeof QUESTION_STYLES[number];

/**
 * NCSBN client-needs distribution, RN test plan effective April 2026.
 * Unchanged from the 2023 plan. Used to measure blueprint conformance of a
 * bank — see {@link blueprintGap}.
 */
export const NCLEX_RN_BLUEPRINT: Record<NursingDomain, { min: number; max: number }> = {
  "Management of Care": { min: 0.15, max: 0.21 },
  "Safety & Infection Control": { min: 0.10, max: 0.16 },
  "Health Promotion & Maintenance": { min: 0.06, max: 0.12 },
  "Psychosocial Integrity": { min: 0.06, max: 0.12 },
  "Basic Care & Comfort": { min: 0.06, max: 0.12 },
  "Pharmacological Therapies": { min: 0.13, max: 0.19 },
  "Reduction of Risk Potential": { min: 0.09, max: 0.15 },
  "Physiological Adaptation": { min: 0.11, max: 0.17 },
};

/**
 * Keyword classification for NCLEX client-needs domains and CJMM steps.
 *
 * This is a *suggestion engine*, not a source of truth. Three properties make
 * it safe to build on, which the previous first-match-wins chain did not have:
 *
 *  1. **No silent fallback.** Unrecognized items return `null`, not a default
 *     domain. A bank with 30% unclassified items must look 30% unclassified,
 *     because blueprint conformance is measured off these labels.
 *  2. **Order-independent.** Every domain is scored and the best one wins, so a
 *     delegation item that mentions "medication" is no longer captured by
 *     whichever branch happened to be written first.
 *  3. **Word-boundary matching.** Single words match as words, so "lab" no
 *     longer fires on "labor" and "adl" no longer fires on "saddle".
 *
 * Ambiguous items — where the top two domains score within `MARGIN` of each
 * other — also return `null` rather than guessing.
 */

/** Weighted signal: `[term, weight]`. Multi-word terms match as phrases. */
type Signal = readonly [string, number];

const DOMAIN_SIGNALS: Record<NursingDomain, readonly Signal[]> = {
  "Management of Care": [
    ["delegate", 3], ["delegation", 3], ["assign", 3], ["assignment", 3], ["supervise", 2],
    ["scope of practice", 3], ["chain of command", 3], ["informed consent", 3], ["advance directive", 3],
    ["confidentiality", 2], ["hipaa", 3], ["advocacy", 2], ["advocate", 2], ["case management", 2],
    ["continuity of care", 2], ["incident report", 2], ["referral", 2], ["interdisciplinary", 2],
    ["interprofessional", 2], ["collaboration", 2], ["charge nurse", 3], ["uap", 3],
    ["unlicensed assistive", 3], ["lpn", 2], ["triage", 3], ["which client should the nurse see first", 3],
    ["legal", 1], ["ethical", 1], ["consent", 1], ["discharge planning", 2],
  ],
  "Safety & Infection Control": [
    ["infection control", 3], ["sterile", 3], ["asepsis", 3], ["aseptic", 3], ["isolation", 3],
    ["ppe", 3], ["personal protective", 3], ["hand hygiene", 3], ["handwashing", 3], ["wash hands", 2],
    ["contact precautions", 3], ["droplet", 3], ["airborne", 3], ["standard precautions", 3],
    ["neutropenic", 2], ["restraint", 3], ["fall risk", 3], ["fire safety", 3], ["biohazard", 2],
    ["needlestick", 3], ["sharps", 2], ["mrsa", 2], ["c. diff", 2], ["clostridium", 2],
    ["hazardous", 2], ["safety", 1], ["infection", 1], ["contamination", 2],
  ],
  "Health Promotion & Maintenance": [
    ["immunization", 3], ["vaccine", 3], ["vaccination", 3], ["screening", 2], ["well-child", 3],
    ["growth and development", 3], ["developmental milestone", 3], ["milestone", 2],
    ["prenatal", 3], ["antepartum", 3], ["postpartum", 3], ["newborn", 3], ["labor", 2],
    ["lactation", 3], ["breastfeeding", 3], ["family planning", 3], ["contraception", 2],
    ["menopause", 2], ["anticipatory guidance", 3], ["health promotion", 3], ["aging", 2],
    ["puberty", 2], ["preventive", 2], ["wellness", 2],
  ],
  "Psychosocial Integrity": [
    ["therapeutic communication", 3], ["coping", 3], ["grief", 3], ["bereavement", 3],
    ["abuse", 3], ["neglect", 2], ["substance use", 3], ["addiction", 3], ["withdrawal", 2],
    ["depression", 3], ["anxiety", 3], ["bipolar", 3], ["schizophrenia", 3], ["suicidal", 3],
    ["suicide", 3], ["psychosis", 3], ["delirium", 2], ["dementia", 2], ["crisis intervention", 3],
    ["mental health", 3], ["psychiatric", 3], ["cultural", 2], ["spiritual", 2],
    ["end of life", 2], ["support group", 2], ["body image", 2],
  ],
  "Basic Care & Comfort": [
    ["hygiene", 2], ["adl", 3], ["activities of daily living", 3], ["ambulation", 3], ["ambulate", 3],
    ["mobility", 2], ["positioning", 2], ["range of motion", 3], ["enteral", 3], ["tube feeding", 3],
    ["nutrition", 2], ["elimination", 2], ["constipation", 2], ["incontinence", 2],
    ["sleep", 2], ["rest", 1], ["comfort", 2], ["nonpharmacological", 3], ["palliative", 2],
    ["assistive device", 3], ["bathing", 2], ["oral care", 2], ["pressure ulcer", 2],
  ],
  "Pharmacological Therapies": [
    ["medication", 2], ["drug", 2], ["dosage", 3], ["dose", 2], ["prescription", 2],
    ["iv push", 3], ["infusion rate", 3], ["titrate", 3], ["adverse effect", 3], ["side effect", 2],
    ["contraindication", 2], ["therapeutic level", 3], ["peak", 2], ["trough", 3],
    ["anticoagulant", 3], ["insulin", 3], ["opioid", 3], ["antibiotic", 3], ["analgesic", 3],
    ["pharmacokinetic", 3], ["tpn", 3], ["total parenteral", 3], ["blood product", 3],
    ["transfusion", 2], ["pca pump", 3], ["mg/kg", 3], ["milligram", 2], ["administer", 1],
  ],
  "Reduction of Risk Potential": [
    ["laboratory value", 3], ["lab value", 3], ["diagnostic test", 3], ["vital signs", 2],
    ["complication", 2], ["postoperative", 3], ["preoperative", 3], ["perioperative", 3],
    ["catheter", 2], ["drain", 2], ["telemetry", 3], ["ecg", 2], ["ekg", 2], ["abg", 3],
    ["arterial blood gas", 3], ["invasive procedure", 3], ["biopsy", 3], ["endoscopy", 3],
    ["monitor for", 2], ["paracentesis", 3], ["thoracentesis", 3], ["lumbar puncture", 3],
    ["surgery", 2], ["procedure", 1], ["risk", 1],
  ],
  "Physiological Adaptation": [
    ["hemodynamic", 3], ["shock", 3], ["sepsis", 3], ["septic", 3], ["arrhythmia", 3],
    ["dysrhythmia", 3], ["fluid and electrolyte", 3], ["electrolyte", 2], ["acid-base", 3],
    ["pathophysiology", 3], ["exacerbation", 3], ["hemorrhage", 3], ["respiratory failure", 3],
    ["renal failure", 3], ["dialysis", 3], ["ventilator", 3], ["resuscitation", 3],
    ["code blue", 3], ["unstable", 2], ["medical emergency", 3], ["intracranial pressure", 3],
    ["seizure", 2], ["hyperglycemia", 2], ["hypoglycemia", 2], ["dka", 3], ["cardiac arrest", 3],
  ],
};

const STYLE_SIGNALS: Record<QuestionStyle, readonly Signal[]> = {
  "Recognize Cues": [
    ["which findings", 3], ["which finding", 3], ["relevant", 2], ["requires follow-up", 3],
    ["requires immediate follow-up", 3], ["concerning", 2], ["abnormal", 2], ["report to the provider", 2],
    ["is significant", 2], ["should be reported", 3],
  ],
  "Analyze Cues": [
    ["consistent with", 3], ["most likely cause", 3], ["indicate", 2], ["indicates", 2],
    ["suggests", 2], ["significance", 2], ["interpret", 2], ["related to", 2],
    ["is experiencing", 2], ["explains", 2],
  ],
  "Prioritize Hypotheses": [
    ["priority", 3], ["highest priority", 3], ["greatest risk", 3], ["most likely", 2],
    ["first", 2], ["initial", 2], ["most concerning", 3], ["immediate", 2], ["most urgent", 3],
    ["see first", 3],
  ],
  "Generate Solutions": [
    ["expected outcome", 3], ["anticipate", 3], ["plan of care", 3], ["prepare", 2],
    ["potential orders", 3], ["which orders", 3], ["would be appropriate", 2],
    ["should be included", 2], ["recommend", 2],
  ],
  "Take Action": [
    ["implement", 3], ["perform", 2], ["intervention", 2], ["the nurse should", 2],
    ["which action", 3], ["teach", 2], ["instruct", 2], ["position the client", 3],
    ["notify", 2], ["next step", 3],
  ],
  "Evaluate Outcomes": [
    ["effective", 3], ["was effective", 3], ["improving", 3], ["resolved", 3], ["reassess", 3],
    ["response to treatment", 3], ["indicates the treatment", 3], ["evaluate", 2],
    ["has been successful", 3], ["understands the teaching", 3],
  ],
  // Generic bucket: only assigned explicitly by an author, never auto-inferred.
  "Clinical Judgment": [],
};

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Multi-word terms match as phrases; single words match on word boundaries. */
const countMatches = (text: string, term: string): number => {
  const pattern = term.includes(' ')
    ? escapeRe(term)
    : `\\b${escapeRe(term)}\\b`;
  return (text.match(new RegExp(pattern, 'g')) || []).length;
};

const scoreAll = <K extends string>(
  text: string,
  table: Record<K, readonly Signal[]>,
): { key: K; score: number }[] =>
  (Object.entries(table) as [K, readonly Signal[]][])
    .map(([key, signals]) => ({
      key,
      // Repeat hits are capped at 2 so one repeated word can't dominate.
      score: signals.reduce((sum, [term, weight]) => sum + Math.min(countMatches(text, term), 2) * weight, 0),
    }))
    .sort((a, b) => b.score - a.score);

/** A winner must clear this, or the item is left unclassified. */
const MIN_SCORE = 3;
/** …and must beat the runner-up by this, or it is treated as ambiguous. */
const MARGIN = 2;

const pick = <K extends string>(ranked: { key: K; score: number }[]): { value: K | null; confidence: number } => {
  const [top, next] = ranked;
  if (!top || top.score < MIN_SCORE) return { value: null, confidence: 0 };
  const runnerUp = next?.score ?? 0;
  if (top.score - runnerUp < MARGIN) return { value: null, confidence: 0 };
  return { value: top.key, confidence: Math.min(1, (top.score - runnerUp) / (top.score || 1)) };
};

export interface Classification {
  domain: NursingDomain | null;
  style: QuestionStyle | null;
  /** 0–1. How decisively the winner beat the runner-up. */
  domainConfidence: number;
  styleConfidence: number;
}

export const classifyQuestionDetailed = (content: string, options: string[] = []): Classification => {
  const text = `${content} ${options.join(' ')}`.toLowerCase();

  const domain = pick(scoreAll(text, DOMAIN_SIGNALS));
  const style = pick(scoreAll(text, STYLE_SIGNALS));

  return {
    domain: domain.value,
    style: style.value,
    domainConfidence: domain.confidence,
    styleConfidence: style.confidence,
  };
};

/**
 * Back-compatible wrapper. Returns `null` for either field when the text gives
 * no confident signal — callers already treat `null` as "unset".
 */
export const classifyQuestion = (
  content: string,
  options: string[] = [],
): { domain: NursingDomain | null; style: QuestionStyle | null } => {
  const { domain, style } = classifyQuestionDetailed(content, options);
  return { domain, style };
};

// ── Blueprint conformance ──────────────────────────────────────────────────

export interface BlueprintRow {
  domain: NursingDomain;
  count: number;
  share: number;
  target: { min: number; max: number };
  /**
   * 0 when inside the band. Positive = items to **add to this domain** to reach
   * `min` (accounts for the denominator growing as you add). Negative = items
   * currently **over** `max` at the present total.
   */
  delta: number;
}

export interface BlueprintReport {
  total: number;
  /** Items with no domain — excluded from `share`, surfaced so they can't hide. */
  unclassified: number;
  rows: BlueprintRow[];
}

/**
 * Measures a bank against the NCSBN client-needs distribution.
 *
 * `share` is computed over *classified* items only. Unclassified items are
 * reported separately rather than being silently bucketed, so a bank cannot
 * appear conformant just because its labels defaulted somewhere.
 */
export const blueprintGap = (items: { domain?: string }[]): BlueprintReport => {
  const classified = items.filter((i) => i.domain && (NURSING_DOMAINS as readonly string[]).includes(i.domain));
  const total = classified.length;

  const rows = NURSING_DOMAINS.map((domain) => {
    const count = classified.filter((i) => i.domain === domain).length;
    const share = total > 0 ? count / total : 0;
    const target = NCLEX_RN_BLUEPRINT[domain];

    // Solve (count + k) / (total + k) >= min for k, so the number is what an
    // author actually has to write — rounding to nearest would under-report a
    // domain sitting just below its floor.
    let delta = 0;
    if (total > 0) {
      if (share < target.min) {
        delta = Math.ceil((target.min * total - count) / (1 - target.min));
      } else if (share > target.max) {
        delta = count - Math.floor(target.max * total);
        delta = -Math.max(1, delta);
      }
    }

    return { domain, count, share, target, delta };
  });

  return { total, unclassified: items.length - total, rows };
};
