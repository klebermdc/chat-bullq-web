'use client';

import { use } from 'react';
import { TemplateBuilder } from '@/features/templates/components/template-builder';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TemplateBuilder templateId={id} />;
}
