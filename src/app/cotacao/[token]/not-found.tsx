import { QuoteUnavailable } from '@/features/quotes/components/public/quote-unavailable';

/** Token inválido ou cotação que não existe: página amigável, com status 404. */
export default function QuoteNotFound() {
  return <QuoteUnavailable reason="not-found" />;
}
