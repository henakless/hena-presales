"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Lead = {
  id: string;
  initials: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  employees: string;
  footprint: string;
  trigger: string;
  stack: string;
  profile: string;
  workflows: string[];
  motion: string;
  motionDetail: string;
  guardrails: string[];
};

const LEADS: Lead[] = [
  {
    id: "arkada",
    initials: "EP",
    name: "Enton Price",
    role: "VP, Digital Workplace",
    company: "Arkada Mobility",
    industry: "Industrial mobility",
    employees: "38,000 employees",
    footprint: "12 markets · EU + US",
    trigger: "Global AI enablement program entering vendor review",
    stack: "Microsoft 365 · Snowflake · ServiceNow",
    profile:
      "A global manufacturer modernizing knowledge work across engineering, operations, and corporate teams.",
    workflows: [
      "Give engineers a governed assistant for technical standards, maintenance history, and quality documentation.",
      "Reduce the time operations teams spend turning incident notes into structured root-cause summaries.",
      "Help commercial teams draft localized RFP responses from approved product and policy sources.",
    ],
    motion: "ChatGPT Enterprise + API Platform",
    motionDetail:
      "A broad workforce motion is plausible, with API-based workflows where actions need to reach ServiceNow or manufacturing knowledge systems.",
    guardrails: ["Product IP boundaries", "EU works council", "Data residency", "Role-based access"],
  },
  {
    id: "northstar",
    initials: "EL",
    name: "Elise Laurent",
    role: "Chief Data & Automation Officer",
    company: "Northstar Bank",
    industry: "Financial services",
    employees: "16,800 employees",
    footprint: "DACH + Benelux",
    trigger: "Board mandate to move three AI pilots into production",
    stack: "Azure · Databricks · Salesforce",
    profile:
      "A regional bank consolidating scattered copilots into a governed automation and model strategy.",
    workflows: [
      "Turn relationship-manager call notes into policy-aligned follow-ups without exposing customer data to unapproved tools.",
      "Let operations analysts investigate exception queues across procedures, tickets, and transaction metadata.",
      "Accelerate controlled software modernization with coding agents that respect internal repositories and review gates.",
    ],
    motion: "API Platform + Codex",
    motionDetail:
      "The production mandate points to governed applications first; Codex may support the engineering teams building and maintaining them.",
    guardrails: ["DORA controls", "Auditability", "PII handling", "Model risk management"],
  },
  {
    id: "solaire",
    initials: "MO",
    name: "Dr. Mira Osei",
    role: "Chief Information Officer",
    company: "Solaire Health Network",
    industry: "Healthcare",
    employees: "21,500 staff",
    footprint: "34 sites · UK + EU",
    trigger: "Clinician capacity program has executive funding",
    stack: "Epic · Google Cloud · Workday",
    profile:
      "A multi-site care provider looking to reduce administrative burden without putting patient trust at risk.",
    workflows: [
      "Convert clinician-approved consultation notes into draft patient instructions in the appropriate language and reading level.",
      "Help care coordinators summarize long referral histories while preserving links to the source record.",
      "Use speech and Realtime capabilities for an accessible, multilingual appointment-navigation assistant.",
    ],
    motion: "API Platform + multimodal application",
    motionDetail:
      "Patient-adjacent workflows need a purpose-built application and careful human review; a general seat rollout may be a later motion.",
    guardrails: ["Clinical safety", "Health data privacy", "Human review", "Accessibility"],
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
  const [leadId, setLeadId] = useState(LEADS[0].id);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const briefingRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lead = LEADS.find((item) => item.id === leadId) ?? LEADS[0];

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.2 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function changeLead(id: string) {
    setLeadId(id);
    setIsReady(false);
    setIsPreparing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function prepareBriefing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) return;

    setIsReady(false);
    setIsPreparing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsPreparing(false);
      setIsReady(true);
      window.setTimeout(() => briefingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }, 1550);
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
        </nav>
        <a className="header-cta" href="#lead-builder">Take the meeting <Arrow direction="right" /></a>
      </header>

      <section className="intro" id="hello">
        <div className="intro-rail" aria-hidden="true">
          <span>01</span>
          <div />
          <span>SCROLL TO MEET HENA</span>
        </div>

        <div className="portrait-column" data-reveal>
          <div className="portrait-frame" aria-label="Placeholder for a portrait of Hena Kless">
            <div className="portrait-orbit portrait-orbit-one" />
            <div className="portrait-orbit portrait-orbit-two" />
            <span className="portrait-monogram">HK</span>
            <span className="portrait-caption">YOUR PHOTO<br />GOES HERE</span>
          </div>
          <div className="portrait-label">
            <span>Hena Kless</span>
            <span>Munich · 48.14° N</span>
          </div>
        </div>

        <div className="intro-copy" data-reveal>
          <p className="kicker">Hi, future colleague.</p>
          <h1>I built this experience so you can get to know me.</h1>
          <div className="intro-body">
            <p>
              I’m Hena—a solutions engineer who likes the moment when an ambiguous enterprise problem
              starts becoming a clear, testable path forward.
            </p>
            <p>
              For the past six years, I’ve worked across technical pre-sales, secure SaaS, and customer
              adoption. I lead discovery, shape solutions, run credible proofs of value, and make sure
              technical depth never loses sight of the human decision behind it.
            </p>
          </div>
          <p className="turn-line">
            I love that every day brings a new challenge to face. But there are some things I’d rather
            avoid. Like this…
          </p>
          <a className="scroll-cue" href="#calendar-message">
            Keep scrolling <Arrow />
          </a>
        </div>
      </section>

      <section className="interruption" id="calendar-message">
        <div className="interruption-grid" aria-hidden="true" />
        <p className="scene-label">Tuesday · 4:42 PM · the calendar ambush</p>

        <div className="message-wrap" data-reveal>
          <div className="message-meta">
            <span className="avatar-small">AM</span>
            <span><strong>Alex · Sales</strong><small>just now</small></span>
          </div>
          <blockquote>
            “Hey Hena, this <em>super promising</em> opp came in today and your calendar looks free at
            5 pm. Can you jump in a meeting with them?”
          </blockquote>
          <span className="message-time">4:42 PM</span>
        </div>

        <div className="moderator" data-reveal>
          <span>MODERATOR’S NOTE</span>
          <p>A “super promising” opportunity sounds like a great, qualified lead.</p>
          <strong>Right? …right?</strong>
        </div>

        <a className="accept-brief" href="#discovery">
          Let’s find out <Arrow />
        </a>
      </section>

      <section className="discovery" id="discovery">
        <header className="discovery-heading" data-reveal>
          <div>
            <p className="section-index">02 / THE EXPERIENCE</p>
            <h2>Discovery starts before the meeting.</h2>
          </div>
          <p>
            Pick the lead that just landed in my calendar. This mockup uses prepared content—no AI,
            no external research, and no invented live data.
          </p>
        </header>

        <div className="lead-builder" id="lead-builder">
          <aside className="lead-list" aria-label="Choose a sample lead">
            <div className="panel-label"><span>A</span> Choose your lead</div>
            {LEADS.map((item, index) => (
              <button
                className={`lead-option ${leadId === item.id ? "is-active" : ""}`}
                type="button"
                key={item.id}
                onClick={() => changeLead(item.id)}
                aria-pressed={leadId === item.id}
              >
                <span className="lead-number">0{index + 1}</span>
                <span className="lead-avatar">{item.initials}</span>
                <span className="lead-option-copy">
                  <strong>{item.name}</strong>
                  <small>{item.role}</small>
                  <em>{item.company}</em>
                </span>
                <span className="radio-mark" aria-hidden="true" />
              </button>
            ))}
            <p className="fiction-note">All names and companies in this prototype are fictional.</p>
          </aside>

          <form className="lead-form" onSubmit={prepareBriefing}>
            <div className="panel-label"><span>B</span> Read the room</div>
            <div className="company-card">
              <div className="company-card-top">
                <div className="company-symbol">{lead.company.charAt(0)}</div>
                <div>
                  <span className="mock-tag">Fictional enterprise profile</span>
                  <h3>{lead.company}</h3>
                  <p>{lead.profile}</p>
                </div>
              </div>
              <dl className="company-facts">
                <div><dt>Sector</dt><dd>{lead.industry}</dd></div>
                <div><dt>Scale</dt><dd>{lead.employees}</dd></div>
                <div><dt>Footprint</dt><dd>{lead.footprint}</dd></div>
                <div><dt>Signal</dt><dd>{lead.trigger}</dd></div>
                <div className="wide"><dt>Likely stack</dt><dd>{lead.stack}</dd></div>
              </dl>
            </div>

            <label className="message-field" htmlFor="lead-message">
              <span>Inbound message</span>
              <textarea
                id="lead-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setIsReady(false);
                }}
                rows={4}
                maxLength={280}
              />
              <small>{message.length}/280 · Edit this to change the trigger in the mock briefing.</small>
            </label>

            <button className="prepare-button" type="submit" disabled={isPreparing || message.trim().length < 10}>
              <span>{isPreparing ? "Preparing the room…" : "Prepare me for the meeting"}</span>
              <Arrow direction="right" />
            </button>
          </form>
        </div>

        <section className={`briefing-stage ${isReady ? "is-ready" : ""}`} ref={briefingRef} aria-live="polite">
          {(isPreparing || isReady) && (
            <div className="hena-response">
              <div className="hena-avatar">HK</div>
              <div className="hena-bubble">
                <span>Hena</span>
                {isPreparing ? (
                  <div className="typing-row">
                    <i /><i /><i />
                    <p>Sure, let’s do some discovery together.</p>
                  </div>
                ) : (
                  <p>Here’s the one-page view I’d walk into the room with.</p>
                )}
              </div>
            </div>
          )}

          {isReady && (
            <article className="brief-paper">
              <header className="brief-header">
                <div>
                  <span className="brief-kicker">FIRST DISCOVERY · STATIC MOCK BRIEF</span>
                  <h3>{lead.company}</h3>
                  <p>{lead.name} · {lead.role}</p>
                </div>
                <div className="brief-date"><span>MEETING</span><strong>Today · 17:00</strong><small>45 minutes</small></div>
              </header>

              <div className="brief-trigger">
                <span>THE INQUIRY</span>
                <p>“{message.trim()}”</p>
              </div>

              <div className="brief-layout">
                <div className="brief-main">
                  <section>
                    <h4>01 · Executive read</h4>
                    <p>
                      {lead.name} likely has the authority to shape requirements and assemble the buying
                      group, but budget ownership and the executive sponsor still need confirmation. The
                      stated scale makes governance, adoption, and measurable value as important as model quality.
                    </p>
                  </section>

                  <section>
                    <h4>02 · Three workflows worth testing</h4>
                    <ol className="workflow-list">
                      {lead.workflows.map((workflow) => <li key={workflow}>{workflow}</li>)}
                    </ol>
                  </section>

                  <section className="motion-section">
                    <h4>03 · Likely OpenAI motion</h4>
                    <strong>{lead.motion}</strong>
                    <p>{lead.motionDetail}</p>
                    <small>Working hypothesis—not a recommendation until discovery validates it.</small>
                  </section>

                  <section>
                    <h4>04 · Questions I’d use to open discovery</h4>
                    <ul className="question-list">
                      <li>What changed internally that made this a priority now?</li>
                      <li>Which 6,000 people—and what do they repeatedly lose time on today?</li>
                      <li>What would need to be true 90 days from now for this to be called valuable?</li>
                      <li>Which systems, data classes, and actions would the first workflow touch?</li>
                      <li>Who can approve budget, security, and a change in how people work?</li>
                    </ul>
                  </section>
                </div>

                <aside className="brief-aside">
                  <section>
                    <h4>WHY NOW?</h4>
                    <p>{lead.trigger}.</p>
                    <span className="evidence-needed">Needs external validation</span>
                  </section>
                  <section>
                    <h4>GUARDRAILS TO TEST</h4>
                    <ul>{lead.guardrails.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                  <section>
                    <h4>BUYING GROUP</h4>
                    <p>Business sponsor<br />IT + architecture<br />Security + privacy<br />Procurement<br />End-user champion</p>
                  </section>
                  <section>
                    <h4>45-MINUTE PLAN</h4>
                    <dl className="meeting-plan">
                      <div><dt>05</dt><dd>Context</dd></div>
                      <div><dt>15</dt><dd>Workflows</dd></div>
                      <div><dt>10</dt><dd>Constraints</dd></div>
                      <div><dt>10</dt><dd>Value + process</dd></div>
                      <div><dt>05</dt><dd>Next step</dd></div>
                    </dl>
                  </section>
                </aside>
              </div>

              <footer className="brief-footer">
                <span>Prepared for Hena Kless</span>
                <span>Mock output · no AI or live research</span>
                <span>01 / 01</span>
              </footer>
            </article>
          )}

          {isReady && (
            <div className="brief-actions">
              <button type="button" onClick={() => {
                setIsReady(false);
                document.querySelector("#lead-builder")?.scrollIntoView({ behavior: "smooth" });
              }}>← Edit the lead</button>
              <span>In the next version, this briefing would be evidence-based and generated from live research.</span>
            </div>
          )}
        </section>

        <details className="research-recipe">
          <summary>
            <span><b>C</b> What the real research agent will investigate</span>
            <span className="details-toggle">View briefing recipe +</span>
          </summary>
          <div className="recipe-content">
            <div>
              <p className="recipe-label">ROLE</p>
              <h3>Enterprise sales researcher for a first discovery meeting.</h3>
              <p>
                Product fit stays open until the customer’s use case has been analyzed: ChatGPT Enterprise
                or Business, Codex, the OpenAI API Platform, an agentic or multimodal application, Realtime,
                or a combination.
              </p>
              <span className="page-limit">Maximum output: one A4 page</span>
            </div>
            <ol>
              {RESEARCH_OBJECTIVES.map((objective, index) => (
                <li key={objective}><span>0{index + 1}</span>{objective}</li>
              ))}
            </ol>
          </div>
        </details>
      </section>

      <footer className="site-footer">
        <div>
          <span className="footer-dot" />
          <p>Good discovery makes the meeting feel less like a guess.</p>
        </div>
        <a href="#top">Back to the top ↑</a>
      </footer>
    </main>
  );
}
