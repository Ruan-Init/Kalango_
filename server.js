// Arquivo de entrada para a Hostinger: sobe o servidor compilado.
import("./packages/web/dist-server/server.mjs").catch((error) => {
  console.error("Falha ao iniciar o servidor:", error);
  process.exit(1);
});
