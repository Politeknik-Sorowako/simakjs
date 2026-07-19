import { createSignal } from 'solid-js';

export function usePagination(defaultLimit = 10) {
  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(defaultLimit);
  const [search, setSearch] = createSignal('');

  const resetPage = () => setPage(1);

  const setLimitAndReset = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return { page, setPage, limit, setLimit: setLimitAndReset, search, setSearch, resetPage };
}
