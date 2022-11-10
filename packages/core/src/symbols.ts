import type { InjectionKey } from 'vue';
import type { Client } from './client';

export const CXQL_CLIENT: InjectionKey<Client> = Symbol('cxql.client');
