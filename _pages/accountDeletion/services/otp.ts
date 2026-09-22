import baseService from 'modules/qcrud/_services/baseService.js'
import { helper } from 'src/plugins/utils';
import { assertSuccessPayload, toApiError } from './apiError';

const SEND_FALLBACK = 'We could not send the verification code.';
const CONFIRM_FALLBACK = 'The verification code is invalid or expired.';

export const sendPin = async (username: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.otpSendPin', {
      attributes: helper.toSnakeCase({ username, authMode: 'otp' }),
    });

    return assertSuccessPayload(response, SEND_FALLBACK);
  } catch (error) {
    throw toApiError(error, SEND_FALLBACK);
  }
};

export const confirmPin = async (username: string, pin: string) => {
  try {
    const response = await baseService.post('apiRoutes.quser.otpConfirmPin', {
      attributes: helper.toSnakeCase({ username, pin, authMode: 'otp' }),
    });

    return assertSuccessPayload(response, CONFIRM_FALLBACK);
  } catch (error) {
    throw toApiError(error, CONFIRM_FALLBACK);
  }
};
