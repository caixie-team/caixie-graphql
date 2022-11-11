import stringify from 'fast-json-stable-stringify';
import type { Operation } from '@cxql/shared/lib/types';
import { normalizeQuery } from '@cxql/shared/lib/utils';

export function hash(x: string) {
  let h;
  let i;
  let l;
  // eslint-disable-next-line no-bitwise
  for (h = 5381 | 0, i = 0, l = x.length | 0; i < l; i += 1) {
    // eslint-disable-next-line no-bitwise
    h = (h << 5) + h + x.charCodeAt(i);
  }

  // eslint-disable-next-line no-bitwise
  return h >>> 0;
}

export function getQueryKey(operation: Operation<unknown, unknown>, ...components: string[]) {
  const variables = operation.variables ? stringify(operation.variables) : '';
  const query = normalizeQuery(operation.query);

  return hash(`${query}${variables}${components.join('')}`);
}
