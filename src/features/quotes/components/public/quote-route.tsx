import type { RouteStop } from '../../lib/quote-blocks';
import { formatDayShort } from '../../lib/quote-format';

interface Props {
  route: RouteStop[];
  sellerFirstName: string | null;
}

function ItemStop({ stop }: { stop: Extract<RouteStop, { kind: 'item' }> }) {
  const when = formatDayShort(stop.item.startDate, stop.item.endDate) ?? 'Data a combinar';
  const provider = stop.item.provider.trim();
  return (
    <li>
      <div className="qt-rail">
        <span className={`qt-dot ${stop.tone}`} />
        <span className="qt-dash" />
      </div>
      <div className="qt-stop">
        <span className={`qt-when ${stop.tone}`}>{when}</span>
        <b>{provider || stop.item.title}</b>
        {provider && <span className="qt-stop-sub">{stop.item.title}</span>}
      </div>
    </li>
  );
}

function FreeStop({ stop, sellerFirstName }: { stop: Extract<RouteStop, { kind: 'free' }>; sellerFirstName: string | null }) {
  const who = sellerFirstName ? `Fale com ${sellerFirstName}.` : 'É só pedir.';
  return (
    <li>
      <div className="qt-rail">
        <span className="qt-dot free" />
        <span className="qt-dash" />
      </div>
      <div className="qt-stop">
        <span className="qt-when free">{formatDayShort(stop.startDate, stop.endDate)}</span>
        <span className="qt-stop-sub">Dias livres. Quer incluir algo? {who}</span>
      </div>
    </li>
  );
}

/** Roteiro: os itens na ordem das datas e os dias vazios entre eles. */
export function QuoteRoute({ route, sellerFirstName }: Props) {
  return (
    <section className="qt-block" aria-labelledby="qt-h-route">
      <h2 id="qt-h-route">Seu roteiro</h2>
      <ol className="qt-route">
        {route.map((stop, i) =>
          stop.kind === 'item' ? (
            <ItemStop key={i} stop={stop} />
          ) : (
            <FreeStop key={i} stop={stop} sellerFirstName={sellerFirstName} />
          ),
        )}
      </ol>
    </section>
  );
}
