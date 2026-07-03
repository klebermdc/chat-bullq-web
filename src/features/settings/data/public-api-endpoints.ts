export interface PublicEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  curl: string;
}

const BASE = '/api/v1/public';

export const PUBLIC_API_ENDPOINTS: { group: string; endpoints: PublicEndpoint[] }[] = [
  {
    group: 'Contatos',
    endpoints: [
      { method: 'GET', path: `${BASE}/contacts`, summary: 'Lista contatos', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/contacts?search=ana&page=1&limit=20"` },
      { method: 'POST', path: `${BASE}/contacts`, summary: 'Cria/resolve contato', curl: `curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"phone":"5511999998888","name":"Ana","channelId":"<id>"}' "$BASE/contacts"` },
      { method: 'PATCH', path: `${BASE}/contacts/:id`, summary: 'Atualiza contato', curl: `curl -X PATCH -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"name":"Ana S."}' "$BASE/contacts/<id>"` },
      { method: 'DELETE', path: `${BASE}/contacts/:id`, summary: 'Remove contato', curl: `curl -X DELETE -H "Authorization: Bearer $KEY" "$BASE/contacts/<id>"` },
    ],
  },
  {
    group: 'Canais',
    endpoints: [
      { method: 'GET', path: `${BASE}/channels`, summary: 'Lista canais', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/channels"` },
      { method: 'GET', path: `${BASE}/channels/:id`, summary: 'Detalha canal', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/channels/<id>"` },
    ],
  },
  {
    group: 'Conversas',
    endpoints: [
      { method: 'GET', path: `${BASE}/conversations`, summary: 'Lista conversas', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/conversations?status=OPEN"` },
      { method: 'GET', path: `${BASE}/conversations/:id`, summary: 'Detalha conversa', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/conversations/<id>"` },
      { method: 'GET', path: `${BASE}/conversations/:id/messages`, summary: 'Mensagens da conversa', curl: `curl -H "Authorization: Bearer $KEY" "$BASE/conversations/<id>/messages"` },
      { method: 'POST', path: `${BASE}/conversations/:id/close`, summary: 'Fecha conversa', curl: `curl -X POST -H "Authorization: Bearer $KEY" "$BASE/conversations/<id>/close"` },
      { method: 'POST', path: `${BASE}/conversations/:id/reopen`, summary: 'Reabre conversa', curl: `curl -X POST -H "Authorization: Bearer $KEY" "$BASE/conversations/<id>/reopen"` },
      { method: 'POST', path: `${BASE}/conversations/:id/assign`, summary: 'Transfere conversa', curl: `curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"assignedToId":"<userId>"}' "$BASE/conversations/<id>/assign"` },
    ],
  },
  {
    group: 'Mensagens',
    endpoints: [
      { method: 'POST', path: `${BASE}/messages`, summary: 'Envia mensagem', curl: `curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"conversationId":"<id>","type":"TEXT","content":{"text":"Olá!"}}' "$BASE/messages"` },
    ],
  },
];
