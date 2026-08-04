export type TopicExample = {
  spanish: string;
  translation: string;
};

export type TopicQuickCheck = {
  prompt: string;
  answer: string;
};

export type GrammarTopicDefinition = {
  key: string;
  title: string;
  summary: string;
  definition: string;
  useCases: string[];
  formation: string;
  examples: TopicExample[];
  commonMistakes: string[];
  quickCheck: TopicQuickCheck;
  match: RegExp;
};

export type GrammarTopicSource = {
  spanish: string;
  translation?: string;
  explanation?: string;
};

export type TopicComponentRole = "concept" | "use" | "formation" | "exception" | "example" | "contrast";

export const TOPIC_CONTENT_VERSION = "v2";

export const GRAMMAR_TOPIC_DEFINITIONS: GrammarTopicDefinition[] = [
  {
    key: "indefinido-vs-imperfecto",
    title: "Indefinido vs. imperfecto",
    summary: "Acción terminada o contexto habitual: aprende a elegir el pasado correcto.",
    definition: "Das Indefinido erzählt abgeschlossene Ereignisse; das Imperfecto beschreibt Hintergründe, Gewohnheiten und laufende Situationen in der Vergangenheit.",
    useCases: ["Indefinido: einmalige oder klar abgeschlossene Handlung.", "Imperfecto: Beschreibung, Gewohnheit oder Hintergrund.", "Beide zusammen: Das Imperfecto setzt die Szene, das Indefinido unterbricht sie."],
    formation: "Achte zuerst auf die Funktion: Was geschah? → Indefinido. Wie war es oder was geschah regelmäßig? → Imperfecto. Typisches Muster: Mientras + imperfecto, Ereignis + indefinido.",
    examples: [
      { spanish: "Mientras cocinaba, sonó el teléfono.", translation: "Während ich kochte, klingelte das Telefon." },
      { spanish: "De niño iba al mar cada verano, pero en 2024 fui a la montaña.", translation: "Als Kind fuhr ich jeden Sommer ans Meer, aber 2024 fuhr ich in die Berge." },
    ],
    commonMistakes: ["Zeitangaben helfen, entscheiden aber nicht allein; entscheidend ist die Perspektive auf die Handlung.", "Eine Beschreibung im Hintergrund steht normalerweise nicht im Indefinido."],
    quickCheck: { prompt: "Mientras Ana ___ (leer), Pedro llegó.", answer: "leía" },
    match: /(?:indefinido|preterito perfecto simple).{0,50}imperfecto|imperfecto.{0,50}(?:indefinido|preterito perfecto simple)/i,
  },
  {
    key: "preterito-indefinido",
    title: "Pretérito indefinido",
    summary: "Acciones terminadas en un periodo del pasado que ya ha concluido.",
    definition: "Das Pretérito indefinido beschreibt abgeschlossene Handlungen in einem klar beendeten Zeitraum der Vergangenheit.",
    useCases: ["Einmalige, abgeschlossene Handlung.", "Abfolge mehrerer vergangener Ereignisse.", "Handlung in einem beendeten Zeitraum wie ayer oder el año pasado."],
    formation: "-ar: é, aste, ó, amos, asteis, aron. -er/-ir: í, iste, ió, imos, isteis, ieron. Häufige unregelmäßige Formen: fui, tuve, hice/hizo, pude, dije, vine.",
    examples: [
      { spanish: "Ayer fui al cine.", translation: "Gestern ging ich ins Kino." },
      { spanish: "Llegué, cené y me acosté.", translation: "Ich kam an, aß zu Abend und ging ins Bett." },
    ],
    commonMistakes: ["Bei unregelmäßigen Stämmen stehen keine Akzente: tuve, pude, hice.", "Für Gewohnheiten und Hintergrundbeschreibungen brauchst du meist das Imperfecto."],
    quickCheck: { prompt: "Ayer nosotros ___ una paella. (comer)", answer: "comimos" },
    match: /\b(?:indefinido|preterito perfecto simple)\b/i,
  },
  {
    key: "preterito-imperfecto",
    title: "Pretérito imperfecto",
    summary: "Hábitos, descripciones y acciones en desarrollo en el pasado.",
    definition: "Das Pretérito imperfecto beschreibt Gewohnheiten, Zustände, Hintergründe und gerade ablaufende Handlungen in der Vergangenheit.",
    useCases: ["Wiederholte Gewohnheit in der Vergangenheit.", "Beschreibung von Personen, Orten, Wetter oder Uhrzeit.", "Laufende Hintergrundhandlung ohne betontes Ende."],
    formation: "-ar: aba, abas, aba, ábamos, abais, aban. -er/-ir: ía, ías, ía, íamos, íais, ían. Nur ser, ir und ver sind unregelmäßig: era, iba, veía.",
    examples: [
      { spanish: "Cuando era niño, jugaba en la calle.", translation: "Als ich ein Kind war, spielte ich auf der Straße." },
      { spanish: "Hacía sol y la gente paseaba.", translation: "Die Sonne schien und die Leute gingen spazieren." },
    ],
    commonMistakes: ["Ein konkretes abgeschlossenes Ereignis verlangt normalerweise das Indefinido.", "Die nosotros-Form von -ar-Verben trägt einen Akzent: hablábamos."],
    quickCheck: { prompt: "De pequeña, Marta ___ al colegio andando. (ir)", answer: "iba" },
    match: /\b(?:imperfecto|preterito imperfecto)\b/i,
  },
  {
    key: "preterito-perfecto",
    title: "Pretérito perfecto",
    summary: "Experiencias y acciones pasadas conectadas con el presente.",
    definition: "Das Pretérito perfecto verbindet eine vergangene Handlung mit der Gegenwart, oft in einem noch nicht abgeschlossenen Zeitraum.",
    useCases: ["Erfahrung bis heute.", "Handlung in einem noch laufenden Zeitraum: hoy, esta semana.", "Vergangenes Ergebnis, das jetzt relevant ist."],
    formation: "Presente von haber + Partizip: he, has, ha, hemos, habéis, han + -ado/-ido. Häufig unregelmäßig: hecho, dicho, visto, puesto, vuelto, escrito.",
    examples: [
      { spanish: "Hoy he hablado con Ana.", translation: "Heute habe ich mit Ana gesprochen." },
      { spanish: "¿Has estado alguna vez en Sevilla?", translation: "Warst du schon einmal in Sevilla?" },
    ],
    commonMistakes: ["Das Partizip wird mit haber nicht an Geschlecht oder Zahl angepasst.", "Für einen klar beendeten Zeitraum wird in Spanien meist das Indefinido verwendet."],
    quickCheck: { prompt: "Esta semana nosotros ___ mucho. (trabajar)", answer: "hemos trabajado" },
    match: /\b(?:preterito perfecto|perfecto compuesto)\b/i,
  },
  {
    key: "condicional",
    title: "Condicional",
    summary: "Deseos, consejos, posibilidades y peticiones corteses.",
    definition: "Das Condicional drückt höfliche Bitten, Wünsche, Ratschläge und mögliche Folgen aus.",
    useCases: ["Höfliche Bitte: ¿Podrías...?", "Wunsch oder Möglichkeit: Me encantaría...", "Ratschlag: Yo, en tu lugar, haría..."],
    formation: "Die Endungen werden an den ganzen Infinitiv gehängt: -ía, -ías, -ía, -íamos, -íais, -ían. Unregelmäßige Stämme sind unter anderem dir-, har-, podr-, pondr-, tendr- und saldr-.",
    examples: [
      { spanish: "¿Podrías ayudarme?", translation: "Könntest du mir helfen?" },
      { spanish: "Yo, en tu lugar, llevaría unas flores.", translation: "An deiner Stelle würde ich Blumen mitbringen." },
    ],
    commonMistakes: ["Die Endung kommt auch bei unregelmäßigen Verben an den veränderten Stamm: tendría.", "Alle sechs Formen tragen einen Akzent auf í."],
    quickCheck: { prompt: "Nosotros ___ más tiempo con menos reuniones. (tener)", answer: "tendríamos" },
    match: /\b(?:condicional|konditional)\b/i,
  },
  {
    key: "futuro-simple",
    title: "Futuro simple",
    summary: "Planes, predicciones y suposiciones sobre el presente.",
    definition: "Das Futuro simple beschreibt Zukünftiges und kann außerdem eine Vermutung über die Gegenwart ausdrücken.",
    useCases: ["Vorhersage oder zukünftige Handlung.", "Versprechen oder formelle Ankündigung.", "Vermutung: Estará en casa."],
    formation: "Die Endungen werden an den Infinitiv gehängt: -é, -ás, -á, -emos, -éis, -án. Es verwendet dieselben unregelmäßigen Stämme wie das Condicional: tendr-, podr-, har-, dir-.",
    examples: [
      { spanish: "Mañana llamaré a Marta.", translation: "Morgen werde ich Marta anrufen." },
      { spanish: "No contesta; estará trabajando.", translation: "Er antwortet nicht; er wird wohl arbeiten." },
    ],
    commonMistakes: ["Für feste persönliche Pläne ist ir a + infinitivo oft natürlicher.", "Die nosotros-Form futuros endet auf -emos, nicht auf -ámos."],
    quickCheck: { prompt: "El próximo año ellos ___ a Valencia. (vivir)", answer: "vivirán" },
    match: /\b(?:futuro simple|futuro imperfecto)\b/i,
  },
  {
    key: "pronombres-de-objeto",
    title: "Pronombres de objeto",
    summary: "Sustituye personas y cosas con lo, la, le, los, las y les.",
    definition: "Objektpronomen ersetzen bereits bekannte Personen oder Dinge. Direkte Pronomen sind lo, la, los, las; indirekte Pronomen sind le und les.",
    useCases: ["Direktes Objekt: Wen oder was? → lo, la, los, las.", "Indirektes Objekt: Wem? → le, les.", "Zwei Pronomen zusammen: indirekt vor direkt; le/les wird vor lo/la/los/las zu se."],
    formation: "Vor einem konjugierten Verb: Se lo doy. Am Infinitiv und Gerundium können sie angehängt werden: voy a dárselo, estoy dándoselo. Reihenfolge: me/te/se/nos/os + lo/la/los/las.",
    examples: [
      { spanish: "Le di el libro a Ana. → Se lo di.", translation: "Ich gab Ana das Buch. → Ich gab es ihr." },
      { spanish: "Las entradas, te las compro mañana.", translation: "Die Eintrittskarten kaufe ich dir morgen." },
    ],
    commonMistakes: ["Nicht le lo, sondern se lo.", "Das direkte Pronomen richtet sich nach dem ersetzten Substantiv: la carta → la."],
    quickCheck: { prompt: "Di: ‘Entrego las llaves a Pablo’ con dos pronombres.", answer: "Se las entrego." },
    match: /(?:pronomb|objektpron|objeto directo|objeto indirecto|complemento directo|complemento indirecto|\blo\s*\/\s*la\s*\/\s*los\s*\/\s*las\b|\ble\s*\/\s*les\b|\bse (?:lo|la|los|las)\b)/i,
  },
  {
    key: "pronombres-reflexivos",
    title: "Pronombres reflexivos",
    summary: "Acciones que vuelven al sujeto: me, te, se, nos y os.",
    definition: "Reflexivpronomen zeigen, dass Subjekt und Objekt derselben Handlung identisch sind.",
    useCases: ["Tägliche Routinen: levantarse, ducharse.", "Echte reflexive Handlung: mirarse.", "Verben mit Bedeutungswechsel: ir/irse, quedar/quedarse."],
    formation: "me, te, se, nos, os, se stehen vor dem konjugierten Verb: me levanto. Am Infinitiv und Gerundium können sie angehängt werden: voy a levantarme, estoy vistiéndome.",
    examples: [
      { spanish: "Me levanto a las siete.", translation: "Ich stehe um sieben Uhr auf." },
      { spanish: "Nos estamos preparando.", translation: "Wir bereiten uns gerade vor." },
    ],
    commonMistakes: ["Das Pronomen muss zum Subjekt passen: nosotros nos levantamos.", "Nicht jedes Verb mit se ist wirklich reflexiv; manche ändern ihre Bedeutung."],
    quickCheck: { prompt: "Todos los días Ana ___ a las ocho. (levantarse)", answer: "se levanta" },
    match: /\b(?:pronombres? reflexiv|reflexivpronomen|verbos? reflexiv)\b/i,
  },
  {
    key: "ser-vs-estar",
    title: "Ser vs. estar",
    summary: "Identidad y características con ser; estado y ubicación con estar.",
    definition: "Ser klassifiziert und identifiziert; estar beschreibt Zustände, Ergebnisse und Orte. Entscheidend ist die beabsichtigte Bedeutung, nicht nur dauerhaft oder vorübergehend.",
    useCases: ["Ser: Identität, Herkunft, Material, Beruf, Uhrzeit.", "Estar: Zustand, Ort und Ergebnis einer Veränderung.", "Adjektive können ihre Bedeutung ändern: ser listo / estar listo."],
    formation: "Presente: soy, eres, es, somos, sois, son; estoy, estás, está, estamos, estáis, están.",
    examples: [
      { spanish: "Marta es muy tranquila, pero hoy está nerviosa.", translation: "Marta ist sehr ruhig, aber heute ist sie nervös." },
      { spanish: "La reunión es en la segunda planta; la sala está al fondo.", translation: "Die Besprechung findet im zweiten Stock statt; der Raum ist hinten." },
    ],
    commonMistakes: ["Veranstaltungen werden mit ser lokalisiert: La fiesta es en mi casa.", "Estar muerto, abierto und cerrado beschreiben Ergebnisse, auch wenn sie lange dauern."],
    quickCheck: { prompt: "La sopa ___ fría hoy.", answer: "está" },
    match: /\bser\b.{0,25}\bestar\b|\bestar\b.{0,25}\bser\b/i,
  },
  {
    key: "por-vs-para",
    title: "Por vs. para",
    summary: "Causa, intercambio y recorrido frente a finalidad, destino y plazo.",
    definition: "Por bezeichnet häufig Ursache, Mittel, Austausch oder Weg; para bezeichnet Ziel, Empfänger, Zweck, Frist oder Standpunkt.",
    useCases: ["Por: Grund, Verkehrsmittel, Preis, Dauer, Bewegung durch einen Ort.", "Para: Ziel, Empfänger, Zweck, Frist.", "Para + infinitivo beantwortet oft: Wozu?"],
    formation: "Lerne die Präposition mit ihrer Funktion und einem Beispiel, nicht als einzelne Übersetzung. Frage: Warum/wodurch? → por. Wozu/für wen/wohin? → para.",
    examples: [
      { spanish: "Voy a Madrid por trabajo.", translation: "Ich fahre wegen der Arbeit nach Madrid." },
      { spanish: "Este regalo es para ti.", translation: "Dieses Geschenk ist für dich." },
    ],
    commonMistakes: ["Deutsch ‘für’ kann je nach Bedeutung por oder para sein.", "Eine Frist steht mit para: Es para el lunes."],
    quickCheck: { prompt: "Estudio español ___ trabajar en Barcelona.", answer: "para" },
    match: /\bpor\b.{0,25}\bpara\b|\bpara\b.{0,25}\bpor\b/i,
  },
  {
    key: "presente-de-subjuntivo",
    title: "Presente de subjuntivo",
    summary: "Deseos, valoración, duda y finalidad en una oración subordinada.",
    definition: "Der Subjuntivo präsentiert eine Handlung nicht als neutrale Tatsache, sondern durch Wunsch, Bewertung, Zweifel, Einfluss oder Ziel.",
    useCases: ["Wunsch oder Einfluss: Quiero que...", "Bewertung: Es importante que...", "Zweifel oder Verneinung einer Meinung: No creo que..."],
    formation: "Nimm die yo-Form des Präsens, entferne -o und setze die Gegenvokale: -ar → e, es, e, emos, éis, en; -er/-ir → a, as, a, amos, áis, an.",
    examples: [
      { spanish: "Quiero que vengas mañana.", translation: "Ich möchte, dass du morgen kommst." },
      { spanish: "Es importante que descanséis.", translation: "Es ist wichtig, dass ihr euch ausruht." },
    ],
    commonMistakes: ["Nach creo que steht normalerweise Indikativ; nach no creo que meist Subjuntivo.", "Wenn beide Satzteile dasselbe Subjekt haben, steht oft der Infinitiv: Quiero salir."],
    quickCheck: { prompt: "Espero que tú ___ tiempo. (tener)", answer: "tengas" },
    match: /\b(?:presente de subjuntivo|subjuntiv|subjuntivo presente)\b/i,
  },
  {
    key: "imperativo",
    title: "Imperativo",
    summary: "Órdenes, instrucciones, consejos y peticiones directas.",
    definition: "Der Imperativ wird für Aufforderungen, Anweisungen, direkte Bitten und Ratschläge verwendet.",
    useCases: ["Direkte Aufforderung oder Anleitung.", "Ratschlag.", "Verbot mit no + presente de subjuntivo."],
    formation: "Bejahte tú-Form meist wie él/ella im Präsens: habla, come, vive. Verneint: no hables, no comas, no vivas. Häufig unregelmäßig: di, haz, ve, pon, sal, sé, ten, ven.",
    examples: [
      { spanish: "Cierra la puerta, por favor.", translation: "Schließ bitte die Tür." },
      { spanish: "No lleguéis tarde.", translation: "Kommt nicht zu spät." },
    ],
    commonMistakes: ["Pronomen werden beim bejahten Imperativ angehängt: dímelo; beim verneinten stehen sie davor: no me lo digas.", "Der verneinte tú-Imperativ ist nicht die Infinitivform."],
    quickCheck: { prompt: "Di a un amigo que no hablar tan rápido.", answer: "No hables tan rápido." },
    match: /\b(?:imperativo|imperativ)\b/i,
  },
  {
    key: "verbos-como-gustar",
    title: "Verbos como gustar",
    summary: "La cosa gustada es el sujeto; la persona aparece como objeto indirecto.",
    definition: "Bei gustar-ähnlichen Verben ist die Sache, die gefällt, grammatisch das Subjekt. Die Person wird mit me, te, le, nos, os oder les ausgedrückt.",
    useCases: ["gustar, encantar, interesar, molestar, faltar.", "Singular oder Infinitiv → gusta; Plural → gustan.", "A + Person kann betonen oder klären."],
    formation: "(A + Person) + indirektes Pronomen + Verb + Subjekt: A Marta le gusta bailar. A Marta le gustan los museos.",
    examples: [
      { spanish: "Me gusta aprender idiomas.", translation: "Ich lerne gern Sprachen." },
      { spanish: "A mis padres les encantan los viajes.", translation: "Meine Eltern lieben Reisen." },
    ],
    commonMistakes: ["Nicht yo gusto für ‘mir gefällt’; richtig ist me gusta.", "Das Verb richtet sich nach der Sache: me gustan las películas."],
    quickCheck: { prompt: "A Laura ___ los libros históricos. (encantar)", answer: "le encantan" },
    match: /\b(?:verbos? como gustar|gustar.{0,30}(?:encantar|interesar)|gustar-ahnlich)\b/i,
  },
  {
    key: "ir-vs-venir",
    title: "Ir vs. venir",
    summary: "El movimiento se describe desde el lugar de quien habla o escucha.",
    definition: "Ir bedeutet Bewegung weg vom aktuellen Bezugspunkt; venir bedeutet Bewegung hin zum Ort der sprechenden oder angesprochenen Person.",
    useCases: ["Ir: Die Bewegung führt zu einem anderen Ort.", "Venir: Die Bewegung führt hierher oder zum Ort der angesprochenen Person.", "Der gewählte Bezugspunkt kann sich im Gespräch ändern."],
    formation: "Presente: voy, vas, va, vamos, vais, van; vengo, vienes, viene, venimos, venís, vienen. Frage dich vor der Wahl: Bewegt sich die Person hierher oder dorthin?",
    examples: [
      { spanish: "Voy a tu casa a las ocho.", translation: "Ich gehe um acht zu dir nach Hause." },
      { spanish: "Perfecto, ¿vienes con Ana?", translation: "Perfekt, kommst du mit Ana her?" },
    ],
    commonMistakes: ["Deutsch ‘kommen’ wird nicht automatisch mit venir übersetzt; der räumliche Bezugspunkt entscheidet.", "Voy und vengo sind unregelmäßige yo-Formen."],
    quickCheck: { prompt: "Estoy en casa y pregunto a Marta: ‘¿___ a cenar?’", answer: "Vienes" },
    match: /\bir\b.{0,30}\bvenir\b|\bvenir\b.{0,30}\bir\b/i,
  },
  {
    key: "comparativos",
    title: "Comparativos",
    summary: "Compara cualidades y cantidades con más, menos y tan.",
    definition: "Komparative vergleichen Eigenschaften oder Mengen; der zweite Vergleichspunkt wird meist mit que angeschlossen.",
    useCases: ["Überlegenheit: más... que.", "Unterlegenheit: menos... que.", "Gleichheit: tan... como oder tanto/a/os/as... como."],
    formation: "más/menos + Adjektiv oder Adverb + que; tan + Adjektiv/Adverb + como; tanto passt sich vor Nomen an. Unregelmäßig: mejor, peor, mayor, menor.",
    examples: [
      { spanish: "Madrid es más grande que Valencia.", translation: "Madrid ist größer als Valencia." },
      { spanish: "Ana tiene tantos libros como Luis.", translation: "Ana hat genauso viele Bücher wie Luis." },
    ],
    commonMistakes: ["Nach einer Zahl steht de: más de veinte personas.", "Nicht más mejor; mejor ist bereits die Vergleichsform."],
    quickCheck: { prompt: "Este ejercicio es ___ difícil como el anterior.", answer: "tan" },
    match: /\b(?:comparativ|comparaciones|mas.{0,20}que|tan.{0,20}como)\b/i,
  },
];

function normalizedTopicSource(source: GrammarTopicSource) {
  return [source.spanish, source.translation, source.explanation]
    .filter(Boolean)
    .join(" · ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

export function matchGrammarTopic(source: GrammarTopicSource) {
  const searchable = normalizedTopicSource(source);
  return GRAMMAR_TOPIC_DEFINITIONS.find((topic) => topic.match.test(searchable)) ?? null;
}

export function inferTopicComponentRole(source: GrammarTopicSource): TopicComponentRole {
  const searchable = normalizedTopicSource(source);
  if (/\b(?:vs|diferenc|contraste|unterschied)\b/i.test(searchable)) return "contrast";
  if (/\b(?:irregular|excepcion|ausnahme)\b/i.test(searchable)) return "exception";
  if (/\b(?:conjug(?:acion)?|terminacion(?:es)?|endung(?:en)?|formacion|bildung|raiz|stamm)\b/i.test(searchable)) return "formation";
  if (/\b(?:uso|usos|cuando se usa|verwendung|gebrauch|wann)\b/i.test(searchable)) return "use";
  if (/\b(?:ejemplo|beispiel)\b/i.test(searchable) || /[.…?¿!¡]$/.test(source.spanish.trim())) return "example";
  return "concept";
}

export function topicIsReady(topic: GrammarTopicDefinition) {
  return topic.definition.length >= 40
    && (topic.useCases.length >= 2 || topic.formation.length >= 40)
    && topic.examples.length >= 2
    && Boolean(topic.quickCheck.prompt && topic.quickCheck.answer);
}
