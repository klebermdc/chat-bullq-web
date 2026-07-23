'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendantGreetingService, type AttendantGreetingSettings } from './service';

export function useAttendantGreetingSettings() {
  return useQuery({
    queryKey: ['attendant-greeting-settings'],
    queryFn: () => attendantGreetingService.get(),
  });
}

export function useUpdateAttendantGreetingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AttendantGreetingSettings>) =>
      attendantGreetingService.update(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendant-greeting-settings'] }),
  });
}
