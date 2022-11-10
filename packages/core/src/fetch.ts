import type { GraphQLError } from 'graphql';
import type { ClientPlugin } from './types';
import { CombinedError } from './utils';
import { makeFetchOptions, parseResponse, resolveGlobalFetch } from '@cxql/shared/lib/network';

interface FetchPluginOpts {
  fetch?: typeof window['fetch'];
}

export function fetch(opts?: FetchPluginOpts): ClientPlugin {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const fetch = opts?.fetch || resolveGlobalFetch();
  if (!fetch) {
    throw new Error('Could not resolve a fetch() method, you should provide one.');
  }

  // eslint-disable-next-line consistent-return
  return async function fetchPlugin(ctx) {
    const { useResult, opContext, operation } = ctx;
    const fetchOpts = makeFetchOptions(operation, opContext);

    let response;
    try {
      response = await fetch(opContext.url as string, fetchOpts).then(parseResponse);
    } catch (err) {
      return useResult(
        {
          data: null,
          error: new CombinedError({ response, networkError: err as any })
        },
        true
      );
    }

    // Set the response on the context
    // eslint-disable-next-line require-atomic-updates
    ctx.response = response;
    const data = response.body?.data;
    if (!response.ok || !response.body) {
      // It is possible than a non-200 response is returned with errors, it should be treated as GraphQL error
      const ctorOptions: { response: typeof response; graphqlErrors?: GraphQLError[]; networkError?: Error } = {
        response
      };

      if (response.body?.errors) {
        ctorOptions.graphqlErrors = response.body.errors;
      } else {
        ctorOptions.networkError = new Error(response.statusText);
      }

      return useResult(
        {
          data,
          error: new CombinedError(ctorOptions)
        },
        true
      );
    }

    useResult(
      {
        data,
        error: response.body.errors ? new CombinedError({ response, graphqlErrors: response.body.errors }) : null
      },
      true
    );
  };
}
