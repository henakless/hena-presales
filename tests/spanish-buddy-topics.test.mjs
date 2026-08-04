import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAMMAR_TOPIC_DEFINITIONS,
  inferTopicComponentRole,
  matchGrammarTopic,
  topicIsReady,
} from "../lib/spanish-buddy-topics.ts";
import { SPANISH_GRAMMAR_CURRICULUM } from "../lib/spanish-buddy-curriculum.ts";

const grammar = (spanish, explanation = "", translation = "") => ({ spanish, explanation, translation });

test("groups object-pronoun fragments into one coherent refresher", () => {
  const fragments = [
    grammar("Dos pronombres de objeto"),
    grammar("Objeto indirecto", "le/les cambia a se delante de lo/la/los/las"),
    grammar("se + lo/la/los/las"),
  ];
  assert.deepEqual(fragments.map((fragment) => matchGrammarTopic(fragment)?.key), [
    "pronombres-de-objeto",
    "pronombres-de-objeto",
    "pronombres-de-objeto",
  ]);
});

test("recognizes standalone grammar concepts and prioritizes contrasts", () => {
  assert.equal(matchGrammarTopic(grammar("Condicional"))?.key, "condicional");
  assert.equal(matchGrammarTopic(grammar("Pretérito indefinido"))?.key, "preterito-indefinido");
  assert.equal(matchGrammarTopic(grammar("Indefinido e imperfecto"))?.key, "indefinido-vs-imperfecto");
  assert.equal(matchGrammarTopic(grammar("Terminación -aron")), null);
});

test("assigns grammar fragments a role inside their parent topic", () => {
  assert.equal(inferTopicComponentRole(grammar("Terminaciones", "Die Endungen sind -é, -aste, -ó")), "formation");
  assert.equal(inferTopicComponentRole(grammar("Excepción", "Raíz irregular tuv-")), "exception");
  assert.equal(inferTopicComponentRole(grammar("Indefinido vs. imperfecto")), "contrast");
});

test("publishes only complete refresher topics", () => {
  assert.ok(GRAMMAR_TOPIC_DEFINITIONS.length >= 10);
  assert.equal(new Set(GRAMMAR_TOPIC_DEFINITIONS.map((topic) => topic.key)).size, GRAMMAR_TOPIC_DEFINITIONS.length);
  for (const topic of GRAMMAR_TOPIC_DEFINITIONS) {
    assert.equal(topicIsReady(topic), true, `${topic.title} must pass the publication gate`);
    assert.ok(topic.examples.length >= 2, `${topic.title} needs examples`);
    assert.ok(topic.quickCheck.prompt && topic.quickCheck.answer, `${topic.title} needs a quick check`);
  }
});

test("assigns every refresher a CEFR curriculum position and valid prerequisites", () => {
  const byKey = new Map(GRAMMAR_TOPIC_DEFINITIONS.map((topic) => [topic.key, topic]));
  const validLevels = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

  for (const topic of GRAMMAR_TOPIC_DEFINITIONS) {
    assert.ok(validLevels.has(topic.cefrLevel), `${topic.title} needs a valid CEFR level`);
    assert.ok(topic.curriculumOrder > 0, `${topic.title} needs a curriculum order`);
    assert.ok(topic.levelRationale.length >= 20, `${topic.title} needs a level rationale`);
    for (const prerequisiteKey of topic.prerequisiteKeys) {
      const prerequisite = byKey.get(prerequisiteKey);
      assert.ok(prerequisite, `${topic.title} references unknown prerequisite ${prerequisiteKey}`);
      assert.ok(prerequisite.curriculumOrder < topic.curriculumOrder, `${prerequisite.title} must come before ${topic.title}`);
    }
  }

  assert.equal(byKey.get("preterito-indefinido")?.cefrLevel, "A2");
  assert.equal(byKey.get("indefinido-vs-imperfecto")?.cefrLevel, "B1");
  assert.equal(byKey.get("presente-de-subjuntivo")?.cefrLevel, "B1");
});

test("curriculum covers every CEFR level with a unique ordered topic tree", () => {
  const byKey = new Map(SPANISH_GRAMMAR_CURRICULUM.map((topic) => [topic.key, topic]));
  assert.equal(byKey.size, SPANISH_GRAMMAR_CURRICULUM.length);
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    assert.ok(SPANISH_GRAMMAR_CURRICULUM.filter((topic) => topic.cefrLevel === level).length >= 8, `${level} needs a useful topic group`);
  }
  for (const topic of SPANISH_GRAMMAR_CURRICULUM) {
    for (const prerequisiteKey of topic.prerequisiteKeys) {
      const prerequisite = byKey.get(prerequisiteKey);
      assert.ok(prerequisite, `${topic.title} references unknown prerequisite ${prerequisiteKey}`);
      assert.ok(prerequisite.curriculumOrder < topic.curriculumOrder, `${prerequisite.title} must come before ${topic.title}`);
    }
  }
  for (const miniLesson of GRAMMAR_TOPIC_DEFINITIONS) assert.ok(byKey.has(miniLesson.key));
});
