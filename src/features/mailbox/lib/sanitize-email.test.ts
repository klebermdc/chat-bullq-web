// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeEmailHtml } from './sanitize-email';

const bodyOf = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('sanitizeEmailHtml', () => {
  it('remove <script> e o conteúdo dele', () => {
    const { html } = sanitizeEmailHtml('<p>Oi</p><script>window.hacked = 1</script>');
    expect(html).toContain('<p>Oi</p>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('window.hacked');
  });

  it('remove onerror/onclick e qualquer atributo on*', () => {
    const { html } = sanitizeEmailHtml('<img src="x" onerror="alert(1)"><a href="#" onclick="alert(2)">x</a>');
    expect(html).not.toMatch(/onerror|onclick|alert\(/i);
    const doc = bodyOf(html);
    expect(doc.querySelector('img')).not.toBeNull();
  });

  it('o onerror não executa quando o HTML vira DOM', () => {
    const marker = globalThis as { __emailXss?: boolean };
    marker.__emailXss = false;
    const { html } = sanitizeEmailHtml('<img src="nao-existe.png" onerror="globalThis.__emailXss = true">');
    const host = document.createElement('div');
    host.innerHTML = html;
    host.querySelector('img')?.dispatchEvent(new Event('error'));
    expect(marker.__emailXss).toBe(false);
  });

  it('tira javascript: dos links e abre os links fora, sem opener', () => {
    const { html } = sanitizeEmailHtml('<a href="javascript:alert(1)">a</a><a href="https://orlandofastpass.com.br">b</a>');
    expect(html).not.toMatch(/javascript:/i);
    const links = bodyOf(html).querySelectorAll('body a');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('tira formulário, iframe, object e meta refresh', () => {
    const { html } = sanitizeEmailHtml(
      '<meta http-equiv="refresh" content="0;url=https://mal.example"><form action="https://mal.example"><input name="senha"></form>' +
        '<iframe src="https://mal.example"></iframe><object data="x.swf"></object><p>fim</p>',
    );
    expect(html).not.toMatch(/<form|<input|<iframe|<object|refresh/i);
    expect(html).toContain('<p>fim</p>');
  });

  it('mantém o CSS do e-mail (fica preso no iframe)', () => {
    const { html } = sanitizeEmailHtml('<html><head><style>.t{color:red}</style></head><body><p class="t">x</p></body></html>');
    expect(html).toContain('.t{color:red}');
    expect(html).toContain('class="t"');
  });

  it('põe a CSP que bloqueia rede e imagens remotas por padrão', () => {
    const { html } = sanitizeEmailHtml('<p>x</p>');
    const csp = bodyOf(html).querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('img-src data: cid:');
    expect(csp).not.toContain('https:');
  });

  it('libera imagens remotas só quando pedido', () => {
    const { html } = sanitizeEmailHtml('<p>x</p>', true);
    const csp = bodyOf(html).querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content');
    expect(csp).toContain('img-src data: cid: https: http:');
  });

  it('avisa quando há imagem remota (img ou fundo no CSS)', () => {
    expect(sanitizeEmailHtml('<img src="https://cdn.example/logo.png">').hasRemoteImages).toBe(true);
    expect(sanitizeEmailHtml('<div style="background:url(https://cdn.example/a.png)">x</div>').hasRemoteImages).toBe(true);
    expect(sanitizeEmailHtml('<p>sem imagem</p>').hasRemoteImages).toBe(false);
  });

  it('HTML vazio vira documento vazio', () => {
    expect(sanitizeEmailHtml('   ')).toEqual({ html: '', hasRemoteImages: false });
  });
});
