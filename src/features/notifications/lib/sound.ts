let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio('/sounds/notify.mp3');
    audio.preload = 'auto';
    audio.volume = 0.5;
  }
  return audio;
}

const GESTURES = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;

/**
 * Destrava o áudio no 1º gesto REAL do usuário (browsers bloqueiam autoplay
 * até uma interação). Dois cuidados que a versão anterior não tinha e que
 * faziam o som nunca destravar no inbox:
 *
 * 1) Fase de CAPTURA (`capture: true`). Popovers/dialogs/botões do inbox
 *    (Radix etc.) chamam `stopPropagation` no pointerdown/click, então o
 *    evento nunca chegava ao `window` na fase de bubble e o unlock não rodava.
 *    Na captura, disparamos ANTES de qualquer stopPropagation.
 * 2) Só removemos os listeners depois de um `play()` CONFIRMADO. A versão
 *    antiga usava `{ once: true }` + removia na 1ª tentativa — se aquele
 *    play falhasse (transiente), nunca mais tentava e o áudio ficava travado.
 */
export function installSoundUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  const unlock = () => {
    const a = getAudio();
    if (!a) return;
    a.muted = true;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        unlocked = true;
        GESTURES.forEach((g) => window.removeEventListener(g, unlock, true));
      })
      .catch(() => {
        a.muted = false; // mantém os listeners: re-tenta no próximo gesto
      });
  };
  GESTURES.forEach((g) => window.addEventListener(g, unlock, true));
}

export function playNotifySound() {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
  } catch {
    /* elemento ainda não pronto — ignora */
  }
  a.play().catch(() => {
    /* autoplay ainda bloqueado (sem gesto prévio); ignora */
  });
}
