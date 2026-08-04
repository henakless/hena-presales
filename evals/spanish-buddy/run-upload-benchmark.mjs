import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

const DEFAULT_COUNTS = [1, 2, 4, 6];
const MAX_IMAGES = 6;
const TARGET_SOURCE_BYTES = 3.5 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

export function parseCounts(raw = DEFAULT_COUNTS.join(",")) {
  const counts = [...new Set(raw.split(",").map(Number))]
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= MAX_IMAGES)
    .sort((a, b) => a - b);
  if (!counts.length) throw new Error(`--counts must contain values from 1 to ${MAX_IMAGES}.`);
  return counts;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function formatDuration(milliseconds) {
  if (milliseconds == null) return "—";
  return milliseconds >= 1_000 ? `${(milliseconds / 1_000).toFixed(1)} s` : `${Math.round(milliseconds)} ms`;
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function writeReport(report, outputPath) {
  const resolved = path.resolve(outputPath);
  const markdownPath = resolved.replace(/\.json$/i, "") + ".md";
  const scenarioRows = report.scenarios.map((scenario) => [
    scenario.imageCount,
    scenario.success ? "pass" : report.dryRun ? "not run" : "fail",
    formatDuration(scenario.totalUserFlowMs),
    formatDuration(scenario.extractionMs),
    scenario.pages.filter((page) => page.success).length,
    scenario.failure ?? "",
  ]);
  const pageRows = report.scenarios.flatMap((scenario) => scenario.pages.map((page) => [
    scenario.imageCount,
    page.page,
    page.success ? "pass" : report.dryRun ? "not run" : "fail",
    formatDuration(page.durationMs),
    page.status ?? "—",
    page.itemCount ?? "—",
    page.error ?? "",
  ]));
  const table = (headings, rows) => [
    `| ${headings.join(" | ")} |`,
    `| ${headings.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
  const markdown = `# SpanishBuddy upload benchmark

Generated: ${report.generatedAt}

- Target: ${report.baseUrl ?? "preparation-only dry run"}
- Source: ${report.fixtureSource}
- Highest successful image count: ${report.summary.highestSuccessfulImageCount ?? "not measured"}
- Successful scenarios: ${report.summary.successfulScenarios}/${report.scenarios.length}
- Median page extraction: ${formatDuration(report.summary.pageDurationMs.p50)}
- P95 page extraction: ${formatDuration(report.summary.pageDurationMs.p95)}

## Scenarios

${table(["Images", "Result", "End-to-end", "Extraction", "Pages completed", "Failure"], scenarioRows)}

## Page timings

${table(["Scenario", "Page", "Result", "Duration", "HTTP", "Items", "Error"], pageRows)}
`;
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await Promise.all([
    fs.writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(markdownPath, markdown),
  ]);
  return { json: resolved, markdown: markdownPath };
}

function noteSvg(pageNumber) {
  const lines = [
    `Página ${pageNumber} · Español A2-B1`,
    "la amistad — die Freundschaft",
    "alojarse en — übernachten in",
    "¿Te apetece venir a cenar?",
    "Gracias por la invitación.",
    "Me gustaría ir, pero no puedo.",
    "El condicional: podría, haría, tendría",
  ];
  return Buffer.from(`<svg width="3024" height="4032" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="none"/>
    ${lines.map((line, index) => `<text x="260" y="${520 + index * 390}" font-family="Arial" font-size="112" fill="#20221d">${line}</text>`).join("\n")}
  </svg>`);
}

async function generateFixture(directory, pageNumber) {
  const output = path.join(directory, `spanish-notes-${pageNumber}.jpg`);
  let best = null;
  for (const quality of [72, 78, 84, 86, 88, 90, 94]) {
    const buffer = await sharp({
      create: {
        width: 3024,
        height: 4032,
        channels: 3,
        background: { r: 241, g: 238, b: 225 },
        noise: { type: "gaussian", mean: 238, sigma: 13 },
      },
    }).composite([{ input: noteSvg(pageNumber), blend: "over" }]).jpeg({ quality, chromaSubsampling: "4:2:0" }).toBuffer();
    if (!best || Math.abs(buffer.length - TARGET_SOURCE_BYTES) < Math.abs(best.length - TARGET_SOURCE_BYTES)) best = buffer;
  }
  await fs.writeFile(output, best);
  return output;
}

async function collectImagePaths(imageDirectory, required) {
  if (!imageDirectory) return null;
  const directory = path.resolve(imageDirectory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLocaleLowerCase()))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b));
  if (files.length < required) throw new Error(`${directory} contains ${files.length} supported images; ${required} are required.`);
  return files.slice(0, required);
}

async function prepareImage(inputPath, index) {
  const source = await fs.readFile(inputPath);
  const started = performance.now();
  const compressed = await sharp(source)
    .rotate()
    .resize({ width: 2_000, height: 2_000, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#fff" })
    .jpeg({ quality: 84, chromaSubsampling: "4:2:0" })
    .toBuffer();
  return {
    index,
    name: `page-${index}.jpg`,
    sourceBytes: source.length,
    preparedBytes: compressed.length < source.length ? compressed.length : source.length,
    preparationMs: round(performance.now() - started),
    data: compressed.length < source.length ? compressed : source,
  };
}

function cookieFrom(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function extractPage({ endpoint, page, scenarioCount, cookie, fetchImpl }) {
  const form = new FormData();
  form.set("title", `Upload eval · ${scenarioCount} páginas`);
  form.set("note", "");
  form.append("images", new Blob([page.data], { type: "image/jpeg" }), page.name);
  const started = performance.now();
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : undefined,
      body: form,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : {};
    return {
      success: response.ok && Boolean(body.extraction),
      status: response.status,
      durationMs: round(performance.now() - started),
      itemCount: body.extraction?.items?.length ?? null,
      sourceDeleted: body.sourceDeleted === true,
      error: response.ok ? null : body.error ?? `Non-JSON HTTP ${response.status}`,
      cookie: cookie || cookieFrom(response),
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      durationMs: round(performance.now() - started),
      itemCount: null,
      sourceDeleted: false,
      error: error instanceof Error ? error.message : String(error),
      cookie,
    };
  }
}

export function summarizeScenarios(scenarios, dryRun = false) {
  const completedDurations = scenarios.flatMap((scenario) => scenario.pages.filter((page) => page.success).map((page) => page.durationMs));
  const successful = dryRun ? [] : scenarios.filter((scenario) => scenario.success);
  return {
    successfulScenarios: successful.length,
    highestSuccessfulImageCount: successful.length ? Math.max(...successful.map((scenario) => scenario.imageCount)) : null,
    pageDurationMs: {
      p50: percentile(completedDurations, 0.5),
      p95: percentile(completedDurations, 0.95),
      max: completedDurations.length ? Math.max(...completedDurations) : null,
    },
  };
}

export async function runUploadBenchmark(options) {
  const maxCount = Math.max(...options.counts);
  const temporaryDirectory = options.imageDirectory ? null : await fs.mkdtemp(path.join(os.tmpdir(), "spanishbuddy-upload-eval-"));
  try {
    const imagePaths = await collectImagePaths(options.imageDirectory, maxCount)
      ?? await Promise.all(Array.from({ length: maxCount }, (_, index) => generateFixture(temporaryDirectory, index + 1)));
    const prepared = [];
    for (let index = 0; index < imagePaths.length; index += 1) {
      process.stderr.write(`Preparing fixture ${index + 1}/${imagePaths.length}\n`);
      prepared.push(await prepareImage(imagePaths[index], index + 1));
    }

    const endpoint = options.baseUrl ? `${options.baseUrl.replace(/\/$/, "")}/api/extract` : null;
    const scenarios = [];
    for (let scenarioIndex = 0; scenarioIndex < options.counts.length; scenarioIndex += 1) {
      const imageCount = options.counts[scenarioIndex];
      const selected = prepared.slice(0, imageCount);
      const pages = [];
      let cookie = "";
      const extractionStarted = performance.now();
      if (!options.dryRun) {
        for (const page of selected) {
          process.stderr.write(`Uploading ${imageCount}-image scenario, page ${page.index}/${imageCount}\n`);
          let result = await extractPage({ endpoint, page, scenarioCount: imageCount, cookie, fetchImpl: options.fetchImpl ?? fetch });
          let attempts = 1;
          if (!result.success && result.status >= 500) {
            result = await extractPage({ endpoint, page, scenarioCount: imageCount, cookie: result.cookie, fetchImpl: options.fetchImpl ?? fetch });
            attempts += 1;
          }
          cookie = result.cookie;
          pages.push({ page: page.index, ...result, attempts, cookie: undefined });
          if (!result.success) break;
        }
      } else {
        pages.push(...selected.map((page) => ({ page: page.index, success: false, status: null, durationMs: null, itemCount: null, sourceDeleted: null, error: null })));
      }
      const extractionMs = options.dryRun ? null : round(performance.now() - extractionStarted);
      const preparationMs = round(selected.reduce((total, page) => total + page.preparationMs, 0));
      const success = !options.dryRun && pages.length === imageCount && pages.every((page) => page.success && page.sourceDeleted);
      scenarios.push({
        imageCount,
        success,
        preparationMs,
        extractionMs,
        totalUserFlowMs: extractionMs == null ? preparationMs : round(preparationMs + extractionMs),
        sourceBytes: selected.reduce((total, page) => total + page.sourceBytes, 0),
        preparedBytes: selected.reduce((total, page) => total + page.preparedBytes, 0),
        failure: success || options.dryRun ? null : pages.find((page) => !page.success)?.error ?? "Not every source was confirmed deleted.",
        pages,
      });
      if (options.pauseMs && scenarioIndex < options.counts.length - 1) await new Promise((resolve) => setTimeout(resolve, options.pauseMs));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      dryRun: options.dryRun,
      baseUrl: options.baseUrl ?? null,
      fixtureSource: options.imageDirectory ? path.resolve(options.imageDirectory) : "synthetic 3024×4032 Spanish note photos targeting 3.5 MB each",
      counts: options.counts,
      sourceImages: prepared.map((page) => ({
        index: page.index,
        name: page.name,
        sourceBytes: page.sourceBytes,
        preparedBytes: page.preparedBytes,
        preparationMs: page.preparationMs,
      })),
      scenarios,
      summary: summarizeScenarios(scenarios, options.dryRun),
    };
    const outputs = await writeReport(report, options.outputPath);
    return { report, outputs };
  } finally {
    if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const baseUrl = valueAfter(args, "--base-url");
  if (live && !baseUrl) throw new Error("--base-url is required with --live (for example https://henakless.com/spanishbuddy).");
  const counts = parseCounts(valueAfter(args, "--counts") ?? undefined);
  const repetitions = Math.max(1, Math.min(5, Number(valueAfter(args, "--repetitions") ?? 1)));
  const expandedCounts = Array.from({ length: repetitions }, () => counts).flat();
  const outputPath = valueAfter(args, "--output") ?? "evals/spanish-buddy/upload-benchmark-report.json";
  const { report, outputs } = await runUploadBenchmark({
    baseUrl,
    counts: expandedCounts,
    dryRun: !live,
    imageDirectory: valueAfter(args, "--image-dir"),
    outputPath,
    pauseMs: Math.max(0, Number(valueAfter(args, "--pause-ms") ?? 1_500)),
  });
  process.stdout.write(`${JSON.stringify({ outputs, summary: report.summary }, null, 2)}\n`);
  if (live && report.summary.highestSuccessfulImageCount < Math.max(...counts)) process.exitCode = 1;
}
