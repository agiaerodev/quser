<script setup lang="ts">
import Otp from 'modules/quser/_components/otp/index.vue';
import useAccountDeletionFlow from '../controllers/accountDeletionFlow';
import { store } from 'src/plugins/utils';

const {
  email,
  step,
  sending,
  deleting,
  errorMessage,
  cooldown,
  formattedCooldown,
  retryAfterSeconds,
  otpRef,
  emailRules,
  canSendPin,
  description,
  clearError,
  onSendPin,
  onResendPin,
  onVerifyPin,
  onBack,
} = useAccountDeletionFlow();
</script>

<template>
  <div class="tw-w-full">
    <div class="tw-flex tw-justify-center tw-mb-8">
      <img
        :src="store.state.qsiteApp.logo"
        alt="Airport Butler"
        class="tw-h-30 tw-w-auto tw-object-contain"
      >
    </div>

    <div
      class="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.12)]"
    >
      <div class="tw-px-8 tw-pt-8 tw-pb-6">
        <div v-if="step === 'email'">
          <h1 class="tw-text-[22px] tw-leading-7 tw-font-semibold tw-text-slate-900">
            Request account deletion
          </h1>
          <p class="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">
            Enter the email associated with your account. We'll send you a
            verification code to confirm your request. Your account will not be
            deleted immediately; our team will review and process the request.
          </p>


          <q-form class="tw-mt-6" @submit.prevent="onSendPin">
            <q-input
              v-model.trim="email"
              type="email"
              outlined
              no-error-icon
              bg-color="white"
              color="primary"
              label="Email address"
              placeholder="you@example.com"
              autocomplete="email"
              :rules="emailRules"
              lazy-rules
              class="tw-w-full"
              @update:model-value="clearError"
            >
              <template #prepend>
                <i class="fa-light fa-envelope tw-text-[15px] tw-text-slate-400" />
              </template>
            </q-input>

            <p
              v-if="errorMessage"
              class="tw-mb-4 tw-flex tw-items-start tw-gap-2 tw-rounded-xl tw-border tw-border-red-100 tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-600"
            >
              <i class="fa-light fa-circle-exclamation tw-mt-[3px]" />
              <span>{{ errorMessage }}</span>
            </p>

            <q-btn
              type="submit"
              no-caps
              unelevated
              color="primary"
              :loading="sending"
              :disable="!canSendPin"
              class="tw-w-full tw-h-11 tw-rounded-xl tw-text-[15px] tw-font-medium"
              :label="
                cooldown > 0
                  ? `Resend available in ${formattedCooldown}`
                  : 'Send verification code'
              "
            />

            <p
              v-if="cooldown > 0"
              class="tw-mt-3 tw-text-center tw-text-xs tw-text-slate-400"
            >
              You can request a new code in
              <span class="tw-font-semibold tw-text-slate-500">{{ formattedCooldown }}</span>
            </p>
          </q-form>
        </div>

        <div v-else-if="step === 'otp'">
          <Otp
            ref="otpRef"
            :email="email"
            :description="description"
            :retry-after-seconds="retryAfterSeconds"
            :show-back-button="true"
            :on-send-code="onResendPin"
            :on-verify-code="onVerifyPin"
            title="Verify your email"
            verify-label="Submit request"
            resend-label="Resend code"
            @back="onBack"
          />

          <p
            v-if="errorMessage"
            class="tw-mt-4 tw-flex tw-items-start tw-gap-2 tw-rounded-xl tw-border tw-border-red-100 tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-600"
          >
            <i class="fa-light fa-circle-exclamation tw-mt-[3px]" />
            <span>{{ errorMessage }}</span>
          </p>

          <div
            v-if="deleting"
            class="tw-mt-3 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-slate-500"
          >
            <q-spinner size="16px" />
            <span>Submitting your request…</span>
          </div>
        </div>

        <div v-else class="tw-text-center">
          <div
            class="tw-mx-auto tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-emerald-50 tw-border tw-border-emerald-100"
          >
            <i class="fa-light fa-check tw-text-lg tw-text-emerald-600" />
          </div>
          <h2 class="tw-mt-4 tw-text-lg tw-font-semibold tw-text-slate-900">
            Request submitted
          </h2>
          <p class="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">
            We received your account deletion request. You'll receive a
            confirmation email once it has been processed.
          </p>
        </div>
      </div>

      <div
        class="tw-border-t tw-border-slate-100 tw-px-8 tw-py-4 tw-text-center tw-text-xs tw-text-slate-400"
      >
        Need help? Contact our support team.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.q-field--outlined .q-field__control) {
  border-radius: 12px;
}
</style>
