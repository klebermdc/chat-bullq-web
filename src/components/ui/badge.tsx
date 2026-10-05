import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-primary/12 text-primary',
        hot: 'bg-warning-wash text-warning-ink',
        success: 'bg-success-wash text-success-ink',
        urgent: 'bg-urgent-wash text-urgent-ink',
        info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
