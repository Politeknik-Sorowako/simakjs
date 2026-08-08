import type { QueryClient, QueryKey } from '@tanstack/solid-query';
import { createMutation, createQuery, useQueryClient } from '@tanstack/solid-query';
import { unwrap } from '../utils/eden';

interface EdenResult<TData> {
  data?: TData | null;
  error?: unknown;
}

export function createEdenQuery<TData>(
  options: () => {
    queryKey: QueryKey;
    queryFn: () => Promise<EdenResult<TData>>;
    enabled?: boolean | (() => boolean);
    staleTime?: number;
  },
) {
  return createQuery(() => {
    const opts = options();
    return {
      queryKey: opts.queryKey,
      queryFn: () => unwrap<TData>(opts.queryFn() as Promise<{ data?: TData; error?: unknown }>),
      enabled: opts.enabled,
      staleTime: opts.staleTime,
    };
  });
}

export function createEdenMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<EdenResult<TData>>,
  options: {
    onError?: (error: unknown) => void;
    onSuccess?: (data: TData, variables: TVariables) => void;
    invalidateKeys?: (queryClient: QueryClient, data: TData, variables: TVariables) => void;
  } = {},
) {
  const queryClient = useQueryClient();
  return createMutation(() => ({
    mutationFn: async (variables: TVariables) =>
      unwrap<TData>(mutationFn(variables) as Promise<{ data?: TData; error?: unknown }>),
    onError: options.onError,
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
      options.invalidateKeys?.(queryClient, data, variables);
    },
  }));
}
