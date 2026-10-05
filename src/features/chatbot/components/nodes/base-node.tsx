'use client';

import { Handle, Position } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';

interface BaseNodeProps {
  label: string;
  icon: LucideIcon;
  color: string;
  children?: React.ReactNode;
  selected?: boolean;
  hasInput?: boolean;
  hasOutput?: boolean;
  outputCount?: number;
}

export function BaseNode({
  label,
  icon: Icon,
  color,
  children,
  selected,
  hasInput = true,
  hasOutput = true,
  outputCount = 1,
}: BaseNodeProps) {
  return (
    <div
      className={`min-w-[180px] max-w-[240px] rounded-xl border-2 bg-card shadow-soft transition-shadow ${
        selected ? 'border-primary shadow-elevated ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-card !bg-zinc-400"
        />
      )}
      <div className={`flex items-center gap-2 rounded-t-[10px] px-3 py-2 ${color}`}>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-white" />
        <span className="text-xs font-semibold text-white">{label}</span>
      </div>
      {children && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {children}
        </div>
      )}
      {hasOutput &&
        Array.from({ length: outputCount }).map((_, i) => (
          <Handle
            key={i}
            type="source"
            position={Position.Bottom}
            id={`output-${i}`}
            className="!h-3 !w-3 !border-2 !border-card !bg-primary"
            style={
              outputCount > 1
                ? { left: `${((i + 1) / (outputCount + 1)) * 100}%` }
                : undefined
            }
          />
        ))}
    </div>
  );
}
