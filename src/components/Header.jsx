
import React from 'react'
import { useStore } from '@nanostores/react'

import { refresh, $groupInfo } from '../stores/iwwc-stats.js'
import { useFormattedDate } from './format-helpers.jsx'

const fullFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" }
const shortFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric" }
const groupFormatOptions = {
  lastRefresh: fullFormatOptions,
  startDate: shortFormatOptions,
  endDate: shortFormatOptions,
}

const Header = (props) => {
  const group = useStore($groupInfo) || {}
  const [ $formatted, set$Formatted ] = React.useState(null)
  React.useEffect(() => {
    set$Formatted(group.$formatted)
  }, [ group.$formatted ])
  const handleReload = React.useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    refresh()
  })

  return (
    <header className={`(group ? '' : 'loading')`}>
      <div className="agent-search"><input type="text"/><span className="clear-search fa-solid fa-remove"></span></div>
      <div className="reload-button" onClick={handleReload}>Reload</div>
      <div className="last-refresh">{$formatted?.lastRefresh}</div>
      <div className="start-date">{$formatted?.startDate}</div>
      <div className="end-date">{$formatted?.endDate}</div>
    </header>
  )
}

export default Header


