import type { Ref } from 'vue';
import { isReactive, isRef, unref } from 'vue';
import type { MaybeLazyOrRef, QueryVariables, QueryPredicateOrSignal, MaybeRef } from '../types';

export function unravel<TVars = QueryVariables>(
  signal: QueryPredicateOrSignal<TVars> | undefined,
  vars: MaybeRef<TVars>
) {
  if (isRef(signal)) {
    return signal.value;
  }

  if (typeof signal === 'function') {
    return signal(unref(vars));
  }

  return signal;
}

export function unwrap<TValue>(val: MaybeLazyOrRef<TValue>) {
  if (isRef(val)) {
    return unref(val);
  }

  // eslint-disable-next-line no-warning-comments
  // TODO: typescript bug to fix here
  return typeof val === 'function' ? (val as any)() : val;
}

export function isWatchable<T>(val: unknown): val is Ref<T> {
  return isRef(val) || isReactive(val) || typeof val === 'function';
}
