// Carrega o Facebook JS SDK sob demanda e resolve quando FB estiver pronto.
let sdkPromise: Promise<any> | null = null;

export function loadFacebookSdk(appId: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' });
      resolve((window as any).FB);
    };
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return;
    const js = document.createElement('script');
    js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.onerror = () => {
      sdkPromise = null;
      reject(new Error('Falha ao carregar o SDK do Facebook'));
    };
    document.body.appendChild(js);
  });
  return sdkPromise;
}
