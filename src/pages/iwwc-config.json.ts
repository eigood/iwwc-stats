import config from '../data/iwwc-config.json'

export const GET = async (astro, request) => {
  return new Response(JSON.stringify(config))
}
