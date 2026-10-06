import type { Tag } from '../services/tags.service';

export interface TagDraft {
  name: string;
  color: string;
  textColor: string | null;
}

export type TagChanges = Partial<TagDraft>;

/**
 * Só os campos que mudaram na edição de uma tag.
 *
 * O nome só vai quando foi alterado: a API recusa (409) qualquer PATCH com
 * `name` igual ao de OUTRA tag sem diferenciar maiúsculas — e existem pares
 * assim ("BÁRBARA" e "Bárbara"). Mandar o nome intacto junto com a cor fazia
 * a troca de cor falhar nessas tags.
 */
export function tagChanges(tag: Tag, draft: TagDraft): TagChanges {
  const name = draft.name.trim();
  return {
    ...(name !== tag.name && { name }),
    ...(draft.color !== tag.color && { color: draft.color }),
    ...(draft.textColor !== (tag.textColor ?? null) && { textColor: draft.textColor }),
  };
}
