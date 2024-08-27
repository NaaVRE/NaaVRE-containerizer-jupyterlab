import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

interface INaaVREExternalServiceResponse {
  status_code: number;
  reason: string;
  header: object;
  content: string;
}

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(settings.baseUrl, endPoint);

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

export async function NaaVREExternalService(
  method: string,
  url: string,
  headers = {},
  data = {}
): Promise<INaaVREExternalServiceResponse | string | object> {
  const endPoint = 'naavre-communicator/external-service';
  const init = {
    method: 'POST',
    body: JSON.stringify({
      query: {
        method: method,
        url: url,
        headers: headers,
        data: data
      }
    })
  };

  const resp: INaaVREExternalServiceResponse = await requestAPI(endPoint, init);

  console.log(resp);

  if (resp.status_code !== 200) {
    return resp;
  } else {
    try {
      return JSON.parse(resp.content);
    } catch (error) {
      return resp.content;
    }
  }
}