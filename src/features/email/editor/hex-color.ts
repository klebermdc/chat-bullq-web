/**
 * Normaliza texto livre de cor para o formato `#rrggbb` exigido pela API
 * (`/^#[0-9a-fA-F]{6}$/`). Aceita com ou sem `#` na digitação. Retorna `null`
 * quando o texto não é um hex de seis dígitos válido — o chamador decide o
 * que fazer com a rejeição (não propagar, mostrar erro etc.).
 */
export function normalizeHexColor(raw: string): string | null {
  const trimmed = raw.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  return /^[0-9a-fA-F]{6}$/.test(withoutHash) ? `#${withoutHash.toLowerCase()}` : null;
}
