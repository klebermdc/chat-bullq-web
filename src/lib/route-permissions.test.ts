import { describe, expect, it } from 'vitest';
import { requiredFeatureForPath } from './route-permissions';

describe('requiredFeatureForPath', () => {
  it('exige a permissão de gestor dos relatórios de CRM em Custos do WhatsApp', () => {
    expect(requiredFeatureForPath('/custos-whatsapp')).toBe('crm-reports.view');
    expect(requiredFeatureForPath('/custos-whatsapp/qualquer')).toBe('crm-reports.view');
  });

  it('não confunde rotas que começam igual', () => {
    expect(requiredFeatureForPath('/relatorios')).toBe('crm-reports.view');
    expect(requiredFeatureForPath('/relatorios-vendas')).toBe('sales-reports.view');
    expect(requiredFeatureForPath('/custos-whatsapp-antigo')).toBeNull();
  });

  it('usa o prefixo mais longo', () => {
    expect(requiredFeatureForPath('/settings/jarvis/agentes')).toBe('ai-agents.view');
    expect(requiredFeatureForPath('/settings/canais')).toBe('settings.view');
  });

  it('não exige nada em rota sem regra', () => {
    expect(requiredFeatureForPath('/inbox')).toBeNull();
  });
});
