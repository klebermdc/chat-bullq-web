'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { contactsService } from '../services/contacts.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { TagMultiSelect } from './tag-multi-select';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

const FORM_ID = 'new-contact-form';
const inputCls = `${controlCls} w-full`;
const labelCls = 'block text-sm font-medium text-foreground';
const optionalCls = 'font-normal text-muted-foreground';

interface NewContactDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewContactDialog({ open, onClose, onCreated }: NewContactDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setTagIds([]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    try {
      const contact = await contactsService.create({
        name: name.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (tagIds.length > 0) {
        await Promise.all(tagIds.map((tagId) => tagsService.addToContact(contact.id, tagId)));
      }
      toast.success('Contato criado');
      handleClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar contato');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open
      onClose={handleClose}
      // Há dado digitado: Esc e clique fora não fecham (o X e "Cancelar" sim).
      dismissible={false}
      size="lg"
      title="Novo contato"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isLoading}>
            Criar contato
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-contact-name" className={labelCls}>
            Nome <span className={optionalCls}>(opcional)</span>
          </label>
          <input
            id="new-contact-name"
            type="text"
            placeholder="Ex.: João Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-contact-phone" className={labelCls}>
            Telefone
          </label>
          <input
            id="new-contact-phone"
            type="text"
            inputMode="tel"
            placeholder="Ex.: 5511999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className={`${inputCls} font-mono tabular-nums`}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-contact-email" className={labelCls}>
            E-mail <span className={optionalCls}>(opcional)</span>
          </label>
          <input
            id="new-contact-email"
            type="email"
            placeholder="Ex.: joao@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-contact-notes" className={labelCls}>
            Observações <span className={optionalCls}>(opcional)</span>
          </label>
          <textarea
            id="new-contact-notes"
            placeholder="Anotações sobre o cliente…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputCls} h-auto resize-none py-2`}
          />
        </div>

        <div className="space-y-1.5">
          <p className={labelCls}>
            Tags <span className={optionalCls}>(opcional)</span>
          </p>
          <TagMultiSelect value={tagIds} onChange={setTagIds} disabled={isLoading} />
        </div>
      </form>
    </Dialog>
  );
}
