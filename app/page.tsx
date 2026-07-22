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
  { id: "balanced", label: "Balanced", detail: "Decision-ready view" },
  { id: "business", label: "Business impact", detail: "Value and priority" },
  { id: "technical", label: "Technical depth", detail: "Architecture and tests" },
  { id: "trust", label: "Trust & readiness", detail: "Risk and governance" },
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

      setBrief(payload.brief);
      setGeneration(payload.generation);
    } catch {
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
          <a href="#scenario">Scenario</a>
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
            I turn enterprise ambiguity into solutions that are valuable, testable, and ready for real-world constraints.
          </p>
          <p className="hero-support">
            Six-plus years in technical pre-sales across secure SaaS and regulated environments — spanning discovery, tailored demos, Proof-of-Value design, security reviews, and executive decision-making.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#scenario">
              Explore an enterprise scenario <span aria-hidden="true">↓</span>
            </a>
            <a className="button text-button" href="#experience">
              View my experience <ArrowIcon />
            </a>
          </div>
        </div>

        <aside className="decision-map" aria-label="Solutions engineering decision path">
          <div className="map-topline">
            <span>Decision path</span>
            <span className="status-dot">Applied</span>
          </div>
          <ol>
            <li><span>01</span><div><strong>Discover</strong><small>Outcome · people · constraints</small></div></li>
            <li><span>02</span><div><strong>Prioritize</strong><small>Value · feasibility · risk</small></div></li>
            <li><span>03</span><div><strong>Design</strong><small>Architecture · controls · trade-offs</small></div></li>
            <li><span>04</span><div><strong>Validate</strong><small>PoV · evidence · next decision</small></div></li>
          </ol>
          <p>One connected brief for business, technical, and trust stakeholders.</p>
        </aside>
      </section>

      <section className="proof-band" aria-label="Selected experience highlights">
        <div className="proof-grid shell">
          <div><strong>6+</strong><span>years technical pre-sales</span></div>
          <div><strong>€542K</strong><span>ARR contribution in 2024</span></div>
          <div><strong>235%</strong><span>ARR growth in year two</span></div>
          <div><strong>35+</strong><span>talks and webinars</span></div>
          <div><strong>4</strong><span>professional languages</span></div>
        </div>
      </section>

      <section className="scenario-section shell" id="scenario">
        <div className="section-intro">
          <div>
            <SectionLabel>Interactive proof of work · live and grounded</SectionLabel>
            <h2>Bring me an enterprise problem.</h2>
          </div>
          <p>
            I’ll structure it as a decision-ready brief — from discovery and business value to architecture, PoV design, and enterprise trust.
          </p>
        </div>

        <div className="scenario-workspace">
          <form className="scenario-form" onSubmit={submitCase}>
            <div className="form-step">
              <span className="step-number">01</span>
              <div>
                <h3>Review the prepared scenario</h3>
                <p>The first live path uses a real, anonymized case and requires no confidential visitor data.</p>
              </div>
            </div>

            <div className="scenario-presets" aria-label="Prepared scenarios">
              <button type="button" className="preset active" aria-pressed="true">
                Crisis communications
              </button>
              <button type="button" className="preset" disabled title="Not connected to the validated live endpoint yet">
                Regulated service AI
              </button>
              <button type="button" className="preset" disabled title="Not connected to the validated live endpoint yet">
                Pilot blocked by trust
              </button>
            </div>

            <label className="sr-only" htmlFor="scenario-input">Prepared enterprise scenario</label>
            <textarea
              id="scenario-input"
              value="A security-sensitive enterprise needs its crisis team to remain operational when Microsoft 365 and the primary identity stack are unavailable or no longer trusted."
              rows={7}
              readOnly
            />
            <div className="input-meta">
              <span>No personal information required</span>
              <span>Prepared source case</span>
            </div>

            <div className="form-step lens-step">
              <span className="step-number">02</span>
              <div>
                <h3>Select the decision lens</h3>
                <p>The full brief stays intact; the selected lens changes emphasis.</p>
              </div>
            </div>

            <div className="lens-grid" role="radiogroup" aria-label="Decision lens">
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

            <button className="button primary generate" type="submit" disabled={isGenerating}>
              {isGenerating ? "Structuring the evidence…" : hasGenerated ? "Rebuild grounded decision brief" : "Build grounded decision brief"}
              {!isGenerating && <span aria-hidden="true">→</span>}
            </button>
            <p className="prototype-note">
              Live server-side OpenAI generation with structured output, source validation, and a curated fallback.
            </p>
          </form>

          <article className={`brief-panel ${isGenerating ? "loading" : hasGenerated ? "ready" : "idle"}`} aria-live="polite" aria-busy={isGenerating}>
            <div className="brief-header">
              <div>
                <span>Solution brief · Crisis Communications</span>
                <h3>{isGenerating ? "Structuring the scenario" : hasGenerated ? "A path from ambiguity to evidence" : "A grounded path to the next decision"}</h3>
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
                <h3>From enterprise context to a decision-ready brief.</h3>
                <p>
                  Build the brief to connect discovery, business value, architecture, PoV criteria, trust, technical findings, and the next decision.
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

                <p className="lens-note">{LENS_LABELS[lens]} · evidence-backed synthesis</p>

                <div className="brief-summary">
                  <p>{activeBrief.executiveSummary.text}</p>
                  <SourceRefs sourceIds={activeBrief.executiveSummary.sourceIds} />
                </div>

                <section className="brief-block emphasized">
                  <span className="block-index">01</span>
                  <div>
                    <h4>What I would clarify first</h4>
                    <ul className="brief-list cited-list">
                      {CRISIS_CASE.discovery.map((item) => (
                        <li key={item.question}>
                          <span>{item.question}</span>
                          <SourceRefs sourceIds={[...item.sourceIds]} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="brief-block split-block">
                  <div>
                    <span className="block-index">02</span>
                    <h4>Highest-value use case</h4>
                    <p>{focus.recommendation.text}</p>
                    <SourceRefs sourceIds={focus.recommendation.sourceIds} />
                  </div>
                  <div>
                    <span className="block-index">03</span>
                    <h4>Value hypothesis</h4>
                    <CitedList items={activeBrief.businessValue} />
                  </div>
                </section>

                <section className="brief-block">
                  <span className="block-index">04</span>
                  <div className="full-width">
                    <h4>Architecture direction</h4>
                    <div className="architecture-flow">
                      {activeBrief.architectureDirection.map((item, index) => (
                        <div key={item.text}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <strong>{item.text}</strong>
                          <SourceRefs sourceIds={item.sourceIds} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="brief-block split-block">
                  <div>
                    <span className="block-index">05</span>
                    <h4>PoV plan</h4>
                    <CitedList items={activeBrief.successCriteria} />
                  </div>
                  <div className="trust-column">
                    <span className="block-index">06</span>
                    <h4>Trust & readiness</h4>
                    <CitedList items={activeBrief.trustReadiness} />
                  </div>
                </section>

                <section className="assumptions">
                  <strong>Still to resolve</strong>
                  <CitedList items={activeBrief.openQuestions} />
                </section>

                <aside className="evidence-inline">
                  <span>Related evidence from my work</span>
                  <p>Hena supported this PoV for a European industrial group, translating resilience requirements into tests and isolating a desktop and web issue to customer-side proxy and SSL-inspection settings.</p>
                  <p><strong>Next decision:</strong> {focus.nextDecision.text} <SourceRefs sourceIds={focus.nextDecision.sourceIds} /></p>
                  <a href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">Review the case study <ArrowIcon /></a>
                </aside>

                <details className="brief-details evidence-details">
                  <summary>Validated findings, contribution, and current status</summary>
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
              <h2>Real enterprise work behind the framework.</h2>
            </div>
            <p>
              An anonymized case from a security- and compliance-sensitive environment, with verified findings and unresolved work kept clearly separate.
            </p>
          </div>

          <div className="evidence-grid">
            <article className="evidence-story feature-story">
              <div className="case-number">Case 01</div>
              <div className="case-main">
                <p className="case-meta">European industrial group · Crisis Management · ISO/NIS2</p>
                <h3>Keeping a Crisis Team Connected When the Primary Collaboration Stack Fails</h3>
                <p>
                  I translated resilience and identity-independence requirements into test scenarios, guided validation across mobile, web, and desktop, and helped isolate a real-time communications issue to customer-side proxy and SSL-inspection settings.
                </p>
                <div className="tag-row"><span>PoV design</span><span>Enterprise networking</span><span>Security & compliance</span><span>Cross-functional troubleshooting</span></div>
              </div>
              <div className="case-side">
                <span className="status-label">Technical fit largely validated</span>
                <p>Final network validation pending. Not presented as a closed-won deployment.</p>
                <a className="button light-button" href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">Read the case study <ArrowIcon /></a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="experience-section shell" id="experience">
        <div className="section-intro">
          <div>
            <SectionLabel>Experience</SectionLabel>
            <h2>Six-plus years at the customer–technology boundary.</h2>
          </div>
          <a className="button outline" href="/Hena_Kless_CV_2026.pdf" download>Download CV <ArrowIcon /></a>
        </div>

        <div className="timeline">
          <article>
            <span className="timeline-year">2026—NOW</span>
            <div>
              <p>Wire · Munich</p>
              <h3>Senior Solutions Engineer</h3>
              <p>Discovery, solution design, security conversations, and structured PoVs for regulated organizations across banking, justice, public sector, and government.</p>
            </div>
          </article>
          <article>
            <span className="timeline-year">2022—2025</span>
            <div>
              <p>LastPass · Munich</p>
              <h3>Solutions Consultant → Senior Solutions Consultant</h3>
              <p>Secure SaaS pre-sales across administrators, security teams, executives, and partners — with measurable commercial impact and extensive public enablement.</p>
            </div>
          </article>
          <article>
            <span className="timeline-year">2019—2022</span>
            <div>
              <p>Lombego Systems · Weimar</p>
              <h3>Solution Consultant</h3>
              <p>International customer onboarding, consultations, tailored training, technical support, and knowledge development for event technology.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="faq-build shell">
        <div className="faq" id="faq">
          <SectionLabel>Focused FAQ</SectionLabel>
          <h2>A few useful questions.</h2>
          <details open>
            <summary>How technical is your role?</summary>
            <p>I work where customer requirements, product capabilities, architecture, security, and business decisions meet — from technical discovery and APIs to identity, networks, risk reviews, and PoV design.</p>
          </details>
          <details>
            <summary>How do you work with security and compliance teams?</summary>
            <p>I translate requirements into answerable questions, documented controls, practical tests, and clear escalation paths. I separate what is verified from what is assumed or needs specialist review.</p>
          </details>
          <details>
            <summary>Why OpenAI?</summary>
            <p>OpenAI combines the work I do best — translating complex enterprise needs, demonstrating technical value, and earning trust across stakeholders — with a platform changing how organizations build and operate.</p>
          </details>
          <details>
            <summary>What did you build here?</summary>
            <p>A live Solutions Engineering application that converts an approved enterprise case into structured discovery, value, architecture, PoV, and trust briefs. The server constrains the model output, validates every source reference, and falls back to a curated brief if a result does not pass evaluation.</p>
          </details>
        </div>

        <aside className="build-note" id="build">
          <SectionLabel>Behind the build</SectionLabel>
          <h2>Designed as a trustworthy AI system.</h2>
          <p>The live application uses a server-side OpenAI integration with structured output, curated evidence, schema validation, and anti-fabrication evaluations.</p>
          <div className="build-flow" aria-label="Application architecture">
            <span>Approved evidence</span><b>→</b><span>Server</span><b>→</b><span>OpenAI</span><b>→</b><span>Validated brief</span>
          </div>
          <ul>
            <li>No visitor profile scraping</li>
            <li>No personal data required</li>
            <li>Facts separated from assumptions</li>
            <li>Evidence limited to approved case sources</li>
          </ul>
        </aside>
      </section>

      <section className="closing">
        <div className="shell closing-inner">
          <SectionLabel>OpenAI · Solutions Engineer, Large Enterprise</SectionLabel>
          <h2>I built this to show how I combine discovery, technical depth, and enterprise trust.</h2>
          <p>And how I would bring that approach to OpenAI’s Large Enterprise customers.</p>
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
