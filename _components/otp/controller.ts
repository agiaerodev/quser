import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export interface OtpProps {
  otpLength?: number;
  retryAfterSeconds?: number | string;
  title?: string;
  description?: string;
  email?: string;
  verifyLabel?: string;
  resendLabel?: string;
  showBackButton?: boolean;
  autoFocus?: boolean;
  onSendCode?: (email?: string) => Promise<void> | void;
  onVerifyCode?: (otp: string, email?: string) => Promise<void> | void;
}

export type OtpEmit = {
  (event: 'verify', otp: string): void;
  (event: 'resend'): void;
  (event: 'back'): void;
};

const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_RETRY_SECONDS = 120;

const normalizeOtpLength = (value?: number): number => {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    return DEFAULT_OTP_LENGTH;
  }

  return value;
};

const normalizeRetrySeconds = (value?: number | string): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_RETRY_SECONDS;
  }

  return parsed;
};

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function useOtpController(props: OtpProps, emit: OtpEmit) {
  const otpLength = computed(() => normalizeOtpLength(props.otpLength));
  const retryAfterSeconds = computed(() => normalizeRetrySeconds(props.retryAfterSeconds));

  const timeLeft = ref(retryAfterSeconds.value);
  const digits = ref<string[]>(Array(otpLength.value).fill(''));
  const inputRefs = ref<Array<HTMLInputElement | null>>([]);
  const loading = ref(false);
  const showVerifyButton = ref(false);

  let timer: ReturnType<typeof setInterval> | null = null;

  const otp = computed(() => digits.value.join(''));
  const isComplete = computed(() => digits.value.every(Boolean));
  const canResend = computed(() => timeLeft.value === 0);
  const formattedTime = computed(() => formatCountdown(timeLeft.value));
  const headerDescription = computed(() => {
    if (props.description) {
      return props.description;
    }

    if (props.email) {
      return `If you have an account, we have sent a code to <strong>${props.email}</strong>. Enter it below.`;
    }

    return 'Enter the code below.';
  });

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startTimer = (seconds?: number | string) => {
    stopTimer();

    timeLeft.value = normalizeRetrySeconds(seconds ?? retryAfterSeconds.value);

    timer = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value -= 1;
        return;
      }

      stopTimer();
    }, 1000);
  };

  const focusAt = (index: number) => {
    nextTick(() => {
      inputRefs.value[index]?.focus();
    });
  };

  const setInputRef = (index: number, element: Element | null) => {
    if (element) {
      inputRefs.value[index] = element as HTMLInputElement;
    }
  };

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const clearDigits = () => {
    digits.value = Array(otpLength.value).fill('');
    showVerifyButton.value = false;

    if (props.autoFocus) {
      focusAt(0);
    }
  };

  const onInput = (index: number, event: Event) => {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    const nextDigit = value ? value[value.length - 1] : '';

    digits.value[index] = nextDigit;
    input.value = nextDigit;

    if (nextDigit && index < otpLength.value - 1) {
      focusAt(index + 1);
      return;
    }

    if (nextDigit) {
      showVerifyButton.value = true;
    }
  };

  const onKeydown = (index: number, event: KeyboardEvent) => {
    if (event.key === 'Backspace') {
      if (digits.value[index]) {
        digits.value[index] = '';
        showVerifyButton.value = false;
      } else if (index > 0) {
        focusAt(index - 1);
      }

      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < otpLength.value - 1) {
      focusAt(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();

    const pastedDigits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    const nextDigits = pastedDigits.split('').slice(0, otpLength.value);

    nextDigits.forEach((digit, index) => {
      digits.value[index] = digit;
    });

    const emptyIndex = digits.value.findIndex((digit) => !digit);

    if (emptyIndex === -1) {
      focusAt(otpLength.value - 1);
      showVerifyButton.value = true;
      return;
    }

    focusAt(emptyIndex);
    showVerifyButton.value = false;
  };

  const submitOtp = async () => {
    if (!isComplete.value) {
      return;
    }

    if (props.onVerifyCode) {
      await props.onVerifyCode(otp.value, props.email);
      return;
    }

    emit('verify', otp.value);
  };

  const handleResend = async () => {
    if (!canResend.value || loading.value) {
      return;
    }

    clearDigits();
    setLoading(true);

    try {
      if (props.onSendCode) {
        await props.onSendCode(props.email);
      }

      emit('resend');
      startTimer(retryAfterSeconds.value);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    emit('back');
  };

  const reset = (seconds?: number | string) => {
    clearDigits();
    startTimer(seconds ?? retryAfterSeconds.value);
  };

  watch(
    digits,
    (value) => {
      showVerifyButton.value = value.every(Boolean);
    },
    { deep: true },
  );

  watch(
    otpLength,
    (length) => {
      digits.value = Array(length).fill('');
      showVerifyButton.value = false;
    },
  );

  watch(
    retryAfterSeconds,
    (value) => {
      if (!Number.isFinite(value)) {
        return;
      }

      startTimer(value);
    },
  );

  onMounted(() => {
    startTimer(retryAfterSeconds.value);

    if (props.autoFocus) {
      focusAt(0);
    }
  });

  onBeforeUnmount(() => {
    stopTimer();
  });

  return {
    digits,
    inputRefs,
    loading,
    showVerifyButton,
    otp,
    isComplete,
    canResend,
    formattedTime,
    headerDescription,
    timeLeft,
    focusAt,
    setInputRef,
    onInput,
    onKeydown,
    onPaste,
    clearDigits,
    submitOtp,
    handleResend,
    handleBack,
    startTimer,
    stopTimer,
    setLoading,
    reset,
  };
}
