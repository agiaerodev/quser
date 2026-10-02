import { Notify } from 'quasar';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, getRetryAfterSeconds } from '../services/apiError';
import appConfig from 'src/setup/app';

import {
  sendOtp,
  validateOtp,
  sendFinalOtp,
  changePassword,
} from '../services/accountRecovery';

const REDIRECT_URLS = appConfig?.appRedirectUrls?.login || {}

const DEFAULT_RETRY_SECONDS = 120;

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

export default function useAccountRecoveryFlow() {
  const route = useRoute();
  const requestedDevice = route.query.device;
  const device = requestedDevice ? requestedDevice.toLowerCase() : '';
  const isSupportedDevice = computed(() =>
    Object.keys(REDIRECT_URLS).some(
      (supportedDevice) => supportedDevice.toLowerCase() === device
    )
  );
  const email = ref('');
  const newPassword = ref('');
  const confirmPassword = ref('');
  const pin = ref('');
  const step = ref<
    'email' | 'send-otp' | 'new-password-form' | 'send-final-otp' | 'success'
  >('email');
  const sending = ref(false);
  const baseErrorMessage = ref('');
  const retryAfterSeconds = ref(DEFAULT_RETRY_SECONDS);
  const cooldown = ref(0);
  const otpRef = ref<{
    clearDigits?: () => void;
    startTimer?: (seconds?: number) => void;
  } | null>(null);

  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailRules = [
    (value: string) => Boolean((value || '').trim()) || 'Email is required',
    (value: string) =>
      emailPattern.test((value || '').trim()) || 'Invalid email format',
  ];
  const isEmailValid = computed(() => emailPattern.test(email.value.trim()));
  const formattedCooldown = computed(() => formatCountdown(cooldown.value));
  const canChangePassword = computed(
    () =>
      !sending.value &&
      newPassword.value.length >= 6 &&
      confirmPassword.value === newPassword.value
  );

  const canSendPin = computed(() => {
    if (sending.value || cooldown.value > 0) {
      return false;
    }

    return isEmailValid.value;
  });

  const description = computed(
    () => `Enter the 6-digit PIN sent to <strong>${email.value}</strong>.`
  );

  const stopCooldown = () => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  };

  const startCooldown = (seconds: number) => {
    stopCooldown();

    cooldown.value = Math.max(0, Math.ceil(seconds));

    if (!cooldown.value) {
      return;
    }

    cooldownTimer = setInterval(() => {
      if (cooldown.value > 0) {
        cooldown.value -= 1;
        return;
      }

      stopCooldown();
    }, 1000);
  };

  const errorMessage = computed(() => {
    if (!baseErrorMessage.value) {
      return '';
    }

    if (cooldown.value > 0) {
      return `${baseErrorMessage.value} You can request a new code in ${formattedCooldown.value}.`;
    }

    return baseErrorMessage.value;
  });

  const clearError = () => {
    baseErrorMessage.value = '';
  };

  const showError = (error: unknown, fallback: string) => {
    const message =
      error instanceof Error && error.message ? error.message : fallback;
    const retry = error instanceof ApiError ? error.retryAfterSeconds : null;

    if (retry) {
      retryAfterSeconds.value = retry;
      startCooldown(retry);
      otpRef.value?.startTimer?.(retry);
    }

    baseErrorMessage.value = message;

    Notify.create({
      message: errorMessage.value,
      color: 'red-5',
      icon: 'fa-light fa-triangle-exclamation',
    });
  };

  const redirectToAPP = async () => {
    const callbackUrl = REDIRECT_URLS[device.toUpperCase() as keyof typeof REDIRECT_URLS];    
    if(!callbackUrl) return false
    try {
      window.location.href = callbackUrl;
      location.assign(callbackUrl);
      window.open(callbackUrl);
    } catch (error) {
      console.log('Error on returnToApplication', error)
    }    
  };

  /* methods */
  const onSendOtp = async () => {
    const username = email.value.trim();

    if (!isEmailValid.value) {
      baseErrorMessage.value = username
        ? 'Invalid email format'
        : 'Email is required';
      return;
    }

    if (sending.value) {
      return;
    }

    if (cooldown.value > 0) {
      baseErrorMessage.value =
        'OTP recently generated. Please wait before requesting a new code.';
      return;
    }

    sending.value = true;
    clearError();

    try {
      const response = await sendOtp(username);
      retryAfterSeconds.value =
        getRetryAfterSeconds(response) ?? DEFAULT_RETRY_SECONDS;
      startCooldown(retryAfterSeconds.value);
      step.value = 'send-otp';

      Notify.create({
        message: 'We sent a PIN to your email.',
        color: 'green-5',
        icon: 'fa-light fa-check',
      });
    } catch (error) {
      showError(error, 'We could not send the verification code.');
    } finally {
      sending.value = false;
    }
  };

  const onResendOtp = async () => {
    clearError();

    try {
      const response = await sendOtp(email.value.trim());
      retryAfterSeconds.value =
        getRetryAfterSeconds(response) ?? DEFAULT_RETRY_SECONDS;
      startCooldown(retryAfterSeconds.value);
      otpRef.value?.startTimer?.(retryAfterSeconds.value);
    } catch (error) {
      showError(error, 'We could not send the verification code.');
    }
  };

  const onValidateOtp = async (otp: string) => {
    const username = email.value.trim();

    if (!username) {
      return;
    }

    if (!/^\d{6}$/.test(otp || '')) {
      baseErrorMessage.value = 'Enter the complete 6-digit code.';
      return;
    }
    clearError();

    try {
      pin.value = otp;

      await validateOtp(username, pin.value);
      stopCooldown();
      cooldown.value = 0;
      step.value = 'new-password-form';
    } catch (error) {
      pin.value = '';
      otpRef.value?.clearDigits?.();
      showError(error, 'The verification code is invalid or expired.');
    } finally {
      //deleting.value = false;
    }
  };

  const onSendFinalOtp = async () => {
    if (!canChangePassword.value) {
      return;
    }

    sending.value = true;
    clearError();

    try {
      await sendFinalOtp(email.value);
      step.value = 'send-final-otp';
      Notify.create({
        message: 'Sent verification code to your email.',
        color: 'green-5',
        icon: 'fa-light fa-check',
      });
    } catch (error) {
      showError(error, 'We could not send the verification code.');
    } finally {
      sending.value = false;
    }
  };

  const onResendFinalOtp = async () => {
    clearError();

    try {
      const response = await sendFinalOtp(email.value);
      retryAfterSeconds.value =
        getRetryAfterSeconds(response) ?? DEFAULT_RETRY_SECONDS;
      startCooldown(retryAfterSeconds.value);
      otpRef.value?.startTimer?.(retryAfterSeconds.value);
    } catch (error) {
      showError(error, 'We could not send the verification code.');
    }
  };

  const onValidateFinalOtp = async (otp: string) => {
    if (!/^\d{6}$/.test(otp || '')) {
      baseErrorMessage.value = 'Enter the complete 6-digit code.';
      return;
    }
    clearError();
    pin.value = otp;

    try {
      stopCooldown();
      await changePassword(
        email.value.trim(),
        newPassword.value,
        confirmPassword.value,
        pin.value
      );

      step.value = 'success';
      Notify.create({
        message: 'Your password has been reset successfully.',
        color: 'green-5',
        icon: 'fa-light fa-check',
      });
    } catch (error) {
      step.value = 'send-final-otp';
      showError(error, 'Wrong password or expired verification code.');
    } finally {
      sending.value = false;
    }
  };

  const onBack = () => {
    if (step.value === 'send-otp') {
      step.value = 'email';
    }

    if (step.value === 'send-final-otp') {
      step.value = 'new-password-form';
    }
    stopCooldown();
    cooldown.value = 0;
    pin.value = '';
    clearError();
  };

  onBeforeUnmount(() => {
    stopCooldown();
  });

  return {
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
    isEmailValid,
    canSendPin,
    canChangePassword,
    isSupportedDevice,
    description,
    clearError,
    onSendOtp,
    onResendOtp,
    onValidateOtp,
    onSendFinalOtp,
    onResendFinalOtp,
    onValidateFinalOtp,
    redirectToAPP,
    onBack,
  };
}
