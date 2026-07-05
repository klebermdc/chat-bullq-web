'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { contactsService } from '../services/contacts.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { TagMultiSelect } from './tag-multi-select';

const inputCls = 'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Novo contato</h2>
          <button onClick={handleClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>
              Nome <span className="text-zinc-400">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Telefone</label>
            <input
              type="text"
              placeholder="Ex: 5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Email <span className="text-zinc-400">(opcional)</span>
            </label>
            <input
              type="email"
              placeholder="Ex: joao@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Observações <span className="text-zinc-400">(opcional)</span>
            </label>
            <textarea
              placeholder="Anotações sobre o cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} h-auto resize-none`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Tags <span className="text-zinc-400">(opcional)</span>
            </label>
            <TagMultiSelect value={tagIds} onChange={setTagIds} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Contato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
