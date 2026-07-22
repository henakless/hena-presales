export type SourceKind = "requirement" | "observed" | "pending";

export type EvidenceSource = {
  id: string;
  label: string;
  kind: SourceKind;
  title: string;
  fact: string;
};

export const CRISIS_CASE = {
  id: "crisis-comms-v1",
  title: "Microsoft-independent crisis communications",
  customerType: "International European industrial group",
  userScope: "Approximately 30 central Crisis Management users",
  summary:
    "The central Crisis Management Team needs a trusted communications fallback when Microsoft 365 and Entra ID are unavailable or no longer trusted.",
  drivers: ["Internal ISO audit", "NIS2 resilience", "Primary-stack failure"],
  discovery: [
    {
      question: "What must remain independent?",
      answer:
        "Teams, Microsoft 365, Entra ID, and Microsoft SSO. The fallback uses local accounts with TOTP-based MFA.",
      sourceIds: ["req-independence", "req-auth"],
    },
    {
      question: "What must the Crisis Team be able to do?",
      answer:
        "Send messages and files, receive notifications, and conduct voice and video calls during a primary-stack failure.",
      sourceIds: ["req-communications"],
    },
    {
      question: "Where must the fallback work?",
      answer:
        "On mobile, in the browser, and on managed desktop devices — including through the customer’s VPN, proxy, and security controls.",
      sourceIds: ["req-environment"],
    },
    {
      question: "What defines a credible PoV?",
      answer:
        "Technical stability and usable crisis workflows for approximately 30 central Crisis Management users, tested under realistic constraints.",
      sourceIds: ["req-scope", "req-usability"],
    },
  ],
  sources: [
    {
      id: "req-scope",
      label: "R1",
      kind: "requirement",
      title: "Customer and PoV scope",
      fact:
        "The customer is an international European industrial group. The PoV covers approximately 25–30 members of its central Crisis Management Team.",
    },
    {
      id: "req-independence",
      label: "R2",
      kind: "requirement",
      title: "Microsoft independence",
      fact:
        "Authentication and communication must function without Microsoft 365, Entra ID, Microsoft SSO, or another required Microsoft component.",
    },
    {
      id: "req-auth",
      label: "R3",
      kind: "requirement",
      title: "Separate authentication",
      fact: "The fallback uses local accounts with TOTP-based multi-factor authentication.",
    },
    {
      id: "req-communications",
      label: "R4",
      kind: "requirement",
      title: "Crisis communications",
      fact:
        "The Crisis Management Team must be able to use messaging, notifications, voice and video calls, and secure file exchange.",
    },
    {
      id: "req-environment",
      label: "R5",
      kind: "requirement",
      title: "Enterprise environment",
      fact:
        "The service must work on mobile, web, and managed desktop devices through the customer’s VPN, proxy, and existing security controls.",
    },
    {
      id: "req-usability",
      label: "R6",
      kind: "requirement",
      title: "Stability and usability",
      fact:
        "Calls, notifications, and core communication workflows must remain stable and usable without unnecessary complexity for the crisis team.",
    },
    {
      id: "req-drivers",
      label: "R7",
      kind: "requirement",
      title: "Audit and resilience drivers",
      fact:
        "The PoV is driven by an internal ISO audit action and NIS2-related resilience requirements for security incidents.",
    },
    {
      id: "obs-mobile",
      label: "O1",
      kind: "observed",
      title: "Mobile validation",
      fact: "Mobile tests completed successfully.",
    },
    {
      id: "obs-network",
      label: "O2",
      kind: "observed",
      title: "Network diagnosis",
      fact:
        "Observed web and desktop issues were traced to customer-side proxy and SSL-inspection settings. Guidance was provided for domains, ports, and real-time communications.",
    },
    {
      id: "obs-legal",
      label: "O3",
      kind: "observed",
      title: "Legal review",
      fact: "The legal reviews were complete at the documented opportunity stage.",
    },
    {
      id: "pending-retest",
      label: "P1",
      kind: "pending",
      title: "Final network retest",
      fact:
        "A final web and desktop test after adjustment of the global network configuration was still pending.",
    },
    {
      id: "pending-outcome",
      label: "P2",
      kind: "pending",
      title: "Commercial outcome",
      fact:
        "The opportunity had not been completed as Closed Won and must not be represented as a production deployment or published customer reference.",
    },
    {
      id: "contribution-tests",
      label: "C1",
      kind: "observed",
      title: "Requirements to tests",
      fact:
        "Hena translated the customer requirements into concrete test scenarios and success criteria.",
    },
    {
      id: "contribution-setup",
      label: "C2",
      kind: "observed",
      title: "Solution and setup",
      fact:
        "Hena presented the technical solution and supported setup and testing across mobile, web, and desktop.",
    },
    {
      id: "contribution-diagnosis",
      label: "C3",
      kind: "observed",
      title: "Joint troubleshooting",
      fact:
        "Hena analyzed network and connectivity behavior jointly with the customer and helped isolate the proxy and SSL-inspection issue.",
    },
    {
      id: "contribution-documentation",
      label: "C4",
      kind: "observed",
      title: "Decision documentation",
      fact:
        "Hena documented findings, technical recommendations, and the next validation steps.",
    },
  ] satisfies EvidenceSource[],
} as const;

export const SOURCE_BY_ID = Object.fromEntries(
  CRISIS_CASE.sources.map((source) => [source.id, source]),
) as Record<string, EvidenceSource>;

