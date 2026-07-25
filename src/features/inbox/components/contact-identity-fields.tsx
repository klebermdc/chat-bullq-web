'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Phone, Mail, Pencil } from 'lucide-react';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';

interface ContactIdentityFieldsProps {
  contact: Contact;
  onSaved: () => void;
}

type Field = 'name' | 'phone' | 'email';

const inputCls =
  'w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50 disabled:opacity-60';

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

  const fields: Array<{ key: Field; label: string; type: string; placeholder: string; icon: ElementType }> = [
    { key: 'name', label: 'Nome', type: 'text', placeholder: 'Sem nome', icon: User },
    { key: 'phone', label: 'Telefone', type: 'text', placeholder: '—', icon: Phone },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Adicionar email', icon: Mail },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {fields.map((f, i) => {
        const Icon = f.icon;
        return (
          <div
            key={f.key}
            className={`group flex items-center gap-3 px-3.5 py-2.5 transition-colors focus-within:bg-primary/[0.04] hover:bg-muted/40 ${i > 0 ? 'border-t border-border/60' : ''}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor={`contact-field-${f.key}`} className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {f.label}
              </label>
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
            <Pencil className="h-3.5 w-3.5 shrink-0 text-transparent transition-colors group-hover:text-muted-foreground/50 group-focus-within:text-primary/60" />
          </div>
        );
      })}
    </div>
  );
}
