'use client';

import { Image as ImageIcon, Video, FileText, Reply, ExternalLink, Phone } from 'lucide-react';
import type { Form } from './template-builder';

export function TemplatePreview({ form }: { form: Form }) {
  const { header, bodyText, footerText, buttons, variableExamples } = form;

  // Substitui cada {{n}} pelo exemplo informado (fallback mantém o placeholder).
  const renderedBody = bodyText.replace(/\{\{(\d+)\}\}/g, (match, n: string) => {
    const ex = variableExamples[n];
    return ex && ex.trim() ? ex : match;
  });

  const MediaIcon =
    header.format === 'VIDEO' ? Video : header.format === 'DOCUMENT' ? FileText : ImageIcon;

  return (
    <div className="rounded-xl p-4 bg-[#efeae2] dark:bg-zinc-800">
      <div className="max-w-[20rem] rounded-lg bg-white dark:bg-zinc-900 p-2.5 shadow text-sm text-zinc-900 dark:text-zinc-100">
        {/* Cabeçalho */}
        {header.format === 'TEXT' && header.text ? (
          <div className="font-semibold mb-1">{header.text}</div>
        ) : null}

        {header.format !== 'NONE' && header.format !== 'TEXT' ? (
          header.previewUrl && header.format === 'IMAGE' ? (
            <img
              src={header.previewUrl}
              alt="Prévia do cabeçalho"
              className="rounded mb-1 max-h-40 w-full object-cover"
            />
          ) : (
            <div className="mb-1 flex items-center gap-2 rounded bg-zinc-100 dark:bg-zinc-800 px-3 py-4 text-zinc-500 dark:text-zinc-400">
              <MediaIcon className="h-5 w-5" />
              <span className="text-xs">arquivo</span>
            </div>
          )
        ) : null}

        {/* Corpo */}
        {bodyText.trim() ? (
          <div className="whitespace-pre-wrap break-words">{renderedBody}</div>
        ) : (
          <div className="text-zinc-400 dark:text-zinc-500">A prévia aparece aqui</div>
        )}

        {/* Rodapé */}
        {footerText ? (
          <div className="text-xs text-zinc-400 mt-1">{footerText}</div>
        ) : null}

        {/* Botões */}
        {buttons.length > 0 ? (
          <div className="mt-2 border-t border-zinc-100 dark:border-zinc-800">
            {buttons.map((b, i) => {
              const Icon =
                b.type === 'URL' ? ExternalLink : b.type === 'PHONE_NUMBER' ? Phone : Reply;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1.5 pt-1 pb-0.5 text-center text-sky-600 text-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {b.text || 'Botão'}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
