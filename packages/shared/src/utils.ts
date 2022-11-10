import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

/**
 * 将查询字符串或对象规范化为字符串。
 */
export function normalizeQuery(query: string | DocumentNode | TypedDocumentNode): string | null {
  if (typeof query === 'string') {
    return query;
  }

  if (query && query.kind) {
    return print(query);
  }

  return null;
}
