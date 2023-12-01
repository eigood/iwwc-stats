
import React from 'react'
import { useStore } from '@nanostores/react'

import { rot13 } from '../data/util.js'
import { refresh, $groupInfo } from '../stores/iwwc-stats.js'
import { useFormattedDate } from './format-helpers.jsx'

const searchPassKeyName = import.meta.env.PUBLIC_SEARCH_PASS_KEY_NAME
const pmPassKeyName = import.meta.env.PUBLIC_PM_PASS_KEY_NAME

const fullFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" }
const shortFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric" }
const groupFormatOptions = {
  lastRefresh: fullFormatOptions,
  startDate: shortFormatOptions,
  endDate: shortFormatOptions,
}

const getWindowSecret = (name) => {
  if (!name) return null
  return rot13(atob(rot13(window[ name ])))
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
  const [ windowSecrets, setWindowSecrets ] = React.useState({})
  React.useEffect(() => {
    const windowSecrets = {
      [ searchPassKeyName ]: getWindowSecret(searchPassKeyName),
      [ pmPassKeyName ]: getWindowSecret(pmPassKeyName),
    }
    setWindowSecrets(windowSecrets)
  }, [])
  const hasSecretCode = windowSecrets[ searchPassKeyName ] && windowSecrets[ pmPassKeyName ]
  const [ showPassKey, setShowPassKey ] = React.useState(false)
  const handleOnChange = React.useCallback((e) => {
    const { target: { value } } = e
    if (value === windowSecrets[ searchPassKeyName ]) {
      setShowPassKey(true)
    }
  })

  return (
    <>
    <header className={`(group ? '' : 'loading')`}>
      <div className="agent-search"><input onChange={hasSecretCode ? handleOnChange : null} type="text"/><span className="clear-search fa-solid fa-remove"></span></div>
      <div className="reload-button" onClick={handleReload}>Reload</div>
      <div className="last-refresh">{$formatted?.lastRefresh}</div>
      <div className="start-date">{$formatted?.startDate}</div>
      <div className="end-date">{$formatted?.endDate}</div>
    </header>

      <div className="passkey-container" style={{display: showPassKey ? 'block' : 'none'}}>
        <div className="passkey-opaque"></div>
        <div className="passkey-content">
          <div className="passkey-message">
            <p>Send "{windowSecrets[ pmPassKeyName ]}" without the quotes to <span className="agent faction-res">@eigood</span> on Telegram.</p>
            <a onClick={e => setShowPassKey(false)}>Close</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Header


