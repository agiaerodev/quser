import baseService from 'modules/qcrud/_services/baseService.js'
import { helper } from 'src/plugins/utils';
import { assertSuccessPayload, toApiError } from './apiError';

const SEND_FALLBACK = 'We could not send the verification code.';
const CONFIRM_FALLBACK = 'The verification code is invalid or expired.';

export const sendOtp = async (email: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.recoverySendOtp', {
      email
    });

    return assertSuccessPayload(response, SEND_FALLBACK);
  } catch (error) {
    throw toApiError(error, SEND_FALLBACK);
  }
};

export const validateOtp = async (email: string, otp: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.recoveryValidateOtp', {
      email, 
      otp
    });

    return assertSuccessPayload(response, CONFIRM_FALLBACK);
  } catch (error) {
    throw toApiError(error, CONFIRM_FALLBACK);
  }
};



export const sendFinalOtp = async (email: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.recoverySendFinalOtp', {
      email
    });

    return assertSuccessPayload(response, CONFIRM_FALLBACK);
  } catch (error) {
    throw toApiError(error, CONFIRM_FALLBACK);º
  }
};

export const changePassword = async (email: string, newPassword: string, confirmPassword: string, otp: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.recoveryChangePassword', {
      email,
      newPassword,
      confirmPassword,
      otp
    });

    return assertSuccessPayload(response, CONFIRM_FALLBACK);
  } catch (error) {
    throw toApiError(error, CONFIRM_FALLBACK);
  }
};






