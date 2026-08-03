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

type AnswerFeedback = {
  title: string;
  message: string;
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
          label: "Lücke ausfüllen",
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
        label: "Bedeutung auswählen",
        item,
        prompt: item.spanish,
        answer: item.translation || item.explanation,
        helper: "Wähle die passendste Bedeutung.",
        options: shuffled([item.translation || item.explanation, ...distractors]).filter(Boolean),
      };
    }

    if (type === "flashcard" || item.kind === "grammar") {
      return {
        type: "flashcard",
        label: item.kind === "grammar" ? "Regel erklären" : "Abrufen",
        item,
        prompt: item.spanish,
        answer: item.explanation || item.translation,
        helper: "Sprich die Antwort aus, bevor du sie aufdeckst.",
        selfRate: true,
      };
    }

    if (type === "sentence") {
      return {
        type,
        label: "Satz bilden",
        item,
        prompt: `Schreibe einen spanischen Satz mit „${item.spanish}“`,
        answer: item.example || `Verwende „${item.spanish}“ in einem vollständigen Satz.`,
        helper: "Ein kurzer, natürlicher Satz genügt.",
        selfRate: true,
      };
    }

    return {
      type: "translation",
      label: "Übersetzung eingeben",
      item,
      prompt: item.spanish,
      answer: item.translation || item.explanation,
      helper: "Übersetze in die Sprache deiner Notizen.",
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
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [needsManualReview, setNeedsManualReview] = useState(false);
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
      if (!response.ok) throw new Error(body.error || "Deine Bibliothek konnte nicht geladen werden.");
      setLessons(body.lessons ?? []);
      setItems(body.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Deine Bibliothek konnte nicht geladen werden.");
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
      setError("Füge zuerst ein Foto oder Notizen ein.");
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
      if (!response.ok || !body.extraction) throw new Error(body.error || "Die Lektion konnte nicht analysiert werden.");
      setExtraction(body.extraction);
      setTitle(body.extraction.title);
      setSourceDeleted(body.sourceDeleted === true);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Die Lektion konnte nicht analysiert werden.");
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
          sourceType: files.length ? "Bilder" : "Textnotizen",
          items: extraction.items,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Die Lektion konnte nicht gespeichert werden.");
      setExtraction(null);
      setTitle("");
      setNote("");
      setFiles([]);
      await loadLibrary();
      setView("today");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Die Lektion konnte nicht gespeichert werden.");
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
    setAnswerFeedback(null);
    setCheckingAnswer(false);
    setNeedsManualReview(false);
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

  async function submitAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!currentExercise || !answer.trim() || checkingAnswer || revealed) return;

    if (acceptsAnswer(answer, currentExercise.answer)) {
      setResult("correct");
      setAnswerFeedback({ title: "Genau richtig.", message: currentExercise.answer });
      setRevealed(true);
      void recordAttempt(true);
      return;
    }

    setCheckingAnswer(true);
    setAnswerFeedback(null);
    try {
      const response = await fetch(apiUrl("evaluate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentExercise.prompt,
          expectedAnswer: currentExercise.answer,
          learnerAnswer: answer,
          exerciseType: currentExercise.type,
          context: [currentExercise.item.spanish, currentExercise.item.translation, currentExercise.item.explanation]
            .filter(Boolean)
            .join(" · "),
        }),
      });
      const body = (await response.json()) as {
        correct?: boolean;
        equivalence?: "exact" | "equivalent" | "not_equivalent";
        feedback?: string;
        error?: string;
      };
      if (!response.ok || typeof body.correct !== "boolean") {
        throw new Error(body.error || "Diese Formulierung konnte gerade nicht geprüft werden.");
      }

      setResult(body.correct ? "correct" : "incorrect");
      setAnswerFeedback({
        title: body.correct ? (body.equivalence === "exact" ? "Genau richtig." : "Auch richtig.") : "Noch nicht ganz.",
        message: body.feedback || (body.correct ? "Diese Formulierung passt ebenfalls." : `Referenz: ${currentExercise.answer}`),
      });
      setRevealed(true);
      void recordAttempt(body.correct);
    } catch {
      setNeedsManualReview(true);
      setAnswerFeedback({
        title: "Du entscheidest.",
        message: "Ich konnte die Bedeutung gerade nicht vergleichen. Entscheide, ob deine Formulierung zählen soll.",
      });
      setRevealed(true);
    } finally {
      setCheckingAnswer(false);
    }
  }

  function resolveManualReview(correct: boolean) {
    if (!needsManualReview || result) return;
    setNeedsManualReview(false);
    setResult(correct ? "correct" : "incorrect");
    setAnswerFeedback({
      title: correct ? "Als richtig gewertet." : "Referenzantwort übernommen.",
      message: correct ? "Deine Formulierung zählt für diese Wiederholung." : currentExercise.answer,
    });
    void recordAttempt(correct);
  }

  function chooseAnswer(option: string) {
    if (revealed) return;
    setAnswer(option);
    const correct = acceptsAnswer(option, currentExercise.answer);
    setResult(correct ? "correct" : "incorrect");
    setAnswerFeedback({
      title: correct ? "Genau richtig." : "Noch nicht ganz.",
      message: correct ? currentExercise.answer : `Antwort: ${currentExercise.answer}`,
    });
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
    setAnswerFeedback(null);
    setNeedsManualReview(false);
  }

  function closeSession() {
    setExercises([]);
    setSessionDone(false);
    setExerciseIndex(0);
    setCheckingAnswer(false);
    setAnswerFeedback(null);
    setNeedsManualReview(false);
  }

  return (
    <main className="sb-app" lang="de">
      <header className="sb-header">
        <button className="sb-brand" onClick={() => { setView("today"); closeSession(); }} aria-label="Spanish Buddy Startseite">
          <span className="sb-brand-mark" aria-hidden="true">ñ</span>
          <span>Spanish Buddy<small>Dein Kurs, im Kopf.</small></span>
        </button>
        <nav aria-label="Hauptnavigation">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Heute</button>
          <button className={view === "add" ? "active" : ""} onClick={() => setView("add")}>Lektion hinzufügen</button>
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>Bibliothek</button>
        </nav>
        <div className="sb-level"><span>B1</span><small>Spanisch aus Spanien</small></div>
      </header>

      {error && <div className="sb-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Schließen</button></div>}

      {view === "today" && (
        <div className="sb-shell">
          <section className="sb-welcome">
            <div>
              <p className="sb-eyebrow">Hoy · dein adaptiver Plan</p>
              <h1>Behalte, was du<br /><em>im Kurs gelernt hast.</em></h1>
              <p>Spanish Buddy macht aus deinen eigenen Notizen genau das Training, das du heute brauchst.</p>
            </div>
            <div className="sb-orbit" aria-hidden="true"><span>{averageMastery}%</span><small>Sicherheit</small></div>
          </section>

          <section className="sb-dashboard-grid">
            <article className="sb-daily-card">
              <div className="sb-card-topline"><span>01</span><span>{dueItems.length || items.length} Einträge bereit</span></div>
              <div className="sb-daily-copy">
                <p>Tägliches Training</p>
                <h2>{items.length ? "Ein wenig Wiederholung heute macht es morgen leichter." : "Deine erste Lektion beginnt hier."}</h2>
                <span>{items.length ? "Etwa 8 Minuten · gemischte Übungen" : "Notizen hochladen oder mit einem Beispiel starten"}</span>
              </div>
              <button className="sb-primary" onClick={() => items.length ? startSession() : setView("add")}>
                {items.length ? "Heutiges Training starten" : "Erste Lektion hinzufügen"}<span aria-hidden="true">→</span>
              </button>
            </article>

            <aside className="sb-progress-card">
              <p className="sb-eyebrow">Deine Lernbasis</p>
              <div className="sb-stat-row"><strong>{items.length}</strong><span>Wörter & Regeln</span></div>
              <div className="sb-stat-row"><strong>{lessons.length}</strong><span>Kurslektionen</span></div>
              <div className="sb-stat-row"><strong>{items.filter((item) => item.mastery >= 62).length}</strong><span>vertraut oder sicher</span></div>
              <div className="sb-meter"><span style={{ width: `${averageMastery}%` }} /></div>
              <small>Sicherheit entsteht durch erfolgreiches Abrufen – nicht nur durch Lesen.</small>
            </aside>
          </section>

          <section className="sb-recents">
            <div className="sb-section-heading"><div><p className="sb-eyebrow">Weiterlernen</p><h2>Letzte Lektionen</h2></div><button onClick={() => setView("library")}>Bibliothek ansehen →</button></div>
            {loadingLibrary ? <div className="sb-empty">Deine Lernbasis wird geladen…</div> : lessons.length ? (
              <div className="sb-lesson-grid">
                {lessons.slice(0, 3).map((lesson, index) => (
                  <article className="sb-lesson-card" key={lesson.id}>
                    <span className="sb-lesson-number">0{index + 1}</span>
                    <p>{new Date(lesson.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</p>
                    <h3>{lesson.title}</h3>
                    <div><span>{lesson.items.length} Einträge</span><span>{Math.round(lesson.items.reduce((sum, item) => sum + item.mastery, 0) / Math.max(lesson.items.length, 1))}%</span></div>
                    <button onClick={() => startSession(lesson.items)}>Lektion üben</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="sb-empty sb-starter-empty">
                <div><strong>Noch nichts gespeichert.</strong><span>Probiere ein Beispiel oder lade deine heutigen Kursnotizen hoch.</span></div>
                <button onClick={() => useExample(EXAMPLE_NOTES[0])}>Beispielnotiz verwenden</button>
              </div>
            )}
          </section>
        </div>
      )}

      {view === "add" && (
        <div className="sb-shell sb-add-shell">
          <section className="sb-add-intro"><p className="sb-eyebrow">Neue Lektion</p><h1>Was hast du <em>heute gelernt?</em></h1><p>Fotos werden nur im Arbeitsspeicher analysiert und sofort gelöscht. Du bestätigst jedes Wort und jede Regel vor dem Training.</p></section>

          {!extraction ? (
            <form className="sb-capture" onSubmit={analyzeLesson}>
              <label className="sb-field"><span>Titel der Lektion <small>optional</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z. B. Unidad 5 · Einladungen" maxLength={100} /></label>
              <div className="sb-upload-grid">
                <label className="sb-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" multiple onChange={onFiles} />
                  <span className="sb-camera" aria-hidden="true">+</span>
                  <strong>Notizen fotografieren oder hochladen</strong>
                  <small>Handschrift, Lehrbuchseiten oder Scans · bis zu 6 Bilder</small>
                  {files.length > 0 && <b>{files.length} {files.length === 1 ? "Bild" : "Bilder"} ausgewählt</b>}
                </label>
                <label className="sb-field sb-notes-field"><span>Oder Notizen einfügen</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="la amistad — die Freundschaft…" maxLength={12000} /></label>
              </div>
              <div className="sb-example-strip">
                <div><p className="sb-eyebrow">Etwas zum Testen?</p><strong>Generiertes Beispiel verwenden</strong></div>
                {EXAMPLE_NOTES.map((example) => <button type="button" key={example.id} onClick={() => useExample(example)}><span>{example.label}</span>{example.title}</button>)}
              </div>
              <button className="sb-primary sb-analyze" disabled={busy}>{busy ? "Lektion wird gelesen…" : "Lektion analysieren"}<span aria-hidden="true">→</span></button>
            </form>
          ) : (
            <section className="sb-review">
              <div className="sb-review-header">
                <div><p className="sb-eyebrow">Erkennung prüfen</p><input aria-label="Titel der Lektion" value={extraction.title} onChange={(event) => setExtraction({ ...extraction, title: event.target.value })} /><p>{extraction.summary}</p></div>
                <div className="sb-deletion"><span aria-hidden="true">✓</span><div><strong>Quelle gelöscht</strong><small>{sourceDeleted ? "Nur die strukturierte Lektion bleibt gespeichert." : "Löschung ausstehend."}</small></div></div>
              </div>
              <div className="sb-review-tools"><span>{extraction.items.filter((item) => item.selected).length} bestätigt</span><span>{extraction.items.filter((item) => item.confidence === "low").length} zu prüfen</span><button onClick={() => setExtraction(null)}>Neu beginnen</button></div>
              <div className="sb-review-list">
                {extraction.items.map((item) => (
                  <article className={`sb-review-item ${item.provenance === "suggested" ? "suggested" : ""}`} key={item.id}>
                    <label className="sb-check"><input type="checkbox" checked={item.selected} onChange={(event) => updateExtractedItem(item.id, { selected: event.target.checked })} /><span /></label>
                    <div className="sb-item-fields">
                      <div className="sb-item-badges"><span>{item.kind === "grammar" ? "Grammatik" : "Vokabel"}</span><span>{item.provenance === "suggested" ? "Ergänzender Vorschlag" : "Aus deiner Lektion"}</span>{item.confidence !== "high" && <span className="warning">{item.confidence === "low" ? "niedrige" : "mittlere"} Sicherheit</span>}</div>
                      <input aria-label="Spanisch" value={item.spanish} onChange={(event) => updateExtractedItem(item.id, { spanish: event.target.value })} />
                      <input aria-label="Übersetzung" value={item.translation} onChange={(event) => updateExtractedItem(item.id, { translation: event.target.value })} placeholder="Übersetzung oder Bezeichnung" />
                      <textarea aria-label="Erklärung" value={item.explanation} onChange={(event) => updateExtractedItem(item.id, { explanation: event.target.value })} placeholder="Kurze Erklärung" />
                      <input aria-label="Beispiel" value={item.example} onChange={(event) => updateExtractedItem(item.id, { example: event.target.value })} placeholder="Beispielsatz" />
                    </div>
                  </article>
                ))}
              </div>
              <div className="sb-review-actions"><p>Du behältst die Kontrolle. Nicht markierte Einträge werden nicht in deine Lernbasis übernommen.</p><button className="sb-primary" disabled={busy || !extraction.items.some((item) => item.selected)} onClick={saveLesson}>{busy ? "Wird gespeichert…" : "Speichern & Training erstellen"}<span>→</span></button></div>
            </section>
          )}
        </div>
      )}

      {view === "library" && (
        <div className="sb-shell sb-library">
          <div className="sb-library-heading"><div><p className="sb-eyebrow">Deine Lernbasis</p><h1>Alles, was du <em>gelernt hast.</em></h1></div><button className="sb-primary" onClick={() => setView("add")}>Lektion hinzufügen <span>+</span></button></div>
          {lessons.length ? lessons.map((lesson) => (
            <section className="sb-library-lesson" key={lesson.id}>
              <div className="sb-library-lesson-head"><div><span>{new Date(lesson.createdAt).toLocaleDateString("de-DE")}</span><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><button onClick={() => startSession(lesson.items)}>Lektion üben →</button></div>
              <div className="sb-library-items">
                {lesson.items.map((item) => (
                  <article key={item.id}><div><span>{item.kind === "grammar" ? "Regel" : "Wort"}</span>{item.provenance === "suggested" && <small>Vorschlag</small>}</div><h3>{item.spanish}</h3><p>{item.translation || item.explanation}</p><div className="sb-item-mastery"><span><i style={{ width: `${item.mastery}%` }} /></span><small>{masteryLabel(item.mastery)} · {item.mastery}%</small></div></article>
                ))}
              </div>
            </section>
          )) : <div className="sb-empty sb-starter-empty"><div><strong>Deine Bibliothek ist bereit für die erste Lektion.</strong><span>Lade Kursnotizen hoch oder starte mit einem Beispiel.</span></div><button onClick={() => setView("add")}>Lektion hinzufügen</button></div>}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="sb-practice" role="dialog" aria-modal="true" aria-label="Tägliches Training">
          <header><button onClick={closeSession} aria-label="Training schließen">×</button><div><span style={{ width: `${sessionDone ? 100 : ((exerciseIndex + 1) / exercises.length) * 100}%` }} /></div><small>{sessionDone ? exercises.length : exerciseIndex + 1} / {exercises.length}</small></header>
          {sessionDone ? (
            <section className="sb-session-summary"><p className="sb-eyebrow">Training abgeschlossen</p><div className="sb-summary-score"><strong>{sessionCorrect}/{exercises.length}</strong><span>sicher erinnert</span></div><h2>Bien hecho. Dein nächstes Training ist schon besser angepasst.</h2><p>Unsichere Inhalte kommen früher zurück. Sicheres Wissen bekommt mehr Abstand bis zur nächsten Wiederholung.</p><button className="sb-primary" onClick={closeSession}>Zurück zu heute <span>→</span></button></section>
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
                    {!revealed ? <button className="sb-reveal" onClick={() => setRevealed(true)}>Antwort aufdecken</button> : <><div className="sb-answer"><small>Beispielantwort</small><strong>{currentExercise.answer}</strong></div>{!result && <div><button onClick={() => selfRate(false)}>Weiter üben</button><button onClick={() => selfRate(true)}>Gewusst</button></div>}</>}
                  </div>
                ) : (
                  <form className="sb-answer-form" onSubmit={submitAnswer}><input autoFocus value={answer} disabled={revealed || checkingAnswer} onChange={(event) => setAnswer(event.target.value)} placeholder="Antwort eingeben…" /><button disabled={revealed || checkingAnswer || !answer.trim()}>{checkingAnswer ? "Bedeutung wird geprüft…" : "Prüfen"}</button></form>
                )}
                {revealed && !currentExercise.selfRate && answerFeedback && <div className={`sb-feedback ${needsManualReview ? "review" : result}`}><span>{result === "correct" ? "✓" : needsManualReview ? "?" : "→"}</span><div><strong>{answerFeedback.title}</strong><p>{answerFeedback.message}</p>{needsManualReview && <div className="sb-review-choice"><button onClick={() => resolveManualReview(true)}>Als richtig werten</button><button onClick={() => resolveManualReview(false)}>Referenzantwort verwenden</button></div>}</div></div>}
                {result && <button className="sb-next" onClick={nextExercise}>{exerciseIndex + 1 === exercises.length ? "Ergebnis ansehen" : "Weiter"} →</button>}
              </div>
              <div className="sb-focus-note"><span>Warum jetzt?</span><p>{currentExercise.item.mastery < 35 ? "Dieser Inhalt ist neu oder noch unsicher und erscheint deshalb früher." : "Für diesen Inhalt ist eine zeitlich verteilte Wiederholung fällig."}</p></div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
