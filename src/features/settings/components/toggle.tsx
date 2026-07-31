'use client';

/**
 * Toggle switch reutilizável das telas de Configurações.
 * Extraído da página de IA quando a aba Horários passou a precisar do mesmo controle.
 */
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
