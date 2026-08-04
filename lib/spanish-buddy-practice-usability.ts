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
  | "INVALID_MULTIPLE_CHOICE_OPTIONS"
  | "NON_SPANISH_MULTIPLE_CHOICE_CONTENT"
  | "INCONSISTENT_MULTIPLE_CHOICE_OPTIONS"
  | "UNEXPECTED_OPTIONS"
  | "FILL_GAP_MISSING"
  | "SENTENCE_ORDER_FRAGMENTS_MISSING"
  | "SELECTION_INSTRUCTION_WITHOUT_OPTIONS"
  | "READING_CONTEXT_LENGTH"
  | "READING_QUESTION_MISSING"
  | "ANSWER_IN_TASK_CONTEXT"
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
const SELECTION_EXERCISES = new Set([
  "lexical-contrast", "grammar-choice", "appropriate-response",
  "vocabulary-gap", "collocations", "conjugation-context", "complete-rule", "dialogue-completion",
]);
const FILL_GAP_EXERCISES = new Set(["vocabulary-gap", "collocations", "conjugation-context", "complete-rule", "dialogue-completion"]);
const READING_EXERCISES = new Set(["reading-main-idea", "reading-detail", "reading-reference", "reading-order", "reading-mediation"]);
const READING_QUESTION_EXERCISES = new Set(["reading-main-idea", "reading-detail", "reading-reference"]);
const DISPLAY_FIELDS = ["instruction", "context", "prompt", "germanSupport", "grammarReminder", "strongerHint"] as const;
const BASIC_HELP_FIELDS = ["germanSupport", "grammarReminder"] as const;

const SAFE_BASIC_HELP: Record<string, string> = {
  "written-recall": "Rufe die vollständige Bedeutung aus dem Gedächtnis ab; die Grundhilfe nennt keine Übersetzung.",
  "active-translation": "Formuliere selbst auf Spanisch und achte auf Artikel, Präpositionen und die vollständige Wendung.",
  "reverse-translation": "Formuliere selbst auf Deutsch und übertrage die vollständige Bedeutung, nicht nur einzelne Wörter.",
  "vocabulary-gap": "Nutze Satzbau, Kongruenz und Bedeutung des gesamten Satzes, bevor du das fehlende Wort einsetzt.",
  collocations: "Prüfe, welche feste Verbindung die Lücke grammatisch und idiomatisch vervollständigt.",
  "lexical-contrast": "Vergleiche alle Optionen im gegebenen Kontext; die Grundhilfe schließt keine einzelne Option aus.",
  "own-sentence": "Bilde ein eigenes natürliches Beispiel; die Referenz ist nur eine mögliche Lösung.",
  "conjugation-dice": "Bestimme zuerst Person und Zeitform und bilde danach die passende Verbform.",
  "conjugation-context": "Bestimme aus dem Kontext Person, Zeit und Aussageabsicht, bevor du die Form bildest.",
  "sentence-transformation": "Verändere nur das verlangte Merkmal und bewahre Personen, Rollen und Hauptbedeutung.",
  "pronoun-substitution": "Bestimme zuerst die Rollen der Satzteile und ersetze sie anschließend in natürlicher Reihenfolge.",
  "grammar-choice": "Vergleiche Bedeutung und Satzstruktur aller Optionen; die Grundhilfe nennt keine richtige Auswahl.",
  "error-correction": "Suche genau einen Fehler, der zum aktuellen Lernziel gehört, und ändere nur das Nötige.",
  "sentence-order": "Finde zuerst Prädikat und zusammengehörige Satzteile und ordne dann den vollständigen Satz.",
  "complete-rule": "Rufe die Regel aus dem Kurs ab; die Grundhilfe nennt den fehlenden Fachbegriff nicht.",
  "guided-production": "Drücke die verlangte Absicht natürlich aus; mehrere Formulierungen können richtig sein.",
  "dialogue-completion": "Antworte passend auf die kommunikative Absicht; mehrere natürliche Reaktionen sind möglich.",
  "appropriate-response": "Vergleiche Funktion und Register aller Reaktionen; die Grundhilfe schließt keine Option aus.",
  "contextual-translation": "Übertrage Absicht und Register natürlich statt Wort für Wort.",
  "reading-main-idea": "Fasse den Zweck des gesamten Textes zusammen und verliere dich nicht in Einzelheiten.",
  "reading-detail": "Suche die Textstelle, die deine Antwort belegt, ohne zusätzliche Informationen zu erfinden.",
  "reading-reference": "Suche einen grammatisch und inhaltlich passenden Bezug im vorherigen Text.",
  "reading-order": "Nutze Zeitangaben und Konnektoren; die Grundhilfe nennt weder Anfang noch Ende.",
  "reading-mediation": "Bewahre die wesentlichen Informationen und formuliere sie adressatengerecht statt wörtlich.",
};

export function applyExerciseUsabilityGuardrails<T extends PracticeExerciseForAudit>(exercise: T): T {
  return {
    ...exercise,
    germanSupport: SAFE_BASIC_HELP[exercise.exerciseType]
      ?? "Löse die Aufgabe aus dem gegebenen Kontext; die Grundhilfe nennt die Antwort nicht.",
    grammarReminder: "",
  };
}

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

function looksGerman(value: string) {
  const normalized = ` ${normalizeComparable(value)} `;
  const markers = [" der ", " die ", " das ", " den ", " dem ", " des ", " ein ", " eine ", " einen ", " einem ", " einer ", " und ", " oder ", " mit ", " für ", " uber ", " sind ", " ist ", " werden ", " meistens ", " diesen ", " welche ", " welcher ", " welches "];
  const markerCount = markers.filter((marker) => normalized.includes(marker)).length;
  return /[äöüß]/i.test(value) || markerCount >= 2;
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

  if (SELECTION_EXERCISES.has(exercise.exerciseType)) {
    const normalizedAnswer = normalizeComparable(exercise.answer);
    const answerCount = normalizedOptions.filter((option) => option === normalizedAnswer).length;
    if (normalizedOptions.length < 2 || normalizedOptions.length > 4 || answerCount !== 1) {
      pushUnique(issues, {
        code: "INVALID_MULTIPLE_CHOICE_OPTIONS",
        severity: "error",
        fields: ["options", "answer"],
        evidence: `${exercise.options.length} options; answer appears ${answerCount} times`,
      });
    }
    const germanFields = [
      ...(looksGerman(exercise.answer) ? ["answer"] : []),
      ...exercise.options.flatMap((option, index) => looksGerman(option) ? [`options[${index}]`] : []),
    ];
    if (germanFields.length) {
      pushUnique(issues, {
        code: "NON_SPANISH_MULTIPLE_CHOICE_CONTENT",
        severity: "error",
        fields: germanFields,
        evidence: germanFields.join(", "),
      });
    }
    const optionWordCounts = exercise.options.map((option) => normalizeComparable(option).split(" ").filter(Boolean).length);
    const shortestOption = Math.min(...optionWordCounts);
    const longestOption = Math.max(...optionWordCounts);
    if (shortestOption > 0 && shortestOption <= 5 && longestOption >= 10 && longestOption / shortestOption >= 3) {
      pushUnique(issues, {
        code: "INCONSISTENT_MULTIPLE_CHOICE_OPTIONS",
        severity: "error",
        fields: ["options"],
        evidence: `${shortestOption}-${longestOption} words per option`,
      });
    }
  } else if (normalizedOptions.length) {
    pushUnique(issues, {
      code: "UNEXPECTED_OPTIONS",
      severity: "error",
      fields: ["options", "exerciseType"],
      evidence: exercise.exerciseType,
    });
  }

  if (!normalizedOptions.length && /\b(?:elige|selecciona|escoge)\b/i.test(exercise.instruction)) {
    pushUnique(issues, {
      code: "SELECTION_INSTRUCTION_WITHOUT_OPTIONS",
      severity: "error",
      fields: ["instruction", "options"],
      evidence: exercise.instruction,
    });
  }

  if (FILL_GAP_EXERCISES.has(exercise.exerciseType) && !/_{2,}/.test(`${exercise.context}\n${exercise.prompt}`)) {
    pushUnique(issues, {
      code: "FILL_GAP_MISSING",
      severity: "error",
      fields: ["context", "prompt"],
      evidence: exercise.prompt,
    });
  }

  if (exercise.exerciseType === "sentence-order") {
    const taskText = `${exercise.context}\n${exercise.prompt}`;
    const separatorCount = (taskText.match(/(?:\s[/|·→]\s|\n\s*[-•\d]+[.)])/g) ?? []).length;
    if (separatorCount < 2) {
      pushUnique(issues, {
        code: "SENTENCE_ORDER_FRAGMENTS_MISSING",
        severity: "error",
        fields: ["context", "prompt"],
        evidence: exercise.prompt,
      });
    }
  }

  if (READING_EXERCISES.has(exercise.exerciseType)) {
    const wordCount = normalizeComparable(exercise.context).split(" ").filter(Boolean).length;
    if (wordCount < 45 || wordCount > 90) {
      pushUnique(issues, {
        code: "READING_CONTEXT_LENGTH",
        severity: "error",
        fields: ["context"],
        evidence: `${wordCount} words`,
      });
    }
  }

  if (READING_QUESTION_EXERCISES.has(exercise.exerciseType) && !/[?¿]/.test(exercise.prompt)) {
    pushUnique(issues, {
      code: "READING_QUESTION_MISSING",
      severity: "error",
      fields: ["prompt"],
      evidence: exercise.prompt,
    });
  }

  if (
    exercise.exerciseType === "sentence-order"
    && meaningfulForDuplicate(exercise.answer)
    && (
      containsWholePhrase(exercise.context, exercise.answer)
      || similarity(exercise.context, exercise.answer) >= 0.7
    )
  ) {
    pushUnique(issues, {
      code: "ANSWER_IN_TASK_CONTEXT",
      severity: "error",
      fields: ["context", "answer"],
      evidence: exercise.context,
    });
  }

  return {
    usable: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}
