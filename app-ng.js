const eventData = {
  '2024': {
    title: '2024 (September)',
    customUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2024.json',
    infoUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2024.json',
  },
  '2023': {
    title: '2023 (November)',
    customUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2023.json',
    infoUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2023.json',
  },
  '2022': {
    title: '2022 (November)',
    customUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2022.json',
    infoUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2022.json',
  },
  '2021': {
    title: '2021 (July)',
    customUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2021.json',
    infoUrl: 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2021.json',
  },
}

let currentEvent = '2024'

const skipStats = {
  'ap': true,
  'level': true,
  'faction': true,
}

const statParsers = {
  ['last_submit']: (value) => {
    if (value === '0000-00-00 00:00:00') value = 0
    if (value) return new Date(Date.parse(value + '+0000'))
    return null
  },
}

const displayStats = [
  ['lifetime_ap', 'AP'],
  ['builder', 'Builder'],
  ['connector', 'Connector'],
  ['engineer', 'Engineer'],
  ['explorer', 'Explorer'],
  ['hacker', 'Hacker'],
  ['illuminator', 'Illuminator'],
  ['crafter', 'Kinetic Capsules Completed'],
  ['liberator', 'Liberator'],
  ['maverick', 'Maverick'],
  ['mind-controller', 'Mind Controller'],
  ['overclocker', 'Overclock'],
  ['pioneer', 'Pioneer'],
  ['purifier', 'Purifier'],
  ['recharger', 'Recharger'],
  ['reclaimer', 'Reclaimer'],
  ['recon', 'Recon'],
  ['recursions', 'Recursions'],
  ['scout', 'Scout'],
  ['scout_controller', 'Scout Controller'],
  ['specops', 'Specops'],
  ['translator', 'Translator'],
  ['trekker', 'Trekker'],
  ['SEPARATOR', 'Extra Values'],
  ['ratio@mu/field', 'MindUnits / Field'],
  ['ratio@fields/link', 'Fields / Link'],
  ['ratio@pioneer/explorer', 'Pioneeer / Explorer'],
  ['ratio@ap/hack', 'AP / Hack'],
  ['ratio@translator/hacker', 'Translator / Hacker'],
  ['ratio@purifier/builder', 'Purifier / Builder'],
  ['ratio@ap/trekker', 'AP / km'],
  ['last_submit', 'Last Submit'],
]

const makeHandlers = (self, ...names) => {
  names.forEach((name) => {
    const { [ name ]: func } = self
    self[ name ] = (...args) => func.apply(self, args)
  })
}

class App {
  constructor({ currentEvent, displayStats, eventData }) {
    this._currentEvent = currentEvent
    this._displayStats = displayStats
    this._eventData = eventData
    this._toggles = {}
    this._toggleSelectors = {
      '#': '.toggles .chart-position',
    }
    makeHandlers(this, 'loadData', 'onSearch', 'onEventChange', 'setSearch', 'clearSearch')
    this.debouncedSetSearch = debounce(this.setSearch, 50)
    this._statPanes = this._displayStats.map(([ statName, statTitle ]) => new StatPane({ app: this, statName, statTitle }))

    this._data = {}
  }

  attachToDOM() {
    this._statPaneTemplate = document.querySelector('#stat-pane')
    this._statListRowTemplate = document.querySelector('#stat-list-row')
    document.querySelector('.reload-button').addEventListener('click', this.loadData)
    const searchInput = document.querySelector('.agent-search input')
    searchInput.addEventListener('keyup', this.onSearch)
    this.setLocation(document.location.hash)
    document.querySelector('.clear-search').addEventListener('click', this.clearSearch)
    Object.entries(this._toggleSelectors).forEach(([ toggle, selector ]) => {
      document.querySelector(selector).addEventListener('click', (e) => {
        this.toggle(toggle, e)
      })
    })

    const currentEventSelect = document.querySelector('select[name="current-event"]')
    const eventData = this._eventData
    const eventKeys = Object.keys(eventData).sort((a, b) => eventData[ a ].title.localeCompare(eventData[ b ].title))
    for (const eventKey of eventKeys) {
      const option = document.createElement('option')
      option.setAttribute('value', eventKey)
      option.textContent = eventData[ eventKey ].title
      if (this._currentEvent == eventKey) option.setAttribute('selected', true)
      currentEventSelect.appendChild(option)
    }
    currentEventSelect.addEventListener('change', this.onEventChange)
    const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
    this._statPanes.forEach((statPane) => statPane.attachToDOM(appContentNode))
    this.updateDOM()
  }

  updateDOM() {
    if (!this._statPaneTemplate) return
    if (this._info) {
      const lastRefresh = new Date(this._info.lastRefresh + 'Z')
      lastRefresh.setHours(lastRefresh.getHours() - 2)
      document.querySelector('.last-refresh').textContent = dateFullFormat.format(lastRefresh)
      document.querySelector('.start-date').textContent = dateShortFormat.format(new Date(this._info.startDate))
      document.querySelector('.end-date').textContent = dateShortFormat.format(new Date(this._info.endDate))
    }
    if (this._factionCounts) {
      const app = document.querySelector('#iwwc-app')
      app.querySelector('header .enl-stat .total').textContent = this._factionCounts.enl
      app.querySelector('header .res-stat .total').textContent = this._factionCounts.res
    }
    if (!this._byStat) return
    if (!this._factionCounts) return
  }

  detatchFromDOM() {
    this._statPanes.forEach((statPane) => statPane.detachFromDOM())
    Object.entries(this._toggleSelectors).forEach(([ toggle, selector ]) => {
      document.querySelector(selector).removeEventListener('click')
    })
    document.querySelector('.reload-button').removeEventListener('click', this.loadData)
    document.querySelector('.agent-search input').removeEventListener('keyup', this.onSearch)
    document.querySelector('.clear-search').removeEventListener('click', this.clearSearch)
    this.clearSearch()
    const currentEventSelect = document.querySelector('select[name="current-event"]')
    while (currentEventSelect.lastChild) {
      currentEventSelect.removeChild(currentEventSelect.lastChild)
    }
    currentEventSelect.removeEventListener('change', this.onEventChange)
    delete this._statPaneTemplate
    delete this._statListRowTemplate
    const app = document.querySelector('#iwwc-app')
    app.querySelector('header .enl-stat .total').textContent = ''
    app.querySelector('header .res-stat .total').textContent = ''
  }

  loadData(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const buttonIcon = document.querySelector('.reload-button .icon')
    buttonIcon.classList.add('fa-spin')
    Promise.all([
      fetchJSON(this._eventData[ this._currentEvent ].customUrl, (data) => this.setData(data)),
      fetchJSON(this._eventData[ this._currentEvent ].infoUrl, (data) => this.setInfo(data)),
    ]).finally(() => {
      buttonIcon.classList.remove('fa-spin')
    })
  }

  setInfo(data) {
    if (!data) return
    this._info = data
    this.updateDOM()
  }

  setData(data) {
    if (!data) return
    this._data = data
    const app = document.querySelector('#iwwc-app')
    app.classList.remove('loading')
    const byStat = this._byStat = {}

    const factionCounts = this._factionCounts = { enl: 0, res: 0 }
    console.time('analyze')
    Object.entries(data).forEach(([ agentName, agentData ]) => {
      factionCounts[ agentData.faction ]++
      calculateInferredStats(agentData)
      Object.entries(agentData).forEach(([ statName, statValue ]) => {
        const { [ statName ]: statParser } = statParsers
        if (statParser) {
          agentData[ statName ] = statParser(statValue)
        }
        if (skipStats[ statName ]) return
        byStat[ statName ] = null;
      })
    })
    const allAgents = this._allAgents = Object.keys(data)
    const statSorter = statName => (a, b) => {
      const { [ a ]: agentA, [ b ]: agentB } = data
      const valueDiff = agentB[ statName ] - agentA[ statName ]
      if (valueDiff) return valueDiff
      if (statName !== 'lifetime_ap') {
        const apDiff = agentB[ 'lifetime_ap' ] - agentA[ 'lifetime_ap' ]
        if (apDiff) return apDiff
      }
      if (a < b) return -1
      if (a > b) return 1
      return 0
    }

    Object.keys(byStat).forEach(statName => {
      byStat[ statName ] = [...allAgents].sort(statSorter(statName))
    })
    console.timeEnd('analyze')
    this.updateDOM()
    console.time('absorb')
    this._statPanes.forEach((statPane) => statPane.setStatList(byStat[ statPane._statName ]))
    this.propagateSearch()
    console.timeEnd('absorb')
  }

  onEventChange(e) {
    const { target: { value } } = e
    if (this._currentEvent !== value) {
      this._currentEvent = value
      this.loadData()
    }
  }

  setLocation(hash = '') {
    const [ all, hashSearch = '', hashToggles = ''] = hash.match(/^#(.*?)(?:;([#])?)?$/) || []
    hashToggles.split('').forEach((toggle) => this.setToggle(toggle, true))
    this.setSearch(hashSearch)
  }

  onSearch(e) {
    const { target: { value } } = e
    e.preventDefault()
    e.stopPropagation()
    this.debouncedSetSearch(value)
  }

  setSearch(rawSearch) {
    const rawSearchLower = rawSearch.toLowerCase()
    if (this._rawSearch === rawSearch) return
    this._rawSearch = rawSearch
    document.querySelector('.agent-search input').value = rawSearch
    this.propagateSearch()
  }

  propagateSearch() {
    const rawSearch = this._rawSearch
    const toggles = Object.keys(this._toggles).sort().join('')
    let newHash = this._rawSearch
    if (toggles) newHash += ';' + toggles
    history.replaceState(null, '', newHash ? '#' + newHash : '#')
    const rawSearchLower = rawSearch.toLowerCase()
    const searchTerms = rawSearchLower ? rawSearchLower.split('&') : []
    const matchedAgents = searchTerms.length && this._allAgents ? this._allAgents.filter((agentName) => {
      const agentNameLower = agentName.toLowerCase()
      return searchTerms.filter(searchTerm => searchTerm.length && agentNameLower.indexOf(searchTerm) !== -1).length
    }).reduce((result, matchedAgent) => (result[ matchedAgent ] = true, result), {}) : null
    this._statPanes.forEach((statPane) => statPane.setSearch(matchedAgents, this._toggles))
  }

  clearSearch() {
    this.setSearch('')
  }

  toggle(toggle, e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const { [ toggle ]: value = false } = this._toggles
    this.setToggle(toggle, !value)
    this.propagateSearch()
  }

  // internal
  setToggle(toggle, value) {
    const toggleElement = document.querySelector(this._toggleSelectors[ toggle ])
    if (value) {
      toggleElement.classList.add('toggle-selected')
      this._toggles[ toggle ] = true
    } else {
      delete this._toggles[ toggle ]
      toggleElement.classList.remove('toggle-selected')
    }
  }
}

class StatPane {
  constructor({ app, statName, statTitle }) {
    this._app = app
    this._statName = statName
    this._statTitle = statTitle
    makeHandlers(this, 'onScroll', 'onKeyDown')
    this._pages = {
      full: { start: 0, rowInfos: undefined, scrollTop: 0, exactMatchedAgents: {} },
      search: { start: 0, rowInfos: undefined, scrollTop: 0, exactMatchedAgents: {} },
    }
    this._currentPage = undefined
  }

  attachToDOM(appContentNode) {
    if (this._statPaneNode) return
    const statPaneFragment = this._app._statPaneTemplate.content.cloneNode(true)
    const statPaneNode = this._statPaneNode = statPaneFragment.querySelector('.stat-pane')

    const headerNode = statPaneFragment.querySelector('.stat-header')
    const contentNode = statPaneNode.querySelector('.stat-content')
    contentNode.tabIndex = 0

    statPaneNode.dataset.medal = this._statName
    headerNode.querySelector('.title').textContent = this._statTitle
    appContentNode.appendChild(statPaneFragment)

    if (this._statName === 'SEPARATOR') {
      statPaneNode.classList.remove('stat-loading')
    }

    contentNode.addEventListener('scroll', this.onScroll)
    contentNode.addEventListener('keydown', this.onKeyDown)
    headerNode.querySelector('.jump-up').addEventListener('click', (e) => this.jumpUp(e))
    headerNode.querySelector('.jump-down').addEventListener('click', (e) => this.jumpDown(e))

    this.checkRender()
  }

  detachFromDOM() {
    if (!this_statPaneNode) return
    const statPaneNode = this._statPaneNode
    const contentNode = statPaneNode.querySelector('.stat-content')
    contentNode.removeEventListener('scroll', this.onScroll)
    contentNode.removeEventListener('keydown', this.onKeyDown)
    const headerNode = statPaneNode.querySelector('.stat-header')
    headerNode.querySelector('.jump-up').removeEventListener('click')
    headerNode.querySelector('.jump-down').removeEventListener('click')
    statPaneNode.parentNode.removeChild(statPaneNode)
    delete this._statPaneNode
    delete this._pages.current
    delete this._pages.full.rowInfos
    delete this._pages.search.rowInfos
  }

  setStatList(statList) {
    if (this._statList === statList) return
    this._statList = statList

    const statPaneNode = this._statPaneNode
    const statName = this._statName
    const data = this._app._data
    const statListRowTemplate = this._app._statListRowTemplate

    const rolloverBuilder = rollovers[ statName ]
    const activeAgents = { enl: 0, res: 0 }
    const sumAgents = { enl: 0, res: 0 }
    let lastValue = undefined, lastPosition = undefined
    const rowInfos = this._pages.full.rowInfos = statList.map((agentName, index) => {
      const agentInfo = this._app._data[ agentName ]
      const faction = agentInfo.faction
      const statValue = agentInfo[ statName ]
      const { [ statName ]: statValueDisplay = (agentName, agentInfo, value) => numberFormat.format(value) } = statValueDisplays
      const rowFragment = statListRowTemplate.content.cloneNode(true)
      const rowNode = rowFragment.querySelector('.stat-row')
      const valueNode = rowFragment.querySelector('.stat-value')
      const positionNode = rowFragment.querySelector('.stat-position')
      const agentNode = rowFragment.querySelector('.agent')
      const rolloverNode = rowFragment.querySelector('.rollover')

      if (statValue) activeAgents[ faction ]++
      sumAgents[ faction ] += statValue

      let position
      if (lastValue === undefined) {
        lastValue = statValue
        position = lastPosition = index + 1
      } else if (statValue !== lastValue) {
        lastValue = statValue
        position = lastPosition = index + 1
      } else {
        position = lastPosition
      }
      const rolloverValue = rolloverBuilder ? rolloverBuilder(agentName, this._app._data) : null
      rowNode.dataset.value = statValue
      rowNode.dataset.agent = agentName
      positionNode.textContent = position
      if (position === 1) {
        rowNode.className += ' onyx'
      } else if (position === 2) {
        rowNode.className += ' platinum'
      } else if (position === 3) {
        rowNode.className += ' gold'
      } else if (position < 21) {
        rowNode.className += ' silver'
      } else {
        rowNode.className += ' none'
      }
      valueNode.textContent = statValueDisplay(agentName, agentInfo, statValue)
      agentNode.className += ' faction-' + agentInfo.faction
      agentNode.textContent = agentName
      if (rolloverValue) {
        rolloverNode.textContent = rolloverValue
      } else {
        rolloverNode.parentNode.removeChild(rolloverNode)
      }
      const attachListeners = (rowFragmentClone) => {
        const agentNode = rowFragmentClone.querySelector('.agent')
        agentNode.addEventListener('click', e => {
          this._app.setSearch(agentName)
        })
      }
      return { rowFragment, attachListeners, agentName, agentNameLower: agentName.toLowerCase(), position }
    })
    const footerNode = statPaneNode.querySelector('.stat-footer')
    footerNode.querySelector('.enl-stat .sum').textContent = numberFormat.format(sumAgents.enl)
    footerNode.querySelector('.enl-stat .agent').textContent = activeAgents.enl
    footerNode.querySelector('.res-stat .sum').textContent = numberFormat.format(sumAgents.res)
    footerNode.querySelector('.res-stat .agent').textContent = activeAgents.res
    this._firstRow = rowInfos[ 0 ].rowFragment
    this._lastRow = rowInfos[ rowInfos.length - 1 ].rowFragment

    this.checkRender()
  }

  setSearch(matchedAgents, toggles) {
    if (this._matchedAgents === matchedAgents && this._toggles === toggles) return
    this._matchedAgents = matchedAgents
    this._toggles = toggles
    this.checkRender()
  }

  renderPage() {
    const contentNode = this._statPaneNode.querySelector('.stat-content')
    const listNode = this._statPaneNode.querySelector('.stat-list')
    const { start, rowInfos, scrollTop } = this._currentPage
    this._statPaneNode.classList.add('stat-loading')
    while (listNode.lastChild) {
      listNode.removeChild(listNode.lastChild)
    }
    if (this._matchedAgents) {
      listNode.classList.add('searching')
    } else {
      listNode.classList.remove('searching')
    }
    const firstRow = this._firstRow.cloneNode(true)
    firstRow.querySelector('.stat-row').classList.add('for-sizing')
    listNode.appendChild(firstRow)
    const lastRow = this._lastRow.cloneNode(true)
    lastRow.querySelector('.stat-row').classList.add('for-sizing')
    listNode.appendChild(lastRow)
    for (let i = start, j = pageSize; j && i < rowInfos.length; i++, j--) {
      const { agentName, rowFragment, attachListeners } = rowInfos[ i ]
      const rowFragmentCloned = rowFragment.cloneNode(true)
      attachListeners(rowFragmentCloned)
      if (this._matchedAgents?.[ agentName ]) {
        rowFragmentCloned.querySelector('.stat-row').classList.add('matched')
      }
      listNode.appendChild(rowFragmentCloned)
    }
    contentNode.scrollTop = scrollTop
    this._statPaneNode.classList.remove('stat-loading')
  }

  checkRender() {
    if (!this._statPaneNode) return
    if (!this._pages.full.rowInfos) return
    this.applySearch()
    this.renderPage()
  }

  applySearch() {
    if (!this._pages.full.rowInfos) return
    const toggles = this._toggles
    const matchedAgents = this._matchedAgents
    if (matchedAgents) {
      const searchPage = this._pages.search
      searchPage.start = 0
      const allRows = this._pages.full.rowInfos
      const chartPositionToggle = toggles[ '#' ]
      const matchedRows = []
      searchPage.exactMatchedAgents = {}
      let minMatchIndex
      const matchedIndexes = allRows.reduce((result, rowInfo, index) => {
        if (matchedAgents[ rowInfo.agentName ]) {
          result[ index ] = true
          if (chartPositionToggle) {
            if (index > 19 && minMatchIndex === undefined) minMatchIndex = index
            if (index > 0) result[ index - 1 ] = true
            if (index + 1 !== allRows.length) result[ index + 1 ] = true
          }
        }
        return result
      }, [])
      if (minMatchIndex !== undefined) {
        matchedIndexes[ 18 ] = true
        matchedIndexes[ 19 ] = true
      }
      searchPage.rowInfos = allRows.filter((rowInfo, index) => matchedIndexes[ index ])
      this._currentPage = searchPage
    } else {
      this._currentPage = this._pages.full
    }
    if (this._currentPage.start + pageSize > this._currentPage.rowInfos.length) {
      this._currentPage.start = this._currentPage.rowInfos.length - pageSize
      if (this._currentPage.start < 0) this._currentPage.start = 0
    }
  }

  onScroll(e) {
    let { target, target: { offsetTop, scrollTop, scrollHeight } } = e
    const current = this._currentPage
    current.scrollTop = scrollTop
    const end = Math.min(current.start + pageSize, current.rowInfos.length)
    const rowHeight = scrollHeight / (end - current.start)
    if (scrollTop > rowHeight * 8) {
      if (end !== current.rowInfos.length) {
        current.start++
        current.scrollTop = scrollTop - rowHeight
        this.renderPage()
      }
    } else if (scrollTop < rowHeight * 4) {
      const newStart = Math.max(current.start - 4, 0)
      if (newStart !== current.start) {
        const diff = current.start - newStart
        current.start = newStart
        current.scrollTop = scrollTop + diff * rowHeight
        this.renderPage()
      }
    }
  }

  jumpUp(e) {
    if (!this._pages.full.rowInfos) return
    const current = this._currentPage
    current.scrollTop = 0
    current.start = 0
    this.renderPage()
    e.stopPropagation()
    e.preventDefault()
    return false
  }

  jumpDown(e) {
    if (!this._pages.full.rowInfos) return
    const current = this._currentPage
    const end = Math.min(current.start + pageSize, current.rowInfos.length)
    current.start = current.rowInfos.length - pageSize
    this.renderPage()
    const listNode = this._statPaneNode.querySelector('.stat-list')
    listNode.lastElementChild.scrollIntoView(false)
    e.stopPropagation()
    e.preventDefault()
    return false
  }

  onKeyDown(e) {
    const { keyCode, target, target: { scrollHeight } } = e
    switch (keyCode) {
      case 36:
        // home
        return this.jumpUp(e)
      case 35:
        // end
        return this.jumpDown(e)
    }
  }
}

const numberFormat = Intl.NumberFormat(navigator.language, { useGrouping:true })
const dateFullFormat = Intl.DateTimeFormat(navigator.language, { year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric", hourCycle: 'h23' })
const dateShortFormat = Intl.DateTimeFormat(navigator.language, { weekday:"short", year:"numeric", month:"short", day:"numeric" })
const lastSubmitFormat = Intl.DateTimeFormat(navigator.language, { timeZone: 'UTC', year: 'numeric', month: '2-digit', day:"2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: 'h23' })

const apRollover = (agentName, data) => {
  const { [ agentName ]: { [ 'lifetime_ap' ]: lifetimeAp } } = data
  return numberFormat.format(lifetimeAp) + ' AP'
}

const statRollover = (statName) => (agentName, data) => {
  const { [ agentName ]: { [ statName ]: statValue } } = data
  if (!statValue) return null
  return numberFormat.format(statValue)
}

const rollovers = {
  'recursions': apRollover,
  'connector': statRollover('ratio@fields/link'),
  'mind-controller': statRollover('ratio@fields/link'),
  'illuminator': statRollover('ratio@mu/field'),
}

const statValueDisplays = {
  'recursions': (agentName, agentInfo, statValue) => {
    const { recursions, level } = agentInfo
    if (recursions) {
      return numberFormat.format(statValue) + '@' + numberFormat.format(level)
    } else {
      return statValue
    }
  },
  'last_submit': (agentName, agentInfo, statValue) => {
    return lastSubmitFormat.format(statValue)
  },
}

async function fetchJSON(url, handler) {
  const response = await fetch(url, {_mode: 'no-cors'})
  const json = await response.json()
  return handler(json)
}

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args) }, timeout)
  }
}

const pageSize = 50

function calculateInferredStats(agentData) {
  const {
    [ 'lifetime_ap' ]: ap,
    builder,
    connector,
    explorer,
    hacker,
    illuminator,
    [ 'mind-controller' ]: mindController,
    pioneer,
    purifier,
    translator,
    trekker,
  } = agentData
  agentData['ratio@fields/link'] = connector ? mindController / connector : null
  agentData['ratio@mu/field'] = mindController ? illuminator / mindController : null
  agentData['ratio@pioneer/explorer'] = explorer ? pioneer / explorer : null
  agentData['ratio@ap/hack'] = hacker ? ap / hacker : null
  agentData['ratio@translator/hacker'] = hacker ? translator / hacker : null
  agentData['ratio@purifier/builder'] = builder ? purifier / builder : null
  agentData['ratio@ap/trekker'] = trekker ? ap / trekker : null
}

const app = new App({
  currentEvent: '2024',
  displayStats,
  eventData,
})

function handleLoad() {
  app.attachToDOM()
  app.loadData()
}

window.addEventListener('load', handleLoad);
