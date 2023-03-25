import path from 'node:path';

async function $import(url) {
  return import(path.join('file://', process.env.PPP_ASPIRANT_DIRNAME, url));
}

const { UTEXTCPServer } = await $import('../aurora/utex.mjs');
const Redis = (await $import('../vendor/ioredis.min.js')).default;

console.log(Redis);
