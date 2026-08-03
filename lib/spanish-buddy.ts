export type KnowledgeKind = "vocabulary" | "grammar";
export type Provenance = "course" | "suggested";

export type ExtractedItem = {
  id: string;
  kind: KnowledgeKind;
  spanish: string;
  translation: string;
  explanation: string;
  example: string;
  confidence: "high" | "medium" | "low";
  provenance: Provenance;
  selected: boolean;
};

export type ExtractionResult = {
  title: string;
  summary: string;
  referenceLanguage: string;
  items: ExtractedItem[];
};

export type SavedItem = Omit<ExtractedItem, "confidence" | "selected"> & {
  lessonId: string;
  lessonTitle: string;
  mastery: number;
  attempts: number;
  correctCount: number;
  nextReviewAt: string;
};

export type SavedLesson = {
  id: string;
  title: string;
  summary: string;
  sourceType: string;
  createdAt: string;
  items: SavedItem[];
};

export function masteryLabel(score: number) {
  if (score >= 82) return "Strong";
  if (score >= 62) return "Familiar";
  if (score >= 35) return "Learning";
  if (score > 0) return "Needs attention";
  return "New";
}

export const EXAMPLE_NOTES = [
  {
    id: "vocab",
    title: "Neue Wörter · Alltag & Medien",
    label: "Vocabulary from class",
    text: `30.07.2026 — Vokabeln\n\nel anhelo — der Wunsch / die Sehnsucht\nlos guisantes — die Erbsen\nla amistad — die Freundschaft\nagitado/a — aufgeregt, unruhig\ncortés — höflich\nla esquina — die Ecke\nel aburrimiento — die Langeweile\nalojarse — übernachten\nlas noticias — die Nachrichten\nel/la carterista — der Taschendieb / die Taschendiebin\ncazar — jagen, fangen\nlas redes sociales — soziale Netzwerke\npillar — erwischen\nla enseñanza — die Bildung\npor lo menos — wenigstens, mindestens`,
  },
  {
    id: "grammar",
    title: "Das Konditional",
    label: "Grammar lesson",
    text: `Grammatik — Das Konditional\n\nDie Endungen werden an den Infinitiv angehängt:\ncomería, comerías, comería, comeríamos, comeríais, comerían\n\nUnregelmäßige Stämme:\ndecir → dir-\nhacer → har-\npoder → podr-\nponer → pondr-\ntener → tendr-\nsalir → saldr-\nhay → habría\n\nVerwendung: höfliche Bitten (¿Podrías ayudarme?), Wünsche (Me encantaría...), Vorschläge und Ratschläge (Yo, en tu lugar, llevaría unas flores).`,
  },
  {
    id: "invitations",
    title: "Einladungen & höflich reagieren",
    label: "Useful phrases",
    text: `Unidad 5 — Comunicación\n\nJemanden einladen:\n¿Te apetece venir a cenar?\nOs invito a mi fiesta.\n¿Vienes a tomar algo?\n\nEine Einladung annehmen:\n¡Claro que voy!\nGracias por la invitación.\nVoy con mucho gusto.\nPodéis contar conmigo.\n\nEine Einladung ablehnen:\nLo siento mucho, pero tengo un compromiso.\n¡Qué pena! Otra vez será.\nMe gustaría, pero no puedo.\n\nEtwas anbieten:\n¿Os apetece algo para picar?\n¿Quieres un poco más?\nNo, gracias, no hace falta.`,
  },
] as const;
