"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Briefing } from "../lib/briefing";

type Contact = {
  id: string;
  initials: string;
  name: string;
  role: string;
  brief: string;
  authority: string;
  priorities: string[];
};

type Company = {
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

type PromptInjectionGuardrail = {
  kind: "prompt_injection";
  title: string;
  message: string;
};

const CONTACTS: Contact[] = [
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
      "Oversees research and document management at an international consulting firm. Wants ChatGPT Enterprise to accelerate analysis, summarize client materials, and surface institutional knowledge.",
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
      "Runs automation initiatives for a large retail group. Evaluating OpenAI for customer support, merchandising insights, and employee productivity—with governance and security as priorities.",
    authority:
      "Likely orchestrates the evaluation and owns the transformation roadmap. Budget may sit across technology and business units; production ownership is probably distributed.",
    priorities: ["Scaled automation", "Measurable value", "Governed deployment"],
  },
];

const COMPANIES: Company[] = [
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
    compliance: ["Client confidentiality and ethical walls", "Data residency and retention", "Source traceability", "Role-based knowledge access"],
    risks: ["A generic seat rollout without workflow ownership", "Low trust if answers cannot point to sources", "Overlapping Microsoft or in-house knowledge initiatives"],
    motion: "ChatGPT Enterprise + selective API workflows",
    motionDetail:
      "ChatGPT Enterprise is the clearest starting point for broad knowledge work. The API becomes relevant where proposal or close-out workflows need structured actions in document systems.",
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
      "Codex-enabled engineering workflow for legacy modernization, test generation, and secure code review.",
    ],
    compliance: ["EU AI Act role and risk classification", "DORA and operational resilience", "Model-risk management", "PII, banking secrecy, and audit logging"],
    risks: ["Treating a sandbox approval as production approval", "Unclear accountability for model outputs", "Legacy data access becoming the critical path"],
    motion: "API Platform + Codex, with a governed ChatGPT pilot",
    motionDetail:
      "Purpose-built applications fit regulated workflows; Codex supports the teams building them. A contained ChatGPT Enterprise cohort can validate lower-risk employee productivity use cases.",
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
    compliance: ["Cross-border data transfers", "Trade and sanctions controls", "Customer and shipment confidentiality", "Human control of operational decisions"],
    risks: ["Real-time data quality and system latency", "Automation crossing from advice into operational control", "Unclear value baseline across regions"],
    motion: "API Platform + agentic workflows + Realtime",
    motionDetail:
      "The highest-value use cases are integrated and event-driven. ChatGPT Enterprise may still support corporate knowledge work, but the core motion is a governed application layer.",
  },
];

const DEFAULT_MESSAGE = "We’re looking for an AI tool for 6,000 people.";

const RESEARCH_OBJECTIVES = [
  "Person, company, and likely buying authority",
  "Business trigger behind the inquiry",
  "Specific, valuable AI workflows",
  "Best-fit OpenAI product motion",
  "Technical, security, data, and compliance needs",
  "Risks, objections, competitors, and buying process",
  "A focused first-discovery meeting plan",
];

function Arrow({ direction = "down" }: { direction?: "down" | "right" }) {
  return <span aria-hidden="true">{direction === "down" ? "↓" : "→"}</span>;
}

export default function Home() {
  const [contactId, setContactId] = useState(CONTACTS[0].id);
  const [companyId, setCompanyId] = useState(COMPANIES[2].id);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isPreparing, setIsPreparing] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [guardrail, setGuardrail] = useState<PromptInjectionGuardrail | null>(null);
  const [error, setError] = useState("");
  const [closingPhase, setClosingPhase] = useState<"idle" | "typing" | "sent">("idle");
  const briefingRef = useRef<HTMLElement>(null);
  const closingChatRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const contact = CONTACTS.find((item) => item.id === contactId) ?? CONTACTS[0];
  const company = COMPANIES.find((item) => item.id === companyId) ?? COMPANIES[0];
  const isReady = briefing !== null || guardrail !== null;

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.16 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!briefing) {
      setClosingPhase("idle");
      return;
    }

    const closingChat = closingChatRef.current;
    if (!closingChat) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClosingPhase("sent");
      return;
    }

    let replyTimer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setClosingPhase("typing");
        replyTimer = window.setTimeout(() => setClosingPhase("sent"), 1600);
        observer.disconnect();
      },
      { threshold: 0.45 },
    );

    observer.observe(closingChat);
    return () => {
      observer.disconnect();
      if (replyTimer) window.clearTimeout(replyTimer);
    };
  }, [briefing]);

  function resetBriefing() {
    requestRef.current?.abort();
    requestRef.current = null;
    setBriefing(null);
    setGuardrail(null);
    setError("");
    setIsPreparing(false);
  }

  async function prepareBriefing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBriefing(null);
    setGuardrail(null);
    setError("");
    setIsPreparing(true);

    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ contactId, companyId, message: message.trim() }),
      });
      const result = (await response.json()) as {
        briefing?: Briefing;
        guardrail?: PromptInjectionGuardrail;
        error?: string;
      };

      if (result.guardrail?.kind === "prompt_injection") {
        setGuardrail(result.guardrail);
        window.setTimeout(() => briefingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return;
      }

      if (!response.ok || !result.briefing) {
        throw new Error(result.error ?? "The briefing could not be generated.");
      }

      setBriefing(result.briefing);
      window.setTimeout(() => briefingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "The briefing could not be generated.");
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsPreparing(false);
      }
    }
  }

  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Hena Kless, start">
          <span className="wordmark-dot" aria-hidden="true" />
          Hena Kless
        </a>
        <nav aria-label="Experience sections">
          <a href="#hello"><span>01</span> Hello</a>
          <a href="#discovery"><span>02</span> Discovery</a>
          <a href="#cv"><span>03</span> CV</a>
        </nav>
        <div className="header-actions">
          <a href="https://www.linkedin.com/in/henakless/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <a className="header-cta" href="/Hena_Kless_CV_2026.pdf" download>Download CV ↓</a>
        </div>
      </header>

      <section className="intro" id="hello">
        <div className="intro-rail" aria-hidden="true">
          <span>01</span>
          <div />
          <span>SCROLL TO MEET HENA</span>
        </div>

        <div className="portrait-column" data-reveal>
          <div className="portrait-frame">
            <img src="/hena-kless-portrait.png" alt="Hena Kless" width={800} height={800} />
            <span className="portrait-caption">SOLUTIONS<br />ENGINEER</span>
          </div>
          <div className="portrait-label">
            <span>Hena Kless</span>
            <a href="https://www.linkedin.com/in/henakless/" target="_blank" rel="noreferrer">View LinkedIn ↗</a>
          </div>
        </div>

        <div className="intro-copy" data-reveal>
          <p className="kicker">Hi, future colleague.</p>
          <h1>I built this experience just for you.</h1>
          <p className="intro-lead">
            I’m Hena, a solutions engineer that would love to work with you in Munich! Curiosity is what drives me everyday and helps me turn complex enterprise needs into practical use cases, measurable business value and actionable next steps. My goal is to align customers, product, and delivery from discovery to adoption and beyond.
          </p>
          <div className="intro-body">
            <p>
              My background is in cybersecurity, but the operating environment is remarkably similar to
              AI: constant change, a huge amount of noise, and yesterday’s assumptions needing to be
              challenged continuously. It taught me to identify reliable signals, communicate responsibly
              under uncertainty, and stay close to both customers and product teams.
            </p>
            <p>
              At Wire and LastPass, I have worked as the bridge between customers, product, and delivery—
              validating valuable use cases, defining success criteria, influencing the roadmap, and helping
              customers understand both the product today and the longer-term vision. AI expands that problem
              space enormously: more room to experiment, build, and learn hands-on.
            </p>
          </div>
          <p className="turn-line">
            I love that every day brings a new challenge to face. But there are some things I’d rather
            avoid. Like this…
          </p>
          <a className="scroll-cue" href="#calendar-message">Keep scrolling <Arrow /></a>
        </div>
      </section>

      <section className="interruption" id="calendar-message">
        <div className="interruption-grid" aria-hidden="true" />
        <p className="scene-label">Tuesday · 4:42 PM · the calendar ambush</p>

        <div className="message-shell" data-reveal>
          <div className="message-sender">
            <span className="avatar-small">AE</span>
            <span><strong>Your Account Executive</strong><small>just now</small></span>
          </div>
          <div className="message-wrap">
            <blockquote>
              Hey Hena, this <em>super promising</em> opp came in today and your calendar looks free at
              5 pm. Can you jump in a meeting with them?
            </blockquote>
            <span className="message-time">4:42 PM · Delivered</span>
          </div>
        </div>

        <div className="moderator" data-reveal>
          <span>MODERATOR’S NOTE</span>
          <p>A “super promising” opportunity sounds like a great, qualified lead with a proper briefing.</p>
          <strong>Right? …right?</strong>
        </div>

        <a className="accept-brief" href="#discovery">Let’s find out <Arrow /></a>
      </section>

      <section className="discovery" id="discovery">
        <header className="discovery-heading" data-reveal>
          <div>
            <p className="section-index">02 / THE EXPERIENCE</p>
            <h2>Discovery starts before the meeting.</h2>
          </div>
          <p>
            <strong className="discovery-prompt">Help create the lead that came in through the website.</strong>
            Choose the contact and company independently, then edit their inquiry. OpenAI will generate
            a fresh, seven-part briefing from the fictional scenario you assemble.
          </p>
        </header>

        <form className="lead-builder" id="lead-builder" onSubmit={prepareBriefing}>
          <section className="selector-panel" aria-label="Choose a customer contact">
            <div className="panel-label"><span>A</span> Choose a person</div>
            {CONTACTS.map((item, index) => (
              <button
                className={`selection-option ${contactId === item.id ? "is-active" : ""}`}
                type="button"
                key={item.id}
                onClick={() => { setContactId(item.id); resetBriefing(); }}
                aria-pressed={contactId === item.id}
              >
                <span className="lead-number">0{index + 1}</span>
                <span className="lead-avatar">{item.initials}</span>
                <span className="selection-copy"><strong>{item.name}</strong><small>{item.role}</small></span>
                <span className="radio-mark" aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className="selector-panel company-selector" aria-label="Choose a customer company">
            <div className="panel-label"><span>B</span> Choose a company</div>
            {COMPANIES.map((item, index) => (
              <button
                className={`selection-option ${companyId === item.id ? "is-active" : ""}`}
                type="button"
                key={item.id}
                onClick={() => { setCompanyId(item.id); resetBriefing(); }}
                aria-pressed={companyId === item.id}
              >
                <span className="lead-number">0{index + 1}</span>
                <span className="company-mini">{item.initial}</span>
                <span className="selection-copy"><strong>{item.name}</strong><small>{item.industry} · {item.scale}</small></span>
                <span className="radio-mark" aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className="selection-review">
            <div className="panel-label"><span>C</span> Read the room</div>
            <div className="selection-review-grid">
              <article>
                <span className="mock-tag">Selected contact</span>
                <h3>{contact.name}</h3>
                <strong>{contact.role}</strong>
                <p>{contact.brief}</p>
              </article>
              <article>
                <span className="mock-tag">Selected company · fictional</span>
                <h3>{company.name}</h3>
                <strong>{company.scale} · {company.footprint}</strong>
                <p>{company.profile}</p>
              </article>
            </div>
            <label className="message-field" htmlFor="lead-message">
              <span>Inbound message</span>
              <textarea
                id="lead-message"
                value={message}
                onChange={(event) => { setMessage(event.target.value); resetBriefing(); }}
                rows={3}
                maxLength={280}
              />
              <small>{message.length}/280 · Edit this to change the stated trigger.</small>
            </label>
            <button className="prepare-button" type="submit" disabled={isPreparing || message.trim().length < 10}>
              <span>{isPreparing ? "Building your briefing…" : "Get the briefing you deserve"}</span>
              <Arrow direction="right" />
            </button>
            <p className="fiction-note">All customer names, companies, and scenario events are fictional. AI-generated hypotheses still require validation.</p>
          </section>
        </form>

        <section className={`briefing-stage ${isReady ? "is-ready" : ""}`} ref={briefingRef} aria-live="polite">
          {(isPreparing || isReady || error) && (
            <div className="hena-response">
              <div className="hena-avatar">HK</div>
              <div className="hena-status">
                <span>Hena</span>
                {isPreparing ? (
                  <div className="typing-row"><i /><i /><i /><p>Sure, let’s do some discovery together.</p></div>
                ) : error ? (
                  <p>I hit a snag while preparing that briefing.</p>
                ) : guardrail ? (
                  <p>That inquiry wandered a little too far from discovery.</p>
                ) : (
                  <p>Here’s the one-page view I’d walk into the meeting with.</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="brief-error" role="alert">
              <div><strong>Briefing interrupted</strong><p>{error}</p></div>
              <button type="submit" form="lead-builder">Try again →</button>
            </div>
          )}

          {guardrail && (
            <div className="guardrail-result" role="status">
              <span aria-hidden="true">↳</span>
              <div>
                <strong>{guardrail.title}</strong>
                <p>{guardrail.message}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetBriefing();
                  document.querySelector<HTMLTextAreaElement>("#lead-message")?.focus();
                }}
              >
                Edit inquiry →
              </button>
            </div>
          )}

          {briefing && (
            <article className="brief-paper">
              <header className="brief-header">
                <div>
                  <span className="brief-kicker">FIRST DISCOVERY · AI-GENERATED BRIEF</span>
                  <h3>{company.name}</h3>
                  <p>{contact.name} · {contact.role}</p>
                </div>
                <div className="brief-date"><span>MEETING</span><strong>Today · 17:00</strong><small>45 minutes</small></div>
              </header>

              <div className="brief-trigger"><span>THE INQUIRY</span><p>“{message.trim()}”</p></div>

              <div className="brief-content">
                <section className="brief-section brief-executive">
                  <span>01</span>
                  <div>
                    <h4>Executive summary</h4>
                    <p>{briefing.executiveSummary}</p>
                  </div>
                </section>

                <div className="brief-two-col">
                  <section className="brief-section">
                    <span>02</span>
                    <div>
                      <h4>Person information</h4>
                      <h5>{contact.name} · {contact.role}</h5>
                      <p>{briefing.person.authority}</p>
                      <h6>Likely priorities</h6>
                      <ul>{briefing.person.priorities.map((item) => <li key={item}>{item}</li>)}</ul>
                      <h6>To validate</h6>
                      <ul>{briefing.person.unknowns.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  </section>
                  <section className="brief-section">
                    <span>03</span>
                    <div>
                      <h4>Company information</h4>
                      <h5>{company.industry} · {company.scale}</h5>
                      <p>{briefing.company.profile}</p>
                      <h6>Noteworthy scenario signals to validate</h6>
                      <ul>{briefing.company.noteworthyEvents.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  </section>
                </div>

                <section className="brief-section relevance-section">
                  <span>04</span>
                  <div>
                    <h4>How OpenAI is relevant</h4>
                    <div className="motion-callout">
                      <strong>{briefing.openaiRelevance.motion}</strong>
                      <p>{briefing.openaiRelevance.rationale}</p>
                    </div>
                    <h6>Workflows worth validating</h6>
                    <ol>{briefing.openaiRelevance.workflows.map((item) => <li key={item}>{item}</li>)}</ol>
                  </div>
                </section>

                <div className="brief-two-col">
                  <section className="brief-section">
                    <span>05</span>
                    <div>
                      <h4>Regulatory & compliance</h4>
                      <ul>{briefing.compliance.map((item) => <li key={item}>{item}</li>)}</ul>
                      <p className="brief-note">Confirm whether OpenAI is acting as a workplace platform, an application component, or both—the control model differs.</p>
                    </div>
                  </section>
                  <section className="brief-section risk-section">
                    <span>06</span>
                    <div>
                      <h4>Risks to qualify</h4>
                      <ul>{briefing.risks.map((item) => <li key={item}>{item}</li>)}</ul>
                      <p className="brief-note">Also test the incumbent landscape, internal build appetite, decision timeline, and procurement route.</p>
                    </div>
                  </section>
                </div>

                <section className="brief-section questions-section">
                  <span>07</span>
                  <div>
                    <h4>Best discovery questions</h4>
                    <ol>{briefing.discoveryQuestions.map((item) => <li key={item}>{item}</li>)}</ol>
                  </div>
                </section>
              </div>

              <footer className="brief-footer">
                <span>Prepared for Hena Kless</span>
                <span>Generated with OpenAI · fictional scenario hypotheses require validation</span>
                <span>01 / 01</span>
              </footer>
            </article>
          )}

          {briefing && (
            <div className="brief-actions">
              <button type="button" onClick={() => { resetBriefing(); document.querySelector("#lead-builder")?.scrollIntoView({ behavior: "smooth" }); }}>← Edit the brief</button>
              <span>Change any selection or message to generate a different briefing.</span>
            </div>
          )}
        </section>

        <details className="research-recipe">
          <summary>
            <span><b>D</b> What the AI briefing considers</span>
            <span className="details-toggle">View briefing recipe +</span>
          </summary>
          <div className="recipe-content">
            <div>
              <p className="recipe-label">ROLE</p>
              <h3>Enterprise sales researcher for a first discovery meeting.</h3>
              <p>
                The live AI reasons over the fictional lead, company profile, scenario signals, and inquiry
                you select. Product fit stays open until the use case has been analyzed: ChatGPT Enterprise
                or Business, Codex, the OpenAI API Platform, an agentic or multimodal application, Realtime,
                or a combination. Hypotheses are explicitly framed for validation rather than presented as
                externally researched facts.
              </p>
              <span className="page-limit">Maximum output: one A4 page</span>
            </div>
            <ol>{RESEARCH_OBJECTIVES.map((objective, index) => <li key={objective}><span>0{index + 1}</span>{objective}</li>)}</ol>
          </div>
        </details>
      </section>

      {briefing && (
        <section
          className={`closing-chat ${closingPhase === "sent" ? "is-sent" : ""}`}
          ref={closingChatRef}
          aria-label="Hena replies to the meeting request"
        >
          <div className="closing-chat-grid" aria-hidden="true" />
          <p className="closing-scene-label">Tuesday · 4:59 PM · briefing ready</p>

          <div className="closing-thread">
            <div className="closing-sender">
              <span className="closing-avatar">HK</span>
              <span>
                <strong>Hena</strong>
                <small>{closingPhase === "sent" ? "just now" : "typing…"}</small>
              </span>
            </div>

            <div className="closing-live-region" aria-live="polite" aria-atomic="true">
              {closingPhase === "sent" ? (
                <div className="closing-message" role="status">
                  <blockquote>Alright, let&apos;s do this.</blockquote>
                  <span>4:59 PM · Delivered</span>
                </div>
              ) : (
                <div className="closing-typing" role="status">
                  <span className="sr-only">Hena is typing</span>
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          {closingPhase === "sent" && (
            <a className="closing-continuation" href="#cv">
              A little more about Hena <Arrow />
            </a>
          )}
        </section>
      )}

      <section className="cv-section" id="cv">
        <header className="cv-heading" data-reveal>
          <div><p className="section-index">03 / THE SHORT VERSION</p><h2>A brief summary of <span>Hena Kless.</span></h2></div>
          <a href="/Hena_Kless_CV_2026.pdf" download>Download the full CV ↓</a>
        </header>

        <div className="cv-grid">
          <div className="cv-main">
            <div className="cv-summary">
              <p>Senior Solutions Engineer with 6+ years turning complex enterprise requirements into secure, commercially viable solutions—from discovery and architecture through PoV, security review, and expansion.</p>
              <dl>
                <div><dt>235%</dt><dd>ARR growth in year two</dd></div>
                <div><dt>35+</dt><dd>talks and webinars</dd></div>
                <div><dt>FY24</dt><dd>President’s Club</dd></div>
              </dl>
            </div>

            <div className="cv-timeline">
              <article><time>2026—NOW</time><div><span>Wire · Munich</span><h3>Senior Solutions Engineer</h3><p>Enterprise discovery and solution design for regulated and public-sector organizations; PoVs, security review, RFP/RFI response, and repeatable presales systems.</p></div></article>
              <article><time>2022—2025</time><div><span>LastPass · Munich</span><h3>Solutions Consultant → Senior Solutions Consultant</h3><p>Led secure SaaS evaluations and technical validation; earned President’s Club 2024 and Solutions Consultant of the Quarter.</p></div></article>
              <article><time>2017—2022</time><div><span>Lombego Systems · Weimar</span><h3>Project Management Assistant → Solution Consultant</h3><p>Built customer and product expertise across onboarding, presales consulting, training, support, and international adoption.</p></div></article>
            </div>
          </div>

          <aside className="cv-aside">
            <section><h3>Credentials</h3><p>CompTIA Security+ · Six Habits of Highly Effective Sales Engineers</p></section>
            <section><h3>Community</h3><p>GTIA Executive Council DACH · Presales & Pretzels Munich · PreSales Collective</p></section>
            <section><h3>Education</h3><p>B.A. Communication Science, minor in Philosophy · University of Erfurt</p></section>
            <section><h3>Languages</h3><p>German · English · Dari · Pashto · Spanish</p></section>
          </aside>
        </div>

        <aside className="reference-card" aria-label="Recommendation from Mario Platt">
          <div className="reference-stamp">THE RECEIPTS</div>
          <div className="reference-copy">
            <p className="reference-label">Don’t take my word for it</p>
            <blockquote>
              You’re looking for the best person for the job, but you don’t know me yet. Hear it
              from someone who does:
            </blockquote>
            <p className="reference-attribution">
              <strong>Mario Platt</strong><span>· Chief Information Security Officer at LastPass</span>
            </p>
            <span className="reference-arrow" aria-hidden="true">→</span>
          </div>
          <figure className="reference-proof">
            <img
              src="/mario-platt-linkedin-reference.jpg"
              alt="LinkedIn screenshot of Mario Platt recommending Hena Kless"
            />
          </figure>
        </aside>
      </section>

      <footer className="site-footer">
        <div className="footer-statement"><span className="footer-dot" /><p>Let’s chat! I’d love to work together.</p></div>
        <div className="footer-actions">
          <a href="https://www.linkedin.com/in/henakless/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <a href="mailto:hena.kless@outlook.com">Email ↗</a>
          <a href="/Hena_Kless_CV_2026.pdf" download>Download CV ↓</a>
        </div>
      </footer>
    </main>
  );
}
