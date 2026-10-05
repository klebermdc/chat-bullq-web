'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, Users, MessageSquare, Plus, NotebookPen } from 'lucide-react';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { NewContactDialog } from '@/features/contacts/components/new-contact-dialog';
import { ContactNotesDialog } from '@/features/contacts/components/contact-notes-dialog';
import { useOrgId } from '@/hooks/use-org-query-key';
import { tagColor } from '@/lib/origin-tag-colors';
import { ZappfyIcon, WasenderIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { getInitials } from '@/lib/initials';
import { TagChip } from '@/components/ui/tag-chip';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

// Fundo opaco e linha por sombra: o cabeçalho fica grudado no topo enquanto as linhas rolam por baixo.
const thCls =
  'sticky top-0 z-10 whitespace-nowrap bg-muted px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]';
const tdCls = 'px-3 py-3';

/**
 * Colunas de dado curto têm largura fixa; o nome (primeira coluna, sem
 * largura) fica com toda a sobra, que antes se perdia entre Canais e Tags.
 */
const contactCols = (
  <colgroup>
    <col />
    <col className="w-[148px]" />
    <col className="w-[150px]" />
    <col className="w-[140px]" />
    <col className="w-[104px]" />
    <col className="w-[72px]" />
  </colgroup>
);

const channelChipCls =
  'inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground';

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_WASENDER: WasenderIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [notesContact, setNotesContact] = useState<Contact | null>(null);
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', orgId, search, page],
    queryFn: () => contactsService.list({ search, page: String(page), limit: '20' }),
  });

  const contacts = data?.contacts || [];
  const pagination = data?.pagination;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['contacts'] });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="w-full shrink-0">
        <SettingsPageHeader
          title="Contatos"
          description={
            pagination ? (
              <>
                <span className="font-mono tabular-nums">{pagination.total}</span>{' '}
                {pagination.total === 1 ? 'contato' : 'contatos'}
              </>
            ) : (
              'Carregando…'
            )
          }
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo contato
            </Button>
          }
        />

        <div className="relative mt-6">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar contatos"
            placeholder="Buscar por nome, telefone ou e-mail…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${controlCls} w-full pl-9`}
          />
        </div>
      </div>

      {/* As logos de canal usam gradiente SVG com id fixo. O navegador resolve
          `url(#id)` pela primeira ocorrência na página; quando ela está dentro
          da lista escondida (display: none), o gradiente não pinta e sobra só
          o traço branco, invisível no chip claro. Esta cópia fora de
          `display: none` garante uma definição válida antes das listas. */}
      <div aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
        {Object.entries(channelIcons).map(([type, Icon]) => (
          <Icon key={type} className="h-3 w-3" />
        ))}
      </div>

      {/* A troca cards ↔ tabela segue a largura deste cartão (container
          query), não a da janela: com a navegação de Configurações ao lado, a
          tabela só entra quando há espaço para as colunas. */}
      <div className="@container mt-4 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Cards no mobile */}
          <div className="flex flex-col gap-2 p-3 @3xl:hidden">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))
            ) : contacts.length === 0 ? (
              <EmptyState
                size="sm"
                icon={Users}
                title="Nenhum contato encontrado"
                description={search ? 'Tente outro nome, telefone ou e-mail.' : 'Crie o primeiro pelo botão Novo contato.'}
              />
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      {getInitials(contact.name) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {contact.name || 'Sem nome'}
                      </p>
                      <p className="truncate font-mono text-xs tabular-nums text-muted-foreground">
                        {contact.phone || contact.email || '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{contact._count?.conversations || 0}</span> conversas
                    </span>
                    <button
                      onClick={() => setNotesContact(contact)}
                      aria-label={`Observações de ${contact.name || 'contato sem nome'}`}
                      title={contact.notes?.trim() ? 'Observações do lead' : 'Adicionar observação'}
                      className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        contact.notes?.trim()
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <NotebookPen aria-hidden="true" className="h-4 w-4" />
                      {contact.notes?.trim() && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                  {(contact.channels.length > 0 || contact.tags.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.channels.map((ch) => {
                        const Icon = channelIcons[ch.channel.type] || MessageSquare;
                        return (
                          <span key={ch.id} className={channelChipCls} title={ch.channel.name}>
                            <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
                            <span className="min-w-0 truncate">{ch.channel.name}</span>
                          </span>
                        );
                      })}
                      {contact.tags.map((t) => (
                        <TagChip key={t.tag.id} name={t.tag.name} color={tagColor(t.tag)} className="max-w-32" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <table aria-label="Contatos" className="hidden w-full table-fixed @3xl:table">
            {contactCols}
            {/* Cabeçalho na mesma tabela (fixo no topo da rolagem), para as
                células ficarem ligadas aos títulos das colunas. */}
            <thead>
              <tr>
                <th scope="col" className={`${thCls} text-left`}>Contato</th>
                <th scope="col" className={`${thCls} text-left`}>Telefone</th>
                <th scope="col" className={`${thCls} text-left`}>Canais</th>
                <th scope="col" className={`${thCls} text-left`}>Tags</th>
                <th scope="col" className={`${thCls} text-right`}>Conversas</th>
                <th scope="col" className={`${thCls} text-center`}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className={tdCls}><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                    <td className={tdCls}><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className={tdCls}><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                    <td className={tdCls}><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className={tdCls}><div className="h-4 w-8 animate-pulse rounded bg-muted" /></td>
                    <td className={tdCls}><div className="h-4 w-8 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4">
                    <EmptyState
                      size="sm"
                      icon={Users}
                      title="Nenhum contato encontrado"
                      description={search ? 'Tente outro nome, telefone ou e-mail.' : 'Crie o primeiro pelo botão Novo contato.'}
                    />
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/50">
                    <th scope="row" className={`${tdCls} text-left font-normal`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                          {getInitials(contact.name) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground" title={contact.name || undefined}>
                            {contact.name || 'Sem nome'}
                          </p>
                          {contact.email && (
                            <p className="truncate text-[11px] text-muted-foreground" title={contact.email}>{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </th>
                    <td className={`${tdCls} whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground`}>
                      {contact.phone || '—'}
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        {contact.channels.map((ch) => {
                          const Icon = channelIcons[ch.channel.type] || MessageSquare;
                          return (
                            <span key={ch.id} className={channelChipCls} title={ch.channel.name}>
                              <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
                              <span className="min-w-0 truncate">{ch.channel.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((t) => (
                          <TagChip key={t.tag.id} name={t.tag.name} color={tagColor(t.tag)} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {contact._count?.conversations || 0}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setNotesContact(contact)}
                        aria-label={`Observações de ${contact.name || 'contato sem nome'}`}
                        title={contact.notes?.trim() ? 'Observações do lead' : 'Adicionar observação'}
                        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          contact.notes?.trim()
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <NotebookPen aria-hidden="true" className="h-4 w-4" />
                        {contact.notes?.trim() && (
                          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação fixa no rodapé */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página <span className="font-mono tabular-nums">{pagination.page}</span> de{' '}
              <span className="font-mono tabular-nums">{pagination.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewContactDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />

      <ContactNotesDialog
        open={!!notesContact}
        onClose={() => setNotesContact(null)}
        contactId={notesContact?.id ?? ''}
        contactName={notesContact?.name}
        onSaved={refresh}
      />
    </div>
  );
}
