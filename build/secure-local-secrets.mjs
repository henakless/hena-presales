import { chmod } from "node:fs/promises";

const generatedSecrets = new URL("../dist/server/.dev.vars", import.meta.url);

try {
  await chmod(generatedSecrets, 0o600);
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}
