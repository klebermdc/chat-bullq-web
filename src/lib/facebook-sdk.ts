// Carrega o Facebook JS SDK sob demanda e resolve quando FB estiver pronto.
// Versão alinhada com o app de exemplo de Tech Provider da Meta.
const FB_SDK_VERSION = 'v24.0';
const SDK_TIMEOUT_MS = 15000;

let sdkPromise: Promise<any> | null = null;

/** O SDK já está pronto pra usar AGORA, de forma síncrona? */
export function isFacebookSdkReady(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).FB);
}

export function loadFacebookSdk(appId: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // Bloqueador de anúncios costuma engolir o connect.facebook.net sem
    // disparar onerror. Sem este teto a promise fica pendurada pra sempre e
    // quem chamou nunca sabe o que houve.
    const timer = setTimeout(() => {
      sdkPromise = null;
      reject(new Error('Tempo esgotado ao carregar o SDK do Facebook — bloqueador de anúncios ou rede?'));
    }, SDK_TIMEOUT_MS);

    const init = () => {
      clearTimeout(timer);
      (window as any).FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: FB_SDK_VERSION });
      resolve((window as any).FB);
    };
    // O SDK pode já ter carregado por outro caminho — nesse caso fbAsyncInit
    // nunca dispara e a promise ficaria pendurada pra sempre.
    if ((window as any).FB) return init();
    (window as any).fbAsyncInit = init;
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return;
    const js = document.createElement('script');
    js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.onerror = () => {
      clearTimeout(timer);
      sdkPromise = null;
      reject(new Error('Falha ao carregar o SDK do Facebook'));
    };
    document.body.appendChild(js);
  });
  return sdkPromise;
}
