import React from 'react'
import { useStore } from '@nanostores/react'

import { $agents, $factionCounts, $stats } from '../stores/iwwc-stats.js'

const positionToClass = (position) => {
  if (position === 1) {
    return ' onyx'
  } else if (position === 2) {
    return ' platinum'
  } else if (position === 3) {
    return ' gold'
  } else if (position < 21) {
    return ' silver'
  } else {
    return ' none'
  }
}


const formatNumber = (value) => (value || 0).toLocaleString(navigator.language, { useGrouping: true })

const StatRow = (props) => {
  const { agentName, faction, position, value, valueFormatted } = props
  return (
    <li className={`stat-row ${positionToClass(position)}`} data-agent={agentName}>
      <span className="stat-position">{position}</span>
      <span className="stat-reward fa-solid fa-medal badge"></span>
      <dfn className="stat-value">{valueFormatted}</dfn>
      <span className={`agent faction-${faction}`} data-agent={agentName}>{agentName}</span>
    </li>
  )

}

const StatPane = (props) => {
  const { statName, statTitle } = props
  const factionCounts = useStore($factionCounts) || {}
  const agents = useStore($agents) || {}
  const stats = useStore($stats)
  const [ statInfo, setStatInfo ] = React.useState({
    statRows: [],
    sumAgents: { $formatted: {}, },
    activeAgents: {},
  })
  const { statRows, sumAgents, activeAgents } = statInfo
  React.useEffect(() => {
    const { [ statName ]: { statRows, sumAgents, activeAgents } } = stats
    setStatInfo({ statRows, sumAgents, activeAgents })
  }, [ stats ])

  return (
    <div className={`stat-pane ${(statRows.length ? '' : 'loading')}`} data-medal={statName}>
      <h4 className="stat-header">
        <span className="title">{statTitle}:{(statRows.length ? '' : 'loading')}</span>
        <span className="badge"></span>
        <span className="loading-icon fa-solid fa-spinner fa-spin"></span>
      </h4>
      <div className="stat-content">
        <ol className="stat-list">
          {statRows.map(({ agentName, position }, index) => {
            const { [ agentName ]: agentInfo = {} } = agents
            const {
              faction,
              $formatted: { [ statName ]: valueFormatted = '' } = {},
            } = agentInfo
            return (
              <li key={agentName} className={`stat-row ${positionToClass(position)}`} data-agent={agentName}>
                <span className="stat-position">{position}</span>
                <span className="stat-reward fa-solid fa-medal badge"></span>
                <dfn className="stat-value">{valueFormatted}</dfn>
                <span className={`agent faction-${faction}`} data-agent={agentName}>{agentName}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="stat-footer">
        <span className="enl-stat"><span className="sum">{sumAgents.$formatted.enl}</span>[<span className="agent">{activeAgents.enl}</span>/<span className="total">{factionCounts.enl}</span>]</span>
        <span className="res-stat"><span className="sum">{sumAgents.$formatted.res}</span>[<span className="agent">{activeAgents.res}</span>/<span className="total">{factionCounts.res}</span>]</span>
      </div>
    </div>
  )
}

export default StatPane
