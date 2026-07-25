'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';

interface ContactIdentityFieldsProps {
  contact: Contact;
  onSaved: () => void;
}

type Field = 'name' | 'phone' | 'email';

const rowCls = 'grid grid-cols-[84px_1fr] items-center gap-2 border-b border-border/60 py-1.5';
const labelCls = 'text-[13px] text-muted-foreground';
const inputCls =
  'w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm font-medium text-foreground outline-none transition-colors hover:border-border focus:border-primary focus:bg-background focus:text-left disabled:opacity-60';

export function ContactIdentityFields({ contact, onSaved }: ContactIdentityFieldsProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    name: contact.name ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
  });

  // Ressincroniza se o contato for atualizado por fora (realtime/refetch).
  useEffect(() => {
    setValues({ name: contact.name ?? '', phone: contact.phone ?? '', email: contact.email ?? '' });
  }, [contact.id, contact.name, contact.phone, contact.email]);

  const save = useMutation({
    mutationFn: (patch: Partial<Contact>) => contactsService.update(contact.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contact.id] });
      onSaved();
    },
  });

  const commit = (field: Field) => {
    const next = values[field].trim();
    const prev = (contact[field] ?? '') as string;
    if (next === prev.trim()) return;
    // Telefone é a identidade de roteamento — não deixa apagar; reverte.
    if (field === 'phone' && !next) {
      setValues((v) => ({ ...v, phone: prev }));
      return;
    }
    save.mutate({ [field]: next || null } as Partial<Contact>, {
      onSuccess: () => toast.success('Contato atualizado'),
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
        setValues((v) => ({ ...v, [field]: prev }));
      },
    });
  };

  const fields: Array<{ key: Field; label: string; type: string; placeholder: string }> = [
    { key: 'name', label: 'Nome', type: 'text', placeholder: 'Sem nome' },
    { key: 'phone', label: 'Telefone', type: 'text', placeholder: '—' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Adicionar email' },
  ];

  return (
    <div>
      {fields.map((f) => (
        <div key={f.key} className={rowCls}>
          <label htmlFor={`contact-field-${f.key}`} className={labelCls}>{f.label}</label>
          <input
            type={f.type}
            id={`contact-field-${f.key}`}
            value={values[f.key]}
            placeholder={f.placeholder}
            disabled={save.isPending}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            onBlur={() => commit(f.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setValues((v) => ({ ...v, [f.key]: (contact[f.key] ?? '') as string }));
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={inputCls}
          />
        </div>
      ))}
    </div>
  );
}
