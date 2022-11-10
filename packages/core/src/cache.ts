import type { OperationResult, ClientPlugin, ClientPluginOperation } from './types';

interface ResultCache {
  [k: string]: OperationResult;
}

export function cache(): ClientPlugin {
  const resultCache: ResultCache = {};

  function setCacheResult({ key }: ClientPluginOperation, result: OperationResult) {
    resultCache[key] = result;
  }

  function getCachedResult({ key }: ClientPluginOperation): OperationResult | undefined {
    return resultCache[key];
  }

  return function cachePlugin({ afterQuery, useResult, operation }) {
    if (operation.type !== 'query' || operation.cachePolicy === 'network-only') {
      return;
    }

    // Set the cache result after query is resolved
    afterQuery(result => {
      setCacheResult(operation, result);
    });

    // Get cached item
    const cachedResult = getCachedResult(operation);
    if (operation.cachePolicy === 'cache-only') {
      // eslint-disable-next-line consistent-return
      return useResult(cachedResult || { data: null, error: null }, true);
    }

    // if exists in cache, terminate with result
    if (cachedResult) {
      // eslint-disable-next-line consistent-return
      return useResult(cachedResult, operation.cachePolicy === 'cache-first');
    }
  };
}
