import { formatDayCompact, formatPeople, formatQuoteMoney, parseCalendarDay, plural } from '../../lib/quote-format';
import { CalendarIcon, PeopleIcon, TicketIcon } from './quote-icons';

interface Props {
  people: { adults: number; children: number };
  tripRange: { startDate: string; endDate: string } | null;
  total: number | null;
  currency: string;
  itemCount: number;
}

interface Fact {
  key: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}

function tripYears(range: { startDate: string; endDate: string }): string {
  const from = parseCalendarDay(range.startDate)?.year;
  const to = parseCalendarDay(range.endDate)?.year;
  return from === to || !to ? String(from) : `${from}–${to}`;
}

/** Resumo em três cartões; cartão sem dado some (e a grade se ajusta). */
export function QuoteFacts({ people, tripRange, total, currency, itemCount }: Props) {
  const travelers = people.adults + people.children;
  const peopleText = formatPeople(people.adults, people.children);
  const dates = tripRange ? formatDayCompact(tripRange.startDate, tripRange.endDate) : null;
  const money = formatQuoteMoney(total, currency);
  const candidates: (Fact | null)[] = [
    peopleText
      ? { key: 'people', icon: <PeopleIcon />, title: plural(travelers, 'viajante', 'viajantes'), detail: peopleText }
      : null,
    dates && tripRange ? { key: 'dates', icon: <CalendarIcon />, title: dates, detail: tripYears(tripRange) } : null,
    money
      ? { key: 'total', icon: <TicketIcon />, title: money, detail: `total, ${plural(itemCount, 'item', 'itens')}` }
      : null,
  ];
  const facts = candidates.filter((f): f is Fact => f !== null);

  if (facts.length === 0) return null;
  return (
    <ul
      className="qt-facts"
      aria-label="Resumo"
      style={{ '--qt-cols': facts.length, listStyle: 'none', margin: 0, paddingLeft: 0, paddingRight: 0 } as React.CSSProperties}
    >
      {facts.map((f) => (
        <li key={f.key} className="qt-fact">
          {f.icon}
          <b className={f.key === 'total' ? 'qt-num' : undefined}>{f.title}</b>
          <span>{f.detail}</span>
        </li>
      ))}
    </ul>
  );
}
