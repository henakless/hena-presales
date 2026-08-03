"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  EXAMPLE_NOTES,
  masteryLabel,
  type ExtractedItem,
  type ExtractionResult,
  type SavedItem,
  type SavedLesson,
} from "../../lib/spanish-buddy";

type View = "today" | "add" | "library";
type ExerciseType = "translation" | "blank" | "choice" | "flashcard" | "sentence";

type Exercise = {
  type: ExerciseType;
  label: string;
  item: SavedItem;
  prompt: string;
  answer: string;
  helper: string;
  options?: string[];
  selfRate?: boolean;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFKC")
    .replace(/[¿?¡!.,;:()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function apiUrl(path: string) {
  const basePath = window.location.pathname.replace(/\/$/, "");
  return `${basePath}/api/${path}`;
}

function acceptsAnswer(input: string, expected: string) {
  const actual = normalize(input);
  return expected
    .split(/\s*[/;]\s*/)
    .map(normalize)
    .some((candidate) => candidate === actual || (candidate.length > 4 && actual.includes(candidate)));
}

function shuffled<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

function buildExercises(items: SavedItem[]) {
  const candidates = [...items]
    .sort((a, b) => a.mastery - b.mastery || a.nextReviewAt.localeCompare(b.nextReviewAt))
    .slice(0, 8);
  const translations = items.filter((item) => item.translation).map((item) => item.translation);

  return candidates.map<Exercise>((item, index) => {
    const type = (["translation", "blank", "choice", "flashcard", "sentence"] as ExerciseType[])[index % 5];
    if (type === "blank" && item.kind === "vocabulary" && item.example) {
      const escaped = item.spanish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const blanked = item.example.replace(new RegExp(escaped, "i"), "_____");
      if (blanked !== item.example) {
        return {
          type,
          label: "Fill in the blank",
          item,
          prompt: blanked,
          answer: item.spanish,
          helper: item.translation,
        };
      }
    }

    if (type === "choice") {
      const distractors = shuffled(translations.filter((value) => value !== item.translation)).slice(0, 3);
      return {
        type,
        label: "Choose the meaning",
        item,
        prompt: item.spanish,
        answer: item.translation || item.explanation,
        helper: "Choose the best match.",
        options: shuffled([item.translation || item.explanation, ...distractors]).filter(Boolean),
      };
    }

    if (type === "flashcard" || item.kind === "grammar") {
      return {
        type: "flashcard",
        label: item.kind === "grammar" ? "Explain the rule" : "Recall",
        item,
        prompt: item.spanish,
        answer: item.explanation || item.translation,
        helper: "Say the answer to yourself before revealing it.",
        selfRate: true,
      };
    }

    if (type === "sentence") {
      return {
        type,
        label: "Build a sentence",
        item,
        prompt: `Write one Spanish sentence using “${item.spanish}”.`,
        answer: item.example || `Use “${item.spanish}” in a complete sentence.`,
        helper: "A short, natural sentence is enough.",
        selfRate: true,
      };
    }

    return {
      type: "translation",
      label: "Type the translation",
      item,
      prompt: item.spanish,
      answer: item.translation || item.explanation,
      helper: "Translate into the language used in your notes.",
    };
  });
}

export default function SpanishBuddy() {
  const [view, setView] = useState<View>("today");
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [sourceDeleted, setSourceDeleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const currentExercise = exercises[exerciseIndex];
  const dueItems = useMemo(
    () => items.filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now() || item.mastery < 35),
    [items],
  );
  const averageMastery = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.mastery, 0) / items.length)
    : 0;

  async function loadLibrary() {
    try {
      const response = await fetch(apiUrl("lessons"), { cache: "no-store" });
      const body = (await response.json()) as { lessons?: SavedLesson[]; items?: SavedItem[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Your library could not be loaded.");
      setLessons(body.lessons ?? []);
      setItems(body.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your library could not be loaded.");
    } finally {
      setLoadingLibrary(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).slice(0, 6));
    setError("");
  }

  function useExample(example: (typeof EXAMPLE_NOTES)[number]) {
    setTitle(example.title);
    setNote(example.text);
    setFiles([]);
    setExtraction(null);
    setSourceDeleted(false);
    setView("add");
    setError("");
  }

  async function analyzeLesson(event: FormEvent) {
    event.preventDefault();
    if (!note.trim() && files.length === 0) {
      setError("Add a photo or paste some notes first.");
      return;
    }

    setBusy(true);
    setError("");
    setExtraction(null);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("note", note.trim());
    files.forEach((file) => formData.append("images", file));

    try {
      const response = await fetch(apiUrl("extract"), { method: "POST", body: formData });
      const body = (await response.json()) as { extraction?: ExtractionResult; sourceDeleted?: boolean; error?: string };
      if (!response.ok || !body.extraction) throw new Error(body.error || "The lesson could not be analyzed.");
      setExtraction(body.extraction);
      setTitle(body.extraction.title);
      setSourceDeleted(body.sourceDeleted === true);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "The lesson could not be analyzed.");
    } finally {
      setBusy(false);
    }
  }

  function updateExtractedItem(id: string, patch: Partial<ExtractedItem>) {
    setExtraction((current) =>
      current
        ? { ...current, items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
        : current,
    );
  }

  async function saveLesson() {
    if (!extraction) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("lessons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extraction.title,
          summary: extraction.summary,
          sourceType: files.length ? "images" : "typed notes",
          items: extraction.items,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The lesson could not be saved.");
      setExtraction(null);
      setTitle("");
      setNote("");
      setFiles([]);
      await loadLibrary();
      setView("today");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The lesson could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function startSession(sourceItems = dueItems.length ? dueItems : items) {
    const nextExercises = buildExercises(sourceItems);
    if (nextExercises.length === 0) {
      setView("add");
      return;
    }
    setExercises(nextExercises);
    setExerciseIndex(0);
    setAnswer("");
    setRevealed(false);
    setResult(null);
    setSessionCorrect(0);
    setSessionDone(false);
  }

  async function recordAttempt(correct: boolean) {
    if (!currentExercise) return;
    if (correct) setSessionCorrect((value) => value + 1);
    setItems((current) =>
      current.map((item) =>
        item.id === currentExercise.item.id
          ? { ...item, mastery: Math.max(0, Math.min(100, item.mastery + (correct ? 12 : -20))) }
          : item,
      ),
    );
    try {
      const response = await fetch(apiUrl("attempts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentExercise.item.id, correct, exerciseType: currentExercise.type }),
      });
      const body = (await response.json()) as {
        progress?: { mastery: number; attempts: number; correctCount: number; nextReviewAt: string };
      };
      if (response.ok && body.progress) {
        setItems((current) =>
          current.map((item) => (item.id === currentExercise.item.id ? { ...item, ...body.progress } : item)),
        );
      }
    } catch {
      // The answer remains usable even when progress syncing has a transient failure.
    }
  }

  function submitAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!currentExercise || !answer.trim()) return;
    const correct = acceptsAnswer(answer, currentExercise.answer);
    setResult(correct ? "correct" : "incorrect");
    setRevealed(true);
    void recordAttempt(correct);
  }

  function chooseAnswer(option: string) {
    if (revealed) return;
    setAnswer(option);
    const correct = acceptsAnswer(option, currentExercise.answer);
    setResult(correct ? "correct" : "incorrect");
    setRevealed(true);
    void recordAttempt(correct);
  }

  function selfRate(correct: boolean) {
    if (result) return;
    setResult(correct ? "correct" : "incorrect");
    void recordAttempt(correct);
  }

  function nextExercise() {
    if (exerciseIndex + 1 >= exercises.length) {
      setSessionDone(true);
      void loadLibrary();
      return;
    }
    setExerciseIndex((value) => value + 1);
    setAnswer("");
    setRevealed(false);
    setResult(null);
  }

  function closeSession() {
    setExercises([]);
    setSessionDone(false);
    setExerciseIndex(0);
  }

  return (
    <main className="sb-app">
      <header className="sb-header">
        <button className="sb-brand" onClick={() => { setView("today"); closeSession(); }} aria-label="Spanish Buddy home">
          <span className="sb-brand-mark" aria-hidden="true">ñ</span>
          <span>Spanish Buddy<small>Your course, remembered.</small></span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Today</button>
          <button className={view === "add" ? "active" : ""} onClick={() => setView("add")}>Add lesson</button>
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>Library</button>
        </nav>
        <div className="sb-level"><span>B1</span><small>European Spanish</small></div>
      </header>

      {error && <div className="sb-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}

      {view === "today" && (
        <div className="sb-shell">
          <section className="sb-welcome">
            <div>
              <p className="sb-eyebrow">Hoy · your adaptive plan</p>
              <h1>Keep what you<br /><em>learned in class.</em></h1>
              <p>Spanish Buddy turns your own notes into the practice you need today—not somebody else’s curriculum.</p>
            </div>
            <div className="sb-orbit" aria-hidden="true"><span>{averageMastery}%</span><small>confidence</small></div>
          </section>

          <section className="sb-dashboard-grid">
            <article className="sb-daily-card">
              <div className="sb-card-topline"><span>01</span><span>{dueItems.length || items.length} items ready</span></div>
              <div className="sb-daily-copy">
                <p>Daily practice</p>
                <h2>{items.length ? "A little recall now makes tomorrow easier." : "Your first lesson starts here."}</h2>
                <span>{items.length ? "About 8 minutes · mixed practice" : "Upload notes or begin with an example"}</span>
              </div>
              <button className="sb-primary" onClick={() => items.length ? startSession() : setView("add")}>
                {items.length ? "Start today’s session" : "Add your first lesson"}<span aria-hidden="true">→</span>
              </button>
            </article>

            <aside className="sb-progress-card">
              <p className="sb-eyebrow">Your learning base</p>
              <div className="sb-stat-row"><strong>{items.length}</strong><span>words & rules</span></div>
              <div className="sb-stat-row"><strong>{lessons.length}</strong><span>course lessons</span></div>
              <div className="sb-stat-row"><strong>{items.filter((item) => item.mastery >= 62).length}</strong><span>familiar or strong</span></div>
              <div className="sb-meter"><span style={{ width: `${averageMastery}%` }} /></div>
              <small>Confidence grows from successful recall—not just reading.</small>
            </aside>
          </section>

          <section className="sb-recents">
            <div className="sb-section-heading"><div><p className="sb-eyebrow">Continue learning</p><h2>Recent lessons</h2></div><button onClick={() => setView("library")}>View library →</button></div>
            {loadingLibrary ? <div className="sb-empty">Loading your learning base…</div> : lessons.length ? (
              <div className="sb-lesson-grid">
                {lessons.slice(0, 3).map((lesson, index) => (
                  <article className="sb-lesson-card" key={lesson.id}>
                    <span className="sb-lesson-number">0{index + 1}</span>
                    <p>{new Date(lesson.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</p>
                    <h3>{lesson.title}</h3>
                    <div><span>{lesson.items.length} items</span><span>{Math.round(lesson.items.reduce((sum, item) => sum + item.mastery, 0) / Math.max(lesson.items.length, 1))}%</span></div>
                    <button onClick={() => startSession(lesson.items)}>Study this lesson</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="sb-empty sb-starter-empty">
                <div><strong>Nothing saved yet.</strong><span>Try a generated note or upload today’s class.</span></div>
                <button onClick={() => useExample(EXAMPLE_NOTES[0])}>Use an example note</button>
              </div>
            )}
          </section>
        </div>
      )}

      {view === "add" && (
        <div className="sb-shell sb-add-shell">
          <section className="sb-add-intro"><p className="sb-eyebrow">New lesson</p><h1>What did you learn <em>today?</em></h1><p>Photos are analyzed in memory and deleted immediately. You approve every word and rule before it reaches practice.</p></section>

          {!extraction ? (
            <form className="sb-capture" onSubmit={analyzeLesson}>
              <label className="sb-field"><span>Lesson title <small>optional</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Unidad 5 · Invitations" maxLength={100} /></label>
              <div className="sb-upload-grid">
                <label className="sb-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" multiple onChange={onFiles} />
                  <span className="sb-camera" aria-hidden="true">+</span>
                  <strong>Photograph or upload notes</strong>
                  <small>Handwriting, textbook pages, or scans · up to 6 images</small>
                  {files.length > 0 && <b>{files.length} image{files.length === 1 ? "" : "s"} selected</b>}
                </label>
                <label className="sb-field sb-notes-field"><span>Or paste your notes</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="la amistad — die Freundschaft…" maxLength={12000} /></label>
              </div>
              <div className="sb-example-strip">
                <div><p className="sb-eyebrow">Need something to test?</p><strong>Use a generated example</strong></div>
                {EXAMPLE_NOTES.map((example) => <button type="button" key={example.id} onClick={() => useExample(example)}><span>{example.label}</span>{example.title}</button>)}
              </div>
              <button className="sb-primary sb-analyze" disabled={busy}>{busy ? "Reading your lesson…" : "Analyze lesson"}<span aria-hidden="true">→</span></button>
            </form>
          ) : (
            <section className="sb-review">
              <div className="sb-review-header">
                <div><p className="sb-eyebrow">Review extraction</p><input aria-label="Lesson title" value={extraction.title} onChange={(event) => setExtraction({ ...extraction, title: event.target.value })} /><p>{extraction.summary}</p></div>
                <div className="sb-deletion"><span aria-hidden="true">✓</span><div><strong>Source deleted</strong><small>{sourceDeleted ? "Only the structured lesson remains." : "Deletion pending."}</small></div></div>
              </div>
              <div className="sb-review-tools"><span>{extraction.items.filter((item) => item.selected).length} approved</span><span>{extraction.items.filter((item) => item.confidence === "low").length} need attention</span><button onClick={() => setExtraction(null)}>Start over</button></div>
              <div className="sb-review-list">
                {extraction.items.map((item) => (
                  <article className={`sb-review-item ${item.provenance === "suggested" ? "suggested" : ""}`} key={item.id}>
                    <label className="sb-check"><input type="checkbox" checked={item.selected} onChange={(event) => updateExtractedItem(item.id, { selected: event.target.checked })} /><span /></label>
                    <div className="sb-item-fields">
                      <div className="sb-item-badges"><span>{item.kind}</span><span>{item.provenance === "suggested" ? "Suggested support" : "From your lesson"}</span>{item.confidence !== "high" && <span className="warning">{item.confidence} confidence</span>}</div>
                      <input aria-label="Spanish" value={item.spanish} onChange={(event) => updateExtractedItem(item.id, { spanish: event.target.value })} />
                      <input aria-label="Translation" value={item.translation} onChange={(event) => updateExtractedItem(item.id, { translation: event.target.value })} placeholder="Translation or label" />
                      <textarea aria-label="Explanation" value={item.explanation} onChange={(event) => updateExtractedItem(item.id, { explanation: event.target.value })} placeholder="Short explanation" />
                      <input aria-label="Example" value={item.example} onChange={(event) => updateExtractedItem(item.id, { example: event.target.value })} placeholder="Example sentence" />
                    </div>
                  </article>
                ))}
              </div>
              <div className="sb-review-actions"><p>You stay in control. Unchecked items will not enter your learning base.</p><button className="sb-primary" disabled={busy || !extraction.items.some((item) => item.selected)} onClick={saveLesson}>{busy ? "Saving…" : "Save & build practice"}<span>→</span></button></div>
            </section>
          )}
        </div>
      )}

      {view === "library" && (
        <div className="sb-shell sb-library">
          <div className="sb-library-heading"><div><p className="sb-eyebrow">Your learning base</p><h1>Everything you’ve <em>learned.</em></h1></div><button className="sb-primary" onClick={() => setView("add")}>Add lesson <span>+</span></button></div>
          {lessons.length ? lessons.map((lesson) => (
            <section className="sb-library-lesson" key={lesson.id}>
              <div className="sb-library-lesson-head"><div><span>{new Date(lesson.createdAt).toLocaleDateString("de-DE")}</span><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><button onClick={() => startSession(lesson.items)}>Study lesson →</button></div>
              <div className="sb-library-items">
                {lesson.items.map((item) => (
                  <article key={item.id}><div><span>{item.kind === "grammar" ? "Rule" : "Word"}</span>{item.provenance === "suggested" && <small>Suggested</small>}</div><h3>{item.spanish}</h3><p>{item.translation || item.explanation}</p><div className="sb-item-mastery"><span><i style={{ width: `${item.mastery}%` }} /></span><small>{masteryLabel(item.mastery)} · {item.mastery}%</small></div></article>
                ))}
              </div>
            </section>
          )) : <div className="sb-empty sb-starter-empty"><div><strong>Your library is ready for its first lesson.</strong><span>Upload course notes or start with one of the examples.</span></div><button onClick={() => setView("add")}>Add a lesson</button></div>}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="sb-practice" role="dialog" aria-modal="true" aria-label="Daily practice">
          <header><button onClick={closeSession} aria-label="Close practice">×</button><div><span style={{ width: `${sessionDone ? 100 : ((exerciseIndex + 1) / exercises.length) * 100}%` }} /></div><small>{sessionDone ? exercises.length : exerciseIndex + 1} / {exercises.length}</small></header>
          {sessionDone ? (
            <section className="sb-session-summary"><p className="sb-eyebrow">Session complete</p><div className="sb-summary-score"><strong>{sessionCorrect}/{exercises.length}</strong><span>solid recalls</span></div><h2>Bien hecho. Your next session is already smarter.</h2><p>Missed material will return sooner. Strong recalls now get more space before the next review.</p><button className="sb-primary" onClick={closeSession}>Back to today <span>→</span></button></section>
          ) : currentExercise && (
            <section className="sb-exercise">
              <div className="sb-exercise-meta"><span>{currentExercise.label}</span><span>{currentExercise.item.lessonTitle}</span></div>
              <div className="sb-exercise-card">
                <p>{currentExercise.helper}</p>
                <h2>{currentExercise.prompt}</h2>
                {currentExercise.options ? (
                  <div className="sb-options">{currentExercise.options.map((option) => <button className={revealed ? acceptsAnswer(option, currentExercise.answer) ? "correct" : option === answer ? "incorrect" : "" : ""} key={option} onClick={() => chooseAnswer(option)}>{option}</button>)}</div>
                ) : currentExercise.selfRate ? (
                  <div className="sb-self-rate">
                    {!revealed ? <button className="sb-reveal" onClick={() => setRevealed(true)}>Reveal answer</button> : <><div className="sb-answer"><small>Suggested answer</small><strong>{currentExercise.answer}</strong></div>{!result && <div><button onClick={() => selfRate(false)}>Needs work</button><button onClick={() => selfRate(true)}>I got it</button></div>}</>}
                  </div>
                ) : (
                  <form className="sb-answer-form" onSubmit={submitAnswer}><input autoFocus value={answer} disabled={revealed} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer…" /><button disabled={revealed || !answer.trim()}>Check</button></form>
                )}
                {revealed && !currentExercise.selfRate && <div className={`sb-feedback ${result}`}><span>{result === "correct" ? "✓" : "→"}</span><div><strong>{result === "correct" ? "Exactly." : "Keep this one close."}</strong><p>{result === "incorrect" && <>Answer: </>}{currentExercise.answer}</p></div></div>}
                {result && <button className="sb-next" onClick={nextExercise}>{exerciseIndex + 1 === exercises.length ? "See results" : "Continue"} →</button>}
              </div>
              <div className="sb-focus-note"><span>Why this?</span><p>{currentExercise.item.mastery < 35 ? "This is new or needs attention, so it appears earlier." : "This item is due for a spaced review."}</p></div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
