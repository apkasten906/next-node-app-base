import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// Types
interface HealthCheck {
  uptime: number;
  timestamp: number;
  status: string;
}

interface ReadinessCheck {
  database: boolean;
  cache: boolean;
  status: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

// Health check hook
export function useHealthCheck(): UseQueryResult<HealthCheck, unknown> {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthCheck>('/health'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Readiness check hook
export function useReadinessCheck(): UseQueryResult<ReadinessCheck, unknown> {
  return useQuery({
    queryKey: ['readiness'],
    queryFn: () => apiClient.get<ReadinessCheck>('/ready'),
    refetchInterval: 30000,
  });
}

// User hooks
export function useUsers(): UseQueryResult<User[], unknown> {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<User[]>('/api/users'),
  });
}

export function useUser(id: string): UseQueryResult<User, unknown> {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiClient.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser(): UseMutationResult<User, unknown, Partial<User>, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => apiClient.post<User>('/api/users', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser(
  id: string
): UseMutationResult<User, unknown, Partial<User>, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => apiClient.patch<User>(`/api/users/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useDeleteUser(): UseMutationResult<unknown, unknown, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
