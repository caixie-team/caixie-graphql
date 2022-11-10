import type { ClientPlugin, ClientPluginOperation, ObservableLike, StandardOperationResult } from './types';

export type SubscriptionForwarder<TData = any> = (
  operation: ClientPluginOperation
) => ObservableLike<StandardOperationResult<TData>>;

export function handleSubscriptions(forwarder: SubscriptionForwarder): ClientPlugin {
  const forward = forwarder;

  return function subscriptionsHandlerPlugin({ operation, useResult }) {
    if (operation.type !== 'subscription') {
      return;
    }

    if (!forward) {
      throw new Error('No subscription forwarder was set.');
    }

    useResult(forward(operation) as any, true);
  };
}
