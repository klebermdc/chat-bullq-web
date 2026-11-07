import type { ContactOrigin } from '../services/website-leads.service';

/**
 * URL completa para colar no Webhook do Elementor. A API devolve só o
 * caminho (`/api/v1/public/leads/website?token=…`); a origem é a mesma do
 * `NEXT_PUBLIC_API_URL` que o painel já usa.
 */
export function buildWebhookUrl(apiBaseUrl: string | undefined, path: string, fallbackOrigin: string): string {
  try {
    if (apiBaseUrl && /^https?:\/\//.test(apiBaseUrl)) return new URL(apiBaseUrl).origin + path;
  } catch {
    // base inválida: cai na origem do próprio painel
  }
  return fallbackOrigin.replace(/\/+$/, '') + path;
}

export const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando',
  SENDING: 'Enviando',
  SENT: 'Template enviado',
  SKIPPED: 'Não precisou',
  FAILED: 'Falhou',
  DECLINED: 'Respondeu "Agora não"',
};

export const FOLLOWUP_REASON_LABELS: Record<string, string> = {
  customer_wrote: 'cliente chamou antes',
  human_active: 'já tinha atendente na conversa',
  recent_followup: 'já recebeu o template nas últimas 24h',
  disabled: 'retorno desligado',
  template_not_approved: 'template ainda não aprovado pela Meta',
  template_missing: 'template não encontrado',
  channel_missing: 'canal não encontrado',
  agora_nao: 'cliente recusou',
};

export function followupLabel(status: string, reason: string | null): string {
  const base = FOLLOWUP_STATUS_LABELS[status] ?? status;
  if (!reason) return base;
  return `${base} · ${FOLLOWUP_REASON_LABELS[reason] ?? reason}`;
}

export interface OriginRow {
  label: string;
  value: string;
}

/** "Nome (id)" quando há nome; só o id quando não há. */
function named(name: string | null | undefined, id: string | null | undefined): string | null {
  if (name && id && name !== id) return `${name} (${id})`;
  return name || id || null;
}

function pagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return url;
  }
}

/** Linhas do bloco "Origem", na ordem em que o vendedor lê. Vazias somem. */
export function originRows(origin: ContactOrigin | undefined | null): OriginRow[] {
  if (!origin) return [];
  const rows: (OriginRow | null)[] = [];
  const s = origin.site;
  if (s) {
    const source = s.utm_source ?? s.ofp_src;
    const medium = s.utm_medium ?? s.ofp_mdm;
    rows.push(
      { label: 'Entrada', value: s.form_kind === 'guiamento' ? 'Formulário do site (guiamento)' : 'Formulário do site' },
      source ? { label: 'Fonte', value: source } : null,
      medium ? { label: 'Meio', value: medium } : null,
    );
    const campaign = named(s.campaignName, s.utm_campaign ?? s.ofp_cmp);
    const adset = named(s.adsetName, s.utm_term ?? s.ofp_trm);
    const ad = named(s.adName, s.utm_content ?? s.ofp_cnt);
    if (campaign) rows.push({ label: 'Campanha', value: campaign });
    if (adset) rows.push({ label: 'Conjunto', value: adset });
    if (ad) rows.push({ label: 'Anúncio', value: ad });
    const page = pagePath(s.page_url);
    if (page) rows.push({ label: 'Página', value: page });
    if (s.fbclid) rows.push({ label: 'Clique Meta', value: 'fbclid registrado' });
    if (s.gclid) rows.push({ label: 'Clique Google', value: 'gclid registrado' });
  }
  const c = origin.ctwa;
  if (c && (c.sourceId || c.adName)) {
    rows.push({ label: 'Anúncio WhatsApp', value: named(c.adName, c.sourceId) ?? '—' });
    if (c.campaignName) rows.push({ label: 'Campanha (WhatsApp)', value: c.campaignName });
  }
  return rows.filter((r): r is OriginRow => !!r);
}
