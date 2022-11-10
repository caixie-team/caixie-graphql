#!/usr/bin/env zx
import { fetch } from 'zx';

const requestUrl = 'https://npmmirror.com/sync/eslint-config-caixiejs';

const pkgs = ['base', 'ts', '', 'vue', 'vue2', 'react', 'react-native', 'svelte', 'solid'];

const requestUrls = pkgs.map(item => requestUrl + (item ? `-${item}` : ''));

async function sync() {
  await Promise.all(requestUrls.map(url => fetch(url)));
}

sync();
