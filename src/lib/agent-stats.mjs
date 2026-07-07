import { promisify } from 'node:util'
import zlib from 'node:zlib'
import base from 'base-x'
import * as fflate from 'fflate'

const base96 = base(' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~')

/*
const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)
const gzip = async (input) => {
  return new UInt8Array(await (new Response(new Blob(input).pipeThrough(new CompressionStream('gzip'))).blob()).arrayBuffer()).toBase64()
}

const gunzip = async (input) > {

}
*/
const gzip = async (input) => Buffer.from(fflate.zlibSync(fflate.strToU8(input), { level: 9 }))
const gunzip = async (input) => fflate.decompressSync(Buffer.from(input, 'base64'))
//const compress = async (input) => Buffer.from(fflate.zlibSync(fflate.strToU8(input), { level: 9 })).toString('base64')
//const decompress = async (input) => fflate.strFromU8(fflate.decompressSync(Buffer.from(input, 'base64')))
const compress = async (input) => (await gzip(input)).toString('base64')
const decompress = async (input) => (await gunzip(Buffer.from(input, 'base64'))).toString('utf8')

//const compress = async (input) => base96.encode(await gzip(input))
//const decompress = async (input) => (await gunzip(base96.decode(input))).toString('utf8')

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
      const k = Object.keys(keyMap).sort()
      const a = [], s = []
      Object.entries(iwwcCustom).forEach(([agentName, agentStats]) => {
        a.push(agentName)
        s.push(k.map(statName => {
          const { [statName]: parser = numberParser } = statParsers
          const v = agentStats[ statName ]
          return v ? parser.write(v) : ''
        }))
      })
      return { k, a, s }
    },
    read: async (d) => {
      const { k, a, s } = d
      return await dataVersions[0].read(s.reduce((iwwcCustom, agentStatList, agentIndex) => {
        const { [agentIndex]: agentName } = a
        iwwcCustom[ agentName ] = agentStatList.reduce((result, statValue, statIndex) => {
          const { [statIndex]: statName } = k
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
      const { k, a, s } = await dataVersions[1].write(iwwcCustom)
      return {
        k: k.join('|'),
        a: a.join('|'),
        s: s.map(s => s.join('|')).join(':'),
      }
    },
    read: async (d) => {
      const { k, a, s } = d
      return await dataVersions[1].read({
        k: k.split('|'),
        a: a.split('|'),
        s: s.split(':').map(s => s.split('|')),
      })
    },
  },
  {
    write: async (iwwcCustom) => {
      const { k, a, s } = await dataVersions[2].write(iwwcCustom)
      return {
        k: await compress(k),
        a: await compress(a),
        s: await compress(s),
      }
    },
    read: async (d) => {
      const k = await decompress(d.k)
      const a = await decompress(d.a)
      const s = await decompress(d.s)
      return await dataVersions[2].read({ k, a, s })
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

