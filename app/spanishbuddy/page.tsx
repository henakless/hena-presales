"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { acceptsAnswer, localAnswerVerdict, normalizeAnswer as normalize } from "../../lib/spanish-buddy-answer";
import {
  EXAMPLE_NOTES,
  inferLearningType,
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

type AnswerResult = "correct" | "almost" | "incorrect";

function apiUrl(path: string) {
  const basePath = window.location.pathname.replace(/\/$/, "");
  return `${basePath}/api/${path}`;
}

function shuffled<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

function topicTokens(value: string) {
  const stopwords = new Set(["aber", "auch", "das", "der", "die", "eine", "einen", "einer", "für", "ist", "mit", "oder", "und", "von", "zu"]);
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 2 && !stopwords.has(token)),
  );
}

function distractorScore(target: SavedItem, candidate: SavedItem) {
  const targetTopic = topicTokens(target.explanation);
  const candidateTopic = topicTokens(candidate.explanation);
  const sharedTopicWords = [...targetTopic].filter((token) => candidateTopic.has(token)).length;
  const sameTopic = normalize(target.explanation) && normalize(target.explanation) === normalize(candidate.explanation);
  const lengthDifference = Math.abs((target.translation || target.explanation).length - (candidate.translation || candidate.explanation).length);

  return (
    (target.lessonId === candidate.lessonId ? 20 : 0) +
    (target.kind === candidate.kind ? 8 : 0) +
    (target.learningType === candidate.learningType ? 28 : 0) +
    (sameTopic ? 45 : 0) +
    sharedTopicWords * 14 -
    Math.min(lengthDifference, 30)
  );
}

function bestDistractors(item: SavedItem, items: SavedItem[]) {
  const answer = item.translation || item.explanation;
  const unique = new Map<string, SavedItem>();
  const targetTopic = topicTokens(item.explanation);

  for (const candidate of items) {
    const value = candidate.translation || candidate.explanation;
    const comparableLength = value.length >= answer.length * .5 && value.length <= answer.length * 2;
    const candidateTopic = topicTokens(candidate.explanation);
    const sharesTopic = normalize(item.explanation) && (
      normalize(item.explanation) === normalize(candidate.explanation) || [...targetTopic].some((token) => candidateTopic.has(token))
    );
    if (candidate.id !== item.id && candidate.kind === item.kind && candidate.learningType === item.learningType && sharesTopic && comparableLength && value && normalize(value) !== normalize(answer)) {
      unique.set(normalize(value), candidate);
    }
  }

  return [...unique.values()]
    .filter((candidate) => distractorScore(item, candidate) >= 18)
    .sort((a, b) => distractorScore(item, b) - distractorScore(item, a))
    .slice(0, 3)
    .map((candidate) => candidate.translation || candidate.explanation);
}

function buildExercises(items: SavedItem[]) {
  const now = Date.now();
  const ranked = [...items].sort((a, b) => {
    const aDue = new Date(a.nextReviewAt).getTime() <= now ? 0 : 1;
    const bDue = new Date(b.nextReviewAt).getTime() <= now ? 0 : 1;
    return aDue - bDue || a.mastery - b.mastery || a.nextReviewAt.localeCompare(b.nextReviewAt);
  });
  const grammar = ranked.filter((item) => item.kind === "grammar");
  const vocabulary = ranked.filter((item) => item.kind === "vocabulary");
  const candidates: SavedItem[] = [];
  const grammarTarget = Math.min(grammar.length, Math.max(2, Math.round(Math.min(8, ranked.length) * .35)));
  const vocabularyTarget = Math.min(vocabulary.length, Math.min(8, ranked.length) - grammarTarget);
  candidates.push(...grammar.slice(0, grammarTarget), ...vocabulary.slice(0, vocabularyTarget));
  for (const item of ranked) if (candidates.length < 8 && !candidates.some((candidate) => candidate.id === item.id)) candidates.push(item);
  candidates.sort((a, b) => a.mastery - b.mastery || a.nextReviewAt.localeCompare(b.nextReviewAt));

  return candidates.map<Exercise>((item, index) => {
    const learningType = item.learningType || inferLearningType(item);
    const eligibleTypes: ExerciseType[] = item.kind === "grammar"
      ? ["flashcard"]
      : learningType === "word"
        ? ["translation", "blank", "choice", "sentence"]
        : learningType === "collocation"
          ? ["translation", "blank", "choice"]
          : ["translation", "blank", "choice"];
    const type = eligibleTypes[index % eligibleTypes.length];
    if (type === "blank" && item.kind === "vocabulary" && item.example) {
      const escaped = item.spanish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const blanked = item.example.replace(new RegExp(escaped, "i"), "_____");
      if (blanked !== item.example) {
        return {
          type,
          label: "Completa el hueco",
          item,
          prompt: blanked,
          answer: item.spanish,
          helper: item.translation,
        };
      }
    }

    if (type === "choice") {
      const distractors = bestDistractors(item, items);
      if (distractors.length < 3) {
        return {
          type: "translation",
          label: "Escribe la traducción",
          item,
          prompt: item.spanish,
          answer: item.translation || item.explanation,
          helper: "Traduce al idioma de tus apuntes.",
        };
      }
      return {
        type,
        label: "Elige el significado",
        item,
        prompt: item.spanish,
        answer: item.translation || item.explanation,
        helper: "Elige la opción que mejor corresponde.",
        options: shuffled([item.translation || item.explanation, ...distractors]).filter(Boolean),
      };
    }

    if (item.kind === "grammar" && type !== "blank") {
      return {
        type: "flashcard",
        label: "Explica la regla",
        item,
        prompt: item.spanish,
        answer: item.explanation || item.translation,
        helper: "Piensa la respuesta antes de descubrirla.",
        selfRate: true,
      };
    }

    if (type === "flashcard") {
      return {
        type: "translation",
        label: "Escribe de memoria",
        item,
        prompt: item.spanish,
        answer: item.translation || item.explanation,
        helper: "Escribe la traducción exacta.",
      };
    }

    if (type === "sentence" && learningType === "word") {
      return {
        type,
        label: "Construye una frase",
        item,
        prompt: `Escribe una frase en español con «${item.spanish}»`,
        answer: item.example || `Quiero usar la palabra «${item.spanish}» correctamente.`,
        helper: "Una frase breve y natural es suficiente.",
      };
    }

    return {
      type: "translation",
      label: "Escribe la traducción",
      item,
      prompt: item.spanish,
      answer: item.translation || item.explanation,
      helper: "Traduce al idioma de tus apuntes.",
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
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [needsManualReview, setNeedsManualReview] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [recordingAttempt, setRecordingAttempt] = useState(false);
  const [overridingAnswer, setOverridingAnswer] = useState(false);
  const [answerJudgedByModel, setAnswerJudgedByModel] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAlmost, setSessionAlmost] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);

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
      if (!response.ok) throw new Error(body.error || "No se ha podido cargar tu biblioteca.");
      setLessons(body.lessons ?? []);
      setItems(body.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se ha podido cargar tu biblioteca.");
    } finally {
      setLoadingLibrary(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLibrary(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentExercise || sessionDone) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "BUTTON") return;
      if (result && !overridingAnswer) {
        event.preventDefault();
        nextExercise();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).slice(0, 6));
    setError("");
  }

  function chooseExample(example: (typeof EXAMPLE_NOTES)[number]) {
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
      setError("Añade primero una foto o tus apuntes.");
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
      if (!response.ok || !body.extraction) throw new Error(body.error || "No se ha podido analizar la lección.");
      setExtraction(body.extraction);
      setTitle(body.extraction.title);
      setSourceDeleted(body.sourceDeleted === true);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "No se ha podido analizar la lección.");
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
          sourceType: files.length ? "imágenes" : "notas de texto",
          items: extraction.items,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se ha podido guardar la lección.");
      setExtraction(null);
      setTitle("");
      setNote("");
      setFiles([]);
      await loadLibrary();
      setView("today");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se ha podido guardar la lección.");
    } finally {
      setBusy(false);
    }
  }

  function startSession(sourceItems = items) {
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
    setCurrentAttemptId(null);
    setAnswerJudgedByModel(false);
    setSessionCorrect(0);
    setSessionAlmost(0);
    setSessionDone(false);
  }

  async function recordAttempt(quality: AnswerResult) {
    if (!currentExercise) return null;
    const correct = quality === "correct";
    if (correct) setSessionCorrect((value) => value + 1);
    if (quality === "almost") setSessionAlmost((value) => value + 1);
    setItems((current) =>
      current.map((item) =>
        item.id === currentExercise.item.id
          ? { ...item, mastery: Math.max(0, Math.min(100, item.mastery + (correct ? 12 : quality === "almost" ? -4 : -20))) }
          : item,
      ),
    );
    try {
      setRecordingAttempt(true);
      const response = await fetch(apiUrl("attempts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentExercise.item.id, correct, quality, exerciseType: currentExercise.type }),
      });
      const body = (await response.json()) as {
        attemptId?: string;
        progress?: { mastery: number; attempts: number; correctCount: number; nextReviewAt: string };
      };
      if (response.ok && body.attemptId) setCurrentAttemptId(body.attemptId);
      if (response.ok && body.progress) {
        setItems((current) =>
          current.map((item) => (item.id === currentExercise.item.id ? { ...item, ...body.progress } : item)),
        );
      }
      return body.attemptId ?? null;
    } catch {
      // The answer remains usable even when progress syncing has a transient failure.
      return null;
    } finally {
      setRecordingAttempt(false);
    }
  }

  async function submitAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!currentExercise || !answer.trim() || checkingAnswer || revealed) return;

    const localVerdict = localAnswerVerdict(answer, currentExercise.answer, currentExercise.item.acceptedAnswers ?? []);
    if (localVerdict) {
      const answerResult: AnswerResult = localVerdict === "almost" ? "almost" : "correct";
      setResult(answerResult);
      setAnswerFeedback(answerResult === "correct"
        ? { title: localVerdict === "exact" ? "Exacto." : "También es correcto.", message: currentExercise.answer }
        : { title: "Casi.", message: "La respuesta se entiende; revisa el acento o la ortografía." });
      setRevealed(true);
      void recordAttempt(answerResult);
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
          itemId: currentExercise.item.id,
          context: [currentExercise.item.spanish, currentExercise.item.translation, currentExercise.item.explanation]
            .filter(Boolean)
            .join(" · "),
        }),
      });
      const body = (await response.json()) as {
        verdict?: "exact" | "equivalent" | "learner_better" | "almost" | "incorrect";
        feedback?: string;
        error?: string;
      };
      if (!response.ok || !body.verdict) {
        throw new Error(body.error || "No he podido comprobar esta formulación ahora mismo.");
      }

      const answerResult: AnswerResult = body.verdict === "exact" || body.verdict === "equivalent" || body.verdict === "learner_better"
        ? "correct"
        : body.verdict === "almost"
          ? "almost"
          : "incorrect";
      setResult(answerResult);
      setAnswerJudgedByModel(true);
      setAnswerFeedback({
        title: answerResult === "correct" ? (body.verdict === "exact" ? "Exacto." : body.verdict === "learner_better" ? "Tu respuesta es mejor." : "También es correcto.") : answerResult === "almost" ? "Casi." : "Todavía no.",
        message: body.feedback || (answerResult === "correct" ? "Esta formulación también funciona." : `Solución: ${currentExercise.answer}`),
      });
      setRevealed(true);
      void recordAttempt(answerResult);
      if (body.verdict === "learner_better") void rememberAcceptedAnswer();
    } catch {
      setNeedsManualReview(true);
      setAnswerFeedback({
        title: "Tú decides.",
        message: "No he podido comparar el significado. Decide si tu formulación debe contar.",
      });
      setRevealed(true);
    } finally {
      setCheckingAnswer(false);
    }
  }

  async function markJudgedAnswerCorrect() {
    if (!currentExercise || result !== "incorrect" || !answerJudgedByModel || recordingAttempt || overridingAnswer) return;
    setOverridingAnswer(true);
    try {
      const response = await fetch(apiUrl("attempts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          attemptId: currentAttemptId,
          itemId: currentExercise.item.id,
          exerciseType: currentExercise.type,
          prompt: currentExercise.prompt,
          expectedAnswer: currentExercise.answer,
          learnerAnswer: answer,
        }),
      });
      const body = (await response.json()) as {
        learnedAnswer?: string;
        progress?: { mastery: number; attempts: number; correctCount: number; nextReviewAt: string };
        error?: string;
      };
      if (!response.ok || !body.learnedAnswer) throw new Error(body.error || "No se ha podido guardar la corrección.");

      setResult("correct");
      setSessionCorrect((value) => value + 1);
      setAnswerFeedback({
        title: "La marco como correcta.",
        message: "He aprendido esta formulación y la aceptaré automáticamente la próxima vez.",
      });
      setItems((current) => current.map((item) => item.id === currentExercise.item.id
        ? {
          ...item,
          ...(body.progress ?? {}),
          acceptedAnswers: [...new Set([...(item.acceptedAnswers ?? []), body.learnedAnswer!])],
        }
        : item));
    } catch (overrideError) {
      setAnswerFeedback({
        title: "No se ha podido guardar.",
        message: overrideError instanceof Error ? overrideError.message : "Inténtalo de nuevo.",
      });
    } finally {
      setOverridingAnswer(false);
    }
  }

  async function rememberAcceptedAnswer() {
    if (!currentExercise || !answer.trim()) return;
    try {
      const response = await fetch(apiUrl("attempts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", itemId: currentExercise.item.id, learnerAnswer: answer }),
      });
      if (!response.ok) return;
      setItems((current) => current.map((item) => item.id === currentExercise.item.id
        ? { ...item, acceptedAnswers: [...new Set([...(item.acceptedAnswers ?? []), answer])] }
        : item));
    } catch {
      // The correct attempt is still recorded; this optimization can retry on a later answer.
    }
  }

  async function saveEditedItem(event: FormEvent) {
    event.preventDefault();
    if (!editingItem || savingItem) return;
    setSavingItem(true);
    setError("");
    try {
      const response = await fetch(apiUrl("lessons"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se han podido guardar los cambios.");
      setItems((current) => current.map((item) => item.id === editingItem.id ? editingItem : item));
      setLessons((current) => current.map((lesson) => ({
        ...lesson,
        items: lesson.items.map((item) => item.id === editingItem.id ? editingItem : item),
      })));
      setEditingItem(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se han podido guardar los cambios.");
    } finally {
      setSavingItem(false);
    }
  }

  function resolveManualReview(correct: boolean) {
    if (!needsManualReview || result) return;
    setNeedsManualReview(false);
    setCurrentAttemptId(null);
    setResult(correct ? "correct" : "incorrect");
    setAnswerFeedback({
      title: correct ? "Marcada como correcta." : "Solución aceptada.",
      message: correct ? "Tu formulación cuenta en esta repetición." : currentExercise.answer,
    });
    void recordAttempt(correct ? "correct" : "incorrect");
  }

  function chooseAnswer(option: string) {
    if (revealed) return;
    setAnswer(option);
    const correct = acceptsAnswer(option, currentExercise.answer, currentExercise.item.acceptedAnswers ?? []);
    setResult(correct ? "correct" : "incorrect");
    setAnswerFeedback({
      title: correct ? "Exacto." : "Todavía no.",
      message: correct ? currentExercise.answer : `Solución: ${currentExercise.answer}`,
    });
    setRevealed(true);
    void recordAttempt(correct ? "correct" : "incorrect");
  }

  function selfRate(correct: boolean) {
    if (result) return;
    setResult(correct ? "correct" : "incorrect");
    void recordAttempt(correct ? "correct" : "incorrect");
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
    setCurrentAttemptId(null);
    setAnswerJudgedByModel(false);
  }

  function closeSession() {
    setExercises([]);
    setSessionDone(false);
    setExerciseIndex(0);
    setCheckingAnswer(false);
    setAnswerFeedback(null);
    setNeedsManualReview(false);
    setCurrentAttemptId(null);
    setAnswerJudgedByModel(false);
  }

  return (
    <main className="sb-app" lang="es">
      <header className="sb-header">
        <button className="sb-brand" onClick={() => { setView("today"); closeSession(); }} aria-label="Inicio de Spanish Buddy">
          <span className="sb-brand-mark" aria-hidden="true"><i /></span>
          <span>Spanish Buddy<small>Tu curso, contigo.</small></span>
        </button>
        <nav aria-label="Navegación principal">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Hoy</button>
          <button className={view === "add" ? "active" : ""} onClick={() => setView("add")}>Nueva lección</button>
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>Biblioteca</button>
        </nav>
        <div className="sb-level"><span>B1</span><small>Español de España</small></div>
      </header>

      {error && <div className="sb-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Cerrar</button></div>}

      {view === "today" && (
        <div className="sb-shell">
          <section className="sb-welcome">
            <div>
              <p className="sb-eyebrow">Hoy · tu plan adaptativo</p>
              <h1>Recuerda lo que<br /><em>aprendes en clase.</em></h1>
              <p>Tus propios apuntes se convierten en la práctica que necesitas hoy.</p>
            </div>
            <div className="sb-orbit" aria-hidden="true"><span>{averageMastery}%</span><small>conocimiento</small></div>
          </section>

          <section className="sb-dashboard-grid">
            <article className="sb-daily-card">
              <div className="sb-card-topline"><span>01</span><span>{dueItems.length || items.length} contenidos listos</span></div>
              <div className="sb-daily-copy">
                <p>Práctica diaria</p>
                <h2>{items.length ? "Un poco de práctica hoy lo hace más fácil mañana." : "Tu primera lección empieza aquí."}</h2>
                <span>{items.length ? "Unos 8 minutos · ejercicios variados" : "Sube tus apuntes o empieza con un ejemplo"}</span>
              </div>
              <button className="sb-primary" onClick={() => items.length ? startSession() : setView("add")}>
                {items.length ? "Empezar la práctica" : "Añadir la primera lección"}<span aria-hidden="true">→</span>
              </button>
            </article>

            <aside className="sb-progress-card">
              <p className="sb-eyebrow">Tu base de aprendizaje</p>
              <div className="sb-stat-row"><strong>{items.length}</strong><span>palabras y reglas</span></div>
              <div className="sb-stat-row"><strong>{lessons.length}</strong><span>lecciones del curso</span></div>
              <div className="sb-stat-row"><strong>{items.filter((item) => item.mastery >= 62).length}</strong><span>ya dominas</span></div>
              <div className="sb-meter"><span style={{ width: `${averageMastery}%` }} /></div>
              <small>El dominio crece al recordar activamente, no solo al leer.</small>
            </aside>
          </section>

          <section className="sb-recents">
            <div className="sb-section-heading"><div><p className="sb-eyebrow">Seguir aprendiendo</p><h2>Últimas lecciones</h2></div><button onClick={() => setView("library")}>Ver biblioteca →</button></div>
            {loadingLibrary ? <div className="sb-empty">Cargando tu base de aprendizaje…</div> : lessons.length ? (
              <div className="sb-lesson-grid">
                {lessons.slice(0, 3).map((lesson, index) => (
                  <article className="sb-lesson-card" key={lesson.id}>
                    <span className="sb-lesson-number">0{index + 1}</span>
                    <p>{new Date(lesson.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</p>
                    <h3>{lesson.title}</h3>
                    <div><span>{lesson.items.length} contenidos</span><span>{Math.round(lesson.items.reduce((sum, item) => sum + item.mastery, 0) / Math.max(lesson.items.length, 1))}%</span></div>
                    <button onClick={() => startSession(lesson.items)}>Practicar</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="sb-empty sb-starter-empty">
                <div><strong>Aún no hay nada guardado.</strong><span>Prueba un ejemplo o sube los apuntes de hoy.</span></div>
                <button onClick={() => chooseExample(EXAMPLE_NOTES[0])}>Usar apuntes de ejemplo</button>
              </div>
            )}
          </section>
        </div>
      )}

      {view === "add" && (
        <div className="sb-shell sb-add-shell">
          <section className="sb-add-intro"><p className="sb-eyebrow">Nueva lección</p><h1>¿Qué has aprendido <em>hoy?</em></h1><p>Las fotos se analizan de forma temporal y se eliminan enseguida. Tú confirmas cada palabra y cada regla antes de practicar.</p></section>

          {!extraction ? (
            <form className="sb-capture" onSubmit={analyzeLesson}>
              <label className="sb-field"><span>Título de la lección <small>opcional</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="p. ej. Unidad 5 · Invitaciones" maxLength={100} /></label>
              <div className="sb-upload-grid">
                <label className="sb-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" multiple onChange={onFiles} />
                  <span className="sb-camera" aria-hidden="true">+</span>
                  <strong>Fotografiar o subir apuntes</strong>
                  <small>Apuntes manuscritos, páginas del libro o escaneos · hasta 6 imágenes</small>
                  {files.length > 0 && <b>{files.length} {files.length === 1 ? "imagen" : "imágenes"}</b>}
                </label>
                <label className="sb-field sb-notes-field"><span>O pegar apuntes</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="la amistad — die Freundschaft…" maxLength={12000} /></label>
              </div>
              <div className="sb-example-strip">
                <div><p className="sb-eyebrow">¿Quieres probarlo?</p><strong>Usa un ejemplo generado</strong></div>
                {EXAMPLE_NOTES.map((example) => <button type="button" key={example.id} onClick={() => chooseExample(example)}><span>{example.label}</span>{example.title}</button>)}
              </div>
              <button className="sb-primary sb-analyze" disabled={busy}>{busy ? "Leyendo la lección…" : "Analizar la lección"}<span aria-hidden="true">→</span></button>
            </form>
          ) : (
            <section className="sb-review">
              <div className="sb-review-header">
                <div><p className="sb-eyebrow">Revisar la extracción</p><input aria-label="Título de la lección" value={extraction.title} onChange={(event) => setExtraction({ ...extraction, title: event.target.value })} /><p>{extraction.summary}</p></div>
                <div className="sb-deletion"><span aria-hidden="true">✓</span><div><strong>Fuente eliminada</strong><small>{sourceDeleted ? "Solo queda la lección estructurada." : "Eliminación pendiente."}</small></div></div>
              </div>
              <div className="sb-review-tools"><span>{extraction.items.filter((item) => item.selected).length} confirmados</span><span>{extraction.items.filter((item) => item.confidence === "low").length} por revisar</span><button onClick={() => setExtraction(null)}>Empezar de nuevo</button></div>
              <div className="sb-review-list">
                {extraction.items.map((item) => (
                  <article className={`sb-review-item ${item.provenance === "suggested" ? "suggested" : ""}`} key={item.id}>
                    <label className="sb-check"><input type="checkbox" checked={item.selected} onChange={(event) => updateExtractedItem(item.id, { selected: event.target.checked })} /><span /></label>
                    <div className="sb-item-fields">
                      <div className="sb-item-badges"><span>{item.kind === "grammar" ? "Gramática" : "Vocabulario"}</span><span>{item.provenance === "suggested" ? "Sugerencia relacionada" : "De tu lección"}</span>{item.confidence !== "high" && <span className="warning">Revisión {item.confidence === "low" ? "necesaria" : "recomendada"}</span>}</div>
                      <input aria-label="Español" value={item.spanish} onChange={(event) => updateExtractedItem(item.id, { spanish: event.target.value, acceptedAnswers: [] })} />
                      <input aria-label="Traducción" value={item.translation} onChange={(event) => updateExtractedItem(item.id, { translation: event.target.value, acceptedAnswers: [] })} placeholder="Traducción o etiqueta" />
                      {item.kind === "grammar" && <textarea aria-label="Explicación" value={item.explanation} onChange={(event) => updateExtractedItem(item.id, { explanation: event.target.value })} placeholder="Explicación breve" />}
                      <input className={item.kind === "vocabulary" ? "sb-field-wide" : ""} aria-label="Ejemplo" value={item.example} onChange={(event) => updateExtractedItem(item.id, { example: event.target.value })} placeholder="Frase de ejemplo" />
                    </div>
                  </article>
                ))}
              </div>
              <div className="sb-review-actions"><p>Tú decides. Los contenidos no marcados no se guardarán.</p><button className="sb-primary" disabled={busy || !extraction.items.some((item) => item.selected)} onClick={saveLesson}>{busy ? "Guardando…" : "Guardar y crear práctica"}<span>→</span></button></div>
            </section>
          )}
        </div>
      )}

      {view === "library" && (
        <div className="sb-shell sb-library">
          <div className="sb-library-heading"><div><p className="sb-eyebrow">Tu base de aprendizaje</p><h1>Todo lo que <em>has aprendido.</em></h1></div><button className="sb-primary" onClick={() => setView("add")}>Añadir lección <span>+</span></button></div>
          {lessons.length ? lessons.map((lesson) => (
            <section className="sb-library-lesson" key={lesson.id}>
              <div className="sb-library-lesson-head"><div><span>{new Date(lesson.createdAt).toLocaleDateString("de-DE")}</span><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><button onClick={() => startSession(lesson.items)}>Practicar →</button></div>
              <div className="sb-library-items">
                {lesson.items.map((item) => (
                  <article key={item.id}>
                    <button className="sb-library-item-button" onClick={() => setEditingItem(item)} aria-label={`Abrir y editar ${item.spanish}`}>
                      <div><span>{item.kind === "grammar" ? "Regla" : item.learningType === "fixed_expression" ? "Expresión" : "Palabra"}</span>{item.provenance === "suggested" && <small>Sugerencia</small>}</div>
                      <h3>{item.spanish}</h3><p lang="de">{item.translation || item.explanation}</p>
                      {item.kind === "grammar" && item.example && <p className="sb-card-example">Ejemplo: {item.example}</p>}
                      <div className="sb-item-mastery"><span><i style={{ width: `${item.mastery}%` }} /></span><small>{masteryLabel(item.mastery)} · {item.mastery}%</small></div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )) : <div className="sb-empty sb-starter-empty"><div><strong>Tu biblioteca está lista para la primera lección.</strong><span>Sube tus apuntes o empieza con un ejemplo.</span></div><button onClick={() => setView("add")}>Añadir lección</button></div>}
        </div>
      )}

      {editingItem && (
        <div className="sb-editor-backdrop" role="dialog" aria-modal="true" aria-label={`Editar ${editingItem.spanish}`}>
          <form className="sb-item-editor" onSubmit={saveEditedItem}>
            <div className="sb-editor-head"><div><p className="sb-eyebrow">Contenido de tu biblioteca</p><h2>{editingItem.kind === "grammar" ? "Detalle de gramática" : "Editar vocabulario"}</h2></div><button type="button" onClick={() => setEditingItem(null)} aria-label="Cerrar">×</button></div>
            <div className="sb-editor-grid">
              <label><span>Tipo de contenido</span><select value={editingItem.learningType} onChange={(event) => setEditingItem({ ...editingItem, learningType: event.target.value as SavedItem["learningType"] })}><option value="word">Palabra</option><option value="collocation">Combinación de palabras</option><option value="fixed_expression">Expresión fija</option><option value="sentence_pattern">Estructura de frase</option><option value="grammar_rule">Regla gramatical</option><option value="conjugation">Conjugación</option></select></label>
              <label><span>Español</span><input value={editingItem.spanish} onChange={(event) => setEditingItem({ ...editingItem, spanish: event.target.value })} required /></label>
              <label><span>Traducción de tus apuntes</span><input lang="de" value={editingItem.translation} onChange={(event) => setEditingItem({ ...editingItem, translation: event.target.value, acceptedAnswers: [] })} /></label>
              <label className="wide"><span>{editingItem.kind === "grammar" ? "Explicación de la regla" : "Nota de uso"}</span><textarea lang="de" value={editingItem.explanation} onChange={(event) => setEditingItem({ ...editingItem, explanation: event.target.value })} placeholder={editingItem.kind === "grammar" ? "Formación, uso y excepciones" : "Solo si hace falta aclarar el uso"} /></label>
              <label className="wide"><span>Ejemplo en español</span><textarea value={editingItem.example} onChange={(event) => setEditingItem({ ...editingItem, example: event.target.value })} placeholder="Una frase clara que muestre el uso" /></label>
              <label className="wide"><span>Respuestas alternativas aceptadas</span><textarea lang="de" value={editingItem.acceptedAnswers.join("\n")} onChange={(event) => setEditingItem({ ...editingItem, acceptedAnswers: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} placeholder="Una alternativa por línea" /></label>
            </div>
            <div className="sb-editor-actions"><button type="button" onClick={() => setEditingItem(null)}>Cancelar</button><button className="sb-primary" disabled={savingItem}>{savingItem ? "Guardando…" : "Guardar cambios"}<span>→</span></button></div>
          </form>
        </div>
      )}

      {exercises.length > 0 && (
        <div className="sb-practice" role="dialog" aria-modal="true" aria-label="Práctica diaria">
          <header><button onClick={closeSession} aria-label="Cerrar práctica">×</button><div><span style={{ width: `${sessionDone ? 100 : ((exerciseIndex + 1) / exercises.length) * 100}%` }} /></div><small>{sessionDone ? exercises.length : exerciseIndex + 1} / {exercises.length}</small></header>
          {sessionDone ? (
            <section className="sb-session-summary"><p className="sb-eyebrow">Práctica terminada</p><div className="sb-summary-score"><strong>{sessionCorrect}/{exercises.length}</strong><span>recordados{sessionAlmost > 0 ? ` · ${sessionAlmost} casi` : ""}</span></div><h2>Bien hecho. La próxima práctica ya está mejor adaptada.</h2><p>Lo que todavía cuesta vuelve antes; lo que ya dominas recibe más espacio.</p><button className="sb-primary" onClick={closeSession}>Volver a Hoy <span>→</span></button></section>
          ) : currentExercise && (
            <section className="sb-exercise">
              <div className="sb-exercise-meta"><span>{currentExercise.label}</span><span>{currentExercise.item.lessonTitle}</span></div>
              <div className="sb-exercise-card">
                <p>{currentExercise.helper}</p>
                <h2>{currentExercise.prompt}</h2>
                {currentExercise.options ? (
                  <div className="sb-options">{currentExercise.options.map((option) => <button className={revealed ? acceptsAnswer(option, currentExercise.answer, currentExercise.item.acceptedAnswers ?? []) ? "correct" : option === answer ? "incorrect" : "" : ""} key={option} onClick={() => chooseAnswer(option)}>{option}</button>)}</div>
                ) : currentExercise.selfRate ? (
                  <div className="sb-self-rate">
                    {!revealed ? <button className="sb-reveal" onClick={() => setRevealed(true)}>Descubrir la respuesta</button> : <><div className="sb-answer"><small>Respuesta de ejemplo</small><strong>{currentExercise.answer}</strong></div>{!result && <div><button onClick={() => selfRate(false)}>Seguir practicando</button><button onClick={() => selfRate(true)}>Lo sabía</button></div>}</>}
                  </div>
                ) : !revealed ? (
                  <form className="sb-answer-form" onSubmit={submitAnswer}><input autoFocus value={answer} disabled={checkingAnswer} onChange={(event) => setAnswer(event.target.value)} placeholder={currentExercise.type === "sentence" ? "Escribe una frase en español…" : "Escribe tu respuesta…"} /><button disabled={checkingAnswer || !answer.trim()}>{checkingAnswer ? "Comprobando…" : "Comprobar"}</button></form>
                ) : (
                  <div className="sb-submitted-answer"><small>Tu respuesta</small><strong>{answer}</strong></div>
                )}
                {revealed && !currentExercise.selfRate && answerFeedback && <div className={`sb-feedback ${needsManualReview ? "review" : result}`}><span>{result === "correct" ? "✓" : result === "almost" ? "≈" : needsManualReview ? "?" : "→"}</span><div><strong>{answerFeedback.title}</strong><p>{answerFeedback.message}</p>{result && <p className="sb-reference">Respuesta de referencia: {currentExercise.answer}</p>}{result === "incorrect" && answerJudgedByModel && <div className="sb-review-choice"><button disabled={recordingAttempt || overridingAnswer} onClick={markJudgedAnswerCorrect}>{overridingAnswer ? "Guardando…" : recordingAttempt ? "Espera un momento…" : "Marcar mi respuesta como correcta"}</button></div>}{needsManualReview && <div className="sb-review-choice"><button onClick={() => resolveManualReview(true)}>Marcar como correcta</button><button onClick={() => resolveManualReview(false)}>Usar la referencia</button></div>}</div></div>}
                {result && <button className="sb-next" disabled={overridingAnswer} onClick={nextExercise}>{exerciseIndex + 1 === exercises.length ? "Ver resultado" : "Continuar"} →</button>}
              </div>
              <div className="sb-focus-note"><span>¿Por qué ahora?</span><p>{currentExercise.item.mastery < 35 ? "Este contenido es nuevo o todavía inseguro, por eso aparece antes." : "Toca repasar este contenido con repetición espaciada."}</p></div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
