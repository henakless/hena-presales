"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { acceptsAnswer, localAnswerVerdict } from "../../lib/spanish-buddy-answer";
import {
  ACTIVE_EXERCISE_IDS,
  EXERCISE_CATEGORIES,
  EXERCISE_LIBRARY,
  EXERCISE_MODES,
  EXERCISE_PRESETS,
} from "../../lib/spanish-buddy-exercises";
import {
  EXAMPLE_NOTES,
  masteryLabel,
  type ExtractedItem,
  type ExtractionResult,
  type LearningTopic,
  type SavedItem,
  type SavedLesson,
} from "../../lib/spanish-buddy";

type View = "today" | "add" | "library" | "exercises";
type LibraryFilter = "topics" | "all" | "words" | "expressions" | "collocations" | "grammar";

type Exercise = {
  exerciseType: string;
  label: string;
  item: SavedItem;
  instruction: string;
  context: string;
  prompt: string;
  answer: string;
  answerTranslation: string;
  options?: string[];
  acceptedAnswers?: string[];
  gradingFocus?: string;
  germanSupport: string;
  grammarReminder: string;
  strongerHint: string;
};

type AnswerFeedback = {
  title: string;
  message: string;
};

type AnswerResult = "correct" | "almost" | "incorrect";

const MAX_LESSON_IMAGES = 6;
const MAX_IMAGE_EDGE = 2_000;
const IMAGE_QUALITY = 0.84;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function prepareLessonImage(file: File) {
  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;

    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas?.toBlob(resolve, "image/jpeg", IMAGE_QUALITY));
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const basename = file.name.replace(/\.[^.]+$/, "") || "apuntes";
    return new File([blob], `${basename}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    // Some browsers cannot decode every otherwise valid image type. Sending
    // that page unchanged is still safe because pages are uploaded separately.
    return file;
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

function mergeExtractions(results: ExtractionResult[], requestedTitle: string): ExtractionResult {
  const byContent = new Map<string, ExtractedItem>();

  for (const result of results) {
    for (const item of result.items) {
      const key = `${item.kind}:${item.spanish.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-ES").trim()}`;
      const existing = byContent.get(key);
      if (!existing) {
        byContent.set(key, item);
        continue;
      }
      byContent.set(key, {
        ...existing,
        acceptedAnswers: [...new Set([...existing.acceptedAnswers, ...item.acceptedAnswers])].slice(0, 5),
        confidence: existing.confidence === "high" || item.confidence === "high"
          ? "high"
          : existing.confidence === "medium" || item.confidence === "medium" ? "medium" : "low",
        provenance: existing.provenance === "course" || item.provenance === "course" ? "course" : "suggested",
        selected: existing.selected || item.selected,
      });
    }
  }

  const mergedItems = [...byContent.values()];
  const courseItems = mergedItems.filter((item) => item.provenance === "course").slice(0, 45);
  const suggestedItems = mergedItems.filter((item) => item.provenance === "suggested").slice(0, 6);

  return {
    title: requestedTitle || results[0]?.title || "Nueva lección de español",
    summary: results.map((result) => result.summary).filter(Boolean).join(" ").slice(0, 300),
    referenceLanguage: results[0]?.referenceLanguage || "Deutsch",
    items: [...courseItems, ...suggestedItems],
  };
}

type SunflowerProps = {
  mastery?: number;
  className?: string;
  celebration?: boolean;
  label?: string;
};

function Sunflower({ mastery = 100, className = "", celebration = false, label }: SunflowerProps) {
  const normalizedMastery = Math.max(0, Math.min(100, mastery));
  const petalCount = normalizedMastery === 100 ? 12 : Math.floor((normalizedMastery / 100) * 12);
  const accessibleLabel = label ?? `${normalizedMastery}% de dominio, ${petalCount} de 12 pétalos`;

  return (
    <svg
      className={`sb-sunflower ${celebration ? "sb-sunflower--celebration" : ""} ${className}`.trim()}
      viewBox="0 0 64 64"
      role="img"
      aria-label={accessibleLabel}
    >
      {Array.from({ length: petalCount }, (_, index) => (
        <g key={index} transform={`rotate(${index * 30} 32 32)`}>
          <ellipse
            className="sb-sunflower-petal"
            cx="32"
            cy="10.5"
            rx="5.2"
            ry="10"
            style={{ "--sb-petal-index": index } as CSSProperties}
          />
        </g>
      ))}
      <circle className="sb-sunflower-center" cx="32" cy="32" r="13" />
    </svg>
  );
}

function apiUrl(path: string) {
  const basePath = window.location.pathname.replace(/\/$/, "");
  return `${basePath}/api/${path}`;
}

export default function SpanishBuddy() {
  const [view, setView] = useState<View>("today");
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [sourceDeleted, setSourceDeleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageProgress, setImageProgress] = useState("");
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
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>([...ACTIVE_EXERCISE_IDS]);
  const [preparingSession, setPreparingSession] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [strongHintRevealed, setStrongHintRevealed] = useState(false);
  const [answerTranslationOpen, setAnswerTranslationOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"detail" | "edit">("detail");
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncPassphrase, setSyncPassphrase] = useState("");
  const [syncName, setSyncName] = useState("Mi biblioteca");
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [syncError, setSyncError] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("topics");

  const currentExercise = exercises[exerciseIndex];
  const dueItems = useMemo(
    () => items.filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now() || item.mastery < 35),
    [items],
  );
  const averageMastery = loadingLibrary
    ? null
    : items.length
      ? Math.round(items.reduce((sum, item) => sum + item.mastery, 0) / items.length)
      : 0;
  const libraryFilters: Array<{ id: LibraryFilter; label: string }> = [
    { id: "topics", label: "Temas" },
    { id: "all", label: "Todo" },
    { id: "words", label: "Palabras" },
    { id: "expressions", label: "Expresiones" },
    { id: "collocations", label: "Combinaciones" },
    { id: "grammar", label: "Gramática" },
  ];

  function libraryCategory(item: SavedItem): Exclude<LibraryFilter, "all" | "topics"> {
    if (item.kind === "grammar" || item.learningType === "grammar_rule" || item.learningType === "conjugation") return "grammar";
    if (item.learningType === "fixed_expression" || item.learningType === "sentence_pattern") return "expressions";
    if (item.learningType === "collocation") return "collocations";
    return "words";
  }

  function libraryCategoryLabel(item: SavedItem) {
    const category = libraryCategory(item);
    if (category === "grammar") return "Regla";
    if (category === "expressions") return "Expresión";
    if (category === "collocations") return "Combinación";
    return "Palabra";
  }

  const libraryCounts = useMemo(() => {
    const counts: Record<LibraryFilter, number> = { topics: topics.length, all: items.length, words: 0, expressions: 0, collocations: 0, grammar: 0 };
    items.forEach((item) => { counts[libraryCategory(item)] += 1; });
    return counts;
  }, [items, topics.length]);

  const filteredLessons = useMemo(() => lessons
    .map((lesson) => ({
      ...lesson,
      items: libraryFilter === "all" ? lesson.items : libraryFilter === "topics" ? [] : lesson.items.filter((item) => libraryCategory(item) === libraryFilter),
    }))
    .filter((lesson) => lesson.items.length > 0), [lessons, libraryFilter]);
  function completeExercisePrompt(exercise: Exercise) {
    return [exercise.instruction, exercise.context, exercise.prompt].filter(Boolean).join("\n\n");
  }

  function openLibraryItem(item: SavedItem) {
    setEditingItem({ ...item, acceptedAnswers: [...item.acceptedAnswers] });
    setEditorMode("detail");
  }

  function cancelItemEditing() {
    if (!editingItem) return;
    const original = items.find((item) => item.id === editingItem.id);
    setEditingItem(original ? { ...original, acceptedAnswers: [...original.acceptedAnswers] } : null);
    setEditorMode("detail");
  }

  async function loadLibrary() {
    try {
      const response = await fetch(apiUrl("lessons"), { cache: "no-store" });
      const body = (await response.json()) as { lessons?: SavedLesson[]; items?: SavedItem[]; topics?: LearningTopic[]; error?: string };
      if (!response.ok) throw new Error(body.error || "No se ha podido cargar tu biblioteca.");
      setLessons(body.lessons ?? []);
      setItems(body.items ?? []);
      setTopics(body.topics ?? []);
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
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl("sync")}?status=1`, { cache: "no-store" });
        const body = await response.json() as { synced?: boolean; name?: string };
        if (response.ok) {
          setSynced(body.synced === true);
          setLibraryName(body.name ?? "");
          setSyncName(body.name || "Mi biblioteca");
        }
      } catch {
        // Sync is optional; the local browser library remains fully usable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("spanish-buddy-exercises");
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedExerciseTypes(parsed.filter((value): value is string => typeof value === "string" && ACTIVE_EXERCISE_IDS.includes(value)));
        }
      } catch {
        // The complete default selection remains available if a local preference is unreadable.
      }
    }, 0);
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
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_LESSON_IMAGES) {
      setFiles(selected.slice(0, MAX_LESSON_IMAGES));
      setError(`Puedes añadir hasta ${MAX_LESSON_IMAGES} imágenes por lección.`);
      return;
    }
    if (selected.some((file) => !SUPPORTED_IMAGE_TYPES.has(file.type))) {
      setFiles([]);
      setError("Usa imágenes JPG, PNG, WEBP o GIF.");
      return;
    }
    setFiles(selected);
    setError("");
  }

  async function syncLibrary(event: FormEvent) {
    event.preventDefault();
    if (syncPassphrase.trim().length < 16) {
      setSyncError("Usa una frase de al menos 16 caracteres.");
      return;
    }
    if (!syncName.trim()) {
      setSyncError("Ponle un nombre a esta biblioteca.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      const response = await fetch(apiUrl("sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: synced ? "rekey" : "connect", passphrase: syncPassphrase, name: syncName }),
      });
      const body = await response.json() as { synced?: boolean; name?: string; error?: string };
      if (!response.ok || !body.synced) throw new Error(body.error || "No se ha podido sincronizar la biblioteca.");
      setSynced(true);
      setLibraryName(body.name || syncName.trim());
      setSyncName(body.name || syncName.trim());
      setSyncPassphrase("");
      await loadLibrary();
      setSyncOpen(false);
    } catch (syncFailure) {
      setSyncError(syncFailure instanceof Error ? syncFailure.message : "No se ha podido sincronizar la biblioteca.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectLibrary() {
    setSyncing(true);
    setSyncError("");
    try {
      const response = await fetch(apiUrl("sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      const body = await response.json() as { synced?: boolean; error?: string };
      if (!response.ok || body.synced !== false) throw new Error(body.error || "No se ha podido desconectar este dispositivo.");
      setSynced(false);
      setLibraryName("");
      setSyncName("Mi biblioteca");
      setSyncOpen(false);
      setLessons([]);
      setItems([]);
      setLoadingLibrary(true);
      await loadLibrary();
      setView("today");
    } catch (disconnectFailure) {
      setSyncError(disconnectFailure instanceof Error ? disconnectFailure.message : "No se ha podido desconectar este dispositivo.");
    } finally {
      setSyncing(false);
    }
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
    setImageProgress(files.length ? `Preparando página 1 de ${files.length}…` : "");
    setError("");
    setExtraction(null);

    try {
      const inputs: Array<{ file?: File; note: string }> = files.length
        ? files.map((file, index) => ({ file, note: index === 0 ? note.trim() : "" }))
        : [{ note: note.trim() }];
      const results: ExtractionResult[] = [];

      for (let index = 0; index < inputs.length; index += 1) {
        const input = inputs[index];
        let preparedFile: File | undefined;
        if (input.file) {
          setImageProgress(`Preparando página ${index + 1} de ${inputs.length}…`);
          preparedFile = await prepareLessonImage(input.file);
          setImageProgress(`Analizando página ${index + 1} de ${inputs.length}…`);
        }

        const formData = new FormData();
        formData.set("title", title.trim());
        formData.set("note", input.note);
        if (preparedFile) formData.append("images", preparedFile);

        let response: Response | null = null;
        let body: { extraction?: ExtractionResult; sourceDeleted?: boolean; error?: string } = {};
        for (let attempt = 0; attempt < 2; attempt += 1) {
          response = await fetch(apiUrl("extract"), { method: "POST", body: formData });
          const responseType = response.headers.get("content-type") ?? "";
          body = responseType.includes("application/json")
            ? await response.json() as typeof body
            : {
                error: response.status === 413
                  ? "Esta imagen es demasiado grande para analizarla."
                  : "No se ha podido analizar la lección.",
              };
          if (response.ok && body.extraction) break;
          if (attempt === 0 && response.status >= 500) continue;
          break;
        }

        if (!response?.ok || !body.extraction) {
          const page = files.length ? ` la página ${index + 1}` : " la lección";
          throw new Error(body.error ? `No se ha podido analizar${page}: ${body.error}` : `No se ha podido analizar${page}.`);
        }
        results.push(body.extraction);
      }

      const merged = mergeExtractions(results, title.trim());
      setExtraction(merged);
      setTitle(merged.title);
      setSourceDeleted(true);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "No se ha podido analizar la lección.");
    } finally {
      setBusy(false);
      setImageProgress("");
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

  function updateExerciseSelection(next: string[]) {
    setSelectedExerciseTypes(next);
    try {
      window.localStorage.setItem("spanish-buddy-exercises", JSON.stringify(next));
    } catch {
      // Selection still works for the current visit when local preferences are unavailable.
    }
  }

  function toggleExerciseType(id: string) {
    updateExerciseSelection(selectedExerciseTypes.includes(id)
      ? selectedExerciseTypes.filter((value) => value !== id)
      : [...selectedExerciseTypes, id]);
  }

  function toggleExercisePreset(modes: (typeof EXERCISE_MODES)[number]["id"][]) {
    const presetExerciseIds = EXERCISE_LIBRARY
      .filter((exercise) => exercise.status === "active" && modes.includes(exercise.mode))
      .map((exercise) => exercise.id);
    const presetIsSelected = presetExerciseIds.length > 0
      && presetExerciseIds.every((id) => selectedExerciseTypes.includes(id));

    updateExerciseSelection(presetIsSelected
      ? selectedExerciseTypes.filter((id) => !presetExerciseIds.includes(id))
      : [...new Set([...selectedExerciseTypes, ...presetExerciseIds])]);
  }

  async function startSession(sourceItems = items, sessionSize = 8) {
    if (!sourceItems.length) {
      setView("add");
      return;
    }
    if (!selectedExerciseTypes.length) {
      setError("Selecciona al menos un tipo de ejercicio.");
      setView("exercises");
      return;
    }
    setPreparingSession(true);
    setError("");
    try {
      const response = await fetch(apiUrl("practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: sourceItems.map((item) => item.id),
          selectedTypes: selectedExerciseTypes,
          sessionSize,
        }),
      });
      const body = await response.json() as { exercises?: Exercise[]; error?: string };
      if (!response.ok || !body.exercises?.length) throw new Error(body.error || "No se ha podido preparar la práctica.");
      setExercises(body.exercises);
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
      setHelpOpen(false);
      setStrongHintRevealed(false);
      setAnswerTranslationOpen(false);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "No se ha podido preparar la práctica.");
    } finally {
      setPreparingSession(false);
    }
  }

  async function recordAttempt(quality: AnswerResult) {
    if (!currentExercise) return null;
    const correct = quality === "correct";
    if (correct) setSessionCorrect((value) => value + 1);
    if (quality === "almost") setSessionAlmost((value) => value + 1);
    setItems((current) =>
      current.map((item) =>
        item.id === currentExercise.item.id
          ? { ...item, mastery: Math.max(0, Math.min(100, item.mastery + (correct ? strongHintRevealed ? 5 : 12 : quality === "almost" ? -4 : -20))) }
          : item,
      ),
    );
    try {
      setRecordingAttempt(true);
      const response = await fetch(apiUrl("attempts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentExercise.item.id, correct, quality, exerciseType: currentExercise.exerciseType, assisted: strongHintRevealed }),
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
          prompt: completeExercisePrompt(currentExercise),
          expectedAnswer: currentExercise.answer,
          learnerAnswer: answer,
          exerciseType: currentExercise.exerciseType,
          itemId: currentExercise.item.id,
          context: [currentExercise.item.spanish, currentExercise.item.translation, currentExercise.item.explanation, currentExercise.gradingFocus]
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
          exerciseType: currentExercise.exerciseType,
          prompt: completeExercisePrompt(currentExercise),
          expectedAnswer: currentExercise.answer,
          learnerAnswer: answer,
          assisted: strongHintRevealed,
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
      setEditorMode("detail");
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
    setHelpOpen(false);
    setStrongHintRevealed(false);
    setAnswerTranslationOpen(false);
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
    setHelpOpen(false);
    setStrongHintRevealed(false);
    setAnswerTranslationOpen(false);
  }

  return (
    <main className="sb-app" lang="es">
      <header className="sb-header">
        <button className="sb-brand" onClick={() => { setView("today"); closeSession(); }} aria-label="Inicio de Spanish Buddy">
          <Sunflower className="sb-brand-mark" label="Spanish Buddy" />
          <span>Spanish Buddy<small>Tu curso, contigo.</small></span>
        </button>
        <nav aria-label="Navegación principal">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Hoy</button>
          <button className={view === "add" ? "active" : ""} onClick={() => setView("add")}>Nueva lección</button>
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>Biblioteca</button>
          <button className={view === "exercises" ? "active" : ""} onClick={() => setView("exercises")}>Ejercicios</button>
        </nav>
        <div className="sb-account-tools">
          <button
            className={`sb-level ${synced ? "synced" : ""}`}
            onClick={() => { setSyncError(""); setSyncName(libraryName || "Mi biblioteca"); setSyncOpen(true); }}
            aria-label={synced ? `${libraryName || "Biblioteca sincronizada"}. Abrir sincronización` : "Sincronizar biblioteca"}
            aria-haspopup="dialog"
            aria-expanded={syncOpen}
            aria-controls="sb-sync-dialog"
          >
            <span>B1</span><small><b>{synced ? libraryName || "Mi biblioteca" : "Sincronizar"}</b><i>Español de España</i></small>
          </button>
        </div>
      </header>

      {error && <div className="sb-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Cerrar</button></div>}

      {view === "today" && (
        <div className="sb-shell">
          <section className="sb-welcome">
            <div>
              <div className="sb-welcome-title">
                <h1>Tu curso,<br /><em>recordado.</em></h1>
                <Sunflower className="sb-kicker-flower" label="Girasol de Spanish Buddy" />
              </div>
              <p>Tus propios apuntes se convierten en la práctica que necesitas hoy.</p>
            </div>
            <div className="sb-orbit">
              {averageMastery !== null && (
                <>
                  <Sunflower mastery={averageMastery} label={`Dominio general: ${averageMastery}%`} />
                  <span>{averageMastery}%</span>
                  <small>conocimiento</small>
                </>
              )}
            </div>
          </section>

          <section className="sb-dashboard-grid">
            <article className="sb-daily-card">
              <div className="sb-card-topline"><span>01</span><span>{dueItems.length || items.length} contenidos listos</span></div>
              <div className="sb-daily-copy">
                <p>Práctica diaria</p>
                <h2>{items.length ? "Un poco de práctica hoy lo hace más fácil mañana." : "Tu primera lección empieza aquí."}</h2>
                <span>{items.length ? "Unos 8 minutos · ejercicios variados" : "Sube tus apuntes o empieza con un ejemplo"}</span>
              </div>
              <button className="sb-primary" disabled={preparingSession} onClick={() => items.length ? void startSession() : setView("add")}>
                {preparingSession ? "Preparando…" : items.length ? "Empezar la práctica" : "Añadir la primera lección"}<span aria-hidden="true">→</span>
              </button>
            </article>

            <aside className="sb-progress-card">
              <p className="sb-eyebrow">Tu base de aprendizaje</p>
              <div className="sb-stat-row"><strong>{items.length}</strong><span>palabras y reglas</span></div>
              <div className="sb-stat-row"><strong>{lessons.length}</strong><span>lecciones del curso</span></div>
              <div className="sb-stat-row"><strong>{topics.length}</strong><span>temas para consultar</span></div>
              <div className="sb-stat-row"><strong>{items.filter((item) => item.mastery >= 62).length}</strong><span>ya dominas</span></div>
              <div className="sb-growth-meter">
                {averageMastery !== null && (
                  <>
                    <Sunflower mastery={averageMastery} label={`Progreso de tu base: ${averageMastery}%`} />
                    <div className="sb-meter"><span style={{ width: `${averageMastery}%` }} /></div>
                  </>
                )}
              </div>
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
                    <p>{new Date(lesson.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</p>
                    <h3>{lesson.title}</h3>
                    <div><span>{lesson.items.length} contenidos</span><span>{Math.round(lesson.items.reduce((sum, item) => sum + item.mastery, 0) / Math.max(lesson.items.length, 1))}%</span></div>
                    <button disabled={preparingSession} onClick={() => void startSession(lesson.items)}>Practicar</button>
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
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={onFiles} />
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
              {imageProgress && <p className="sb-image-progress" role="status">{imageProgress}</p>}
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
                      <textarea className="sb-field-wide" aria-label={item.kind === "grammar" ? "Explicación" : "Nota de uso"} value={item.explanation} onChange={(event) => updateExtractedItem(item.id, { explanation: event.target.value })} placeholder={item.kind === "grammar" ? "Explicación breve de la regla" : "Nota de uso, si es útil"} />
                      <input className="sb-field-wide" aria-label="Ejemplo" value={item.example} onChange={(event) => updateExtractedItem(item.id, { example: event.target.value })} placeholder="Frase de ejemplo" />
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
          <nav className="sb-library-filters" aria-label="Secciones de la biblioteca">
            {libraryFilters.map((filter) => (
              <button
                type="button"
                className={libraryFilter === filter.id ? "active" : ""}
                aria-pressed={libraryFilter === filter.id}
                onClick={() => setLibraryFilter(filter.id)}
                key={filter.id}
              >
                <span>{filter.label}</span><small>{libraryCounts[filter.id]}</small>
              </button>
            ))}
          </nav>
          {libraryFilter === "topics" ? (
            topics.length ? (
              <section className="sb-topic-catalog" aria-label="Temas de aprendizaje">
                <div className="sb-topic-catalog-intro">
                  <p className="sb-eyebrow">Consulta rápida</p>
                  <h2>Tu gramática, explicada para volver a ella.</h2>
                  <p>Cada lección añade o enriquece estos temas. Léelos cuando necesites refrescar una regla y practica solo ese contenido.</p>
                </div>
                <div className="sb-topic-list">
                  {topics.map((topic, index) => {
                    const topicItems = topic.itemIds.map((id) => items.find((item) => item.id === id)).filter((item): item is SavedItem => Boolean(item));
                    return (
                      <article className="sb-topic-card" key={topic.id}>
                        <div className="sb-topic-number">{String(index + 1).padStart(2, "0")}</div>
                        <div className="sb-topic-copy">
                          <div className="sb-topic-meta"><span>Tema de gramática</span><span>{topic.lessonTitles.length} {topic.lessonTitles.length === 1 ? "lección" : "lecciones"}</span></div>
                          <h2>{topic.title}</h2>
                          <p className="sb-topic-explanation" lang="de">{topic.explanation || "Este tema todavía necesita una explicación más completa."}</p>
                          {topic.examples.length > 0 && (
                            <div className="sb-topic-examples">
                              <span>{topic.examples.length === 1 ? "Ejemplo" : "Ejemplos"}</span>
                              {topic.examples.map((example) => <p lang="es" key={example}>{example}</p>)}
                            </div>
                          )}
                          <p className="sb-topic-sources">De: {topic.lessonTitles.join(" · ")}</p>
                        </div>
                        <aside className="sb-topic-action">
                          <Sunflower mastery={topic.mastery} label={`${topic.title}: ${topic.mastery}% de dominio`} />
                          <strong>{topic.mastery}%</strong>
                          <span>{masteryLabel(topic.mastery)}</span>
                          <button disabled={preparingSession || !topicItems.length} onClick={() => void startSession(topicItems, 4)}>{preparingSession ? "Preparando…" : "Entrenamiento corto →"}</button>
                        </aside>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="sb-empty sb-starter-empty"><div><strong>Los temas aparecerán con tus lecciones de gramática.</strong><span>Sube apuntes sobre el indefinido, el subjuntivo u otra regla para empezar.</span></div><button onClick={() => setView("add")}>Añadir lección</button></div>
            )
          ) : filteredLessons.length ? filteredLessons.map((lesson) => (
            <section className="sb-library-lesson" key={lesson.id}>
              <div className="sb-library-lesson-head"><div><span>{new Date(lesson.createdAt).toLocaleDateString("es-ES")}</span><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><button disabled={preparingSession} onClick={() => void startSession(lesson.items)}>{preparingSession ? "Preparando…" : "Practicar →"}</button></div>
              <div className="sb-library-items">
                {lesson.items.map((item) => (
                  <article key={item.id}>
                    <button className="sb-library-item-button" onClick={() => openLibraryItem(item)} aria-label={`Abrir ${item.spanish}`}>
                      <div><span>{libraryCategoryLabel(item)}</span>{item.provenance === "suggested" && <small>Sugerencia</small>}</div>
                      <h3>{item.spanish}</h3><p lang="de">{item.translation || item.explanation}</p>
                      {item.kind === "grammar" && item.example && <p className="sb-card-example">Ejemplo: {item.example}</p>}
                      <div className="sb-item-mastery"><Sunflower mastery={item.mastery} label={`${item.spanish}: ${item.mastery}% de dominio`} /><span><i style={{ width: `${item.mastery}%` }} /></span><small>{masteryLabel(item.mastery)} · {item.mastery}%</small></div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )) : lessons.length ? (
            <div className="sb-empty sb-starter-empty"><div><strong>Aún no hay contenido en esta sección.</strong><span>Elige otra sección o añade una nueva lección.</span></div><button onClick={() => setLibraryFilter("all")}>Ver todo</button></div>
          ) : <div className="sb-empty sb-starter-empty"><div><strong>Tu biblioteca está lista para la primera lección.</strong><span>Sube tus apuntes o empieza con un ejemplo.</span></div><button onClick={() => setView("add")}>Añadir lección</button></div>}
        </div>
      )}

      {view === "exercises" && (
        <div className="sb-shell sb-exercise-library">
          <section className="sb-exercise-library-intro">
            <div>
              <p className="sb-eyebrow">Tu forma de practicar</p>
              <h1>Elige cómo quieres <em>aprender.</em></h1>
              <p>Elige una combinación para tu situación de hoy y ajusta después cualquier ejercicio individual.</p>
            </div>
            <div className="sb-selection-panel">
              <strong>{selectedExerciseTypes.length}</strong>
              <span>tipos seleccionados</span>
              <div>
                <button onClick={() => updateExerciseSelection([...ACTIVE_EXERCISE_IDS])}>Seleccionar todos</button>
                <button onClick={() => updateExerciseSelection([])}>Deseleccionar todos</button>
              </div>
              <button className="sb-primary" disabled={!items.length || !selectedExerciseTypes.length || preparingSession} onClick={() => void startSession()}>
                {preparingSession ? "Preparando…" : "Empezar entrenamiento"}<span>→</span>
              </button>
            </div>
          </section>

          <section className="sb-practice-presets" aria-labelledby="sb-practice-presets-title">
            <div className="sb-practice-presets-head">
              <div><p className="sb-eyebrow">Combinaciones rápidas</p><h2 id="sb-practice-presets-title">¿Qué te apetece ahora?</h2></div>
              <p>Pulsa otra vez una combinación activa para quitar sus ejercicios. Tus ajustes individuales se conservan.</p>
            </div>
            <div className="sb-practice-preset-grid">
              {EXERCISE_PRESETS.map((preset) => {
                const presetExerciseIds = EXERCISE_LIBRARY
                  .filter((exercise) => exercise.status === "active" && preset.modes.includes(exercise.mode))
                  .map((exercise) => exercise.id);
                const selectedCount = presetExerciseIds.filter((id) => selectedExerciseTypes.includes(id)).length;
                const selected = presetExerciseIds.length > 0 && selectedCount === presetExerciseIds.length;
                const unavailable = presetExerciseIds.length === 0;
                return (
                  <button
                    type="button"
                    className={`sb-practice-preset ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    disabled={unavailable}
                    onClick={() => toggleExercisePreset(preset.modes)}
                    key={preset.id}
                  >
                    <span>{unavailable ? "Próximamente" : selected ? "Activo" : `${selectedCount}/${presetExerciseIds.length}`}</span>
                    <strong>{preset.name}</strong>
                    <p>{preset.description}</p>
                    <small>{preset.modes.map((mode) => EXERCISE_MODES.find((entry) => entry.id === mode)?.name).join(" · ")}</small>
                  </button>
                );
              })}
            </div>
          </section>

          {EXERCISE_CATEGORIES.map((category) => {
            const categoryExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.category === category.id);
            const activeCategoryExercises = categoryExercises.filter((exercise) => exercise.status === "active");
            const selectedCategoryCount = activeCategoryExercises.filter((exercise) => selectedExerciseTypes.includes(exercise.id)).length;
            return (
              <section className="sb-exercise-category" key={category.id}>
                <div className="sb-exercise-category-head">
                  <div><p className="sb-eyebrow">{category.name}</p><h2>{category.description}</h2></div>
                  <div className="sb-exercise-category-actions">
                    <span>{activeCategoryExercises.length ? `${selectedCategoryCount}/${activeCategoryExercises.length}` : "Próximamente"}</span>
                  </div>
                </div>
                <div className="sb-exercise-boxes">
                  {categoryExercises.map((exercise) => {
                    const comingSoon = exercise.status === "coming_soon";
                    const selected = !comingSoon && selectedExerciseTypes.includes(exercise.id);
                    return (
                      <button
                        type="button"
                        className={`sb-exercise-box ${selected ? "selected" : ""} ${comingSoon ? "coming-soon" : ""}`}
                        key={exercise.id}
                        disabled={comingSoon}
                        aria-pressed={comingSoon ? undefined : selected}
                        onClick={() => toggleExerciseType(exercise.id)}
                      >
                        <div className="sb-exercise-box-top"><span>{comingSoon ? "Próximamente" : selected ? "Activo" : "Inactivo"} · {EXERCISE_MODES.find((mode) => mode.id === exercise.mode)?.name}</span><i aria-hidden="true">{comingSoon ? "·" : selected ? "✓" : "+"}</i></div>
                        <h3>{exercise.name}</h3>
                        <p>{exercise.description}</p>
                        <div className="sb-exercise-example"><small>Ejemplo</small><strong>{exercise.examplePrompt}</strong><span>{exercise.exampleAnswer}</span></div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editingItem && (
        <div className="sb-editor-backdrop" role="dialog" aria-modal="true" aria-label={`${editingItem.kind === "grammar" ? "Regla" : "Vocabulario"}: ${editingItem.spanish}`}>
          {editorMode === "detail" ? (
            <section className="sb-item-editor sb-item-detail">
              <div className="sb-editor-head">
                <div><p className="sb-eyebrow">{editingItem.kind === "grammar" ? "Mini lección de gramática" : "Contenido de vocabulario"}</p><h2>{editingItem.spanish}</h2></div>
                <div className="sb-editor-head-actions"><button type="button" className="sb-edit-symbol" onClick={() => setEditorMode("edit")} aria-label="Editar este contenido">✎</button><button type="button" onClick={() => setEditingItem(null)} aria-label="Cerrar">×</button></div>
              </div>
              {editingItem.translation && <p className="sb-detail-translation" lang="de">{editingItem.translation}</p>}
              <div className="sb-learning-blocks">
                {editingItem.explanation && <section><span>{editingItem.kind === "grammar" ? "Cómo funciona" : "Cómo se usa"}</span><p lang="de">{editingItem.explanation}</p></section>}
                {editingItem.example && <section className="sb-detail-example"><span>Ejemplo</span><p lang="es">{editingItem.example}</p></section>}
                {!editingItem.explanation && !editingItem.example && <p className="sb-detail-empty">Todavía no hay una explicación o un ejemplo guardado para este contenido.</p>}
              </div>
              <div className="sb-detail-footer"><Sunflower mastery={editingItem.mastery} label={`${editingItem.mastery}% de dominio`} /><div><strong>{masteryLabel(editingItem.mastery)}</strong><span>{editingItem.mastery}% de dominio</span></div></div>
            </section>
          ) : (
            <form className="sb-item-editor" onSubmit={saveEditedItem}>
              <div className="sb-editor-head"><div><p className="sb-eyebrow">Editar contenido</p><h2>{editingItem.kind === "grammar" ? "Regla gramatical" : "Vocabulario"}</h2></div><button type="button" onClick={() => setEditingItem(null)} aria-label="Cerrar">×</button></div>
              <div className="sb-editor-grid">
                <label><span>Tipo de contenido</span><select value={editingItem.learningType} onChange={(event) => setEditingItem({ ...editingItem, learningType: event.target.value as SavedItem["learningType"] })}><option value="word">Palabra</option><option value="collocation">Combinación de palabras</option><option value="fixed_expression">Expresión fija</option><option value="sentence_pattern">Estructura de frase</option><option value="grammar_rule">Regla gramatical</option><option value="conjugation">Conjugación</option></select></label>
                <label><span>Español</span><input value={editingItem.spanish} onChange={(event) => setEditingItem({ ...editingItem, spanish: event.target.value })} required /><small>En los verbos, incluye la preposición: hablar con, ir a, depender de…</small></label>
                <label><span>Traducción de tus apuntes</span><input lang="de" value={editingItem.translation} onChange={(event) => setEditingItem({ ...editingItem, translation: event.target.value, acceptedAnswers: [] })} /></label>
                <label className="wide"><span>{editingItem.kind === "grammar" ? "Explicación de la regla" : "Nota de uso"}</span><textarea lang="de" value={editingItem.explanation} onChange={(event) => setEditingItem({ ...editingItem, explanation: event.target.value })} placeholder={editingItem.kind === "grammar" ? "Formación, uso y excepciones" : "Solo si hace falta aclarar el uso"} /></label>
                <label className="wide"><span>Ejemplo en español</span><textarea value={editingItem.example} onChange={(event) => setEditingItem({ ...editingItem, example: event.target.value })} placeholder="Una frase clara que muestre el uso" /></label>
                <label className="wide"><span>Respuestas alternativas aceptadas</span><textarea lang="de" value={editingItem.acceptedAnswers.join("\n")} onChange={(event) => setEditingItem({ ...editingItem, acceptedAnswers: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} placeholder="Una alternativa por línea" /></label>
              </div>
              <div className="sb-editor-actions"><button type="button" onClick={cancelItemEditing}>Cancelar</button><button className="sb-primary" disabled={savingItem}>{savingItem ? "Guardando…" : "Guardar cambios"}<span>→</span></button></div>
            </form>
          )}
        </div>
      )}

      {syncOpen && (
        <div id="sb-sync-dialog" className="sb-editor-backdrop" role="dialog" aria-modal="true" aria-labelledby="sb-sync-title">
          <form className="sb-item-editor sb-sync-dialog" onSubmit={syncLibrary}>
            <div className="sb-editor-head">
              <div><p className="sb-eyebrow">La misma biblioteca en todos tus dispositivos</p><h2 id="sb-sync-title">Sincronizar</h2></div>
              <button type="button" onClick={() => { setSyncOpen(false); setSyncPassphrase(""); setSyncName(libraryName || "Mi biblioteca"); setSyncError(""); }} aria-label="Cerrar">×</button>
            </div>
            {synced ? (
              <div className="sb-sync-connected-view">
                <div className="sb-sync-connected"><span aria-hidden="true">✓</span><div><strong>{libraryName || "Mi biblioteca"}</strong><p>Configura una frase nueva para esta biblioteca y úsala en tus otros dispositivos.</p></div></div>
                <div className="sb-sync-rekey-fields">
                  <label className="sb-sync-field"><span>Nombre de la biblioteca</span><input type="text" autoComplete="off" value={syncName} onChange={(event) => setSyncName(event.target.value)} maxLength={60} placeholder="p. ej. Español B1" required /></label>
                  <label className="sb-sync-field"><span>Nueva frase de sincronización</span><input type="password" autoComplete="new-password" value={syncPassphrase} onChange={(event) => setSyncPassphrase(event.target.value)} minLength={16} maxLength={160} placeholder="p. ej. cuatro palabras que solo tú recuerdas" required /><small>Mínimo 16 caracteres. Tus lecciones y tu progreso se conservarán.</small></label>
                </div>
                {syncError && <p className="sb-sync-error" role="alert">{syncError}</p>}
                <div className="sb-sync-warning"><strong>La frase anterior dejará de funcionar.</strong><span>Los otros dispositivos deberán conectarse de nuevo con la frase nueva.</span></div>
                <button className="sb-primary sb-sync-submit" disabled={syncing || !syncName.trim() || syncPassphrase.trim().length < 16}>{syncing ? "Guardando…" : "Guardar nombre y nueva frase"}<span>→</span></button>
                <button className="sb-disconnect-button" type="button" disabled={syncing} onClick={() => void disconnectLibrary()}>{syncing ? "Desconectando…" : "Desconectar este dispositivo"}</button>
                <small className="sb-disconnect-note">La biblioteca sincronizada no se borrará. Podrás recuperarla introduciendo de nuevo la misma frase.</small>
              </div>
            ) : (
              <>
                <p className="sb-sync-copy">Elige una frase larga y memorable. Tus contenidos actuales se unirán a la biblioteca vinculada con esa frase.</p>
                <label className="sb-sync-field"><span>Nombre de la biblioteca</span><input type="text" autoComplete="off" autoFocus value={syncName} onChange={(event) => setSyncName(event.target.value)} maxLength={60} placeholder="p. ej. Español B1" required /></label>
                <label className="sb-sync-field"><span>Frase de sincronización</span><input type="password" autoComplete="new-password" value={syncPassphrase} onChange={(event) => setSyncPassphrase(event.target.value)} minLength={16} maxLength={160} placeholder="p. ej. cuatro palabras que solo tú recuerdas" required /><small>Mínimo 16 caracteres. Se distingue entre mayúsculas y minúsculas. La frase no se guarda.</small></label>
                {syncError && <p className="sb-sync-error" role="alert">{syncError}</p>}
                <div className="sb-sync-warning"><strong>Guárdala bien.</strong><span>No podemos recuperar una frase perdida. Podrás cambiarla mientras esta biblioteca siga conectada en algún dispositivo.</span></div>
                <button className="sb-primary sb-sync-submit" disabled={syncing || !syncName.trim() || syncPassphrase.trim().length < 16}>{syncing ? "Sincronizando…" : "Sincronizar biblioteca"}<span>→</span></button>
              </>
            )}
          </form>
        </div>
      )}

      {exercises.length > 0 && (
        <div className="sb-practice" role="dialog" aria-modal="true" aria-label="Práctica diaria">
          <header><button onClick={closeSession} aria-label="Cerrar práctica">×</button><Sunflower className="sb-practice-flower" mastery={sessionDone ? 100 : Math.round(((exerciseIndex + 1) / exercises.length) * 100)} label="Progreso de la práctica" /><div><span style={{ width: `${sessionDone ? 100 : ((exerciseIndex + 1) / exercises.length) * 100}%` }} /></div><small>{sessionDone ? exercises.length : exerciseIndex + 1} / {exercises.length}</small></header>
          {sessionDone ? (
            <section className="sb-session-summary"><p className="sb-eyebrow">Práctica terminada</p><div className="sb-completion-bloom"><Sunflower celebration label="Sesión completada: el girasol ha florecido" /><strong>{sessionCorrect}/{exercises.length}</strong><span>recordados{sessionAlmost > 0 ? ` · ${sessionAlmost} casi` : ""}</span><i className="sb-bloom-spark sb-bloom-spark-one" aria-hidden="true" /><i className="sb-bloom-spark sb-bloom-spark-two" aria-hidden="true" /><i className="sb-bloom-spark sb-bloom-spark-three" aria-hidden="true" /></div><h2>Bien hecho. La próxima práctica ya está mejor adaptada.</h2><p>Lo que todavía cuesta vuelve antes; lo que ya dominas recibe más espacio.</p><button className="sb-primary" onClick={closeSession}>Volver a Hoy <span>→</span></button></section>
          ) : currentExercise && (
            <section className="sb-exercise">
              <div className="sb-exercise-meta"><span>{currentExercise.label}</span><span>{currentExercise.item.lessonTitle}</span></div>
              <div className="sb-exercise-card">
                <div className="sb-task-row">
                  <div className="sb-task-instruction"><small>Tu tarea</small><p>{currentExercise.instruction}</p></div>
                  <button className="sb-info-button" type="button" aria-label="Información y ayuda en alemán" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}>i</button>
                </div>
                {helpOpen && (
                  <aside className="sb-language-help" aria-label="Ayuda en alemán">
                    <div><small>En alemán</small><p lang="de">{currentExercise.germanSupport}</p></div>
                    {currentExercise.grammarReminder && <div><small>Recordatorio gramatical</small><p lang="de">{currentExercise.grammarReminder}</p></div>}
                    {!strongHintRevealed ? (
                      <button type="button" onClick={() => setStrongHintRevealed(true)}>Mostrar más ayuda</button>
                    ) : (
                      <div className="sb-strong-hint"><small>Ayuda adicional</small><p lang="de">{currentExercise.strongerHint}</p><span>Esta respuesta contará como práctica con ayuda.</span></div>
                    )}
                  </aside>
                )}
                {currentExercise.context && <div className="sb-exercise-context" lang="es">{currentExercise.context}</div>}
                <h2 className={currentExercise.context ? "sb-context-question" : ""}>{currentExercise.prompt}</h2>
                {currentExercise.options?.length ? (
                  <div className="sb-options">{currentExercise.options.map((option) => <button className={revealed ? acceptsAnswer(option, currentExercise.answer, currentExercise.item.acceptedAnswers ?? []) ? "correct" : option === answer ? "incorrect" : "" : ""} key={option} onClick={() => chooseAnswer(option)}>{option}</button>)}</div>
                ) : !revealed ? (
                  <form className="sb-answer-form" onSubmit={submitAnswer}><input autoFocus value={answer} disabled={checkingAnswer} onChange={(event) => setAnswer(event.target.value)} placeholder="Escribe tu respuesta…" /><button disabled={checkingAnswer || !answer.trim()}>{checkingAnswer ? "Comprobando…" : "Comprobar"}</button></form>
                ) : (
                  <div className="sb-submitted-answer"><small>Tu respuesta</small><strong>{answer}</strong></div>
                )}
                {revealed && answerFeedback && <div className={`sb-feedback ${needsManualReview ? "review" : result}`}><span>{result === "correct" ? "✓" : result === "almost" ? "≈" : needsManualReview ? "?" : "→"}</span><div><strong>{answerFeedback.title}</strong><p>{answerFeedback.message}</p>{result && <div className="sb-reference-block"><p className="sb-reference">Respuesta de referencia: {currentExercise.answer}</p><button type="button" aria-expanded={answerTranslationOpen} onClick={() => setAnswerTranslationOpen((value) => !value)}>{answerTranslationOpen ? "Ocultar alemán" : "Ver en alemán"}</button>{answerTranslationOpen && <p className="sb-answer-translation" lang="de">{currentExercise.answerTranslation}</p>}</div>}{needsManualReview && <div className="sb-review-choice"><button onClick={() => resolveManualReview(true)}>Marcar como correcta</button><button onClick={() => resolveManualReview(false)}>Usar la referencia</button></div>}</div></div>}
                {result === "incorrect" && answerJudgedByModel && <div className="sb-override-option"><span>¿La evaluación no encaja?</span><button disabled={recordingAttempt || overridingAnswer} onClick={markJudgedAnswerCorrect}>{overridingAnswer ? "Guardando…" : recordingAttempt ? "Espera un momento…" : "Marcar mi respuesta como correcta"}</button></div>}
                {result && strongHintRevealed && <p className="sb-assisted-note">Con ayuda · esta respuesta aporta menos evidencia de dominio.</p>}
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
