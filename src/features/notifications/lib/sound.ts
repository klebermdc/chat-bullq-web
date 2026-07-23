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

/** Destrava o áudio no 1º gesto do usuário (browsers bloqueiam autoplay). */
export function installSoundUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  const unlock = () => {
    const a = getAudio();
    if (!a) return;
    a.muted = true;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; unlocked = true; })
      .catch(() => { /* tenta de novo no próximo gesto */ });
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function playNotifySound() {
  const a = getAudio();
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(() => { /* autoplay ainda bloqueado; ignora */ });
}
