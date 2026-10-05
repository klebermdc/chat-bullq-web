'use client';

import { ProjectsTable } from '@/features/projects/components/projects-table';
import { usePageTitle } from '@/components/layout/use-page-title';

// O cabeçalho e a largura vêm de dentro de <ProjectsTable> (outro dono); aqui
// ficam só a rolagem da página e o título da aba.
export default function ProjectsPage() {
  usePageTitle('Projetos');
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <ProjectsTable />
    </div>
  );
}
