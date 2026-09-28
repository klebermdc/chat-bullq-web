// Mensagens de erro que chegam ao usuário. O interceptor de lib/api.ts já
// rejeita com `new Error(mensagemDoServidor)` — sem `response` —, então ler
// `err.response.data.message` nas telas devolve sempre undefined e o operador
// só via o texto genérico. Use getErrorMessage(err, 'Erro ao X') em todo catch.

const NETWORK_MESSAGE = 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
const TIMEOUT_MESSAGE = 'O servidor demorou para responder. Tente de novo em instantes.';

// Mensagens que a API ainda devolve em inglês.
const KNOWN_API_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'E-mail ou senha incorretos.',
  'Account is deactivated': 'Sua conta está desativada. Fale com o seu gestor.',
  'Email already registered': 'Este e-mail já está cadastrado.',
  'Forbidden resource': 'Você não tem permissão para fazer isso.',
  Unauthorized: 'Sua sessão expirou. Entre de novo.',
  'Internal server error': '',
};

// O axios diz só o status quando o servidor não mandou mensagem: aí o texto
// da própria tela ("Erro ao salvar") informa mais.
const STATUS_ONLY = /^Request failed with status code \d+$/;
const TIMEOUT = /^timeout of \d+ms exceeded$/;

export function translateApiMessage(raw: string): string {
  if (raw in KNOWN_API_MESSAGES) return KNOWN_API_MESSAGES[raw];
  if (raw === 'Network Error') return NETWORK_MESSAGE;
  if (TIMEOUT.test(raw)) return TIMEOUT_MESSAGE;
  return raw;
}

function readServerMessage(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  if (Array.isArray(message)) return typeof message[0] === 'string' ? message[0] : undefined;
  return typeof message === 'string' ? message : undefined;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  const raw = readServerMessage(err) ?? (err instanceof Error ? err.message : '');
  if (!raw || STATUS_ONLY.test(raw)) return fallback;
  return translateApiMessage(raw) || fallback;
}
