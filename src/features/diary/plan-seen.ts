const STORAGE_KEY = 'diary-plan-seen-day';

const today = () => new Date().toLocaleDateString('en-CA');

/** Só conforto deste navegador: sem storage, o aviso apenas volta a aparecer. */
export function wasPlanSeenToday(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === today();
  } catch {
    return false;
  }
}

export function markPlanSeenToday(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, today());
  } catch {
    // Navegador sem storage: o aviso continua aparecendo, nada quebra.
  }
}
