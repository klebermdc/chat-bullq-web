'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bug } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { bugsService, type BugFilters, type ErrorIssueStatus } from '@/features/bugs/services/bugs.service';
import { BugFilterBar, DEFAULT_BUG_FILTERS, isDefaultFilters } from '@/features/bugs/components/bug-filters';
import { BugList } from '@/features/bugs/components/bug-list';
import { BugDetail } from '@/features/bugs/components/bug-detail';

const STATUS_ADJECTIVE: Record<ErrorIssueStatus, string> = {
  OPEN: 'aberto',
  RESOLVED: 'resolvido',
  MUTED: 'silenciado',
};

// Singular/plural do substantivo E do adjetivo de situação — "1 problema
// aberto", "2 problemas abertos", nunca "1 problemas".
function buildSubtitle(total: number, status: ErrorIssueStatus | undefined): string {
  const noun = total === 1 ? 'problema' : 'problemas';
  const adjectiveBase = status ? STATUS_ADJECTIVE[status] : null;
  if (!adjectiveBase) {
    return `${total} ${noun} encontrado${total === 1 ? '' : 's'}`;
  }
  const adjective = total === 1 ? adjectiveBase : `${adjectiveBase}s`;
  return `${total} ${noun} ${adjective}`;
}

interface BugsScreenProps {
  /** Id vindo da rota `/bugs/[id]` — abre o detalhe já selecionado. */
  initialSelectedId?: string;
}

export function BugsScreen({ initialSelectedId }: BugsScreenProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<BugFilters>(DEFAULT_BUG_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  // Única porta de troca de seleção: mantém o estado local e a URL sempre
  // de acordo (para copiar o endereço ou usar "voltar" fazer o esperado).
  // `replace` (não `push`) para o botão voltar sair do painel em vez de
  // andar por cada problema que o usuário clicou.
  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    router.replace(id ? `/bugs/${id}` : '/bugs');
  };

  // O BottomSheet é um Dialog do Headless UI: com `open` true ele trava o
  // scroll do body e captura o foco, mesmo quando `lg:hidden` o esconde. Por
  // isso a folha só pode abrir de verdade em tela estreita — o próprio
  // componente avisa que "quem chama decide quando abrir". Sem esta trava,
  // clicar numa linha no desktop congelava a rolagem da página.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bugs', filters],
    queryFn: () => bugsService.list(filters),
    // Painel de bug não precisa de tempo real. 30s é o bastante, e evita
    // depender do socket — que tem um problema conhecido de expiração de JWT.
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  // Filtro novo pode deixar de fora o problema que estava selecionado —
  // e trocar de página também: a seleção quase certamente não está na
  // página nova. Em ambos os casos, limpamos.
  const handleFiltersChange = (next: BugFilters) => {
    setFilters(next);
    handleSelect(null);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    handleSelect(null);
  };

  return (
    // Sem checagem de isSuperAdmin aqui: `src/app/(platform)/layout.tsx` já
    // redireciona pra /inbox quem não é superadmin antes de chegar nesta
    // página — duplicar a checagem só criaria dois lugares pra errar.
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <header>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Bugs</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {buildSubtitle(total, filters.status)}
        </p>
      </header>

      <BugFilterBar filters={filters} onChange={handleFiltersChange} />

      {/* Em telas lg+, lista e detalhe ficam lado a lado, cada um com o
          próprio scroll vertical (altura limitada ao viewport). Em telas
          estreitas, a lista ocupa a largura toda e o detalhe some daqui —
          ele vive só no BottomSheet abaixo. O gate de qual lado monta o
          `BugDetail` é `isNarrow` (JS), não a classe `lg:*` — ver comentário
          no BottomSheet abaixo. Nenhum dos dois lados nunca rola na
          horizontal. */}
      <div className="flex flex-col gap-4 lg:h-[calc(100vh-16rem)] lg:flex-row lg:overflow-hidden">
        <div className="overflow-y-auto lg:w-96 lg:flex-none">
          <BugList
            items={items}
            total={total}
            page={filters.page ?? 1}
            perPage={filters.perPage ?? 25}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            selectedId={selectedId}
            onSelect={handleSelect}
            onPageChange={handlePageChange}
            isDefaultFilters={isDefaultFilters(filters)}
          />
        </div>

        {!isNarrow && selectedId && (
          <div className="overflow-y-auto lg:flex-1">
            <BugDetail
              id={selectedId}
              onClose={() => handleSelect(null)}
              onChanged={() => refetch()}
            />
          </div>
        )}
      </div>

      {/* Padrão mobile do projeto (sem Sheet/Drawer): BottomSheet. Gate real
          é `isNarrow` (JS/matchMedia), não CSS — o Dialog do Headless UI
          trava scroll e foco assim que `open` vira true, mesmo escondido por
          `lg:hidden`. Fechar a folha limpa a seleção, senão reabrir a mesma
          linha não reabre nada (o efeito no BugDetail não teria mudança de
          `id` pra disparar). */}
      <BottomSheet
        open={isNarrow && !!selectedId}
        onClose={() => handleSelect(null)}
        title="Detalhe do problema"
      >
        {isNarrow && selectedId && (
          <div className="px-4 pb-4">
            <BugDetail
              id={selectedId}
              onClose={() => handleSelect(null)}
              onChanged={() => refetch()}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
