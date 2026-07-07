import { cn } from '@/lib/utils';

/**
 * OFP Chat brand logo.
 *
 * `icon`   — just the speech-bubble mark (square, good for favicons/avatars).
 * `full`   — mark + "OFP | Chat" wordmark lockup.
 *
 * Vector SVG so it stays crisp at any size and adapts to dark mode
 * (the wordmark uses `currentColor`).
 */
type LogoProps = {
  variant?: 'full' | 'icon';
  className?: string;
};

function BubbleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ofp-bubble" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2B8BFF" />
          <stop offset="1" stopColor="#4B54F0" />
        </linearGradient>
      </defs>
      {/* speech bubble outline with tail at bottom-left */}
      <path
        d="M14 7H34a7 7 0 0 1 7 7v10a7 7 0 0 1-7 7H22l-6.5 7v-7H14a7 7 0 0 1-7-7V14a7 7 0 0 1 7-7Z"
        stroke="url(#ofp-bubble)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* three dots */}
      <circle cx="17" cy="19" r="2.3" fill="url(#ofp-bubble)" />
      <circle cx="24" cy="19" r="2.3" fill="url(#ofp-bubble)" />
      <circle cx="31" cy="19" r="2.3" fill="url(#ofp-bubble)" />
    </svg>
  );
}

export function Logo({ variant = 'full', className }: LogoProps) {
  if (variant === 'icon') {
    return <BubbleMark className={cn('h-8 w-8', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BubbleMark className="h-9 w-9 shrink-0" />
      <span className="flex items-baseline gap-2 leading-none">
        <span className="text-2xl font-extrabold italic tracking-tight text-zinc-900 dark:text-white">
          OFP
        </span>
        <span className="h-5 w-px translate-y-0.5 bg-gradient-to-b from-[#2B8BFF] to-[#4B54F0]" />
        <span className="text-2xl font-normal tracking-tight text-zinc-800 dark:text-zinc-100">
          Chat
        </span>
      </span>
    </div>
  );
}

export { BubbleMark };
