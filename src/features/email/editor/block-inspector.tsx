'use client';

import { Info, Plus, Trash2 } from 'lucide-react';
import type { BlockStyle, EmailTheme, SocialNetwork, SpacerSize } from '@/lib/email-api';
import type { EditorBlock } from './editor-state';
import { Field, StyleControls, inputClass } from './style-controls';
import { MediaPicker } from './media-picker';

interface Props {
  block: EditorBlock;
  theme: EmailTheme;
  onChange: (patch: Record<string, unknown>) => void;
  onStyleChange: (patch: BlockStyle) => void;
}

const SOCIAL_NETWORKS: Array<{ value: SocialNetwork; label: string }> = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'site', label: 'Site' },
];

const SPACER_SIZES: Array<{ value: SpacerSize; label: string }> = [
  { value: 'sm', label: 'Pequeno' },
  { value: 'md', label: 'Médio' },
  { value: 'lg', label: 'Grande' },
];

/** Recebe o bloco selecionado e devolve os campos daquele tipo, mais os controles de estilo. */
export function BlockInspector({ block, theme, onChange, onStyleChange }: Props) {
  return (
    <div className="space-y-4">
      <TypeFields block={block} onChange={onChange} />
      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <StyleControls
          style={block.style}
          theme={theme}
          showButtonControls={block.type === 'button' || block.type === 'offer'}
          onChange={onStyleChange}
        />
      </div>
    </div>
  );
}

function PersonalizationHint() {
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-zinc-400">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        Use{' '}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">
          {'{{nome}}'}
        </code>{' '}
        para personalizar com o nome do destinatário.
      </span>
    </p>
  );
}

function TypeFields({
  block,
  onChange,
}: {
  block: EditorBlock;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (block.type) {
    case 'heading':
    case 'text':
      return (
        <Field label="Texto" htmlFor="field-text">
          <textarea
            id="field-text"
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={block.type === 'heading' ? 2 : 5}
            className={inputClass}
          />
          <PersonalizationHint />
        </Field>
      );

    case 'image':
      return (
        <div className="space-y-3">
          <MediaPicker
            id="field-image-src"
            label="Imagem"
            value={block.src}
            onChange={(src) => onChange({ src })}
          />
          <Field label="Texto alternativo" htmlFor="field-image-alt">
            <input
              id="field-image-alt"
              value={block.alt ?? ''}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Descreve a imagem para quem não consegue vê-la"
              className={inputClass}
            />
          </Field>
        </div>
      );

    case 'logo':
      return (
        <div className="space-y-3">
          <MediaPicker
            id="field-logo-src"
            label="Logo"
            value={block.src}
            onChange={(src) => onChange({ src })}
          />
          <Field label="Link (opcional)" htmlFor="field-logo-href">
            <input
              id="field-logo-href"
              value={block.href ?? ''}
              onChange={(e) => onChange({ href: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>
        </div>
      );

    case 'button':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rótulo" htmlFor="field-button-label">
            <input
              id="field-button-label"
              value={block.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Link" htmlFor="field-button-href">
            <input
              id="field-button-href"
              value={block.href}
              onChange={(e) => onChange({ href: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>
        </div>
      );

    case 'offer':
      return (
        <div className="space-y-3">
          <MediaPicker
            id="field-offer-src"
            label="Imagem (opcional)"
            value={block.src ?? ''}
            onChange={(src) => onChange({ src: src || undefined })}
          />
          <Field label="Título" htmlFor="field-offer-title">
            <input
              id="field-offer-title"
              value={block.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Preço" htmlFor="field-offer-price">
            <input
              id="field-offer-price"
              value={block.price ?? ''}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="Ex: a partir de R$ 1.299, ou 12x de R$ 99"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Texto livre — escreva exatamente como quer que apareça, moeda e condição inclusas.
            </p>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rótulo do botão" htmlFor="field-offer-label">
              <input
                id="field-offer-label"
                value={block.label}
                onChange={(e) => onChange({ label: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Link" htmlFor="field-offer-href">
              <input
                id="field-offer-href"
                value={block.href}
                onChange={(e) => onChange({ href: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Tamanho
          </span>
          <div className="flex gap-2" role="group" aria-label="Tamanho do espaço">
            {SPACER_SIZES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ size: value })}
                aria-pressed={block.size === value}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  block.size === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'social':
      return <SocialLinksFields links={block.links} onChange={onChange} />;

    case 'divider':
      return (
        <p className="text-xs text-zinc-400">
          Este bloco não tem campos próprios, só o estilo abaixo.
        </p>
      );

    default:
      return null;
  }
}

function SocialLinksFields({
  links,
  onChange,
}: {
  links: Array<{ network: SocialNetwork; href: string }>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const updateLink = (index: number, patch: Partial<{ network: SocialNetwork; href: string }>) => {
    onChange({ links: links.map((link, i) => (i === index ? { ...link, ...patch } : link)) });
  };

  const addLink = () => {
    onChange({ links: [...links, { network: 'instagram' as SocialNetwork, href: '' }] });
  };

  const removeLink = (index: number) => {
    onChange({ links: links.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
        Redes sociais
      </span>

      {links.map((link, index) => (
        <div key={index} className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`social-network-${index}`}>
            Rede
          </label>
          <select
            id={`social-network-${index}`}
            value={link.network}
            onChange={(e) => updateLink(index, { network: e.target.value as SocialNetwork })}
            className={`${inputClass} w-32 shrink-0`}
          >
            {SOCIAL_NETWORKS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor={`social-href-${index}`}>
            Link
          </label>
          <input
            id={`social-href-${index}`}
            value={link.href}
            onChange={(e) => updateLink(index, { href: e.target.value })}
            placeholder="https://..."
            className={inputClass}
          />

          <button
            type="button"
            onClick={() => removeLink(index)}
            aria-label="Remover rede"
            className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addLink}
        className="flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar rede
      </button>
    </div>
  );
}
