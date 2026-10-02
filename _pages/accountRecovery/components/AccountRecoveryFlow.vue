<script setup lang="ts">
import Otp from 'modules/quser/_components/otp/index.vue';
import useAccountRecoveryFlow from '../controllers/accountRecoveryFlow';
import { store } from 'src/plugins/utils';
import RecoveryErrorMessage from './RecoveryErrorMessage.vue';

const {
  email,
  newPassword,
  confirmPassword,
  pin,
  step,
  sending,
  errorMessage,
  cooldown,
  formattedCooldown,
  retryAfterSeconds,
  otpRef,
  emailRules,
  canSendPin,
  canChangePassword,
  isSupportedDevice,
  description,
  clearError,
  onSendOtp,
  onResendOtp,
  onValidateOtp,
  onSendFinalOtp,
  onValidateFinalOtp,
  onResendFinalOtp,
  redirectToAPP,
  onBack,
} = useAccountRecoveryFlow();
</script>

<template>
  <div class="tw-w-full">
    <div class="tw-flex tw-justify-center tw-mb-8">
      <img
        :src="store.state.qsiteApp.logo"
        alt="Airport Butler"
        class="tw-h-30 tw-w-auto tw-object-contain"
      />
    </div>

    <div
      class="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.12)]"
    >
      <div class="tw-px-8 tw-pt-8 tw-pb-6">
        <!--step 1: email -->
        <div v-if="step === 'email'">
          <h1
            class="tw-text-[22px] tw-leading-7 tw-font-semibold tw-text-slate-900"
          >
            Request account recovery
          </h1>
          <p class="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">
            Enter the email associated with your account. We'll send you a
            verification code to confirm your request.
          </p>

          <q-form class="tw-mt-6" @submit.prevent="onSendOtp">
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
                <i
                  class="fa-light fa-envelope tw-text-[15px] tw-text-slate-400"
                />
              </template>
            </q-input>

            <RecoveryErrorMessage :message="errorMessage" class="tw-mb-4" />

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
              <span class="tw-font-semibold tw-text-slate-500">{{
                formattedCooldown
              }}</span>
            </p>
          </q-form>
        </div>

        <!--step 2: send OTP-->

        <div v-else-if="step === 'send-otp'">
          <Otp
            ref="otpRef"
            :email="email"
            :description="description"
            :retry-after-seconds="retryAfterSeconds"
            :show-back-button="true"
            :on-send-code="onResendOtp"
            :on-verify-code="onValidateOtp"
            title="Verify your email"
            verify-label="Submit request"
            resend-label="Resend code"
            @back="onBack"
          />

          <RecoveryErrorMessage :message="errorMessage" class="tw-mt-4" />
        </div>

        <!--step 3: new password form-->
        <div v-else-if="step === 'new-password-form'">
          <h1
            class="tw-text-[22px] tw-leading-7 tw-font-semibold tw-text-slate-900"
          >
            Reset your password
          </h1>
          <p class="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">
            Enter a new password for your account. Make sure to choose a strong
            password that you haven't used before.
          </p>

          <q-form class="tw-mt-6" @submit.prevent="onSendFinalOtp">
            <q-input
              v-model="newPassword"
              type="password"
              outlined
              no-error-icon
              bg-color="white"
              color="primary"
              label="New password"
              autocomplete="new-password"
              :rules="[
                (value) => !!value || 'Password is required',
                (value) =>
                  value.length >= 6 || 'Password must be at least 6 characters',
              ]"
              lazy-rules
              class="tw-w-full"
              @update:model-value="clearError"
            />

            <q-input
              v-model="confirmPassword"
              type="password"
              outlined
              no-error-icon
              bg-color="white"
              color="primary"
              label="Confirm password"
              autocomplete="new-password"
              :rules="[
                (value) => !!value || 'Please confirm your password',
                (value) => value === newPassword || 'Passwords do not match',
              ]"
              lazy-rules
              class="tw-w-full tw-mt-4"
              @update:model-value="clearError"
            />

            <RecoveryErrorMessage
              :message="errorMessage"
              class="tw-mb-4 tw-mt-4"
            />

            <q-btn
              type="submit"
              no-caps
              unelevated
              color="primary"
              :loading="sending"
              :disable="!canChangePassword"
              class="tw-mt-4 tw-w-full tw-h-11 tw-rounded-xl tw-text-[15px] tw-font-medium"
              label="Reset password"
            />
          </q-form>
        </div>

        <!--step 4: send-final-otp-->
        <div v-else-if="step === 'send-final-otp'">
          <Otp
            ref="otpRef"
            :email="email"
            :description="description"
            :retry-after-seconds="retryAfterSeconds"
            :show-back-button="true"
            :on-send-code="onResendFinalOtp"
            :on-verify-code="onValidateFinalOtp"
            title="Reset your password"
            verify-label="Submit request"
            resend-label="Resend code"
            @back="onBack"
          />

          <RecoveryErrorMessage :message="errorMessage" class="tw-mt-4" />
        </div>

        <!--step 5: success message-->
        <div v-else-if="step === 'success'">
          <div class="tw-text-center">
            <i
              class="fa-light fa-circle-check tw-text-[50px] tw-text-green-500"
            />
            <h1
              class="tw-mt-4 tw-text-[22px] tw-leading-7 tw-font-semibold tw-text-slate-900"
            >
              Password reset successful
            </h1>
            <p class="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">
              Your password has been successfully reset. You can now log in with
              your new password.
            </p>
            <q-btn
              v-if="isSupportedDevice"
              no-caps
              unelevated
              color="primary"
              class="tw-mt-6 tw-h-11 tw-w-full tw-rounded-xl tw-text-[15px] tw-font-medium"
              label="Return to application"
              @click="redirectToAPP"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.q-field--outlined .q-field__control) {
  border-radius: 12px;
}
</style>
