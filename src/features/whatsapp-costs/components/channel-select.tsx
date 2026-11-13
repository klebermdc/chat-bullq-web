import { controlSmCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { formatCost } from '../lib/format';
import type { ChannelCosts } from '../services/whatsapp-costs.service';

function optionLabel(channel: ChannelCosts): string {
  if (channel.status === 'error') return `${channel.channelName} (sem dados da Meta)`;
  return `${channel.channelName} · ${formatCost(channel.totals.cost, channel.currency)}`;
}

/** Escolha do número do WhatsApp; cada opção já mostra o custo do período. */
export function ChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: ReadonlyArray<ChannelCosts>;
  value: string;
  onChange: (channelId: string) => void;
}) {
  if (channels.length <= 1) return null;
  return (
    <label className="flex w-full min-w-0 items-center gap-2 text-xs text-muted-foreground sm:w-auto">
      <span className="shrink-0">Número</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlSmCls, 'min-w-0 flex-1 sm:max-w-xs')}
      >
        {channels.map((channel) => (
          <option key={channel.channelId} value={channel.channelId}>
            {optionLabel(channel)}
          </option>
        ))}
      </select>
    </label>
  );
}
