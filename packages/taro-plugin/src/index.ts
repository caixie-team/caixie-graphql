// import { getToken } from '~/utils/token';
import { fetch } from '@cxql/core';
import Taro from '@tarojs/taro';
// type Methods = 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';

export const fetchTaro = fetch({
  fetch(url, options) {
    // const token = getToken();
    return new Promise((resolve, reject) => {
      Taro.request({
        url: url.toString(),
        method: 'POST',
        data: options?.body as any,
        header: {
          ...options?.headers
          // ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        success(res) {
          return resolve({
            ok: true,
            status: res.statusCode,
            headers: res.header,
            text: async () => JSON.stringify(res.data),
            json: async () => res.data
          } as Response);
        },
        fail(e) {
          return reject(e);
        }
      });
    });
  }
});
