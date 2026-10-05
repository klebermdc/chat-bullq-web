'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Info } from 'lucide-react';
import { emailApi } from '@/lib/email-api';
import { usePageTitle } from '@/components/layout/use-page-title';
import { addBlock, createInitialState, toContent } from '@/features/email/editor/editor-state';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

const fieldCls = `${controlCls} w-full`;

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
  usePageTitle('Nova campanha');

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && subject.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Nasce com um bloco de texto inicial — o corpo do email é todo
      // montado depois, no editor visual, não aqui.
      const content = toContent(addBlock(createInitialState(), 'text'));

      const campaign = await emailApi.createCampaign({
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        content,
      });

      router.push(`/email/campanhas/${campaign.id}/editar`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-2xl space-y-6 overflow-y-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nova campanha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha o básico agora — o conteúdo do email, com blocos e estilo, você monta a
          seguir no editor visual.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Use <code className="rounded bg-background/70 px-1 py-0.5 font-mono">{'{{nome}}'}</code>{' '}
          no assunto para personalizar o email com o nome de cada destinatário.
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft">
        <Field label="Nome interno" hint="Só para você identificar a campanha na lista">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Promoção de agosto"
            className={fieldCls}
          />
        </Field>

        <Field label="Assunto">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="O que aparece na caixa de entrada"
            className={fieldCls}
          />
        </Field>

        <Field label="Texto de prévia" hint="Texto que aparece ao lado do assunto na caixa de entrada">
          <input
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            placeholder="Opcional"
            className={fieldCls}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={handleSave} disabled={!canSave} loading={saving}>
          {saving ? 'Salvando…' : 'Continuar para o editor'}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => router.push('/email/campanhas')}
          disabled={saving}
        >
          Cancelar
        </Button>
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
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}
