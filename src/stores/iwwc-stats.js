import { atom, computed } from 'nanostores'

export const $rawIwwcData = atom({})

const statsUrl = import.meta.env.PUBLIC_IWWC_STATS_URL || '/data/iwwc-stats.json'

export const refresh = async () => {
  const rawIwwcData = await fetch(statsUrl).then(response => response.json())
  $rawIwwcData.set(rawIwwcData)
}

const fullFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" }
const shortFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric" }

export const $groupInfo = computed($rawIwwcData, rawIwwcData => {
  const { group: { endDate, lastRefresh, startDate, ...rest }  = {} } = rawIwwcData

  const group = {
    ...rest,
    endDate: new Date(endDate),
    lastRefresh: new Date(lastRefresh),
    startDate: new Date(startDate),
  }
  group.$formatted = {
    endDate: group.endDate.toLocaleString(navigator.language, shortFormatOptions),
    lastRefresh: group.lastRefresh.toLocaleString(navigator.language, fullFormatOptions),
    startDate: group.startDate.toLocaleString(navigator.language, shortFormatOptions),
  }
  console.log('computed:groupInfo', group)
  return group

})

export const $agents = computed($rawIwwcData, rawIwwcData => {
  const { data: { statKeys = [], agents  = [] } = {} } = rawIwwcData
  return agents.reduce((agents, rawAgentData) => {
    const [ agentName, ...statValues ] = rawAgentData
    const agentInfo = agents[ agentName ] = statKeys.reduce((agentInfo, statKey, index) => {
      const value = agentInfo[ statKey ] = statValues[ index ]
      if (Number.isInteger(value)) {
        agentInfo.$formatted[ statKey ] = value.toLocaleString(navigator.language, { useGrouping: true })
      } else {
        agentInfo.$formatted[ statKey ] = value
      }
      return agentInfo
    }, { $formatted: {} })
    if (agentInfo.last_submit) {
      agentInfo.last_submit = new Date(agentInfo.last_submit)
    }
    return agents
  }, {})
})

export const $factionCounts = computed($rawIwwcData, rawIwwcData => {
  const { data: { factionCounts } = {} } = rawIwwcData
  return factionCounts
})

export const $stats = computed($rawIwwcData, rawIwwcData => {
  const { data: { stats = [] } = {} } = rawIwwcData
  return stats.reduce((stats, rawStatData) => {
    const { statName, statRows, sumAgents, ...rest } = rawStatData
    stats[ statName ] = {
      ...rest,
      sumAgents: Object.entries(sumAgents).reduce((sumAgents, [ key, value ]) => {
        sumAgents[ key ] = value
        sumAgents.$formatted[ key ] = value.toLocaleString(navigator.language, { useGrouping: true })
        return sumAgents
      }, { $formatted: {} }),
      statRows: statRows.reduce((statRows, [ agentName, position ]) => {
        statRows.push({ agentName, position})
        return statRows
      }, []),
    }
    return stats
  }, {})
})


