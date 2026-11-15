import DOMPurify, { type DOMPurify as Purifier } from 'dompurify';

/**
 * O HTML dos e-mails chega CRU da API (é o que o remetente mandou). Antes de
 * mostrar: DOMPurify tira script, on*, javascript:, formulários e embutidos;
 * depois o resultado vai para um iframe `srcdoc` com sandbox sem
 * `allow-scripts` e uma CSP que bloqueia qualquer rede, menos imagens quando
 * o atendente pede. O CSS do e-mail fica preso no iframe.
 */

const FORBID_TAGS = [
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'base', 'meta', 'link', 'portal',
];

// Fundo branco sempre (o e-mail foi desenhado para ele, como no Gmail);
// imagem nunca estoura a largura do leitor.
const BASE_STYLE =
  'body{margin:0;padding:16px;background:#fff;color:#18181b;' +
  'font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-wrap:anywhere}' +
  'img{max-width:100%;height:auto}table{max-width:100%}';

const REMOTE_REF = /(?:src|background)\s*=\s*["']?\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i;

let purifier: Purifier | null = null;

/** Instância própria (o hook dos links não vaza para outros usos do DOMPurify). */
function getPurifier(): Purifier | null {
  if (typeof window === 'undefined') return null;
  if (purifier) return purifier;
  const instance = DOMPurify(window);
  if (!instance.isSupported) return null;
  instance.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  purifier = instance;
  return purifier;
}

export interface SanitizedEmail {
  /** Documento completo, pronto para o `srcdoc`. */
  html: string;
  /** Há imagem ou fundo vindo da internet (bloqueado até o atendente pedir). */
  hasRemoteImages: boolean;
}

function contentSecurityPolicy(isRemoteImagesAllowed: boolean): string {
  const img = isRemoteImagesAllowed ? 'data: cid: https: http:' : 'data: cid:';
  return `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src ${img}`;
}

/**
 * Sanitiza e monta o documento do iframe. Sem DOM disponível (servidor),
 * devolve vazio: o DOMPurify sem `window` devolveria o HTML intacto.
 */
export function sanitizeEmailHtml(rawHtml: string, isRemoteImagesAllowed = false): SanitizedEmail {
  const instance = getPurifier();
  if (!instance || !rawHtml.trim()) return { html: '', hasRemoteImages: false };

  const root = instance.sanitize(rawHtml, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    FORBID_TAGS,
    ALLOW_DATA_ATTR: false,
  }) as HTMLElement;

  const doc = root.ownerDocument;
  const head = root.querySelector('head') ?? root.insertBefore(doc.createElement('head'), root.firstChild);

  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', contentSecurityPolicy(isRemoteImagesAllowed));
  const charset = doc.createElement('meta');
  charset.setAttribute('charset', 'utf-8');
  const base = doc.createElement('base');
  base.setAttribute('target', '_blank');
  const style = doc.createElement('style');
  style.textContent = BASE_STYLE;
  // Na frente do CSS do e-mail: as regras dele continuam valendo.
  head.prepend(charset, csp, base, style);

  const html = `<!doctype html>${root.outerHTML}`;
  return { html, hasRemoteImages: REMOTE_REF.test(html) };
}
