"use client";

import { FormEvent, useState } from "react";
import { CRISIS_CASE, SOURCE_BY_ID } from "./lib/crisis-case";
import {
  CURATED_BRIEF,
  type BriefApiResponse,
  type BriefGeneration,
  type CitedClaim,
  type DecisionBrief,
  type EvidenceKind,
  type Lens,
} from "./lib/decision-brief";

const LENSES: Array<{ id: Lens; label: string; detail: string }> = [
  { id: "balanced", label: "Balanced", detail: "Connected decision view" },
  { id: "business", label: "Business", detail: "Resilience and value" },
  { id: "technical", label: "Technical", detail: "Architecture and validation" },
  { id: "trust", label: "Trust", detail: "Controls and readiness" },
];

const LENS_LABELS: Record<Lens, string> = {
  balanced: "Balanced decision",
  business: "Business priority",
  technical: "Technical priority",
  trust: "Trust priority",
};

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function EvidenceBadge({ kind, children }: { kind: EvidenceKind; children: React.ReactNode }) {
  return <span className={`evidence-badge badge-${kind}`}>{children}</span>;
}

function SourceRefs({ sourceIds }: { sourceIds: string[] }) {
  return (
    <span className="source-refs" aria-label={`Sources ${sourceIds.map((id) => SOURCE_BY_ID[id]?.label ?? id).join(", ")}`}>
      {sourceIds.map((sourceId) => {
        const source = SOURCE_BY_ID[sourceId];
        return <span key={sourceId} title={source?.title}>{source?.label ?? sourceId}</span>;
      })}
    </span>
  );
}

function CitedList({ items }: { items: CitedClaim[] }) {
  return (
    <ul className="brief-list cited-list">
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`}>
          <span>{item.text}</span>
          <SourceRefs sourceIds={item.sourceIds} />
        </li>
      ))}
    </ul>
  );
}

function BriefTile({
  className,
  index,
  title,
  children,
  priority,
}: {
  className: string;
  index: string;
  title: string;
  children: React.ReactNode;
  priority?: boolean;
}) {
  return (
    <section className={`brief-tile ${className}${priority ? " priority-tile" : ""}`}>
      <span className="block-index">{index}</span>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

export default function Home() {
  const [lens, setLens] = useState<Lens>("balanced");
  const [isGenerating, setIsGenerating] = useState(false);
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [generation, setGeneration] = useState<BriefGeneration | null>(null);
  const hasGenerated = brief !== null;
  const activeBrief = brief ?? CURATED_BRIEF;
  const focus = activeBrief.stakeholderViews[lens];

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setBrief(null);
    setGeneration(null);

    try {
      const response = await fetch("/api/decision-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: CRISIS_CASE.id }),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);

      const payload = (await response.json()) as BriefApiResponse;
      if (!payload.brief || !payload.generation?.validated) {
        throw new Error("The generated brief did not pass validation.");
      }

      setLens("balanced");
      setBrief(payload.brief);
      setGeneration(payload.generation);
    } catch {
      setLens("balanced");
      setBrief(CURATED_BRIEF);
      setGeneration({
        mode: "fallback",
        model: "gpt-5.6-terra",
        validated: true,
        notice: "The live request could not be completed, so the source-validated curated brief is shown.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Hena Kless, home">
          <span className="brand-mark">HK</span>
          <span>
            <strong>Hena Kless</strong>
            <small>Solutions Engineer · Munich</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#golden-path">Golden path</a>
          <a href="#evidence">Evidence</a>
          <a href="#experience">Experience</a>
          <a className="nav-cta" href="/Hena_Kless_CV_2026.pdf" download>
            CV <ArrowIcon />
          </a>
        </nav>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <SectionLabel>Enterprise solutions engineering for applied AI</SectionLabel>
          <h1>
            From complex requirements to <em>credible decisions.</em>
          </h1>
          <p className="hero-lede">
            One real customer case becomes a grounded, decision-ready brief.
          </p>
          <p className="hero-support">
            The source is an anonymized Crisis Communications PoV from my work at Wire. The applied-AI layer is the structured transformation of approved evidence into a stakeholder-ready recommendation — not a claim that I delivered an enterprise AI project.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#golden-path">
              Explore the Golden Path <span aria-hidden="true">↓</span>
            </a>
            <a className="button text-button" href="#evidence">
              Follow the evidence <ArrowIcon />
            </a>
          </div>
        </div>

        <aside className="decision-map" aria-label="Crisis Communications PoV decision path">
          <div className="map-topline">
            <span>Crisis Communications PoV</span>
            <span className="status-dot">Real case</span>
          </div>
          <ol>
            <li><span>01</span><div><strong>Frame the risk</strong><small>Outage · compromise · loss of trust</small></div></li>
            <li><span>02</span><div><strong>Define evidence</strong><small>Success criteria · owners · constraints</small></div></li>
            <li><span>03</span><div><strong>Validate end to end</strong><small>Identity · clients · network · workflow</small></div></li>
            <li><span>04</span><div><strong>Diagnose precisely</strong><small>Observation · cause · corrective action</small></div></li>
            <li><span>05</span><div><strong>Document the decision</strong><small>Fit · gaps · next validation</small></div></li>
          </ol>
          <p>Grounded in one real PoV. Known facts, observed results, and pending validation remain visibly separate.</p>
        </aside>
      </section>

      <section className="proof-band" aria-label="Selected experience highlights">
        <div className="proof-grid shell">
          <div><strong>6+</strong><span>years technical pre-sales</span></div>
          <div><strong>€542K</strong><span>ARR contribution · LastPass 2024</span></div>
          <div><strong>235%</strong><span>year-two ARR growth · LastPass</span></div>
          <div><strong>35+</strong><span>talks and webinars</span></div>
          <div><strong>0→1</strong><span>second member of Wire’s SE team</span></div>
        </div>
      </section>

      <section className="scenario-section shell" id="golden-path">
        <div className="section-intro">
          <div>
            <SectionLabel>Golden Path · Crisis Communications</SectionLabel>
            <h2>One real PoV. One grounded decision brief.</h2>
          </div>
          <p>
            Review the customer evidence, then let the live application synthesize it. Optional stakeholder views reprioritize the same facts without changing them.
          </p>
        </div>

        <div className="scenario-workspace">
          <form className="scenario-form" onSubmit={submitCase}>
            <div className="form-step">
              <span className="step-number">01</span>
              <div>
                <h3>Start with the source case</h3>
                <p>The visitor reviews my actual discovery logic — they do not have to role-play the Solutions Engineer.</p>
              </div>
            </div>

            <article className="case-source-card">
              <div className="source-topline">
                <EvidenceBadge kind="requirement">Anonymized customer case</EvidenceBadge>
                <span>{CRISIS_CASE.userScope}</span>
              </div>
              <h3>{CRISIS_CASE.title}</h3>
              <p>{CRISIS_CASE.summary}</p>
              <div className="driver-tags" aria-label="PoV drivers">
                {CRISIS_CASE.drivers.map((driver) => <span key={driver}>{driver}</span>)}
              </div>
            </article>

            <section className="discovery-record" aria-labelledby="discovery-title">
              <div className="record-heading">
                <span>Documented discovery</span>
                <strong id="discovery-title">Questions → customer requirements</strong>
              </div>
              {CRISIS_CASE.discovery.map((item, index) => (
                <div className="discovery-pair" key={item.question}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.question}</strong>
                    <p>{item.answer}</p>
                    <SourceRefs sourceIds={[...item.sourceIds]} />
                  </div>
                </div>
              ))}
            </section>

            <button className="button primary generate" type="submit" disabled={isGenerating}>
              {isGenerating ? "Structuring the evidence…" : hasGenerated ? "Rebuild grounded decision brief" : "Build grounded decision brief"}
              {!isGenerating && <span aria-hidden="true">→</span>}
            </button>
            <p className="prototype-note">
              Server-side OpenAI · structured output · source validation · curated fallback
            </p>
          </form>

          <article className={`brief-panel ${isGenerating ? "loading" : hasGenerated ? "ready" : "idle"}`} aria-live="polite" aria-busy={isGenerating}>
            <div className="brief-header">
              <div>
                <span>Decision brief · Crisis Communications</span>
                <h3>{isGenerating ? "Generating and validating the brief" : hasGenerated ? "From discovery to the next decision" : "Grounded synthesis, ready when you are"}</h3>
              </div>
              <span className="brief-version">V1.0</span>
            </div>

            {isGenerating ? (
              <div className="loading-state" role="status">
                <span /><span /><span />
                <p>Calling OpenAI, applying the output schema, and validating every source reference…</p>
              </div>
            ) : !hasGenerated ? (
              <div className="idle-state">
                <span>One source of truth</span>
                <h3>One real PoV. One grounded brief.</h3>
                <p>
                  Build the brief to connect the customer’s business risk, architecture, PoV criteria, technical turning point, current status, and my contribution.
                </p>
                <div className="grounding-preview" aria-label="Evidence types">
                  <EvidenceBadge kind="requirement">Documented requirement</EvidenceBadge>
                  <EvidenceBadge kind="observed">Validated observation</EvidenceBadge>
                  <EvidenceBadge kind="pending">Pending validation</EvidenceBadge>
                  <EvidenceBadge kind="synthesis">Decision synthesis</EvidenceBadge>
                </div>
              </div>
            ) : (
              <div className="brief-content">
                <div className={`generation-status status-${generation?.mode ?? "fallback"}`}>
                  <div>
                    <span className="generation-pulse" aria-hidden="true" />
                    <strong>{generation?.mode === "live" ? "Live OpenAI generation" : "Curated fallback"}</strong>
                  </div>
                  <span>{generation?.model ?? "gpt-5.6-terra"} · source-validated</span>
                </div>

                {generation?.notice && <p className="generation-notice">{generation.notice}</p>}

                <div className={`focus-card focus-${lens}`}>
                  <span className="focus-label">{LENS_LABELS[lens]} · evidence-backed synthesis</span>
                  <h3>{focus.headline.text}</h3>
                  <SourceRefs sourceIds={focus.headline.sourceIds} />
                  <p>{focus.recommendation.text}</p>
                  <SourceRefs sourceIds={focus.recommendation.sourceIds} />
                  <div>
                    <strong>Next decision</strong>
                    <span>{focus.nextDecision.text}<SourceRefs sourceIds={focus.nextDecision.sourceIds} /></span>
                  </div>
                </div>

                <div className="lens-explorer">
                  <div>
                    <strong>Explore the same facts by stakeholder view</strong>
                    <span>The evidence stays fixed; only the decision emphasis changes.</span>
                  </div>
                  <div className="lens-grid" role="radiogroup" aria-label="Stakeholder view">
                    {LENSES.map((item) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={lens === item.id}
                        className={lens === item.id ? "lens active" : "lens"}
                        onClick={() => setLens(item.id)}
                        key={item.id}
                      >
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="brief-summary">
                  <p>{activeBrief.executiveSummary.text}</p>
                  <SourceRefs sourceIds={activeBrief.executiveSummary.sourceIds} />
                </div>

                <div className={`brief-tiles lens-${lens}`}>
                  <BriefTile className="tile-value" index="01" title="Business value" priority={lens === "business"}>
                    <EvidenceBadge kind="synthesis">Decision synthesis</EvidenceBadge>
                    <CitedList items={activeBrief.businessValue} />
                  </BriefTile>

                  <BriefTile className="tile-technical" index="02" title="Architecture direction" priority={lens === "technical"}>
                    <EvidenceBadge kind="requirement">Documented requirement</EvidenceBadge>
                    <CitedList items={activeBrief.architectureDirection} />
                  </BriefTile>

                  <BriefTile className="tile-discovery" index="03" title="PoV success criteria" priority={lens === "balanced"}>
                    <EvidenceBadge kind="requirement">Agreed test basis</EvidenceBadge>
                    <CitedList items={activeBrief.successCriteria} />
                  </BriefTile>

                  <BriefTile className="tile-trust" index="04" title="Trust & enterprise readiness" priority={lens === "trust"}>
                    <EvidenceBadge kind="synthesis">Readiness recommendation</EvidenceBadge>
                    <CitedList items={activeBrief.trustReadiness} />
                  </BriefTile>
                </div>

                <section className="turning-point-card">
                  <div>
                    <EvidenceBadge kind="observed">Validated observation</EvidenceBadge>
                    <span>Technical turning point</span>
                    <h4>The blocker became diagnosable.</h4>
                    <CitedList items={activeBrief.technicalTurningPoint} />
                  </div>
                  <div>
                    <EvidenceBadge kind="pending">Pending validation</EvidenceBadge>
                    <span>Current decision status</span>
                    <h4>Technical fit largely validated.</h4>
                    <CitedList items={activeBrief.currentStatus} />
                  </div>
                </section>

                <section className="contribution-card">
                  <div>
                    <span>My contribution</span>
                    <h4>What I personally owned in the PoV</h4>
                  </div>
                  <CitedList items={activeBrief.personalContribution} />
                </section>

                <details className="brief-details open-questions" open={lens === "trust"}>
                  <summary>Open questions kept out of the fact base</summary>
                  <CitedList items={activeBrief.openQuestions} />
                </details>

                <details className="brief-details source-catalog">
                  <summary>Trace every source label</summary>
                  <div className="source-map">
                    {CRISIS_CASE.sources.map((source) => (
                      <div key={source.id}>
                        <span className={`source-key source-${source.kind}`}>{source.label}</span>
                        <p><strong>{source.title}</strong>{source.fact}</p>
                      </div>
                    ))}
                  </div>
                </details>

                <aside className="evidence-inline">
                  <div className="grounding-legend">
                    <EvidenceBadge kind="requirement">Requirement</EvidenceBadge>
                    <EvidenceBadge kind="observed">Observed</EvidenceBadge>
                    <EvidenceBadge kind="pending">Pending</EvidenceBadge>
                    <EvidenceBadge kind="synthesis">Synthesis</EvidenceBadge>
                  </div>
                  <p>Every generated statement is schema-valid, cites an approved source ID, and has passed the server-side outcome checks.</p>
                  <a href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">Read the anonymized case study <ArrowIcon /></a>
                </aside>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="shell">
          <div className="section-intro light-intro">
            <div>
              <SectionLabel>Evidence, not claims</SectionLabel>
              <h2>The proof is the chain of reasoning.</h2>
            </div>
            <p>
              This is one anonymized customer case, not three loosely connected stories. The strength comes from following it from requirement to the next decision.
            </p>
          </div>

          <div className="evidence-grid">
            <article className="evidence-story feature-story">
              <div className="case-number">Golden case</div>
              <div className="case-main">
                <p className="case-meta">European industrial group · Crisis Management · ISO/NIS2</p>
                <h3>Keeping a Crisis Team connected when the primary stack fails.</h3>
                <p>
                  I translated resilience and identity-independence requirements into a structured PoV, guided testing across mobile, web, and desktop, and helped isolate a real-time communications issue to customer-side proxy and SSL-inspection settings.
                </p>
                <div className="tag-row"><span>Discovery</span><span>PoV design</span><span>Enterprise networking</span><span>Trust</span><span>Technical diagnosis</span></div>
              </div>
              <div className="case-side">
                <span className="status-label">Technical fit largely validated</span>
                <p>Final network validation pending. The case is deliberately not presented as a completed deployment or a published customer reference.</p>
                <a className="button light-button" href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">Read the case study <ArrowIcon /></a>
              </div>
            </article>
          </div>

          <div className="proof-chain" aria-label="Crisis Communications PoV evidence chain">
            <div><span>01</span><strong>Discover</strong><p>Independent fallback required by audit and resilience drivers.</p></div>
            <div><span>02</span><strong>Define</strong><p>Success criteria across identity, communication, clients, and network.</p></div>
            <div><span>03</span><strong>Test</strong><p>Mobile successful; web and desktop constrained in the customer environment.</p></div>
            <div><span>04</span><strong>Diagnose</strong><p>Proxy and SSL inspection isolated as the source of the observed issue.</p></div>
            <div><span>05</span><strong>Decide</strong><p>Retest after global network adjustment; no inflated outcome claim.</p></div>
          </div>

          <p className="confidentiality-note">This case is anonymized and intentionally generalized. Employer review is required before public publication.</p>
        </div>
      </section>

      <section className="experience-section shell" id="experience">
        <div className="section-intro">
          <div>
            <SectionLabel>Experience behind the case</SectionLabel>
            <h2>Six-plus years between customers, technology, Security, and Product.</h2>
          </div>
          <a className="button outline" href="/Hena_Kless_CV_2026.pdf" download>Download CV <ArrowIcon /></a>
        </div>

        <div className="timeline">
          <article>
            <span className="timeline-year">2026—NOW</span>
            <div>
              <p>Wire · Munich</p>
              <h3>Senior Solutions Engineer</h3>
              <p>Second member of the Solutions Engineering team, leading discovery, PoVs, security conversations, and technical validation for regulated and compliance-sensitive organizations.</p>
            </div>
          </article>
          <article>
            <span className="timeline-year">2022—2025</span>
            <div>
              <p>LastPass · Munich</p>
              <h3>Solutions Consultant → Senior Solutions Consultant</h3>
              <p>Secure SaaS pre-sales across administrators, Security teams, executives, partners, and Product — including risk reviews, test environments, new-product discovery, and measurable commercial impact.</p>
            </div>
          </article>
          <article>
            <span className="timeline-year">2019—2022</span>
            <div>
              <p>Lombego Systems · Weimar</p>
              <h3>Solution Consultant</h3>
              <p>International customer onboarding, consultations, tailored training, support, and knowledge development — connecting technology with adoption from the beginning of my career.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="faq-build shell">
        <div className="faq" id="faq">
          <SectionLabel>Focused FAQ</SectionLabel>
          <h2>A few useful questions.</h2>
          <details open>
            <summary>What did you build here?</summary>
            <p>A server-side OpenAI workflow that turns one grounded customer case into a structured decision brief. The model produces all four stakeholder views in one schema-constrained response; the server verifies every source ID and rejects inflated outcomes before the result reaches the browser.</p>
          </details>
          <details>
            <summary>Where is the applied AI?</summary>
            <p>In the transformation layer: approved evidence is sent to the Responses API, separated into requirements, observations, pending validation, and synthesis, then reorganized for different stakeholder decisions. Structured Output defines the contract; application-level evaluations check traceability and outcome integrity.</p>
          </details>
          <details>
            <summary>How technical is your role?</summary>
            <p>I work where customer requirements, product capabilities, architecture, security, and business decisions meet — from APIs and identity to enterprise networks, risk reviews, PoV design, testing, and a clean handoff to Delivery.</p>
          </details>
          <details>
            <summary>Why OpenAI?</summary>
            <p>OpenAI combines the work I do best — translating uncertain enterprise problems, demonstrating technical value, and earning trust across stakeholders — with a rapidly changing technology platform. I am especially motivated by the opportunity to help build the Munich team’s local standards, customer practice, and culture in a zero-to-one environment.</p>
          </details>
        </div>

        <aside className="build-note" id="build">
          <SectionLabel>Behind the build</SectionLabel>
          <h2>Trust starts with saying what is real.</h2>
          <p>One controlled source case feeds one structured output contract and four stakeholder views. The facts remain fixed while the recommendation changes emphasis.</p>
          <div className="build-flow" aria-label="Application architecture">
            <span>Approved evidence</span><b>→</b><span>Server</span><b>→</b><span>OpenAI</span><b>→</b><span>Validated brief</span>
          </div>
          <ul>
            <li>API key remains server-side and never reaches the browser</li>
            <li>JSON Schema constrains every section, label, and source ID</li>
            <li>Facts, synthesis, and unresolved validation remain separate</li>
            <li>Unsupported outcome claims trigger the curated fallback</li>
          </ul>
        </aside>
      </section>

      <section className="closing">
        <div className="shell closing-inner">
          <SectionLabel>OpenAI · Solutions Engineer, Large Enterprise</SectionLabel>
          <h2>I bring the customer evidence, technical judgment, and ownership that turn possibility into a credible next decision.</h2>
          <p>I would like to bring that way of working to OpenAI’s enterprise customers in Germany.</p>
          <div className="closing-actions">
            <a className="button closing-primary" href="mailto:hena.kless@outlook.com">Start a conversation <ArrowIcon /></a>
            <a className="button closing-secondary" href="/Hena_Kless_CV_2026.pdf" download>Download CV</a>
            <a className="button closing-secondary" href="https://www.linkedin.com/in/henakless/" target="_blank" rel="noreferrer">LinkedIn <ArrowIcon /></a>
          </div>
        </div>
      </section>

      <footer className="site-footer shell">
        <span>© 2026 Hena Kless</span>
        <span>Built as an applied Solutions Engineering proof of work.</span>
        <a href="mailto:hena.kless@outlook.com">hena.kless@outlook.com</a>
      </footer>
    </main>
  );
}
