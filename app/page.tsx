"use client";

import { FormEvent, useMemo, useState } from "react";
import { CRISIS_CASE, SOURCE_BY_ID } from "./lib/crisis-case";
import {
  DEFAULT_ANSWER,
  DEFAULT_QUESTION,
  fallbackAnswerForQuestion,
  type AnswerGeneration,
  type CitedClaim,
  type DecisionAnswer,
  type DecisionAnswerApiResponse,
} from "./lib/decision-answer";

const SUGGESTED_QUESTIONS = [
  "What should happen next before a buying decision?",
  "What is the biggest hidden risk?",
  "Where is the business value in this PoV?",
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function SourceRefs({ sourceIds }: { sourceIds: string[] }) {
  return (
    <span
      className="source-refs"
      aria-label={`Sources: ${sourceIds.map((id) => SOURCE_BY_ID[id]?.title ?? id).join(", ")}`}
    >
      {sourceIds.map((sourceId) => {
        const source = SOURCE_BY_ID[sourceId];
        return (
          <span key={sourceId} title={`${source?.title}: ${source?.fact}`}>
            {source?.label ?? sourceId}
          </span>
        );
      })}
    </span>
  );
}

function Claim({ claim }: { claim: CitedClaim }) {
  return (
    <>
      <p>{claim.text}</p>
      <SourceRefs sourceIds={claim.sourceIds} />
    </>
  );
}

export default function Home() {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [askedQuestion, setAskedQuestion] = useState(DEFAULT_QUESTION);
  const [answer, setAnswer] = useState<DecisionAnswer>(DEFAULT_ANSWER);
  const [generation, setGeneration] = useState<AnswerGeneration | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedSourceIds = useMemo(
    () => Array.from(new Set([
      ...answer.recommendation.sourceIds,
      ...answer.evidence.flatMap((item) => item.sourceIds),
      ...answer.uncertainty.sourceIds,
      ...answer.nextStep.sourceIds,
    ])),
    [answer],
  );

  async function askEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 8) {
      setError("Ask a little more specifically so the evidence can be useful.");
      return;
    }

    setIsThinking(true);
    setError(null);
    setAskedQuestion(trimmedQuestion);

    try {
      const response = await fetch("/api/decision-answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: CRISIS_CASE.id, question: trimmedQuestion }),
      });
      const payload = (await response.json()) as DecisionAnswerApiResponse & { error?: string };
      if (!response.ok || !payload.answer || !payload.generation?.validated) {
        throw new Error(payload.error ?? "The answer could not be validated.");
      }
      setAnswer(payload.answer);
      setGeneration(payload.generation);
    } catch (requestError) {
      setAnswer(fallbackAnswerForQuestion(trimmedQuestion));
      setGeneration({
        mode: "fallback",
        model: "gpt-5.6",
        validated: true,
        notice: "The live request could not be completed. A source-validated answer is shown instead.",
      });
      setError(requestError instanceof Error ? requestError.message : "The live request was unavailable.");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Hena Kless, home">
          <span className="brand-mark">HK</span>
          <span className="brand-name">Hena Kless</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#decision-room">AI proof</a>
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a className="nav-cta" href="/Hena_Kless_CV_2026.pdf" download>
            CV <Arrow />
          </a>
        </nav>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Enterprise solutions engineering · Applied AI</p>
          <h1>I make complex AI decisions easier to trust.</h1>
          <p className="hero-lede">
            I turn ambiguous requirements into a clear solution, a credible test, and the evidence people need to move forward.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#decision-room">See how I work <span aria-hidden="true">↓</span></a>
            <a className="button quiet" href="/Hena_Kless_CV_2026.pdf" download>Download CV <Arrow /></a>
          </div>
        </div>

        <aside className="hero-note" aria-label="Selected experience">
          <p>Solutions Engineer based in Munich</p>
          <dl>
            <div><dt>6+</dt><dd>years in technical pre-sales</dd></div>
            <div><dt>€542K</dt><dd>ARR contribution in 2024</dd></div>
            <div><dt>35+</dt><dd>talks and webinars</dd></div>
          </dl>
          <p className="hero-note-foot">Secure SaaS · Regulated environments · Four languages</p>
        </aside>
      </section>

      <section className="decision-section" id="decision-room">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">A small, useful AI proof</p>
            <h2>One question. One grounded answer.</h2>
            <p>
              The AI does not invent a new case study. It interprets approved evidence, makes one recommendation, and shows exactly where confidence ends.
            </p>
          </div>

          <div className="decision-room">
            <aside className="case-card">
              <div className="case-card-topline">
                <span>Prepared case</span>
                <span className="case-status">PoV in progress</span>
              </div>
              <h3>Microsoft-independent crisis communications</h3>
              <p>{CRISIS_CASE.summary}</p>
              <dl className="case-facts">
                <div>
                  <dt>Need</dt>
                  <dd>Keep roughly 30 crisis users connected when the primary stack is unavailable or untrusted.</dd>
                </div>
                <div>
                  <dt>Known</dt>
                  <dd>Mobile passed. The web and desktop issue was isolated to proxy and SSL inspection.</dd>
                </div>
                <div>
                  <dt>Unknown</dt>
                  <dd>The final network-adjusted retest is pending. This is not a Closed Won deployment.</dd>
                </div>
              </dl>
              <a href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">
                Read the full case study <Arrow />
              </a>
            </aside>

            <div className="question-workspace">
              <form onSubmit={askEvidence} className="question-form">
                <label htmlFor="decision-question">Ask a decision question about this case</label>
                <div className="question-suggestions" aria-label="Suggested questions">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={question === suggestion ? "active" : ""}
                      onClick={() => {
                        setQuestion(suggestion);
                        setError(null);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <div className="question-input-row">
                  <textarea
                    id="decision-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={2}
                    maxLength={240}
                    aria-describedby="question-guardrail"
                  />
                  <button className="button primary ask-button" type="submit" disabled={isThinking}>
                    {isThinking ? "Reading evidence…" : "Ask the evidence"}
                    {!isThinking && <span aria-hidden="true">→</span>}
                  </button>
                </div>
                <div className="question-meta" id="question-guardrail">
                  <span>AI can interpret and recommend. It cannot add facts.</span>
                  <span>{question.length}/240</span>
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
              </form>

              <article className={`answer-panel ${isThinking ? "is-thinking" : ""}`} aria-live="polite" aria-busy={isThinking}>
                <div className="answer-topline">
                  <span>{generation?.mode === "live" ? "Live AI answer" : generation ? "Validated fallback" : "Example answer"}</span>
                  <span>{generation?.model ?? "gpt-5.6"} · source-bound</span>
                </div>
                <p className="asked-question">“{askedQuestion}”</p>

                {isThinking ? (
                  <div className="thinking-state" role="status">
                    <span /><span /><span />
                    <p>Finding the decision, the evidence, and the honest unknown.</p>
                  </div>
                ) : (
                  <>
                    {generation?.notice && <p className="generation-note">{generation.notice}</p>}
                    <section className="recommendation">
                      <span>Recommendation</span>
                      <Claim claim={answer.recommendation} />
                    </section>
                    <div className="answer-grid">
                      <section>
                        <span>Evidence</span>
                        {answer.evidence.map((item, index) => (
                          <div className="evidence-item" key={`${item.text}-${index}`}>
                            <Claim claim={item} />
                          </div>
                        ))}
                      </section>
                      <section>
                        <span>What remains unknown</span>
                        <Claim claim={answer.uncertainty} />
                      </section>
                    </div>
                    <section className="next-step">
                      <span>Next test</span>
                      <Claim claim={answer.nextStep} />
                    </section>
                    <div className="source-legend">
                      <span>Sources used</span>
                      <SourceRefs sourceIds={usedSourceIds} />
                      <small>R = requirement · O = observed · P = pending</small>
                    </div>
                  </>
                )}
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="work-section" id="work">
        <div className="shell work-grid">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2>The evidence behind the interaction.</h2>
          </div>
          <article className="work-story">
            <p className="work-meta">European industrial group · Crisis management · Anonymized</p>
            <h3>Keeping a crisis team connected when the primary collaboration stack fails.</h3>
            <p>
              I translated resilience and identity-independence requirements into test scenarios, guided validation across mobile, web, and desktop, and helped isolate the network issue blocking the PoV.
            </p>
            <div className="work-outcome">
              <span>Result so far</span>
              <p>Technical fit largely validated. Final network validation remains pending.</p>
            </div>
            <a className="button light" href="/Crisis_Communications_Case_Study.pdf" target="_blank" rel="noreferrer">
              Read the case study <Arrow />
            </a>
          </article>
        </div>
      </section>

      <section className="experience-section shell" id="experience">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Experience</p>
          <h2>Six years at the customer–technology boundary.</h2>
        </div>
        <div className="experience-grid">
          <div className="timeline">
            <article>
              <time>2026—NOW</time>
              <div><span>Wire · Munich</span><h3>Senior Solutions Engineer</h3></div>
            </article>
            <article>
              <time>2022—2025</time>
              <div><span>LastPass · Munich</span><h3>Solutions Consultant → Senior Solutions Consultant</h3></div>
            </article>
            <article>
              <time>2019—2022</time>
              <div><span>Lombego Systems · Weimar</span><h3>Solution Consultant</h3></div>
            </article>
          </div>
          <aside className="working-style">
            <h3>How I work</h3>
            <ol>
              <li><span>01</span><p><strong>Find the real decision.</strong> Align people, outcomes, and constraints before reaching for a demo.</p></li>
              <li><span>02</span><p><strong>Make uncertainty testable.</strong> Turn requirements and risk into a proof plan with clear success criteria.</p></li>
              <li><span>03</span><p><strong>Keep claims honest.</strong> Separate what is required, observed, inferred, and still pending.</p></li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="contact-section">
        <div className="shell contact-inner">
          <div>
            <p className="eyebrow">OpenAI · Solutions Engineer</p>
            <h2>Let’s make the next decision clearer.</h2>
          </div>
          <div className="contact-actions">
            <a className="button contact-primary" href="mailto:hena.kless@outlook.com">Start a conversation <Arrow /></a>
            <a className="button contact-secondary" href="https://www.linkedin.com/in/henakless/" target="_blank" rel="noreferrer">LinkedIn <Arrow /></a>
          </div>
        </div>
      </section>

      <footer className="site-footer shell">
        <span>© 2026 Hena Kless</span>
        <span>Munich, Germany</span>
        <a href="mailto:hena.kless@outlook.com">hena.kless@outlook.com</a>
      </footer>
    </main>
  );
}
