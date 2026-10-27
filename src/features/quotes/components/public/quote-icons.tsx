/** Ícones de traço do design aprovado (decorativos: sempre aria-hidden). */

interface IconProps {
  size?: number;
  color?: string;
}

const stroke = (color = 'currentColor', width = 2) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function ClockIcon({ size = 18, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke(color, 2.2)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PeopleIcon({ size = 22, color = '#6B4EFF' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke(color)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M16.5 14.2c2.6.2 4.4 2 5 5" />
    </svg>
  );
}

export function CalendarIcon({ size = 22, color = '#E2405F' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke(color)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function TicketIcon({ size = 22, color = '#0E8C97' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke(color)}>
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M13 6v2M13 11v2M13 16v2" />
    </svg>
  );
}

export function ChevronIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke('currentColor', 2.2)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChatIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke('currentColor', 2.2)}>
      <path d="M4 18l1.3-3.9A8 8 0 1 1 9 18.7z" />
    </svg>
  );
}

export function DownloadIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke()}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

export function LockIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke()}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
