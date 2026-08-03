const CONTRACTIONS: Record<string, string> = {
  al: "a el",
  del: "de el",
  am: "an dem",
  ans: "an das",
  im: "in dem",
  ins: "in das",
  zum: "zu dem",
  zur: "zu der",
};

const NEGATIONS = new Set(["kein", "keine", "keinen", "nicht", "nie", "ni", "no", "nunca", "tampoco"]);
const OPEN_COMPLEMENT_WORDS = new Set(["a", "an", "auf", "con", "de", "en", "für", "mit", "para", "por", "zu"]);

export function normalizeAnswer(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFKC")
    .replace(/[¿?¡!.,;:()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandContractions(value: string) {
  return normalizeAnswer(value)
    .split(" ")
    .flatMap((token) => (CONTRACTIONS[token] ?? token).split(" "))
    .join(" ");
}

function withoutAccents(value: string) {
  return expandContractions(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[right.length];
}

function hasDifferentNegation(left: string, right: string) {
  const leftTokens = new Set(normalizeAnswer(left).split(" "));
  const rightTokens = new Set(normalizeAnswer(right).split(" "));
  return [...NEGATIONS].some((word) => leftTokens.has(word) !== rightTokens.has(word));
}

function ellipsisCandidates(value: string) {
  if (!/\.{3}|…/.test(value)) return [];
  const [rawPrefix = "", rawSuffix = ""] = value.split(/\.{3}|…/, 2);
  const prefixTokens = expandContractions(rawPrefix).split(" ").filter(Boolean);
  const suffix = expandContractions(rawSuffix);
  const candidates = [`${prefixTokens.join(" ")} ${suffix}`.trim()];
  if (OPEN_COMPLEMENT_WORDS.has(prefixTokens.at(-1) ?? "")) {
    candidates.push(`${prefixTokens.slice(0, -1).join(" ")} ${suffix}`.trim());
  }
  return candidates;
}

export function localAnswerVerdict(
  input: string,
  expected: string,
  acceptedAnswers: string[] = [],
): "exact" | "equivalent" | "almost" | null {
  const alternatives = [expected, ...acceptedAnswers]
    .flatMap((value) => [value, ...value.split(/\s*[/;]\s*/), ...ellipsisCandidates(value)])
    .filter(Boolean);
  const actual = normalizeAnswer(input);
  if (alternatives.some((candidate) => normalizeAnswer(candidate) === actual)) {
    return normalizeAnswer(expected) === actual ? "exact" : "equivalent";
  }

  const expanded = expandContractions(input);
  if (alternatives.some((candidate) => expandContractions(candidate) === expanded)) return "equivalent";

  const accentless = withoutAccents(input);
  if (alternatives.some((candidate) => withoutAccents(candidate) === accentless)) return "almost";

  if (!hasDifferentNegation(input, expected)) {
    const closeTypo = alternatives.some((candidate) => {
      const normalizedCandidate = withoutAccents(candidate);
      return normalizedCandidate.length >= 5
        && normalizedCandidate.split(" ").length === accentless.split(" ").length
        && editDistance(accentless, normalizedCandidate) === 1;
    });
    if (closeTypo) return "almost";
  }
  return null;
}

export function acceptsAnswer(input: string, expected: string, acceptedAnswers: string[] = []) {
  const verdict = localAnswerVerdict(input, expected, acceptedAnswers);
  return verdict === "exact" || verdict === "equivalent";
}
