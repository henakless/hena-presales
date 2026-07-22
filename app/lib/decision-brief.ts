export const LENS_IDS = ["balanced", "business", "technical", "trust"] as const;

export type Lens = (typeof LENS_IDS)[number];
export type EvidenceKind = "requirement" | "observed" | "pending" | "synthesis";

export type CitedClaim = {
  text: string;
  evidenceKind: EvidenceKind;
  sourceIds: string[];
};

export type StakeholderView = {
  headline: CitedClaim;
  recommendation: CitedClaim;
  nextDecision: CitedClaim;
};

export type DecisionBrief = {
  stakeholderViews: Record<Lens, StakeholderView>;
  executiveSummary: CitedClaim;
  businessValue: CitedClaim[];
  architectureDirection: CitedClaim[];
  successCriteria: CitedClaim[];
  trustReadiness: CitedClaim[];
  technicalTurningPoint: CitedClaim[];
  currentStatus: CitedClaim[];
  personalContribution: CitedClaim[];
  openQuestions: CitedClaim[];
};

export type BriefGeneration = {
  mode: "live" | "fallback";
  model: string;
  validated: boolean;
  notice: string | null;
};

export type BriefApiResponse = {
  brief: DecisionBrief;
  generation: BriefGeneration;
};

const claim = (
  text: string,
  evidenceKind: EvidenceKind,
  sourceIds: string[],
): CitedClaim => ({ text, evidenceKind, sourceIds });

export const CURATED_BRIEF: DecisionBrief = {
  stakeholderViews: {
    balanced: {
      headline: claim(
        "Validate the whole fallback, not only the application.",
        "synthesis",
        ["req-independence", "req-environment", "pending-retest"],
      ),
      recommendation: claim(
        "Test identities, people, devices, communications, networks, and operating procedures together so the decision reflects the real crisis path.",
        "synthesis",
        ["req-auth", "req-communications", "req-environment", "req-usability"],
      ),
      nextDecision: claim(
        "Run the final network-adjusted test against the agreed success criteria.",
        "pending",
        ["pending-retest"],
      ),
    },
    business: {
      headline: claim(
        "Protect the Crisis Team’s ability to coordinate when the primary stack fails.",
        "synthesis",
        ["req-scope", "req-independence", "req-communications"],
      ),
      recommendation: claim(
        "Connect the technical fallback to the audit action, accountable crisis roles, and the operational impact of losing trusted communication.",
        "synthesis",
        ["req-drivers", "req-scope", "req-usability"],
      ),
      nextDecision: claim(
        "Confirm the required recovery outcome and the owner of ongoing readiness.",
        "synthesis",
        ["req-drivers", "req-usability"],
      ),
    },
    technical: {
      headline: claim(
        "Prove independence across identity, endpoints, and network controls.",
        "synthesis",
        ["req-independence", "req-auth", "req-environment"],
      ),
      recommendation: claim(
        "Validate local authentication, managed clients, notification and media paths, proxy behavior, and the absence of hidden Microsoft dependencies under realistic conditions.",
        "synthesis",
        ["req-auth", "req-communications", "req-environment", "obs-network"],
      ),
      nextDecision: claim(
        "Retest web and desktop after the proxy and SSL-inspection adjustment.",
        "pending",
        ["obs-network", "pending-retest"],
      ),
    },
    trust: {
      headline: claim(
        "Make readiness repeatable, auditable, and owned.",
        "synthesis",
        ["req-drivers", "req-independence", "pending-retest"],
      ),
      recommendation: claim(
        "Use the PoV evidence to address the audit action, then assign ownership for emergency access, recurring exercises, and configuration drift.",
        "synthesis",
        ["req-drivers", "req-auth", "req-environment"],
      ),
      nextDecision: claim(
        "Agree control owners, evidence retention, and a recurring exercise schedule.",
        "synthesis",
        ["req-drivers", "req-usability"],
      ),
    },
  },
  executiveSummary: claim(
    "This is an operational-resilience decision, not a messaging replacement: the fallback is credible only if identity, communications, endpoints, and network paths remain independent of the primary Microsoft control plane.",
    "synthesis",
    ["req-independence", "req-auth", "req-communications", "req-environment"],
  ),
  businessValue: [
    claim(
      "Preserve trusted executive and operational coordination when the primary collaboration and identity stack fails or cannot be trusted.",
      "synthesis",
      ["req-scope", "req-independence", "req-communications"],
    ),
    claim(
      "Turn an ISO audit action and NIS2 resilience need into observable test evidence.",
      "synthesis",
      ["req-drivers", "req-usability"],
    ),
  ],
  architectureDirection: [
    claim("Use local identities and TOTP MFA as the separate access path.", "requirement", ["req-auth"]),
    claim("Keep administration independent of Entra ID and Microsoft SSO.", "requirement", ["req-independence"]),
    claim("Cover messaging, notifications, files, voice, and video.", "requirement", ["req-communications"]),
    claim("Validate mobile, web, and desktop through VPN, proxy, and real-time media paths.", "requirement", ["req-environment"]),
  ],
  successCriteria: [
    claim("Authentication and communication remain available without M365 or Entra ID.", "requirement", ["req-independence"]),
    claim("Local accounts and TOTP MFA provide a separate, secure access path.", "requirement", ["req-auth"]),
    claim("Messaging, calls, notifications, and file exchange work for the Crisis Team.", "requirement", ["req-communications"]),
    claim("Mobile, web, and desktop clients work through the enterprise network environment.", "requirement", ["req-environment"]),
    claim("Core workflows remain stable and usable under crisis conditions.", "requirement", ["req-usability"]),
  ],
  trustReadiness: [
    claim("Keep identity and recovery dependencies separate from the primary stack.", "synthesis", ["req-independence", "req-auth"]),
    claim("Retain evidence that maps the audit and resilience drivers to tested controls.", "synthesis", ["req-drivers", "req-usability"]),
    claim("Before production, assign owners for emergency access, exercise cadence, and configuration drift.", "synthesis", ["req-auth", "req-environment"]),
  ],
  technicalTurningPoint: [
    claim("Mobile validation completed successfully.", "observed", ["obs-mobile"]),
    claim("The web and desktop issue was traced to customer-side proxy and SSL-inspection settings, enabling concrete network guidance.", "observed", ["obs-network"]),
  ],
  currentStatus: [
    claim("The legal reviews were complete at the documented opportunity stage.", "observed", ["obs-legal"]),
    claim("The available evidence supports a largely validated technical fit, subject to the final network retest.", "synthesis", ["obs-mobile", "obs-network", "pending-retest"]),
    claim("Final network validation remains pending, and the opportunity is not Closed Won.", "pending", ["pending-retest", "pending-outcome"]),
  ],
  personalContribution: [
    claim("Translated customer requirements into concrete test scenarios and success criteria.", "observed", ["contribution-tests"]),
    claim("Presented the solution and supported setup and testing across mobile, web, and desktop.", "observed", ["contribution-setup"]),
    claim("Troubleshot network and connectivity behavior jointly with the customer.", "observed", ["contribution-diagnosis"]),
    claim("Documented findings, recommendations, and the next technical validation step.", "observed", ["contribution-documentation"]),
  ],
  openQuestions: [
    claim("Will web and desktop meet every success criterion after the global network adjustment?", "pending", ["pending-retest"]),
    claim("Who will own recurring readiness exercises and configuration-drift checks after the technical decision?", "synthesis", ["req-drivers", "req-environment"]),
  ],
};

