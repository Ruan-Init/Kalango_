// Compila o servidor (TypeScript) para um arquivo JS que roda direto com `node`.
import { build } from "esbuild";

await build({
  entryPoints: ["src/server.ts"],
  outfile: "dist-server/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  tsconfig: "tsconfig.app.json",
  logLevel: "info",
});
