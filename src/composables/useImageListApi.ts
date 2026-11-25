import { type MaybeUndefined, optArray } from '@chanzor/utils';
import { ref } from 'vue';

import { API_SERVER } from '@/api/api';
import type { ImagePathData } from '@/module/image.model';

async function apiGet() {
  const res =
    await API_SERVER.get<MaybeUndefined<ImagePathData[]>>('/api/img/list');
  return optArray(res.data);
}

export function useImageListApi() {
  const list = ref<string[]>([]);

  const status = ref<'error' | 'idle' | 'pending' | 'success'>();
  const error = ref<Error>();

  async function fetch(): Promise<void> {
    const data = await apiGet();
    list.value = data
      .map((item) => item.filename)
      .filter((filename) => typeof filename === 'string');
    status.value = 'success';
  }

  async function refresh(): Promise<void> {
    status.value = 'pending';
    await fetch().catch((e) => {
      error.value = e;
      status.value = 'error';
    });
  }

  return { list, status, error, refresh };
}
