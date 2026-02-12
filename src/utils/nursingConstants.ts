
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

// Simple keyword-based classifier (Heuristic "AI")
export const classifyQuestion = (content: string, options: string[] = []): { domain: NursingDomain | null, style: QuestionStyle | null } => {
  const text = (content + " " + options.join(" ")).toLowerCase();

  let domain: NursingDomain | null = null;
  let style: QuestionStyle | null = null;

  // Domain Logic
  if (text.includes("drug") || text.includes("medication") || text.includes("dose") || text.includes("prescription") || text.includes("administer") || text.includes("side effect")) {
    domain = "Pharmacological Therapies";
  } else if (text.includes("infection") || text.includes("sterile") || text.includes("isolation") || text.includes("ppe") || text.includes("wash hands") || text.includes("safety")) {
    domain = "Safety & Infection Control";
  } else if (text.includes("psych") || text.includes("mental") || text.includes("depression") || text.includes("anxiety") || text.includes("coping") || text.includes("therapeutic communication")) {
    domain = "Psychosocial Integrity";
  } else if (text.includes("baby") || text.includes("development") || text.includes("vaccine") || text.includes("screen") || text.includes("prevention") || text.includes("educat")) {
    domain = "Health Promotion & Maintenance";
  } else if (text.includes("pain") || text.includes("comfort") || text.includes("sleep") || text.includes("hygiene") || text.includes("mobility") || text.includes("adl")) {
    domain = "Basic Care & Comfort";
  } else if (text.includes("lab") || text.includes("procedure") || text.includes("complication") || text.includes("surgery") || text.includes("risk")) {
    domain = "Reduction of Risk Potential";
  } else if (text.includes("delegate") || text.includes("assign") || text.includes("priority") || text.includes("legal") || text.includes("ethical") || text.includes("consent")) {
    domain = "Management of Care";
  } else {
    // Default fallback or more specific checks
    domain = "Physiological Adaptation";
  }

  // Style Logic (NGN - Next Gen NCLEX styles)
  if (text.includes("highlight") || text.includes("click") || text.includes("finding")) {
    style = "Recognize Cues";
  } else if (text.includes("meaning") || text.includes("significance") || text.includes("indicate")) {
    style = "Analyze Cues";
  } else if (text.includes("priority") || text.includes("most important") || text.includes("first")) {
    style = "Prioritize Hypotheses";
  } else if (text.includes("intervention") || text.includes("recommend") || text.includes("plan")) {
    style = "Generate Solutions";
  } else if (text.includes("action") || text.includes("perform") || text.includes("administer") || text.includes("implement")) {
    style = "Take Action";
  } else if (text.includes("outcome") || text.includes("effective") || text.includes("response")) {
    style = "Evaluate Outcomes";
  } else {
    style = "Clinical Judgment";
  }

  return { domain, style };
};
