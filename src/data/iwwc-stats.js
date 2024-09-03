//import { action, atom, computed, map } from 'nanostores'
import { $groupInfo, $rawIwwcData } from '../stores/iwwc-stats.js'
import { displayStats } from './iwwc-config.js'

const fetchJSON = async (url, handler = (json) => json) => {
  const response = await fetch(url, {
    _mode: 'no-cors',
    headers: {
      'AS-Key': import.meta.env.AS_KEY,
    },
  })
  const json = await response.json()
  return handler(json)
}

export const iwwcInfo = async () => {
  const { lastRefresh, ...rest } = await fetchJSON(`https://api.agent-stats.com/groups/${import.meta.env.AS_GROUP_ID}/info`)
  const fixedLastRefresh = new Date(lastRefresh)
  fixedLastRefresh.setHours(fixedLastRefresh.getHours() - 1)
  //console.log('iwwcInfo', iwwcInfo)
  return { ...rest, lastRefresh: fixedLastRefresh }
}

export const iwwcData = async () => {
  const iwwcCustom = await fetchJSON(`https://api.agent-stats.com/groups/${import.meta.env.AS_GROUP_ID}/now`)
  const agents = {}
  const factionCounts = { enl: 0, res: 0 }

  const statNameKeys = {}
  Object.entries(iwwcCustom).forEach(([ agentName, agentData ]) => {
    factionCounts[ agentData.faction ]++
    agents[ agentName ] = Object.entries(agentData).reduce((result, [ statName, statValue ]) => {
      if (statValue) {
        if (statName === 'last_submit') {
          statValue = new Date(statValue).getTime()
        }
        result[ statName ] = statValue
        statNameKeys[ statName ] = true
      }
      return result
    }, {})
  })
  //console.log('agents', agents)
  const allAgents = Object.keys(iwwcCustom)
  const statSorter = statName => (a, b) => {
    const {
      [ a ]: { [ statName ]: aValue = 0 },
      [ b ]: { [ statName ]: bValue = 0 },
    } = agents
    const valueDiff = bValue - aValue
    if (valueDiff) return valueDiff
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  const stats = displayStats.map(([ statName, statTitle ]) => {
    const statList = [...allAgents].sort(statSorter(statName))
    const activeAgents = { enl: 0, res: 0 }
    const sumAgents = { enl: 0, res: 0 }
    let lastValue = undefined, lastPosition = undefined
    const statRows = statList.map((agentName, index) => {
      const agentInfo = agents[ agentName ]
      const faction = agentInfo.faction
      const { [ statName ]: value = 0 } = agentInfo
      if (value) activeAgents[ faction ]++
      sumAgents[ faction ] += value

      let position
      if (lastValue === undefined) {
        lastValue = value
        position = lastPosition = index + 1
      } else if (value !== lastValue) {
        lastValue = value
        position = lastPosition = index + 1
      } else {
        position = lastPosition
      }
      return [ agentName, position ]
    })
    return { activeAgents, statName, statRows, sumAgents }
  })
  const statKeysWithValue = Object.keys(statNameKeys)
  return {
    factionCounts,
    statKeys: statKeysWithValue,
    agents: Object.entries(agents).reduce((result, [ agentName, agentInfo ]) => {
      result.push([
        agentName,
        ...statKeysWithValue.reduce((result, statName) => {
          result.push(agentInfo[ statName ])
          return result
        }, [])
      ])
      return result
    }, []),
    stats,
  }
}

export const load = async (force = false) => {
  const groupInfo = $groupInfo.get()
  const checkDate = new Date()
  checkDate.setHours(checkDate.getHours() - 1)
  console.log('iwwc-data:load', {force, checkDate, groupInfo})
  const { lastRefresh } = groupInfo
  // TODO: Add out-of-date check

  if (!isNaN(lastRefresh)) {
    console.log('freshness', {last: lastRefresh.getTime(), check: checkDate.getTime()})
  }

  if (force || isNaN(lastRefresh) || lastRefresh < checkDate) {
    console.log('fetching data')
    const group = await iwwcInfo()
    const data = await iwwcData()
    $rawIwwcData.set({ group, data })
  }
  const { group, data } = $rawIwwcData.get()
  return { group, data }
}
