import baseService from 'modules/qcrud/_services/baseService.js'
import { helper } from 'src/plugins/utils';
import { assertSuccessPayload, toApiError } from './apiError';

const FALLBACK_MESSAGE = 'We could not submit your account deletion request.';

export default async function accountDeletion(email: string, pin: string) {
  try {
    const response = await baseService.post(
      'apiRoutes.quser.requestAccountDeletion',
      {
        attributes: helper.toSnakeCase({ email, pin }),
      }
    );

    return assertSuccessPayload(response, FALLBACK_MESSAGE);
  } catch (error) {
    throw toApiError(error, FALLBACK_MESSAGE);
  }
}
