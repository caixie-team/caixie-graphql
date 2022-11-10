import { getQueryKey } from './utils';
import { cache } from './cache';
import { fetch } from './fetch';
import { dedup } from './dedup';
import type {
  OperationResult,
  CachePolicy,
  QueryVariables,
  ClientPlugin,
  ClientPluginContext,
  OperationType,
  AfterQueryCallback,
  ObservableLike,
  OperationWithCachePolicy,
  StandardOperationResult,
  QueryExecutionContext
} from './types';
import { CXQL_CLIENT } from './symbols';
import type { App, InjectionKey } from 'vue';
import { getCurrentInstance, inject } from 'vue';
import type { FetchOptions, Operation } from '@cxql/shared/lib/types';
import { DEFAULT_FETCH_OPTS } from '@cxql/shared/lib/network';

export interface ClientOptions {
  url: string;
  cachePolicy?: CachePolicy;
  use?: ClientPlugin[];
}

/**
 * setActiveClient should be called to solve problem outside setup
 */
// eslint-disable-next-line no-use-before-define
let activeClient: Client | undefined;

/**
 * Sets or unsets the active client
 *
 * @param client - cxql client instance
 */
export const setActiveClient = (client: Client | undefined) => (activeClient = client);

/**
 * Get the currently active client if there is any.
 */
export const getActiveClient = () => {
  const vm = getCurrentInstance() as any;
  if (!vm) {
    return activeClient;
  }

  return vm.provides?.[CXQL_CLIENT as any] || inject(CXQL_CLIENT, activeClient);
};

type OnResultChangedCallback<TData> = (result: OperationResult<TData>) => unknown;

export const defaultPlugins = () => [cache(), dedup(), fetch()];

export class Client {
  // eslint-disable-next-line class-methods-use-this
  public install: (app: App) => void = () => undefined;

  private url: string;

  private defaultCachePolicy: CachePolicy;

  private plugins: ClientPlugin[];

  public constructor(opts: ClientOptions) {
    this.url = opts.url;
    this.defaultCachePolicy = opts.cachePolicy || 'cache-first';
    this.plugins = opts.use || [...defaultPlugins()];
  }

  /**
   * 执行操作并返回规范化响应。
   */
  // eslint-disable-next-line max-params
  private async execute<TData, TVars>(
    operation: Operation<TData, TVars> | OperationWithCachePolicy<TData, TVars>,
    type: OperationType,
    queryContext?: QueryExecutionContext,
    onResultChanged?: OnResultChangedCallback<TData>
  ): Promise<OperationResult<TData>> {
    let result: OperationResult<TData> | undefined;
    const opContext: FetchOptions = {
      url: this.url,
      ...DEFAULT_FETCH_OPTS,
      headers: { ...DEFAULT_FETCH_OPTS.headers, ...(queryContext?.headers || {}) }
    };

    let terminateSignal = false;
    const afterQuery: AfterQueryCallback[] = [];

    const context: ClientPluginContext = {
      useResult(pluginResult, terminate) {
        if (terminate) {
          terminateSignal = true;
        }

        // this means the `useResult` was called multiple times
        if (result) {
          onResultChanged?.(pluginResult as OperationResult<TData>);
        }

        result = pluginResult as OperationResult<TData>;
      },
      afterQuery(cb) {
        afterQuery.push(cb);
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      operation: {
        ...operation,
        key: getQueryKey(operation),
        type,
        cachePolicy:
          ('cachePolicy' in operation ? operation.cachePolicy : this.defaultCachePolicy) || this.defaultCachePolicy
      },
      opContext
    };

    let lastI = 0;
    for (let i = 0; i < this.plugins.length; i += 1) {
      const plugin = this.plugins[i];
      // eslint-disable-next-line no-await-in-loop
      await plugin(context);
      if (result) {
        lastI = i;
        break;
      }
    }

    return new Promise((resolve, reject) => {
      if (!result) {
        reject(
          new Error(
            'Operation result was not set by any plugin, make sure you have default plugins configured or review documentation'
          )
        );
        return;
      }

      resolve(result);

      (async () => {
        if (!terminateSignal) {
          for (let i = lastI + 1; i < this.plugins.length; i += 1) {
            const plugin = this.plugins[i];
            // eslint-disable-next-line no-await-in-loop
            await plugin(context);
          }
        }

        const afterQueryCtx = { response: context.response };
        for (let i = 0; i < afterQuery.length; i += 1) {
          const afterCb = afterQuery[i];
          // eslint-disable-next-line no-await-in-loop
          await afterCb(result as OperationResult<TData>, afterQueryCtx);
        }
      })();
    });
  }

  public async executeQuery<TData = any, TVars = QueryVariables>(
    operation: OperationWithCachePolicy<TData, TVars>,
    queryContext?: QueryExecutionContext,
    onResultChanged?: OnResultChangedCallback<TData>
  ): Promise<OperationResult<TData>> {
    return this.execute<TData, TVars>(operation, 'query', queryContext, onResultChanged);
  }

  public async executeMutation<TData = any, TVars = QueryVariables>(
    operation: Operation<TData, TVars>,
    queryContext?: QueryExecutionContext
  ): Promise<OperationResult<TData>> {
    return this.execute<TData, TVars>(operation, 'mutation', queryContext);
  }

  public async executeSubscription<TData = any, TVars = QueryVariables>(operation: Operation<TData, TVars>) {
    const result = await this.execute<TData, TVars>(operation, 'subscription');

    return result as unknown as ObservableLike<StandardOperationResult<TData>>;
  }
}

export function createClient(opts: ClientOptions) {
  const client = new Client(opts);
  client.install = (app: App) => {
    // this allows useQuery() etc useFunctions to get client outside of a component setup after
    setActiveClient(client);
    app.provide(CXQL_CLIENT, client);
  };
  return client;
}

function resolveInternalInjection<T>(vm: any, symbol: InjectionKey<T>) {
  // Vue 2 uses `proxy._provided` while Vue 3 has `provides`
  // Vue 2.7's proxy property might be a bug but thats the IRL situation.
  // eslint-disable-next-line no-underscore-dangle
  return vm?.proxy?._provided?.[symbol as any] || vm?._provided?.[symbol as any] || vm?.provides?.[symbol as any];
}

export function resolveClient(): Client {
  const vm = getCurrentInstance() as any;
  // Uses same component provide as its own injections
  // Due to changes in https://github.com/vuejs/vue-next/pull/2424
  let client = vm && inject(CXQL_CLIENT, resolveInternalInjection(vm, CXQL_CLIENT));

  if (client) setActiveClient(client);
  client = getActiveClient();

  if (client === null || client === undefined) {
    throw new Error(
      '无法检测 cxql client，您是否忘记调用 `useClinet`？或者，你可以显示地传递一个客户端作为 `manualClient` 参数。'
    );
  }

  return client;
}
