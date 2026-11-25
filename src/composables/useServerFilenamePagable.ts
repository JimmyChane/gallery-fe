import {
  LinearQueueHandler,
  type MaybeUndefined,
  optArray,
  optBoolean,
  optNumber,
} from '@chanzor/utils';
import { computed, ref } from 'vue';

import { API_SERVER } from '@/api/api';
import type { ImagePathData } from '@/module/image.model';

async function apiGet(page: number, limit: number) {
  const res = await API_SERVER.get<
    MaybeUndefined<{
      items?: ImagePathData[];
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      };
    }>
  >('/api/img/list/pagable', { params: { page, limit } });
  return res.data;
}

type PaginationType = {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
};

const queue = new LinearQueueHandler();

export function useServerFilenamePagable(option?: {
  /** @default 10 */
  limit: number;
}) {
  if (typeof option?.limit === 'number') {
    if (option.limit < 1) throw new Error('allow only greater than 1');

    const limitStr = option.limit.toString();
    if (limitStr.includes(',')) throw new Error('allow only integer');
  }

  const limit = option?.limit ?? 10;

  const list = ref<string[]>([]);
  const pagination = ref<PaginationType>();

  const status = ref<'pending' | 'success' | 'error'>();
  const error = ref<Error>();

  async function fetch(query: { page: number }): Promise<void> {
    return queue.next(async () => {
      status.value = 'pending';

      const data = await apiGet(query.page, limit).catch((e: Error) => e);
      if (data instanceof Error) {
        status.value = 'error';
        error.value = data;
        return;
      }

      list.value = optArray(data?.items)
        .map((item) => item.filename)
        .filter((filename) => typeof filename === 'string');

      pagination.value = {
        total: optNumber(data?.meta?.total),
        page: optNumber(data?.meta?.page),
        limit: optNumber(data?.meta?.limit),
        totalPages: optNumber(data?.meta?.totalPages),
        hasNext: optBoolean(data?.meta?.hasNext),
        hasPrevious: optBoolean(data?.meta?.hasPrev),
      };

      status.value = 'success';
    });
  }

  async function refresh(option?: { page?: number }): Promise<void> {
    await fetch({
      page: option?.page ?? (pagination.value ? pagination.value.page + 1 : 0),
    });
  }

  async function clear(): Promise<void> {
    return queue.next(() => {
      list.value = [];
      pagination.value = undefined;
    });
  }

  async function nextPage(): Promise<void> {
    if (!pagination.value?.hasNext) return;
    return fetch({ page: pagination.value.page + 1 });
  }

  async function previousPage(): Promise<void> {
    if (!pagination.value?.hasPrevious) return;
    return fetch({ page: pagination.value.page - 1 });
  }

  return {
    list: computed(() => list.value),
    pagination: computed(() => pagination.value),

    status,
    error,

    refresh,
    nextPage,
    previousPage,
    clear,
  };
}
