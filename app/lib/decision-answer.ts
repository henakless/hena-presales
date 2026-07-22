export type EvidenceKind = "requirement" | "observed" | "pending" | "synthesis";

export type CitedClaim = {
  text: string;
  evidenceKind: EvidenceKind;
  sourceIds: string[];
};

export type DecisionAnswer = {
  recommendation: CitedClaim;
  evidence: [CitedClaim, CitedClaim];
  uncertainty: CitedClaim;
  nextStep: CitedClaim;
};

export type AnswerGeneration = {
  mode: "live" | "fallback";
  model: string;
  validated: boolean;
  notice: string | null;
};

export type DecisionAnswerApiResponse = {
  answer: DecisionAnswer;
  generation: AnswerGeneration;
};

const claim = (
  text: string,
  evidenceKind: EvidenceKind,
  sourceIds: string[],
): CitedClaim => ({ text, evidenceKind, sourceIds });

export const DEFAULT_QUESTION = "What should happen next before a buying decision?";

export const DEFAULT_ANSWER: DecisionAnswer = {
  recommendation: claim(
    "Use the final network-adjusted retest as the decision gate. The fallback is only credible when identity, endpoints, communications, and enterprise network controls work together under the agreed crisis conditions.",
    "synthesis",
    ["req-independence", "req-environment", "pending-retest"],
  ),
  evidence: [
    claim(
      "Mobile validation completed successfully, proving one part of the fallback path.",
      "observed",
      ["obs-mobile"],
    ),
    claim(
      "The web and desktop blocker was traced to customer-side proxy and SSL-inspection settings, turning a vague failure into a testable network change.",
      "observed",
      ["obs-network"],
    ),
  ],
  uncertainty: claim(
    "The final web and desktop retest is still pending, and the opportunity is not Closed Won or a production deployment.",
    "pending",
    ["pending-retest", "pending-outcome"],
  ),
  nextStep: claim(
    "Retest web and desktop after the network adjustment, record the result against every success criterion, and make the buying decision from that evidence.",
    "pending",
    ["req-environment", "req-usability", "pending-retest"],
  ),
};

const RISK_ANSWER: DecisionAnswer = {
  recommendation: claim(
    "Treat hidden dependency as the primary risk. A crisis fallback fails its purpose if access, communications, or managed devices still depend on the primary Microsoft or enterprise network control plane.",
    "synthesis",
    ["req-independence", "req-auth", "req-environment"],
  ),
  evidence: [
    claim(
      "The intended access path uses local accounts with TOTP-based MFA rather than Entra ID or Microsoft SSO.",
      "requirement",
      ["req-auth", "req-independence"],
    ),
    claim(
      "Web and desktop testing exposed a real dependency on proxy and SSL-inspection configuration.",
      "observed",
      ["obs-network"],
    ),
  ],
  uncertainty: claim(
    "The available evidence does not yet show that the adjusted network path works across web and desktop in the customer environment.",
    "pending",
    ["pending-retest"],
  ),
  nextStep: claim(
    "Run the network-adjusted retest without relying on Microsoft identity, then retain the result as readiness evidence.",
    "pending",
    ["req-independence", "pending-retest"],
  ),
};

const VALUE_ANSWER: DecisionAnswer = {
  recommendation: claim(
    "Frame the value as preserved crisis coordination, not another messaging tool. The buying case depends on whether the central Crisis Team can keep trusted communication available when the primary stack fails.",
    "synthesis",
    ["req-scope", "req-independence", "req-communications"],
  ),
  evidence: [
    claim(
      "The documented scope covers roughly 25–30 central Crisis Management users and the communications they need during a primary-stack failure.",
      "requirement",
      ["req-scope", "req-communications"],
    ),
    claim(
      "The PoV is tied to an internal ISO audit action and NIS2-related resilience requirements.",
      "requirement",
      ["req-drivers"],
    ),
  ],
  uncertainty: claim(
    "The evidence supports a resilience need and partial technical validation, but it does not establish a completed purchase, rollout, or production outcome.",
    "pending",
    ["obs-mobile", "pending-retest", "pending-outcome"],
  ),
  nextStep: claim(
    "Agree what operational outcome defines readiness, then use the final retest to decide whether the solution meets it.",
    "synthesis",
    ["req-usability", "pending-retest"],
  ),
};

export function fallbackAnswerForQuestion(question: string): DecisionAnswer {
  const normalized = question.toLowerCase();
  if (/risk|trust|security|compliance|fail|dependency/.test(normalized)) {
    return RISK_ANSWER;
  }
  if (/value|business|buy|purchase|roi|outcome/.test(normalized)) {
    return VALUE_ANSWER;
  }
  return DEFAULT_ANSWER;
}
