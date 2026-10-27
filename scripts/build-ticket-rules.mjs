#!/usr/bin/env node
/**
 * Gera src/features/ticket-rules/data/ticket-rules.json a partir da base de
 * regras de ingressos (ingressos_orlando.json, pesquisa do Kleber).
 *
 * Só REGRAS entram no app: preço de referência, fontes e canal de venda ficam
 * de fora, e qualquer valor em dinheiro que apareça no meio de um texto é
 * removido. O script falha se sobrar algum valor.
 *
 * Uso: node scripts/build-ticket-rules.mjs ~/Downloads/ingressos-orlando/ingressos_orlando.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/features/ticket-rules/data/ticket-rules.json');

/** Frases com valor que precisam de reescrita, não só de corte. */
const REWRITES = [
  [/geral a partir de US\$\s*[\d.,]+\s*\+\s*impostos/gi, 'cobrado à parte'],
  [/Estacionamento US\$\s*[\d.,]+ por carro, à parte/gi, 'Estacionamento cobrado à parte, por carro'],
  [/demais US\$\s*[\d.,]+ cada/gi, 'demais com taxa'],
  [/voucher de alimentação US\$\s*[\d.,]+/gi, 'voucher de alimentação'],
  [/Remarcação US\$\s*[\d.,]+ por ingresso/gi, 'Remarcação com taxa por ingresso'],
];
/** "(~US$ 30–32/dia)", "(US$ 99/dia)", "(desde US$ 79,99 com admissão)". */
const MONEY_IN_PARENS = /\s*\([^)]*(?:US\$|R\$)[^)]*\)/g;
const MONEY_LEFT = /(?:US\$|R\$)\s*\d|\$\s*\d/;

function stripMoney(text) {
  if (typeof text !== 'string') return text;
  const out = REWRITES.reduce((s, [re, to]) => s.replace(re, to), text).replace(MONEY_IN_PARENS, '').trim();
  if (MONEY_LEFT.test(out)) throw new Error(`Valor em dinheiro sobrou no texto: "${out}"`);
  return out;
}

const texts = (list) => (list ?? []).map(stripMoney).filter(Boolean);

function toRule(x) {
  return {
    id: x.id,
    operatorId: x.operador,
    status: x.status,
    name: stripMoney(x.nome_pt),
    nameEn: stripMoney(x.nome_en ?? ''),
    description: stripMoney(x.descricao ?? ''),
    saleEnd: x.venda_fim,
    useStart: x.uso_inicio,
    useEnd: x.uso_fim,
    parks: x.parques ?? [],
    days: x.qtd_dias,
    visits: x.qtd_visitas,
    access: x.tipo_acesso,
    parkHopping: x.park_hopping,
    hoppingRule: stripMoney(x.regra_hopping ?? ''),
    windowType: x.janela_tipo,
    windowDays: x.janela_dias,
    windowRule: stripMoney(x.janela_regra ?? ''),
    activationMonths: x.prazo_ativacao_meses,
    finalValidity: x.validade_final,
    reservationRequired: x.reserva_obrigatoria,
    ageBands: (x.faixas_etarias ?? []).map((f) => ({
      band: f.faixa, min: f.idade_min, max: f.idade_max, free: f.gratis, note: stripMoney(f.observacao ?? ''),
    })),
    ageHeight: stripMoney(x.restricoes_idade_altura ?? ''),
    refund: stripMoney(x.reembolso ?? ''),
    dateChange: stripMoney(x.troca_data ?? ''),
    transferable: x.transferivel,
    identification: stripMoney(x.identificacao ?? ''),
    includes: texts(x.inclui),
    excludes: texts(x.nao_inclui),
    sellerAlerts: texts(x.alertas_vendedor),
    pending: texts(x.pendencias),
    confidence: x.confianca,
  };
}

const source = process.argv[2];
if (!source) {
  console.error('Uso: node scripts/build-ticket-rules.mjs <ingressos_orlando.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(source, 'utf8'));
const catalog = {
  verifiedAt: data.meta.verificado_em,
  operators: data.operadores.map((o) => ({ id: o.id, name: o.nome })),
  parks: data.parques.map((p) => ({ id: p.id, name: p.nome })),
  rules: data.ingressos.map(toRule),
};
writeFileSync(OUT, `${JSON.stringify(catalog, null, 1)}\n`);
console.log(`${catalog.rules.length} ingressos → ${OUT}`);
