'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  channelsService,
  type Channel,
} from '@/features/channels/services/channels.service';
import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import { segmentsService, type Segment } from '../services/segments.service';

import { channelTypeLabel } from '@/lib/channel-labels';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

const inputCls = `${controlCls} w-full`;
const labelCls = 'block text-sm font-medium text-foreground';

// Grupos são um conceito de WhatsApp — só esses canais podem compartilhar.
const GROUP_CAPABLE_TYPES = new Set(['WHATSAPP_ZAPPFY', 'WHATSAPP_OFFICIAL']);

interface SegmentFormDialogProps {
  open: boolean;
  segment?: Segment | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SegmentFormDialog({
  open,
  segment,
  onClose,
  onSaved,
}: SegmentFormDialogProps) {
  const orgId = useOrgId();
  const isEdit = !!segment;

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { data: channels } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
    enabled: open,
  });

  const groupChannels = useMemo(
    () => (channels ?? []).filter((c) => GROUP_CAPABLE_TYPES.has(c.type)),
    [channels],
  );

  // (Re)hidrata o form quando abre/troca de segmento.
  useEffect(() => {
    if (!open) return;
    setName(segment?.name ?? '');
    const ids = segment?.members.map((m) => m.channelId) ?? [];
    setMemberIds(ids);
    setPrimaryId(segment?.primaryChannelId ?? ids[0] ?? '');
  }, [open, segment]);

  const toggleMember = (channelId: string) => {
    setMemberIds((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      // Mantém um principal válido (membro da lista).
      setPrimaryId((cur) => {
        if (next.includes(cur)) return cur;
        return next[0] ?? '';
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe um nome para o segmento');
      return;
    }
    if (memberIds.length < 1) {
      toast.error('Selecione ao menos um canal');
      return;
    }
    if (!primaryId || !memberIds.includes(primaryId)) {
      toast.error('Escolha o canal principal entre os membros');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && segment) {
        if (name.trim() !== segment.name) {
          await segmentsService.update(segment.id, { name: name.trim() });
        }
        const currentIds = [...segment.members.map((m) => m.channelId)].sort();
        const nextIds = [...memberIds].sort();
        const membersChanged =
          currentIds.length !== nextIds.length ||
          currentIds.some((id, i) => id !== nextIds[i]);
        if (membersChanged) {
          await segmentsService.setChannels(segment.id, memberIds);
        }
        if (primaryId !== segment.primaryChannelId) {
          await segmentsService.setPrimary(segment.id, primaryId);
        }
        toast.success('Segmento atualizado');
      } else {
        await segmentsService.create({
          name: name.trim(),
          channelIds: memberIds,
          primaryChannelId: primaryId,
        });
        toast.success('Segmento criado');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar segmento');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      // Há dado digitado: Esc e clique fora não fecham (o X e "Cancelar" sim).
      dismissible={false}
      size="lg"
      title={isEdit ? 'Editar segmento' : 'Novo segmento'}
      description="Vários números que compartilham os mesmos grupos. As mensagens de grupo viram uma única conversa, ancorada no canal principal."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} loading={saving}>
            {isEdit ? 'Salvar' : 'Criar segmento'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="segment-name" className={labelCls}>
            Nome
          </label>
          <input
            id="segment-name"
            className={inputCls}
            placeholder="Ex.: Comercial · Grupos"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className={labelCls}>Canais membros</legend>
          {groupChannels.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Nenhum canal de WhatsApp disponível. Conecte canais de WhatsApp
              para montar um segmento.
            </p>
          ) : (
            <div className="space-y-1.5">
              {groupChannels.map((ch: Channel) => {
                const checked = memberIds.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-input"
                      checked={checked}
                      onChange={() => toggleMember(ch.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {ch.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {channelTypeLabel(ch.type)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {memberIds.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="segment-primary-channel" className={labelCls}>
              Canal principal
            </label>
            <p className="text-xs text-muted-foreground">
              Por onde as respostas dos grupos são enviadas.
            </p>
            <select
              id="segment-primary-channel"
              className={inputCls}
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
            >
              {memberIds.map((id) => {
                const ch = groupChannels.find((c) => c.id === id);
                return (
                  <option key={id} value={id}>
                    {ch?.name ?? id}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </Dialog>
  );
}
