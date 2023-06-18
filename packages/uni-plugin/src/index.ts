import { fetch } from '@cxql/core';
// type Methods = 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';

export const fetchUni = fetch({
  fetch(url, options) {
    // const token = getToken();
    return new Promise((resolve, reject) => {
      uni.request({
        url: url.toString(),
        // method: options?.method as Methods,
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
