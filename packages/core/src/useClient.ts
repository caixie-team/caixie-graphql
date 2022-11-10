import { provide } from 'vue';
import type { ClientOptions } from './client';
import { createClient } from './client';
import { CXQL_CLIENT } from './symbols';

export function useClient(opts: ClientOptions) {
  const client = createClient(opts);
  provide(CXQL_CLIENT, client);

  return client;
}
