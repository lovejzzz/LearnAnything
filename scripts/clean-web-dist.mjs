import { rm } from "node:fs/promises";

await rm(new URL("../apps/web/dist/", import.meta.url), { recursive: true, force: true });
