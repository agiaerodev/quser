import { Notify } from 'quasar';
import { computed, onBeforeUnmount, ref } from 'vue';
import accountDeletion from '../services/accountDeletion';
import { ApiError, getRetryAfterSeconds } from '../services/apiError';
import { confirmPin, sendPin } from '../services/otp';

const DEFAULT_RETRY_SECONDS = 120;

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

export default function useAccountDeletionFlow() {
  const email = ref('');
  const pin = ref('');
  const step = ref<'email' | 'otp' | 'done'>('email');
  const sending = ref(false);
  const deleting = ref(false);
  const baseErrorMessage = ref('');
  const retryAfterSeconds = ref(DEFAULT_RETRY_SECONDS);
  const cooldown = ref(0);
  const otpRef = ref<{ clearDigits?: () => void; startTimer?: (seconds?: number) => void } | null>(
    null,
  );

  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailRules = [
    (value: string) => Boolean((value || '').trim()) || 'Email is required',
    (value: string) => emailPattern.test((value || '').trim()) || 'Invalid email format',
  ];
  const isEmailValid = computed(() => emailPattern.test(email.value.trim()));
  const formattedCooldown = computed(() => formatCountdown(cooldown.value));

  const canSendPin = computed(() => {
    if (sending.value || deleting.value || cooldown.value > 0) {
      return false;
    }

    return isEmailValid.value;
  });

  const description = computed(
    () => `Enter the 6-digit PIN sent to <strong>${email.value}</strong>.`,
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
    const message = error instanceof Error && error.message ? error.message : fallback;
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

  const onSendPin = async () => {
    const username = email.value.trim();

    if (!isEmailValid.value) {
      baseErrorMessage.value = username ? 'Invalid email format' : 'Email is required';
      return;
    }

    if (sending.value) {
      return;
    }

    if (cooldown.value > 0) {
      baseErrorMessage.value = 'OTP recently generated. Please wait before requesting a new code.';
      return;
    }

    sending.value = true;
    clearError();

    try {
      const response = await sendPin(username);
      retryAfterSeconds.value = getRetryAfterSeconds(response) ?? DEFAULT_RETRY_SECONDS;
      startCooldown(retryAfterSeconds.value);
      step.value = 'otp';

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

  const onResendPin = async () => {
    clearError();

    try {
      const response = await sendPin(email.value.trim());
      retryAfterSeconds.value = getRetryAfterSeconds(response) ?? DEFAULT_RETRY_SECONDS;
      startCooldown(retryAfterSeconds.value);
      otpRef.value?.startTimer?.(retryAfterSeconds.value);
    } catch (error) {
      showError(error, 'We could not send the verification code.');
    }
  };

  const onVerifyPin = async (otp: string) => {
    const username = email.value.trim();

    if (!username || deleting.value) {
      return;
    }

    if (!/^\d{6}$/.test(otp || '')) {
      baseErrorMessage.value = 'Enter the complete 6-digit code.';
      return;
    }

    deleting.value = true;
    clearError();

    try {
      await confirmPin(username, otp);
      pin.value = otp;
      await accountDeletion(username, pin.value);
      stopCooldown();
      cooldown.value = 0;
      step.value = 'done';

      Notify.create({
        message: 'Account deletion request sent successfully.',
        color: 'green-5',
        icon: 'fa-light fa-check',
      });
    } catch (error) {
      pin.value = '';
      otpRef.value?.clearDigits?.();
      showError(error, 'The verification code is invalid or expired.');
    } finally {
      deleting.value = false;
    }
  };

  const onBack = () => {
    if (deleting.value) {
      return;
    }

    step.value = 'email';
    pin.value = '';
    clearError();
  };

  onBeforeUnmount(() => {
    stopCooldown();
  });

  return {
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
    isEmailValid,
    canSendPin,
    description,
    clearError,
    onSendPin,
    onResendPin,
    onVerifyPin,
    onBack,
  };
}
