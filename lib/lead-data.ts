export type Contact = {
  id: string;
  initials: string;
  name: string;
  role: string;
  brief: string;
  authority: string;
  priorities: string[];
};

export type Company = {
  id: string;
  initial: string;
  name: string;
  industry: string;
  scale: string;
  footprint: string;
  profile: string;
  signals: string[];
  workflows: string[];
  compliance: string[];
  risks: string[];
  motion: string;
  motionDetail: string;
};

export const CONTACTS: Contact[] = [
  {
    id: "entor",
    initials: "EP",
    name: "Entor Price",
    role: "Chief Technology Officer",
    brief:
      "Leads enterprise modernization at a global logistics company. Interested in secure AI assistants for developers, operations teams, and internal knowledge search.",
    authority:
      "Likely technical sponsor and architecture decision-maker. May control platform budget, but business-unit adoption and procurement authority still need to be mapped.",
    priorities: ["Developer velocity", "Operational resilience", "Secure knowledge access"],
  },
  {
    id: "paige",
    initials: "PT",
    name: "Paige Turner",
    role: "Chief Knowledge Officer",
    brief:
      "Oversees research and document management at an international consulting firm. Wants an enterprise AI assistant to accelerate analysis, summarize client materials, and surface institutional knowledge.",
    authority:
      "Strong business owner for knowledge workflows and adoption. Likely needs the CIO, security, legal, and practice leaders to approve the platform and data-access model.",
    priorities: ["Research quality", "Knowledge reuse", "Client confidentiality"],
  },
  {
    id: "al",
    initials: "AG",
    name: "Al Gorithm",
    role: "VP of AI Transformation",
    brief:
      "Runs automation initiatives for a large retail group. Evaluating enterprise AI platforms for customer support, merchandising insights, and employee productivity—with governance and security as priorities.",
    authority:
      "Likely orchestrates the evaluation and owns the transformation roadmap. Budget may sit across technology and business units; production ownership is probably distributed.",
    priorities: ["Scaled automation", "Measurable value", "Governed deployment"],
  },
];

export const COMPANIES: Company[] = [
  {
    id: "prompt",
    initial: "P",
    name: "Prompt & Circumstance Consulting",
    industry: "Strategy consulting",
    scale: "12,000 people",
    footprint: "Global · 28 offices",
    profile:
      "A strategy consultancy looking to improve research, proposal writing, and knowledge sharing across global teams.",
    signals: [
      "An enterprise knowledge-platform consolidation is planned for this year.",
      "A proposal-writing pilot has executive visibility but no agreed success metric yet.",
      "The global risk committee is reviewing how generative AI may touch confidential client material.",
    ],
    workflows: [
      "Grounded research workspace that synthesizes approved internal and external sources with citations.",
      "Proposal copilot that finds reusable credentials, case studies, and experts before drafting a first response.",
      "Engagement close-out agent that turns final deliverables into tagged, permission-aware institutional knowledge.",
    ],
    compliance: [
      "Client confidentiality and ethical walls",
      "Data residency and retention",
      "Source traceability",
      "Role-based knowledge access",
    ],
    risks: [
      "A generic seat rollout without workflow ownership",
      "Low trust if answers cannot point to sources",
      "Overlapping Microsoft or in-house knowledge initiatives",
    ],
    motion: "Enterprise AI assistant + selective API workflows",
    motionDetail:
      "A secure enterprise assistant is the clearest starting point for broad knowledge work. Model APIs become relevant where proposal or close-out workflows need structured actions in document systems.",
  },
  {
    id: "model",
    initial: "M",
    name: "Model Citizens Bank",
    industry: "Financial services",
    scale: "34,000 employees",
    footprint: "Multinational · EU + UK + US",
    profile:
      "A multinational financial-services company exploring governed AI for compliance analysis, employee support, and software development.",
    signals: [
      "A group-wide AI governance framework has been approved; implementation standards remain open.",
      "The software-modernization portfolio is expanding across three regulated business lines.",
      "Procurement is preparing third-party model-risk requirements for production AI vendors.",
    ],
    workflows: [
      "Compliance-analysis assistant that compares policy changes with internal controls and preserves a review trail.",
      "Employee support agent grounded in approved procedures, with deterministic escalation for regulated decisions.",
      "AI-assisted engineering workflow for legacy modernization, test generation, and secure code review.",
    ],
    compliance: [
      "EU AI Act role and risk classification",
      "DORA and operational resilience",
      "Model-risk management",
      "PII, banking secrecy, and audit logging",
    ],
    risks: [
      "Treating a sandbox approval as production approval",
      "Unclear accountability for model outputs",
      "Legacy data access becoming the critical path",
    ],
    motion: "Model API platform + coding assistant, with a governed workplace pilot",
    motionDetail:
      "Purpose-built applications fit regulated workflows; an AI coding assistant supports the teams building them. A contained workplace-assistant cohort can validate lower-risk employee productivity use cases.",
  },
  {
    id: "token",
    initial: "T",
    name: "Token Transit Group",
    industry: "Shipping and logistics",
    scale: "46,000 employees",
    footprint: "70 countries · 24/7 operations",
    profile:
      "A global shipping and logistics operator interested in AI-powered route analysis, operations support, contract processing, and multilingual customer service.",
    signals: [
      "A multilingual operations program is being standardized across Europe and APAC.",
      "A recent acquisition increased the contract-processing backlog and fragmented operating procedures.",
      "The route-disruption command center is modernizing how teams interpret alerts and coordinate responses.",
    ],
    workflows: [
      "Operations copilot that summarizes live disruption signals, SOPs, and shipment context for human dispatchers.",
      "Contract intake workflow that extracts obligations, flags exceptions, and routes clauses for specialist review.",
      "Multilingual customer-service agent that preserves shipment context and hands off high-impact exceptions.",
    ],
    compliance: [
      "Cross-border data transfers",
      "Trade and sanctions controls",
      "Customer and shipment confidentiality",
      "Human control of operational decisions",
    ],
    risks: [
      "Real-time data quality and system latency",
      "Automation crossing from advice into operational control",
      "Unclear value baseline across regions",
    ],
    motion: "Model API platform + agentic workflows + real-time AI",
    motionDetail:
      "The highest-value use cases are integrated and event-driven. An enterprise assistant may still support corporate knowledge work, but the core motion is a governed application layer.",
  },
];

export const DEFAULT_MESSAGE = "We’re looking for an AI tool for 6,000 people.";
