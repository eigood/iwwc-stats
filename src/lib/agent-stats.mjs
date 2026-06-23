import { promisify } from 'node:util'
import zlib from 'node:zlib'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)
const compress = async (input) => (await gzip(input)).toString('base64')
const decompress = async (input) => (await gunzip(Buffer.from(input, 'base64'))).toString('utf8')

const statParsers = {
  faction: {
    write: (v) => v === 'enl' ? 'E' : v === 'res' ? 'R' : 'U',
    read: (v) => v === 'E' ? 'enl' : v === 'R' ? 'res' : 'unknown',
  },
  last_submit: {
    write: (v) => Date.parse(v).toString(36),
    read: (v) => new Date(Number.parseInt(Number(v), 36)),
  },
}

const numberParser = {
  write: (v) => v.toString(36),
  read: (v) => v ? Number.parseInt(v, 36) : 0,
}

const dataVersions = [
  {
    write: (iwwcCustom) => iwwcCustom,
    read: (d) => d,
  },
  {
    write: async (iwwcCustom) => {
      iwwcCustom = await dataVersions[0].write(iwwcCustom)
      const keyMap = {}
      Object.values(iwwcCustom).forEach(agentStats => {
        Object.keys(agentStats).forEach(statName => keyMap[ statName ] = true)
      })
      const keys = Object.keys(keyMap).sort()
      const agents = [], stats = []
      Object.entries(iwwcCustom).forEach(([agentName, agentStats]) => {
        agents.push(agentName)
        stats.push(keys.map(statName => {
          const { [statName]: parser = numberParser } = statParsers
          const v = agentStats[ statName ]
          return v ? parser.write(v) : ''
        }))
      })
      return { keys, agents, stats }
    },
    read: async (d) => {
      const { keys, agents, stats } = d
      return await dataVersions[0].read(stats.reduce((iwwcCustom, agentStatList, agentIndex) => {
        const { [agentIndex]: agentName } = agents
        iwwcCustom[ agentName ] = agentStatList.reduce((result, statValue, statIndex) => {
          const { [statIndex]: statName } = keys
          const { [statName]: parser = numberParser } = statParsers
          result[ statName ] = parser.read(statValue)
          return result
        }, {})
        return iwwcCustom
      }, {}))
    }
  },
  {
    write: async (iwwcCustom) => {
      const { keys, agents, stats } = await dataVersions[1].write(iwwcCustom)
      return {
        k: await compress(keys.join('|')),
        a: await compress(agents.join('|')),
        s: await compress(stats.map(s => s.join('|')).join(':')),
      }
    },
    read: async (d) => {
      const keys = (await decompress(d.k)).split('|')
      const agents = (await decompress(d.a)).split('|')
      const stats = (await decompress(d.s)).split(':').map(s => s.split('|'))
      return await dataVersions[1].read({ keys, agents, stats })
    },
  },
]

export const writeVersion = async (iwwcCustom, v = dataVersions.length - 1) => {
  const { [v]: { write } } = dataVersions
  const output = {}
  if (v) output[':v'] = v
  Object.assign(output, await write(iwwcCustom))
  return output
}

export const readVersion = async (d) => {
  const { ':v': v = 0 } = d
  return dataVersions[v].read(d)
}

