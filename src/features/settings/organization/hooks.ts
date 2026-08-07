'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  organizationService,
  type UpdateOrganizationGeneralInput,
} from './service';

export function useOrganizationGeneralSettings() {
  return useQuery({
    queryKey: ['organization-general-settings'],
    queryFn: () => organizationService.get(),
  });
}

export function useUpdateOrganizationGeneralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationGeneralInput) =>
      organizationService.update(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['organization-general-settings'] }),
  });
}
