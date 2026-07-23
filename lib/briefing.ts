export type Briefing = {
  executiveSummary: string;
  person: {
    authority: string;
    priorities: string[];
    unknowns: string[];
  };
  company: {
    profile: string;
    noteworthyEvents: string[];
  };
  openaiRelevance: {
    motion: string;
    rationale: string;
    workflows: string[];
  };
  compliance: string[];
  risks: string[];
  discoveryQuestions: string[];
};

export type BriefingModelResult =
  | {
      outcome: "briefing";
      briefing: Briefing;
    }
  | {
      outcome: "prompt_injection";
      briefing: null;
    };

const stringArray = (minItems: number, maxItems: number) => ({
  type: "array",
  items: { type: "string" },
  minItems,
  maxItems,
});

export const BRIEFING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveSummary: { type: "string" },
    person: {
      type: "object",
      additionalProperties: false,
      properties: {
        authority: { type: "string" },
        priorities: stringArray(3, 4),
        unknowns: stringArray(2, 4),
      },
      required: ["authority", "priorities", "unknowns"],
    },
    company: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: { type: "string" },
        noteworthyEvents: stringArray(3, 4),
      },
      required: ["profile", "noteworthyEvents"],
    },
    openaiRelevance: {
      type: "object",
      additionalProperties: false,
      properties: {
        motion: { type: "string" },
        rationale: { type: "string" },
        workflows: stringArray(3, 3),
      },
      required: ["motion", "rationale", "workflows"],
    },
    compliance: stringArray(3, 5),
    risks: stringArray(3, 5),
    discoveryQuestions: stringArray(6, 7),
  },
  required: [
    "executiveSummary",
    "person",
    "company",
    "openaiRelevance",
    "compliance",
    "risks",
    "discoveryQuestions",
  ],
} as const;

export const BRIEFING_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    outcome: {
      type: "string",
      enum: ["briefing", "prompt_injection"],
    },
    briefing: {
      anyOf: [BRIEFING_SCHEMA, { type: "null" }],
    },
  },
  required: ["outcome", "briefing"],
} as const;

function isStringArray(value: unknown, minimum: number) {
  return Array.isArray(value) && value.length >= minimum && value.every((item) => typeof item === "string");
}

export function isBriefing(value: unknown): value is Briefing {
  if (!value || typeof value !== "object") return false;
  const briefing = value as Partial<Briefing>;
  return (
    typeof briefing.executiveSummary === "string" &&
    !!briefing.person &&
    typeof briefing.person.authority === "string" &&
    isStringArray(briefing.person.priorities, 3) &&
    isStringArray(briefing.person.unknowns, 2) &&
    !!briefing.company &&
    typeof briefing.company.profile === "string" &&
    isStringArray(briefing.company.noteworthyEvents, 3) &&
    !!briefing.openaiRelevance &&
    typeof briefing.openaiRelevance.motion === "string" &&
    typeof briefing.openaiRelevance.rationale === "string" &&
    isStringArray(briefing.openaiRelevance.workflows, 3) &&
    isStringArray(briefing.compliance, 3) &&
    isStringArray(briefing.risks, 3) &&
    isStringArray(briefing.discoveryQuestions, 6)
  );
}

export function isBriefingModelResult(value: unknown): value is BriefingModelResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<BriefingModelResult>;

  if (result.outcome === "prompt_injection") {
    return result.briefing === null;
  }

  return result.outcome === "briefing" && isBriefing(result.briefing);
}

export function normalizeDiscoveryQuestions(items: string[]) {
  const questions = items.flatMap((item) => {
    const singleLine = item.replace(/\\n|\r?\n/g, " ").trim();
    const matches = singleLine.match(/[^?]+\?/g);
    return matches ?? [singleLine];
  });

  const cleaned = questions
    .map((question) =>
      question
        .replace(/^\s*(?:discoveryQuestions\s*[:=]\s*)?/i, "")
        .replace(/^[\s\[{"',]+/, "")
        .replace(/[\s\]}"',]+$/, "")
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((question) => question.length > 8 && question.endsWith("?"));

  return [...new Set(cleaned)].slice(0, 7);
}
