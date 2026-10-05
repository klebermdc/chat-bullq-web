'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { channelsService, type Channel } from '../services/channels.service';
import { channelTypeLabel } from '@/lib/channel-labels';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

interface EditChannelDialogProps {
  channel: Channel | null;
  onClose: () => void;
  onSaved: () => void;
}

const labelCls = 'block text-sm font-medium text-foreground';
const optionalCls = 'font-normal text-muted-foreground';
// Credenciais em fonte monoespaçada: facilita conferir com o painel do provedor.
const credentialCls = `${controlCls} w-full font-mono`;

/**
 * Pre-fills with the channel's current credentials so the operator can
 * audit/correct without needing to recreate. All credential inputs use
 * type="text" — JP needs the values visible to compare against the
 * provider's dashboard. This trades shoulder-surfing risk for ergonomics.
 */
export function EditChannelDialog({
  channel,
  onClose,
  onSaved,
}: EditChannelDialogProps) {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!channel) return;
    setName(channel.name);
    // Coerce nested values to string for the form. Booleans/numbers are
    // re-typed on save when needed (none of the WhatsApp configs use them).
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(channel.config ?? {})) {
      flat[k] = v == null ? '' : String(v);
    }
    setConfig(flat);
    setWebhookSecret(channel.webhookSecret ?? '');
  }, [channel]);

  if (!channel) return null;

  const fields = fieldsFor(channel.type);

  const setField = (k: string, v: string) =>
    setConfig((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      // Keep keys present in the original config but allow updating only
      // the fields the form exposes — preserves anything bespoke.
      const merged = { ...channel.config, ...config };
      // Remove empty optional keys to avoid storing literal "".
      for (const f of fields) {
        if (f.optional && !merged[f.key]?.trim()) {
          delete merged[f.key];
        }
      }
      await channelsService.update(channel.id, {
        name: name.trim(),
        config: merged,
        webhookSecret: webhookSecret.trim() || undefined,
      });
      toast.success('Credenciais atualizadas');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={false}
      size="lg"
      title="Editar credenciais"
      description={channelTypeLabel(channel.type)}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-channel-name" className={labelCls}>
            Nome do canal
          </label>
          <input
            id="edit-channel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${controlCls} w-full`}
          />
        </div>

        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label htmlFor={`edit-channel-${f.key}`} className={labelCls}>
              {f.label}{' '}
              {f.optional && <span className={optionalCls}>(opcional)</span>}
            </label>
            <input
              id={`edit-channel-${f.key}`}
              type="text"
              value={config[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={credentialCls}
            />
            {f.hint && (
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            )}
          </div>
        ))}

        <div className="space-y-1.5">
          <label htmlFor="edit-channel-webhook-secret" className={labelCls}>
            Segredo do webhook <span className={optionalCls}>(opcional)</span>
          </label>
          <input
            id="edit-channel-webhook-secret"
            type="text"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className={credentialCls}
          />
        </div>
      </div>
    </Dialog>
  );
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
}

/** Field set per channel type — mirrors create-channel-dialog. */
function fieldsFor(type: Channel['type']): FieldDef[] {
  if (type === 'WHATSAPP_OFFICIAL') {
    return [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'Encontrado no Meta Business Suite' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Token de usuário do sistema ou token temporário' },
      { key: 'appSecret', label: 'App Secret', placeholder: 'Chave secreta do app (Configurações → Básico, na Meta)' },
      { key: 'businessAccountId', label: 'Business Account ID (WABA)', placeholder: 'Habilita a inscrição automática do webhook', optional: true },
      { key: 'appId', label: 'App ID', placeholder: 'ID do app (Configurações → Básico, na Meta)', hint: 'Necessário para cabeçalho de mídia em templates.', optional: true },
    ];
  }
  if (type === 'WHATSAPP_ZAPPFY') {
    return [
      { key: 'token', label: 'Token', placeholder: 'Token da instância Zappfy' },
    ];
  }
  if (type === 'INSTAGRAM') {
    return [
      { key: 'accessToken', label: 'Access Token', placeholder: 'Token de acesso do usuário do Instagram (IGAAN...)' },
      { key: 'appSecret', label: 'App Secret', placeholder: 'Chave secreta do app' },
      { key: 'igBusinessId', label: 'Instagram Business ID', placeholder: 'Detectado automaticamente', optional: true },
      { key: 'igAppId', label: 'Instagram App ID', optional: true },
    ];
  }
  return [];
}
