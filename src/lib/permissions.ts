'use client';
import { useAuthStore } from '@/stores/auth-store';

export function computeCan(permissions: string[], feature: string): boolean {
  return permissions.includes(feature);
}

export function usePermissions() {
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const permissions =
    organizations.find((o) => o.id === activeOrgId)?.permissions ?? [];
  return { permissions, can: (feature: string) => computeCan(permissions, feature) };
}
