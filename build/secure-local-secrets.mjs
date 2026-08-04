import { chmod, readFile, writeFile } from "node:fs/promises";

const generatedSecrets = new URL("../dist/server/.dev.vars", import.meta.url);
const generatedWorkerConfig = new URL("../dist/server/wrangler.json", import.meta.url);

// The current Cloudflare runtime enables nodejs_compat by default. Vinext still
// needs the flag while compiling, but Sites rejects it in the deployment config.
const workerConfig = JSON.parse(await readFile(generatedWorkerConfig, "utf8"));
workerConfig.compatibility_flags = (workerConfig.compatibility_flags ?? []).filter(
  (flag) => flag !== "nodejs_compat",
);
await writeFile(generatedWorkerConfig, `${JSON.stringify(workerConfig)}\n`);

try {
  await chmod(generatedSecrets, 0o600);
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}
