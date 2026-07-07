import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-primary/12 text-primary',
        hot: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
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
