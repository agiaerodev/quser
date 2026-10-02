<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <p
    v-if="message"
    class="tw-flex tw-items-start tw-gap-2 tw-rounded-xl tw-border tw-border-red-100 tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-600"
  >
    <i class="fa-light fa-circle-exclamation tw-mt-[3px]" />
    <span>{{ message }}</span>
  </p>
</template>
