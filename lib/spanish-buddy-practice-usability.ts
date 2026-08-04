export type PracticeExerciseForAudit = {
  exerciseType: string;
  instruction: string;
  context: string;
  prompt: string;
  answer: string;
  answerTranslation: string;
  options: string[];
  acceptedAnswers: string[];
  germanSupport: string;
  grammarReminder: string;
  strongerHint: string;
};

export type ExerciseUsabilityIssueCode =
  | "ANSWER_IN_BASIC_HELP"
  | "ANSWER_TRANSLATION_IN_BASIC_HELP"
  | "REPEATED_TEXT_WITHIN_FIELD"
  | "REPEATED_TEXT_ACROSS_FIELDS"
  | "DUPLICATE_OPTIONS";

export type ExerciseUsabilityIssue = {
  code: ExerciseUsabilityIssueCode;
  severity: "error" | "warning";
  fields: string[];
  evidence: string;
};

export type ExerciseUsabilityAudit = {
  usable: boolean;
  issues: ExerciseUsabilityIssue[];
};

const SOURCE_TRANSLATION_EXERCISES = new Set(["active-translation", "contextual-translation"]);
const DISPLAY_FIELDS = ["instruction", "context", "prompt", "germanSupport", "grammarReminder", "strongerHint"] as const;
const BASIC_HELP_FIELDS = ["germanSupport", "grammarReminder"] as const;

function normalizeComparable(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(value: string) {
  return value
    .split(/(?:[.!?…]+\s+)|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokens(value: string) {
  return new Set(normalizeComparable(value).split(" ").filter(Boolean));
}

function similarity(left: string, right: string) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

function meaningfulForDuplicate(value: string) {
  const normalized = normalizeComparable(value);
  return normalized.length >= 18 && normalized.split(" ").length >= 4;
}

function containsWholePhrase(container: string, phrase: string) {
  const normalizedContainer = normalizeComparable(container);
  const normalizedPhrase = normalizeComparable(phrase);
  if (normalizedPhrase.length < 3) return false;
  return ` ${normalizedContainer} `.includes(` ${normalizedPhrase} `);
}

function duplicateEvidence(left: string, right: string) {
  const normalizedLeft = normalizeComparable(left);
  const normalizedRight = normalizeComparable(right);
  if (!meaningfulForDuplicate(left) || !meaningfulForDuplicate(right)) return null;
  if (normalizedLeft === normalizedRight || similarity(left, right) >= 0.9) {
    return left.length <= right.length ? left : right;
  }
  return null;
}

function pushUnique(issues: ExerciseUsabilityIssue[], issue: ExerciseUsabilityIssue) {
  const key = `${issue.code}:${[...issue.fields].sort().join(",")}:${normalizeComparable(issue.evidence)}`;
  const exists = issues.some((candidate) => (
    `${candidate.code}:${[...candidate.fields].sort().join(",")}:${normalizeComparable(candidate.evidence)}` === key
  ));
  if (!exists) issues.push(issue);
}

export function auditExerciseUsability(exercise: PracticeExerciseForAudit): ExerciseUsabilityAudit {
  const issues: ExerciseUsabilityIssue[] = [];
  const answerCandidates = [exercise.answer, ...exercise.acceptedAnswers].filter(Boolean);

  for (const field of BASIC_HELP_FIELDS) {
    const value = exercise[field];
    for (const answer of answerCandidates) {
      if (containsWholePhrase(value, answer)) {
        pushUnique(issues, {
          code: "ANSWER_IN_BASIC_HELP",
          severity: "error",
          fields: ["answer", field],
          evidence: answer,
        });
      }
    }

    if (
      !SOURCE_TRANSLATION_EXERCISES.has(exercise.exerciseType)
      && containsWholePhrase(value, exercise.answerTranslation)
    ) {
      pushUnique(issues, {
        code: "ANSWER_TRANSLATION_IN_BASIC_HELP",
        severity: "error",
        fields: ["answerTranslation", field],
        evidence: exercise.answerTranslation,
      });
    }
  }

  for (const field of DISPLAY_FIELDS) {
    const parts = sentences(exercise[field]);
    for (let leftIndex = 0; leftIndex < parts.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < parts.length; rightIndex += 1) {
        const evidence = duplicateEvidence(parts[leftIndex], parts[rightIndex]);
        if (evidence) {
          pushUnique(issues, {
            code: "REPEATED_TEXT_WITHIN_FIELD",
            severity: "error",
            fields: [field],
            evidence,
          });
        }
      }
    }
  }

  for (let leftIndex = 0; leftIndex < DISPLAY_FIELDS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < DISPLAY_FIELDS.length; rightIndex += 1) {
      const leftField = DISPLAY_FIELDS[leftIndex];
      const rightField = DISPLAY_FIELDS[rightIndex];
      for (const leftSentence of sentences(exercise[leftField])) {
        for (const rightSentence of sentences(exercise[rightField])) {
          const evidence = duplicateEvidence(leftSentence, rightSentence);
          if (evidence) {
            pushUnique(issues, {
              code: "REPEATED_TEXT_ACROSS_FIELDS",
              severity: "error",
              fields: [leftField, rightField],
              evidence,
            });
          }
        }
      }
    }
  }

  const normalizedOptions = exercise.options.map(normalizeComparable).filter(Boolean);
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    pushUnique(issues, {
      code: "DUPLICATE_OPTIONS",
      severity: "error",
      fields: ["options"],
      evidence: exercise.options.join(" | "),
    });
  }

  return {
    usable: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}
