import { load } from '../../data/iwwc-stats.js'

export async function GET(Astro) {
  return new Response(JSON.stringify(await load()))
}

