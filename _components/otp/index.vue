<script setup lang="ts">
import { toRefs, withDefaults } from 'vue';
import GradientButton from './components/GradientButton.vue';
import ModalHeader from './components/ModalHeader.vue';
import useOtpController, { type OtpProps } from './controller';

const props = withDefaults(defineProps<OtpProps>(), {
  otpLength: 6,
  retryAfterSeconds: 120,
  title: 'Verification',
  description: '',
  email: '',
  verifyLabel: 'Verify',
  resendLabel: 'Resend PIN',
  showBackButton: true,
  autoFocus: true,
  onSendCode: undefined,
  onVerifyCode: undefined,
});

const { title, verifyLabel, resendLabel, showBackButton } = toRefs(props);

const emit = defineEmits<{
  (event: 'verify', otp: string): void;
  (event: 'resend'): void;
  (event: 'back'): void;
}>();

const {
  digits,
  canResend,
  formattedTime,
  headerDescription,
  loading,
  showVerifyButton,
  setInputRef,
  onInput,
  onKeydown,
  onPaste,
  submitOtp,
  handleResend,
  handleBack,
  clearDigits,
  reset,
  startTimer,
  stopTimer,
  setLoading,
} = useOtpController(props, emit);

defineExpose({
  clearDigits,
  reset,
  startTimer,
  stopTimer,
  setLoading,
});
</script>

<template>
  <div class="tw-grid tw-gap-5">
    <ModalHeader :title="title" :description="headerDescription" />

    <!-- OTP boxes -->
    <div class="tw-flex tw-justify-center tw-gap-3">
      <input
        v-for="(_, index) in digits"
        :key="index"
        :ref="(el) => setInputRef(index, el)"
        :value="digits[index]"
        type="text"
        inputmode="numeric"
        maxlength="1"
        class="tw-w-[52px] tw-h-[58px] tw-border tw-border-[#e0e7ef] tw-rounded-[14px] tw-bg-white tw-text-center tw-text-[1.4rem] tw-font-semibold tw-text-[#162F48] tw-outline-none tw-transition tw-duration-200 tw-caret-[#2292C7] focus:tw-border-[#2292C7] focus:tw-shadow-[0_0_0_3px_rgba(34,146,199,0.15)]"
        @input="onInput(index, $event)"
        @keydown="onKeydown(index, $event)"
        @paste="onPaste"
      />
    </div>

    <div class="tw-text-center">
      <div v-if="!canResend">
        <p class="tw-text-sm tw-text-gray-500">
          Didn't receive the code?
          <br />
          You can request a new PIN in
          <span class="tw-font-semibold">
            {{ formattedTime }}
          </span>
        </p>
      </div>

      <div class="tw-p-2 tw-justify-center tw-flex-col">
        <div class="tw-justify-center tw-flex">
          <div class="tw-w-1/2">
            <GradientButton
              v-if="showVerifyButton"
              :label="verifyLabel"
              @click="submitOtp"
            />
          </div>
        </div>

        <q-btn
          v-if="canResend"
          :loading="loading"
          @click="handleResend"
          class="tw-text-blue-600 hover:tw-underline"
          no-caps
          flat
        >
          <span v-if="!loading">
            {{ resendLabel }}
          </span>

          <template #loading>
            <q-spinner />
          </template>
        </q-btn>
      </div>
    </div>

    <q-btn
      v-if="showBackButton"
      flat
      no-caps
      rounded
      class="tw-self-center"
      @click="handleBack"
    >
      <div class="tw-flex tw-items-center tw-gap-2 tw-text-[#2292C7]">
        <i class="fa-solid fa-arrow-left" />
        <span>Back</span>
      </div>
    </q-btn>
  </div>
</template>
