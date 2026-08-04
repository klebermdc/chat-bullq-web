'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { emailApi, type EmailBlock } from '@/lib/email-api';
import { DEFAULT_THEME } from '@/features/email/editor/editor-state';

function extractErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  const fallback = (err as { message?: unknown })?.message;
  return typeof fallback === 'string' && fallback.trim()
    ? fallback
    : 'Não foi possível criar a campanha. Tente novamente.';
}

export default function NovaCampanhaPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [heading, setHeading] = useState('');
  const [text, setText] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonHref, setButtonHref] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBody = heading.trim().length > 0 || text.trim().length > 0;
  const canSave = name.trim().length > 0 && subject.trim().length > 0 && hasBody;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const blocks: EmailBlock[] = [];
      if (heading.trim()) blocks.push({ type: 'heading', text: heading.trim() });
      if (text.trim()) blocks.push({ type: 'text', text: text.trim() });
      if (buttonLabel.trim() && buttonHref.trim()) {
        blocks.push({ type: 'button', label: buttonLabel.trim(), href: buttonHref.trim() });
      }

      const campaign = await emailApi.createCampaign({
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        content: { theme: DEFAULT_THEME, blocks },
      });

      router.push(`/email/campanhas/${campaign.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-2xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Nova campanha</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Preencha os campos abaixo — o editor visual arrastável chega em breve, mas o
          email montado aqui já sai pronto para envio.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Use <code className="rounded bg-white/60 px-1 py-0.5 font-mono dark:bg-black/20">{'{{nome}}'}</code>{' '}
          no assunto ou no texto para personalizar o email com o nome de cada destinatário.
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Field label="Nome interno" hint="Só pra você identificar a campanha na lista">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Promoção de agosto"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </Field>

        <Field label="Assunto">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="O que aparece na caixa de entrada"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </Field>

        <Field label="Prévia (preheader)" hint="Texto que aparece ao lado do assunto na caixa de entrada">
          <input
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </Field>

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Corpo do email
          </p>

          <div className="space-y-4">
            <Field label="Título do email">
              <input
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </Field>

            <Field label="Texto">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Opcional"
                rows={5}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Texto do botão">
                <input
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Ex: Ver oferta"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </Field>
              <Field label="Link do botão">
                <input
                  value={buttonHref}
                  onChange={(e) => setButtonHref(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </Field>
            </div>
          </div>

          {!hasBody && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Preencha o título ou o texto — sem corpo não existe email.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar campanha'}
        </button>
        <button
          onClick={() => router.push('/email/campanhas')}
          disabled={saving}
          className="rounded-lg px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
      {children}
    </label>
  );
}
