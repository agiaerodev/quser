import baseService from 'modules/qcrud/_services/baseService'
import apiRoutes from 'modules/quser/_config/apiRoutes'
import {helper} from 'src/plugins/utils'

export const sendPin = (data = {}, params = {}): Promise<any> =>{
  return new Promise((resolve, reject) => {
    const convertedData = helper.toSnakeCase(data);
    baseService.post(apiRoutes.otpSendPin, {attributes: convertedData}).then(response => {
      resolve(response)
    }).catch(error => reject(error))
  })
}

export const confirmPin = (data = {}, params = {}): Promise<any> =>{
  return new Promise((resolve, reject) => {
    const convertedData = helper.toSnakeCase(data);
    baseService.post(apiRoutes.otpConfirmPin, {attributes: convertedData}).then(response => {
      resolve(response)
    }).catch(error => reject(error))
  })
}


