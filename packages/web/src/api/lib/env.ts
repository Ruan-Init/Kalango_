/**
 * Lê variável de ambiente já "limpa": remove espaços, quebras de linha e aspas
 * simples/duplas nas pontas. Painéis de hospedagem costumam guardar o valor
 * exatamente como foi colado, e um espaço sobrando quebra senha, API key e URL.
 */
export function envValue(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const cleaned = raw.trim().replace(/^(["'])(.*)\1$/s, "$2").trim();
  return cleaned || undefined;
}

/** URL pública do site, sem barra final. Só aceita http(s); senão devolve o padrão. */
export function publicSiteUrl(fallback = "https://kalangocafe.com.br", httpsOnly = false): string {
  for (const name of ["WEBSITE_URL", "SITE_URL"]) {
    const value = envValue(name);
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || (!httpsOnly && url.protocol === "http:")) return url.origin;
    } catch {
      // valor inválido: tenta a próxima opção
    }
  }
  return fallback.replace(/\/$/, "");
}
