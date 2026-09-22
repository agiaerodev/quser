<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  icon?: string;
  iconColor?: string;
}>();
</script>
<template>
  <div class="tw-flex tw-flex-col tw-items-center tw-gap-3">
    <slot name="icon">
      <i :class="`fa-solid ${icon} tw-text-5xl tw-text-[${iconColor}]`"></i>
    </slot>
    <div class="tw-text-center">
      <span class="tw-text-xl tw-font-semibold">
        {{ title }}
      </span>
      <slot name="description">
        <p
          class="tw-text-[#718499] tw-text-sm tw-mt-1"
          v-html="description"
        ></p>
      </slot>
    </div>
  </div>
</template>
