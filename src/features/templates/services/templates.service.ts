import { api } from '@/lib/api';

export type TemplateStatus = 'DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|'PAUSED'|'DISABLED';
export interface TemplateButton { type:'QUICK_REPLY'|'URL'|'PHONE_NUMBER'; text:string; url?:string; phone?:string; }
export interface TemplateComponents {
  header?: { format:'TEXT'|'IMAGE'|'VIDEO'|'DOCUMENT'; text?:string; exampleHandle?:string };
  body: { text:string }; footer?: { text:string }; buttons?: TemplateButton[];
}
export interface Template {
  id:string; name:string; displayName?:string; category:'MARKETING'|'UTILITY'; language:string;
  status:TemplateStatus; components:TemplateComponents; variableExamples:Record<string,string>;
  rejectionReason?:string|null; metaTemplateId?:string|null; createdAt:string; updatedAt:string;
}
export interface CreateTemplatePayload { name:string; displayName?:string; category:'MARKETING'|'UTILITY'; language?:string; components:TemplateComponents; variableExamples?:Record<string,string>; }
export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export const templatesService = {
  list: (channelId:string) => api.get(`/channels/${channelId}/message-templates`).then(r => r.data.data as Template[]),
  getById: (id:string, channelId:string) => api.get(`/channels/${channelId}/message-templates`).then(r => (r.data.data as Template[]).find(t => t.id===id)),
  create: (channelId:string, p:CreateTemplatePayload) => api.post(`/channels/${channelId}/message-templates`, p).then(r => r.data.data as Template),
  update: (id:string, channelId:string, p:UpdateTemplatePayload) => api.patch(`/channels/${channelId}/message-templates/${id}`, p).then(r => r.data.data as Template),
  submit: (id:string, channelId:string) => api.post(`/channels/${channelId}/message-templates/${id}/submit`).then(r => r.data.data as Template),
  sync: (channelId:string) => api.post(`/channels/${channelId}/message-templates/sync`).then(r => r.data.data as Template[]),
  remove: (id:string, channelId:string) => api.delete(`/channels/${channelId}/message-templates/${id}`).then(r => r.data),
  uploadMedia: (channelId:string, file:File) => { const fd=new FormData(); fd.append('file',file); return api.post(`/channels/${channelId}/message-templates/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }).then(r => (r.data.data as {handle:string})?.handle ?? (r.data as { handle?:string }).handle); },
};
