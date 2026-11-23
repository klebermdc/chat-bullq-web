'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { VirtualHqSnapshot } from '../api';
import { lookFor } from '../lib/world/color-hash';
import { isManagerRole } from '../lib/world/departments';
import { buildWorld, type PersonInput } from '../lib/world/layout';
import { buildScene, describeScene } from '../lib/world/scene';
import { RoomPanel } from './panels/room-panel';
import { RoomList } from './world/room-list';
import { WorldCanvas } from './world/world-canvas';

/** Só remonta o mapa quando muda quem está nele (não a cada atualização de números). */
function peopleSignature(people: readonly PersonInput[]): string {
  return people.map((p) => `${p.userId}|${p.name}|${p.role}|${String(p.department)}`).join('\n');
}

export function OfficeWorld({ snapshot }: { snapshot: VirtualHqSnapshot }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ key: string; nonce: number } | null>(null);

  const people = useMemo(
    () => (snapshot.rooms ?? []).map((r) => ({ userId: r.userId, name: r.name, role: r.role, department: r.department })),
    [snapshot.rooms],
  );
  const signature = peopleSignature(people);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a assinatura já cobre `people`
  const layout = useMemo(() => buildWorld(people), [signature]);
  const scene = useMemo(() => buildScene(layout, snapshot, userId), [layout, snapshot, userId]);
  const player = useMemo(() => ({ id: userId, look: lookFor(userId ?? 'visitante') }), [userId]);

  const close = useCallback(() => setSelected(null), []);
  const selectFromList = useCallback((key: string) => {
    setSelected(key);
    setFocus((f) => ({ key, nonce: (f?.nonce ?? 0) + 1 }));
  }, []);

  const selectedRoom = layout.rooms.find((r) => r.key === selected) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-xs text-muted-foreground">
          Ande pelo escritório e entre numa sala para ver a carteira. Balão amarelo é cliente esperando resposta.
        </p>
        <WorldCanvas
          layout={layout}
          scene={scene}
          player={player}
          selectedKey={selected}
          focus={focus}
          onSelectRoom={setSelected}
          onClose={close}
          ariaLabel={describeScene(snapshot)}
        />
        <RoomList rooms={layout.rooms} snapshot={snapshot} selectedKey={selected} onSelect={selectFromList} />
      </div>
      {selectedRoom && (
        <RoomPanel
          snapshot={snapshot}
          room={selectedRoom}
          canManage={isManagerRole(role)}
          onClose={close}
          className="w-full lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-96 lg:overflow-y-auto"
        />
      )}
    </div>
  );
}
