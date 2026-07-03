'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { PUBLIC_API_ENDPOINTS } from '@/features/settings/data/public-api-endpoints';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  POST: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  PATCH: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  DELETE: 'text-red-600 bg-red-50 dark:bg-red-900/20',
};

export function ApiReference() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
  };

  return (
    <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">API Pública (REST)</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Autentique com{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Authorization: Bearer &lt;API_KEY&gt;</code>.
          </p>
        </div>
        <a
          href="/docs/public"
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ExternalLink className="h-4 w-4" /> Documentação interativa
        </a>
      </div>

      <div className="mt-6 space-y-6">
        {PUBLIC_API_ENDPOINTS.map((group) => (
          <div key={group.group}>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{group.group}</h3>
            <div className="mt-2 space-y-2">
              {group.endpoints.map((ep) => {
                const id = `${ep.method}-${ep.path}`;
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${METHOD_COLORS[ep.method]}`}>
                        {ep.method}
                      </span>
                      <code className="text-xs text-zinc-700 dark:text-zinc-300">{ep.path}</code>
                      <span className="ml-auto text-xs text-zinc-400">{ep.summary}</span>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <pre className="flex-1 overflow-x-auto rounded bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-zinc-100">
                        {ep.curl}
                      </pre>
                      <button
                        onClick={() => copy(ep.curl, id)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Copiar"
                      >
                        {copied === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
