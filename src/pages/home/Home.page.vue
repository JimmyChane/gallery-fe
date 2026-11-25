<script setup lang="ts">
import { waitFrameMs } from '@chanzor/vue-utils';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useImagePagableApi } from '@/composables/useImagePagableApi.ts';
import { ImageBlobModel, type ImageModel } from '@/module/image.model.ts';

import SlideshowView from './components/Slideshow.view.vue';

const { list, pagination, status, error, refresh, nextPage } =
  useImagePagableApi();

const errorMessage = computed(() =>
  error.value ? error.value.message || 'Unknown error' : undefined,
);

const isLoading = computed(
  () => status.value === 'pending' && imageModels.value.length === 0,
);

const imageModels = ref<ImageModel[]>([]);
let loadTime = 0;

async function enqueuePage(isCancelled: () => boolean): Promise<boolean> {
  const shuffled = [...list.value].sort(() => Math.random() - 0.5);
  for (const filename of shuffled) {
    imageModels.value.push(new ImageBlobModel(filename));
    await waitFrameMs(100);
    if (isCancelled()) return false;
  }
  return true;
}

async function loadData(): Promise<void> {
  const now = (loadTime = Date.now());
  const isCancelled = () => now !== loadTime;

  imageModels.value = [];
  error.value = undefined;

  await refresh({ page: 1 });
  if (isCancelled() || error.value) return;

  if (!(await enqueuePage(isCancelled))) return;

  while (pagination.value?.hasNext) {
    await nextPage();
    if (isCancelled() || error.value) return;
    if (!(await enqueuePage(isCancelled))) return;
  }
}

onMounted(loadData);

onUnmounted(() => {
  imageModels.value = [];
  loadTime = Date.now();
});
</script>

<template>
  <div class="home-page">
    <div
      v-if="errorMessage?.length && imageModels.length === 0"
      class="home-page-view"
    >
      <span>{{ errorMessage }}</span>
      <button @click="loadData">Try Again</button>
    </div>
    <div v-else-if="imageModels.length > 0" class="home-page-view">
      <SlideshowView :models="imageModels" />
    </div>
    <div v-else-if="isLoading" class="home-page-view">Loading...</div>
    <div v-else-if="!isLoading" class="home-page-view">No images found</div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  width: 100%;
  height: 100%;
  display: flex;
  background: linear-gradient(90deg, #333333 0%, #141c1d 100%);

  .home-page-view {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }
}
</style>
