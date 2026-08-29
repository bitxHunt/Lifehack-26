import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const devVarsPath = join(projectRoot, "dist", "server", ".dev.vars");

await rm(devVarsPath, { force: true });
console.log("Removed local development secrets from the deployable build.");
