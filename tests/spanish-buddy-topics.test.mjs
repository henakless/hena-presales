import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAMMAR_TOPIC_DEFINITIONS,
  matchGrammarTopic,
  topicIsReady,
} from "../lib/spanish-buddy-topics.ts";

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

test("publishes only complete refresher topics", () => {
  assert.ok(GRAMMAR_TOPIC_DEFINITIONS.length >= 10);
  assert.equal(new Set(GRAMMAR_TOPIC_DEFINITIONS.map((topic) => topic.key)).size, GRAMMAR_TOPIC_DEFINITIONS.length);
  for (const topic of GRAMMAR_TOPIC_DEFINITIONS) {
    assert.equal(topicIsReady(topic), true, `${topic.title} must pass the publication gate`);
    assert.ok(topic.examples.length >= 2, `${topic.title} needs examples`);
    assert.ok(topic.quickCheck.prompt && topic.quickCheck.answer, `${topic.title} needs a quick check`);
  }
});
