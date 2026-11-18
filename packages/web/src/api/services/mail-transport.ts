import { STORE } from "../config/store";
import { envValue } from "../lib/env";

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
};
export type MailResult =
  | { sent: true; ids: string[] }
  | { sent: false; uncertain: boolean; error: string };

export function mailConfiguration() {
  const from = envValue("EMAIL_FROM") ?? envValue("MAIL_FROM") ?? STORE.mailFrom;
  const keyPresent = Boolean(envValue("RESEND_API_KEY"));
  return {
    ready: keyPresent,
    from,
    provider: "Resend",
    note: keyPresent
      ? "Envio configurado. O domínio do remetente precisa estar verificado no Resend. Aceito pelo serviço não significa entregue na caixa de entrada."
      : "Envio bloqueado: configure a API key do Resend e verifique o domínio do remetente. Você já pode salvar rascunhos.",
  };
}

/** Uma chamada = um lote; nunca lista todos os destinatários no campo To. */
export async function sendMailBatch(messages: MailMessage[], key: string, batch = true): Promise<MailResult> {
  const config = mailConfiguration();
  if (!config.ready) return { sent: false, uncertain: false, error: "Serviço de e-mail não configurado" };
  if (!messages.length || messages.length > 50) throw new Error("Lote de e-mail inválido");
  const payload = messages.map(({ replyTo, ...m }) => ({
    ...m, from: config.from, to: Array.isArray(m.to) ? m.to : [m.to],
    reply_to: replyTo ?? STORE.notificationEmail,
  }));
  let response: Response;
  try {
    response = await fetch(`https://api.resend.com/emails${batch ? "/batch" : ""}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${envValue("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(batch ? payload : payload[0]),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return { sent: false, uncertain: true, error: "Resposta do serviço não recebida. Verifique o painel Resend antes de reenviar." };
  }
  if (!response.ok) {
    // O Resend devolve { name, message }: mostra o motivo real, sem expor a chave.
    let detail = "";
    try { detail = String(((await response.json()) as { message?: string }).message ?? "").slice(0, 200); } catch {}
    const reason: Record<number, string> = {
      401: "A API key do Resend é inválida, foi revogada ou está com espaço/aspas. Gere uma nova em API keys, atualize RESEND_API_KEY e reimplante.",
      403: "O Resend recusou o remetente: o domínio kalangocafe.com.br ainda não está verificado (registros DNS + Verify no Resend) ou a chave não tem acesso a ele. Nada foi enviado.",
      422: "O Resend recusou os dados do e-mail (remetente ou destinatário inválido). Confira EMAIL_FROM: o endereço precisa ser do domínio verificado.",
      429: "Limite de envio atingido. Aguarde alguns minutos e tente de novo.",
    };
    return { sent: false, uncertain: response.status >= 500 || response.status === 408,
      error: `Serviço de e-mail respondeu HTTP ${response.status}. ${reason[response.status] ?? "Confira API key, remetente e domínio verificado no Resend."}${detail ? ` (Resend: ${detail})` : ""}` };
  }
  try {
    const result = await response.json() as { id?: string; data?: { id: string }[] };
    const ids = batch ? result.data?.map((r) => r.id) : result.id ? [result.id] : [];
    if (!ids || ids.length !== messages.length || ids.some((id) => !id)) throw new Error("Resposta incompleta");
    return { sent: true, ids };
  } catch {
    return { sent: false, uncertain: true, error: "Serviço respondeu sem confirmação completa. Verifique o painel Resend; não reenviar cegamente." };
  }
}

export function sendMail(message: MailMessage, key: string) {
  return sendMailBatch([message], key, false);
}

export const escapeEmailHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");