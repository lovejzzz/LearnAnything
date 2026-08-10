import { rename } from "node:fs/promises";

await rename(
  new URL("../apps/web/dist/client/index.html", import.meta.url),
  new URL("../apps/web/dist/client/app-shell.txt", import.meta.url),
);
