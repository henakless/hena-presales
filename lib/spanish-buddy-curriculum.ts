import { GRAMMAR_TOPIC_DEFINITIONS, type CEFRLevel } from "./spanish-buddy-topics.ts";

export type CurriculumTopicNode = {
  key: string;
  title: string;
  summary: string;
  cefrLevel: CEFRLevel;
  curriculumOrder: number;
  prerequisiteKeys: string[];
};

const ADDITIONAL_CURRICULUM_TOPICS: CurriculumTopicNode[] = [
  { key: "genero-y-numero", title: "Género y número", summary: "Concordancia básica de sustantivos, artículos y adjetivos.", cefrLevel: "A1", curriculumOrder: 4, prerequisiteKeys: [] },
  { key: "articulos-basicos", title: "Artículos", summary: "El, la, los, las, un y una en referentes conocidos y nuevos.", cefrLevel: "A1", curriculumOrder: 8, prerequisiteKeys: ["genero-y-numero"] },
  { key: "presente-regular", title: "Presente regular", summary: "Conjugación y usos básicos de verbos en -ar, -er e -ir.", cefrLevel: "A1", curriculumOrder: 12, prerequisiteKeys: [] },
  { key: "presente-irregular", title: "Presente irregular", summary: "Formas frecuentes como tengo, hago, puedo, quiero y sé.", cefrLevel: "A1", curriculumOrder: 16, prerequisiteKeys: ["presente-regular"] },
  { key: "ser-estar-hay-basico", title: "Ser, estar y hay", summary: "Identificar, describir, localizar y expresar existencia.", cefrLevel: "A1", curriculumOrder: 24, prerequisiteKeys: ["presente-regular"] },
  { key: "posesivos-y-demostrativos", title: "Posesivos y demostrativos", summary: "Mi, tu, este, ese y aquel para señalar pertenencia y distancia.", cefrLevel: "A1", curriculumOrder: 34, prerequisiteKeys: ["genero-y-numero"] },
  { key: "preguntas-basicas", title: "Preguntas básicas", summary: "Qué, quién, dónde, cuándo, cómo y cuánto.", cefrLevel: "A1", curriculumOrder: 38, prerequisiteKeys: [] },
  { key: "negacion-basica", title: "Negación básica", summary: "No, tampoco, nada y nadie en enunciados sencillos.", cefrLevel: "A1", curriculumOrder: 42, prerequisiteKeys: [] },
  { key: "preposiciones-lugar-tiempo", title: "Lugar y tiempo", summary: "Preposiciones y expresiones para situarse y organizar el día.", cefrLevel: "A1", curriculumOrder: 46, prerequisiteKeys: [] },

  { key: "cuantificadores", title: "Cuantificadores", summary: "Mucho, poco, bastante, demasiado y sus concordancias.", cefrLevel: "A2", curriculumOrder: 104, prerequisiteKeys: ["genero-y-numero"] },
  { key: "estar-gerundio", title: "Estar + gerundio", summary: "Acciones en desarrollo y contraste con el presente habitual.", cefrLevel: "A2", curriculumOrder: 114, prerequisiteKeys: ["presente-regular"] },
  { key: "pronombres-indefinidos", title: "Indefinidos", summary: "Algo, alguien, alguno, ninguno, nada y nadie.", cefrLevel: "A2", curriculumOrder: 124, prerequisiteKeys: ["negacion-basica"] },
  { key: "pronombres-objeto-basicos", title: "Objeto directo e indirecto", summary: "Introducción a lo, la, los, las, le y les.", cefrLevel: "A2", curriculumOrder: 134, prerequisiteKeys: ["presente-regular"] },
  { key: "imperativo-afirmativo", title: "Imperativo afirmativo", summary: "Instrucciones, consejos y peticiones sencillas.", cefrLevel: "A2", curriculumOrder: 154, prerequisiteKeys: ["presente-irregular"] },
  { key: "ir-a-infinitivo", title: "Ir a + infinitivo", summary: "Planes e intenciones próximas.", cefrLevel: "A2", curriculumOrder: 164, prerequisiteKeys: ["ir-vs-venir"] },
  { key: "obligacion-y-necesidad", title: "Obligación y necesidad", summary: "Tener que, hay que, deber y necesitar.", cefrLevel: "A2", curriculumOrder: 174, prerequisiteKeys: ["presente-irregular"] },
  { key: "relativos-basicos", title: "Relativos básicos", summary: "Que y donde para unir información sobre personas, cosas y lugares.", cefrLevel: "A2", curriculumOrder: 184, prerequisiteKeys: [] },
  { key: "adverbios-frecuencia-modo", title: "Frecuencia y modo", summary: "Adverbios para precisar cuándo y cómo ocurre una acción.", cefrLevel: "A2", curriculumOrder: 194, prerequisiteKeys: [] },

  { key: "conectores-narrativos", title: "Conectores narrativos", summary: "Primero, después, entonces, mientras y al final.", cefrLevel: "B1", curriculumOrder: 204, prerequisiteKeys: ["preterito-indefinido", "preterito-imperfecto"] },
  { key: "perfecto-vs-indefinido", title: "Perfecto vs. indefinido", summary: "Pasado conectado con el presente frente a periodo terminado.", cefrLevel: "B1", curriculumOrder: 214, prerequisiteKeys: ["preterito-perfecto", "preterito-indefinido"] },
  { key: "se-impersonal-pasiva", title: "Se impersonal y pasiva refleja", summary: "Generalizar acciones y ocultar el agente.", cefrLevel: "B1", curriculumOrder: 224, prerequisiteKeys: ["pronombres-reflexivos"] },
  { key: "relativos-intermedios", title: "Pronombres relativos", summary: "Quien, el que, lo que y cuyo en oraciones relativas.", cefrLevel: "B1", curriculumOrder: 234, prerequisiteKeys: ["relativos-basicos"] },
  { key: "estilo-indirecto-basico", title: "Estilo indirecto", summary: "Transmitir palabras, preguntas y peticiones de otras personas.", cefrLevel: "B1", curriculumOrder: 244, prerequisiteKeys: ["preterito-imperfecto"] },
  { key: "condicionales-reales", title: "Condicionales reales", summary: "Si + indicativo para condiciones posibles y habituales.", cefrLevel: "B1", curriculumOrder: 254, prerequisiteKeys: ["futuro-simple"] },
  { key: "voz-pasiva", title: "Voz pasiva", summary: "Ser + participio y alternativas naturales con se.", cefrLevel: "B1", curriculumOrder: 264, prerequisiteKeys: ["ser-vs-estar"] },
  { key: "verbos-con-preposicion", title: "Verbos con preposición", summary: "Régimen frecuente: depender de, pensar en, soñar con y otros.", cefrLevel: "B1", curriculumOrder: 274, prerequisiteKeys: [] },
  { key: "conectores-causa-consecuencia", title: "Causa y consecuencia", summary: "Porque, como, por eso, así que y de modo que.", cefrLevel: "B1", curriculumOrder: 284, prerequisiteKeys: [] },

  { key: "imperfecto-de-subjuntivo", title: "Imperfecto de subjuntivo", summary: "Formas en -ra/-se y subordinación en coordenadas de pasado.", cefrLevel: "B2", curriculumOrder: 304, prerequisiteKeys: ["presente-de-subjuntivo"] },
  { key: "perfecto-de-subjuntivo", title: "Pretérito perfecto de subjuntivo", summary: "Valoración o duda sobre acciones pasadas vinculadas al presente.", cefrLevel: "B2", curriculumOrder: 314, prerequisiteKeys: ["presente-de-subjuntivo", "preterito-perfecto"] },
  { key: "pluscuamperfecto", title: "Pretérito pluscuamperfecto", summary: "Acciones anteriores a otro momento del pasado.", cefrLevel: "B2", curriculumOrder: 324, prerequisiteKeys: ["preterito-perfecto", "preterito-imperfecto"] },
  { key: "condicionales-hipoteticas", title: "Condicionales hipotéticas", summary: "Si + imperfecto de subjuntivo con condicional.", cefrLevel: "B2", curriculumOrder: 334, prerequisiteKeys: ["condicional", "imperfecto-de-subjuntivo"] },
  { key: "estilo-indirecto-avanzado", title: "Estilo indirecto avanzado", summary: "Cambios de tiempos, pronombres y referencias temporales.", cefrLevel: "B2", curriculumOrder: 344, prerequisiteKeys: ["estilo-indirecto-basico"] },
  { key: "relativos-con-preposicion", title: "Relativos con preposición", summary: "El cual, quien y el que tras preposición.", cefrLevel: "B2", curriculumOrder: 354, prerequisiteKeys: ["relativos-intermedios"] },
  { key: "pasiva-y-se-avanzado", title: "Pasiva y valores de se", summary: "Diferencias entre pasiva, impersonal, media y accidental.", cefrLevel: "B2", curriculumOrder: 364, prerequisiteKeys: ["se-impersonal-pasiva", "voz-pasiva"] },
  { key: "perifrasis-modales-aspectuales", title: "Perífrasis verbales", summary: "Matices de obligación, posibilidad, inicio, duración y finalización.", cefrLevel: "B2", curriculumOrder: 374, prerequisiteKeys: ["obligacion-y-necesidad"] },
  { key: "concesion-y-contraste", title: "Concesión y contraste", summary: "Aunque, a pesar de, sin embargo y construcciones equivalentes.", cefrLevel: "B2", curriculumOrder: 384, prerequisiteKeys: ["presente-de-subjuntivo"] },
  { key: "futuro-y-condicional-perfectos", title: "Futuro y condicional perfectos", summary: "Anterioridad, probabilidad y conjetura en distintos tiempos.", cefrLevel: "B2", curriculumOrder: 394, prerequisiteKeys: ["futuro-simple", "condicional", "preterito-perfecto"] },

  { key: "perspectiva-temporal", title: "Perspectiva temporal y aspecto", summary: "Elegir tiempos según foco, resultado, duración y relevancia discursiva.", cefrLevel: "C1", curriculumOrder: 504, prerequisiteKeys: ["pluscuamperfecto", "futuro-y-condicional-perfectos"] },
  { key: "alternancias-subjuntivo-indicativo", title: "Alternancias de modo", summary: "Cambios de significado entre indicativo y subjuntivo.", cefrLevel: "C1", curriculumOrder: 514, prerequisiteKeys: ["imperfecto-de-subjuntivo", "perfecto-de-subjuntivo"] },
  { key: "subordinacion-compleja", title: "Subordinación compleja", summary: "Condición, concesión, finalidad, causa y consecuencia con matices.", cefrLevel: "C1", curriculumOrder: 524, prerequisiteKeys: ["condicionales-hipoteticas", "concesion-y-contraste"] },
  { key: "nominalizacion", title: "Nominalización", summary: "Condensar información y construir un estilo formal y académico.", cefrLevel: "C1", curriculumOrder: 534, prerequisiteKeys: [] },
  { key: "foco-y-orden", title: "Foco y orden de palabras", summary: "Destacar información mediante posición, repetición y entonación.", cefrLevel: "C1", curriculumOrder: 544, prerequisiteKeys: [] },
  { key: "estructuras-enfaticas", title: "Estructuras enfáticas", summary: "Construcciones escindidas y recursos para presentar contraste.", cefrLevel: "C1", curriculumOrder: 554, prerequisiteKeys: ["foco-y-orden"] },
  { key: "marcadores-discursivos-formales", title: "Marcadores discursivos formales", summary: "Organizar argumentos, reformular y establecer relaciones lógicas.", cefrLevel: "C1", curriculumOrder: 564, prerequisiteKeys: ["conectores-causa-consecuencia", "concesion-y-contraste"] },
  { key: "atenuacion-y-cortesia", title: "Atenuación y cortesía", summary: "Graduar peticiones, desacuerdos y valoraciones según el contexto.", cefrLevel: "C1", curriculumOrder: 574, prerequisiteKeys: ["condicional"] },
  { key: "construcciones-idiomaticas", title: "Construcciones idiomáticas", summary: "Patrones verbales y expresivos de alta frecuencia con significado no literal.", cefrLevel: "C1", curriculumOrder: 584, prerequisiteKeys: ["verbos-con-preposicion"] },

  { key: "matices-aspectuales", title: "Matices aspectuales", summary: "Interpretar y producir diferencias sutiles de inicio, límite y resultado.", cefrLevel: "C2", curriculumOrder: 604, prerequisiteKeys: ["perspectiva-temporal"] },
  { key: "modo-y-distancia", title: "Modo y distancia discursiva", summary: "Usar el modo verbal para adhesión, reserva, eco e ironía.", cefrLevel: "C2", curriculumOrder: 614, prerequisiteKeys: ["alternancias-subjuntivo-indicativo"] },
  { key: "sintaxis-de-alta-complejidad", title: "Sintaxis de alta complejidad", summary: "Integrar varias relaciones subordinadas sin perder claridad.", cefrLevel: "C2", curriculumOrder: 624, prerequisiteKeys: ["subordinacion-compleja"] },
  { key: "pragmatica-ironia-mitigacion", title: "Ironía, énfasis y mitigación", summary: "Interpretar intención implícita y ajustar el impacto interpersonal.", cefrLevel: "C2", curriculumOrder: 634, prerequisiteKeys: ["atenuacion-y-cortesia"] },
  { key: "cohesion-elipsis-referencia", title: "Cohesión, elipsis y referencia", summary: "Mantener textos densos mediante sustitución, omisión y cadenas referenciales.", cefrLevel: "C2", curriculumOrder: 644, prerequisiteKeys: ["marcadores-discursivos-formales"] },
  { key: "fraseologia-avanzada", title: "Fraseología avanzada", summary: "Locuciones, colocaciones y fórmulas idiomáticas según género y situación.", cefrLevel: "C2", curriculumOrder: 654, prerequisiteKeys: ["construcciones-idiomaticas"] },
  { key: "cambio-de-registro", title: "Cambio de registro", summary: "Alternar con precisión entre estilos coloquiales, formales y especializados.", cefrLevel: "C2", curriculumOrder: 664, prerequisiteKeys: ["nominalizacion", "atenuacion-y-cortesia"] },
  { key: "variacion-del-espanol", title: "Variación del español", summary: "Reconocer y manejar rasgos peninsulares y de otras variedades sin confusión.", cefrLevel: "C2", curriculumOrder: 674, prerequisiteKeys: ["cambio-de-registro"] },
  { key: "estilo-y-generos-discursivos", title: "Estilo y géneros discursivos", summary: "Adaptar gramática, cohesión y voz a textos complejos de distintos géneros.", cefrLevel: "C2", curriculumOrder: 684, prerequisiteKeys: ["cohesion-elipsis-referencia", "cambio-de-registro"] },
];

const MINI_LESSON_CURRICULUM: CurriculumTopicNode[] = GRAMMAR_TOPIC_DEFINITIONS.map((topic) => ({
  key: topic.key,
  title: topic.title,
  summary: topic.summary,
  cefrLevel: topic.cefrLevel,
  curriculumOrder: topic.curriculumOrder,
  prerequisiteKeys: topic.prerequisiteKeys,
}));

export const SPANISH_GRAMMAR_CURRICULUM: CurriculumTopicNode[] = [
  ...MINI_LESSON_CURRICULUM,
  ...ADDITIONAL_CURRICULUM_TOPICS,
].sort((left, right) => left.curriculumOrder - right.curriculumOrder);
