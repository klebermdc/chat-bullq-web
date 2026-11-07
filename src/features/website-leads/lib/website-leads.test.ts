import { describe, expect, it } from 'vitest';
import { buildWebhookUrl, followupLabel, originRows } from './website-leads';

describe('buildWebhookUrl', () => {
  const path = '/api/v1/public/leads/website?token=wl_x';

  it('usa a origem da API configurada', () => {
    expect(buildWebhookUrl('https://api.sendtur.com.br/api/v1', path, 'https://app.sendtur.com.br')).toBe(
      'https://api.sendtur.com.br/api/v1/public/leads/website?token=wl_x',
    );
  });

  it('sem base absoluta, cai na origem do painel', () => {
    expect(buildWebhookUrl('/api/v1', path, 'https://app.sendtur.com.br/')).toBe(
      'https://app.sendtur.com.br/api/v1/public/leads/website?token=wl_x',
    );
  });
});

describe('followupLabel', () => {
  it('traduz situação e motivo', () => {
    expect(followupLabel('SKIPPED', 'customer_wrote')).toBe('Não precisou · cliente chamou antes');
    expect(followupLabel('SENT', null)).toBe('Template enviado');
  });
});

describe('originRows', () => {
  it('mostra fonte, meio, campanha/anúncio com nome e id, e a página', () => {
    const rows = originRows({
      site: {
        utm_source: 'ig',
        utm_medium: 'paid',
        utm_campaign: '6757481011574',
        utm_content: '52517172431978',
        page_url: 'https://orlandofastpass.com.br/?utm_source=ig',
        form_kind: 'main',
        fbclid: 'IwAR',
        campaignName: '21_03_25_engaj_site',
        adsetName: null,
        adName: 'video12',
      },
      ctwa: null,
      submissions: [],
    });
    expect(rows).toEqual([
      { label: 'Entrada', value: 'Formulário do site' },
      { label: 'Fonte', value: 'ig' },
      { label: 'Meio', value: 'paid' },
      { label: 'Campanha', value: '21_03_25_engaj_site (6757481011574)' },
      { label: 'Anúncio', value: 'video12 (52517172431978)' },
      { label: 'Página', value: 'orlandofastpass.com.br/' },
      { label: 'Clique Meta', value: 'fbclid registrado' },
    ]);
  });

  it('usa os campos ofp_* quando não há utm', () => {
    const rows = originRows({
      site: { ofp_src: 'bio', form_kind: 'guiamento', campaignName: null, adsetName: null, adName: null },
      ctwa: null,
      submissions: [],
    });
    expect(rows[0].value).toBe('Formulário do site (guiamento)');
    expect(rows).toContainEqual({ label: 'Fonte', value: 'bio' });
  });

  it('anúncio de WhatsApp (CTWA)', () => {
    expect(
      originRows({
        site: null,
        ctwa: { sourceId: '123', sourceType: 'ad', at: null, adName: 'video12', campaignName: 'Camp' },
        submissions: [],
      }),
    ).toEqual([
      { label: 'Anúncio WhatsApp', value: 'video12 (123)' },
      { label: 'Campanha (WhatsApp)', value: 'Camp' },
    ]);
  });

  it('sem origem → vazio', () => {
    expect(originRows(null)).toEqual([]);
  });
});
