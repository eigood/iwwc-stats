import { readFileSync } from 'node:fs'
import { readVersion, writeVersion } from '../lib/agent-stats.mjs'

const iwwcCustom = JSON.parse(readFileSync(0))

const output = await writeVersion(iwwcCustom, 3)
const original = await readVersion(output)
console.info(JSON.stringify(output))

