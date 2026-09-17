import baseService from 'modules/qcrud/_services/baseService'

const moduleName = 'iprofile';
const moduleVersion = 'v1';
const urlBase = `/${moduleName}/${moduleVersion}`

const apiRoute = `${urlBase}/user-preferences`
  
export const getUserPreferences = (params = {}, refresh = false): Promise<any> => {
  return new Promise((resolve, reject) => {
    const requestParams = {refresh, params}
    //Request
    baseService.index(apiRoute, requestParams).then(response => {
      resolve(response)
    }).catch(error => reject(error))
  })
}

export const updateOrCreateUserPreferences = (data = {}, params = {}): Promise<any> =>{
  return new Promise((resolve, reject) => {
    //Request
    const route = `${apiRoute}/update-or-create`
    baseService.post(route, {attributes: data}).then(response => {
      resolve(response)
    }).catch(error => reject(error))
  })
}


