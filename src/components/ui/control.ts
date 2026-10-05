/**
 * Aparência única para campo, seletor e área de texto escritos à mão
 * (`<input>`, `<select>`, `<textarea>`): mesma altura, borda, fundo e foco
 * em todas as telas. Use `controlCls` em formulário e `controlSmCls` em barra
 * de filtro.
 */
const shared =
  'rounded-lg border border-input bg-background text-foreground shadow-soft outline-none ' +
  'transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const controlCls = `${shared} h-9 px-3 text-sm`;
export const controlSmCls = `${shared} h-8 px-2.5 text-xs`;
