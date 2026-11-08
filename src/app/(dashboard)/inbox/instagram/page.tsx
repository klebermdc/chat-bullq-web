import { redirect } from 'next/navigation';

/**
 * O Inbox Instagram virou parte do inbox único. A rota fica só para não
 * quebrar favoritos e links antigos: manda para /inbox levando a query
 * (ex.: ?conversationId=) junto.
 */
export default async function InboxInstagramRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const query = params.toString();
  redirect(query ? `/inbox?${query}` : '/inbox');
}
