const skipStats = {
  'ap': true,
  'level': true,
  'faction': true,
}

const makeSafeRatioParser = (numeratorKey, denominatorKey) => (value, agentData) => {
  const { [numeratorKey]: numerator, [denominatorKey]: denominator } = agentData
  return denominator ? numerator / denominator : null
}

const parseFullDate = (value) => {
  if (value === '0000-00-00 00:00:00') value = 0
  if (value) return new Date(Date.parse(value + '+0000'))
  return null
}

const parseShortDate = (value) => {
  if (!value) return null
  return parseFullDate(value + 'T00:00:00.0')
}

const statParsers = {
  ['last_submit']: parseFullDate,
  ['ratio@fields/link']: makeSafeRatioParser('mind-controller', 'connector'),
  ['ratio@mu/field']: makeSafeRatioParser('illuminator', 'mind-controller'),
  ['ratio@pioneer/explorer']: makeSafeRatioParser('pioneer', 'explorer'),
  ['ratio@ap/hack']: makeSafeRatioParser('lifetime_ap', 'hacker'),
  ['ratio@translator/hacker']: makeSafeRatioParser('translator', 'hacker'),
  ['ratio@purifier/builder']: makeSafeRatioParser('purifier', 'builder'),
  ['ratio@ap/trekker']: makeSafeRatioParser('lifetime_ap', 'trekker'),
  ['ratio@builder/purifier']: makeSafeRatioParser('builder', 'purifier'),
  ['ratio@connector/illuminator']: makeSafeRatioParser('connector', 'illuminator'),
  ['ratio@illuminator/connector']: makeSafeRatioParser('illuminator', 'connector'),
}

const statValueDiff = {
  //['ratio@purifier/builder']: (a, b) => Math.abs(1 - a) - Math.abs(1 - b),
  //['ratio@builder/purifier']: (a, b) => Math.abs(1 - a) - Math.abs(1 - b),
}

const getValueExtractor = (agentData, statName) => {
  return (agentName) => {
    const { [agentName]: agentInfo } = agentData
    const { [statName]: statValue } = agentInfo
    const statValues = [ agentName, statValue ]
    if (statName !== 'lifetime_ap') statValues.push(agentInfo[ 'lifetime_ap' ])
    return statValues
  }
}

const sortValues = (aValues, bValues) => {
  // agentName, followed by 1 or 2 values
  for (var i = 1; i < aValues.length; i++) {
    const { [ i ]: valueA } = aValues
    const { [ i ]: valueB } = bValues
    if (valueA === null) return 1
    if (valueB === null) return -1
    const valueDiff = valueB - valueA
    if (valueDiff) return valueDiff
  }
  return aValues[ 0 ].localeCompare(bValues[ 0 ])
}

const areDifferentValues = (aValues, bValues) => {
  for (var i = 1; i < aValues.length; i++) {
    const { [ i ]: valueA } = aValues
    const { [ i ]: valueB } = bValues
    if (valueA !== valueB) return i
  }
  return 0
}

const makeHandlers = (self, ...names) => {
  names.forEach((name) => {
    const { [ name ]: func } = self
    self[ name ] = (...args) => func.apply(self, args)
  })
}

const adjustLastRefresh = (text) => {
  const lastRefresh = new Date(text + 'Z')
  lastRefresh.setHours(lastRefresh.getHours() - 2)
  return lastRefresh
}

export class App {
  #configUrl
  #currentEvent
  #previousEvent
  #displayStats
  #eventData
  #enabledFactions
  #toggles
  #toggleSelectors
  #statPanes
  #data
  #info
  #statPaneTemplate
  #statListRowTemplate
  #byStat
  #factionCounts
  #allAgents
  #rawSearch
  #agentStatus

  constructor(configUrl) {
    this.#configUrl = configUrl
    this.#toggles = {}
    this.#toggleSelectors = {
      '#': '.toggles .chart-ranking',
    }
    makeHandlers(this, 'loadData', 'onSearch', 'onEventChange', 'setSearch', 'clearSearch', 'toggleHelp')
    this.debouncedPropagateSearch = debounce(this.propagateSearch, 50, this)
    this.#data = {}
    this.#info = {}
    this.#statPanes = []
    this.#eventData = []
    this.#byStat = {}
  }

  setConfig({ currentEvent, displayStats, eventData, enabledFactions = { enl: true, res: true }, agentStatus = {} }) {
    if (this.#currentEvent === undefined) this.#currentEvent = currentEvent
    this.#displayStats = displayStats
    this.#eventData = eventData.map((event, index) => {
      const { startDate, endDate, ...rest } = event
      return {
        startDate: parseShortDate(startDate),
        endDate: parseShortDate(endDate),
        ...rest,
      }
    })
    this.#agentStatus = Object.fromEntries(Object.entries(agentStatus).map(([ agentName, agentStatus ]) => {
      if (Array.isArray(agentStatus)) {
        agentStatus = { '*': agentStatus }
      } else if (typeof agentStatus === 'string') {
        agentStatus = { '*': agentStatus }
      }
      if (typeof agentStatus !== 'object') throw new Error('Invalid agentStatus from config')
      agentStatus = Object.fromEntries(Object.entries(agentStatus).map(([ statName, statStatus ]) => {
        if (typeof statStatus === 'string') statStatus = statStatus.split(',').map(value => value.trim())
        if (!Array.isArray(statStatus)) throw new Error('Invalid agentStatus from config')
        //statStatus = statStatus.reduce((result, item) => result[ item ] = (true, result), {})
        return [ statName, statStatus ]
      }))
      return [ agentName, agentStatus ]
    }))
    this.#enabledFactions = { enl: !!enabledFactions.enl, res: !!enabledFactions.res }
    this.updateDOM()
  }

  get data() {
    return this.#data
  }

  get statPaneTemplate() {
    return this.#statPaneTemplate
  }

  get statListRowTemplate() {
    return this.#statListRowTemplate
  }

  attachToDOM() {
    this.#statPaneTemplate = document.querySelector('#stat-pane')
    this.#statListRowTemplate = document.querySelector('#stat-list-row')
    document.querySelector('.reload-button').addEventListener('click', this.loadData)
    const searchInput = document.querySelector('.agent-search input')
    searchInput.addEventListener('keyup', this.onSearch)
    this.setLocation(document.location.hash)
    document.querySelector('.show-help').addEventListener('click', this.toggleHelp)
    document.querySelector('.clear-search').addEventListener('click', this.clearSearch)
    Object.entries(this.#toggleSelectors).forEach(([ toggle, selector ]) => {
      document.querySelector(selector).addEventListener('click', (e) => {
        this.toggle(toggle, e)
      })
    })

    const currentEventSelect = document.querySelector('select[name="current-event"]')
    currentEventSelect.addEventListener('change', this.onEventChange)

  }

  updateDOM() {
    if (!this.#statPaneTemplate) return

    const currentEventSelect = document.querySelector('select[name="current-event"]')
    while (currentEventSelect.lastChild) {
      currentEventSelect.removeChild(currentEventSelect.lastChild)
    }
    const eventData = this.#eventData
    const eventKeys = eventData.map((event, index) => index).sort((a, b) => {
      return eventData[ a ].startDate.getTime() - eventData[ b ].startDate.getTime()
    })
    for (const eventKey of eventKeys) {
      const { [ eventKey ]: { title, startDate } } = eventData
      const option = document.createElement('option')
      option.setAttribute('value', eventKey)
      option.textContent = title + ' | ' + dateShortFormat.format(startDate)
      if (this.#currentEvent == eventKey) option.setAttribute('selected', true)
      currentEventSelect.appendChild(option)
    }

    const statPanesByName = this.#statPanes.reduce((result, statPane) => {
      if (statPane) result[ statPane.statName ] = statPane
      return result
    }, {})
    const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
    this.#statPanes = this.#displayStats.map(([ statName, statTitle ]) => {
      const { [ statName ]: statPane } = statPanesByName
      if (statPane) {
        delete statPanesByName[ statName ]
        statPane.statTitle = statTitle
        return statPane
      }
      const newStatPane = new StatPane({ app: this, statName, statTitle })
      newStatPane.attachToDOM(appContentNode)
      return newStatPane
    })
    Object.values(statPanesByName).forEach((statPane) => statPane.detatchFromDOM())

    const { lastRefresh, startDate, endDate } = this.#info
    document.querySelector('.last-refresh').textContent = lastRefresh ? dateFullFormat.format(lastRefresh) : 'xx'
    document.querySelector('.start-date').textContent = startDate ? dateShortFormat.format(startDate) : 'xx'
    document.querySelector('.end-date').textContent = endDate ? dateShortFormat.format(endDate) : 'xx'
    const app = document.querySelector('#iwwc-app')
    app.dataset.enl = String(this.#enabledFactions.enl)
    app.dataset.res = String(this.#enabledFactions.res)
    if (this.#factionCounts) {
      app.querySelector('header .enl-stat .total').textContent = this.#factionCounts.enl
      app.querySelector('header .res-stat .total').textContent = this.#factionCounts.res
    }
    if (!this.#byStat) return
    if (!this.#factionCounts) return
  }

  detatchFromDOM() {
    this.#statPanes.forEach((statPane) => statPane.detachFromDOM())
    Object.entries(this.#toggleSelectors).forEach(([ toggle, selector ]) => {
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
    this.#statPaneTemplate = undefined
    this.#statListRowTemplate = undefined
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
    fetchJSON(this.#configUrl, (data) => this.setConfig(data)).then(() => {
      const { [ this.#currentEvent ]: { customUrl, infoUrl } } = this.#eventData
      return Promise.all([
        fetchJSON(customUrl, (data) => this.setData(data)),
        fetchJSON(infoUrl, (data) => this.setInfo(data)),
      ])
    }).finally(() => {
      buttonIcon.classList.remove('fa-spin')
    })
  }

  setInfo(data = {}) {
    const { lastRefresh, startDate, endDate, ...rest } = data
    this.#info = {
      lastRefresh: adjustLastRefresh(lastRefresh),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...rest,
    }
    this.updateDOM()
  }

  setData(data = {}) {
    this.#data = data
    const app = document.querySelector('#iwwc-app')
    app.classList.remove('loading')
    const byStat = {}

    const factionCounts = this.#factionCounts = { enl: 0, res: 0 }
    const { [ this.#currentEvent ]: { primaryStat } } = this.#eventData
    console.time('analyze')
    Object.entries(data).forEach(([ agentName, agentData ]) => {
      factionCounts[ agentData.faction ]++
      Object.entries(statParsers).forEach(([ statName, statParser ]) => {
        const { [statName]: statValue } = agentData
        agentData[ statName ] = statParser(statValue, agentData)
      })
      Object.entries(agentData).forEach(([ statName, statValue ]) => {
        if (skipStats[ statName ]) return
        byStat[ statName ] = null;
      })
    })
    const allAgents = this.#allAgents = Object.keys(data).filter((agentName) => {
      const { faction } = this.#data[ agentName ]
      return this.#enabledFactions[ faction ]
    })

    Object.keys(byStat).forEach(statName => {
      const activeAgents = { enl: 0, res: 0 }
      const sumAgents = { enl: 0, res: 0 }
      let lastValues = undefined, lastRanking = undefined, lastAgentStatus, floatingIndex = 0

      const agentsSorted = [...allAgents].map(getValueExtractor(data, statName)).sort(sortValues)
      const perStat = (this.#byStat[ statName ] ||= { rowInfos: [] })
      const rowInfosByAgentName = perStat.rowInfos.reduce((result, rowInfo) => {
        if (rowInfo) {
          const { agentName } = rowInfo
          result[ agentName ] = rowInfo
        }
        return result
      }, {})
      const rowInfos = perStat.rowInfos = agentsSorted.map((agentValues, currentIndex) => {
        const { [ 0 ]: agentName } = agentValues
        const rowInfo = rowInfosByAgentName[ agentName ] || { agentName, agentNameLower: agentName.toLowerCase() }
        if (rowInfo.currentIndex !== undefined) rowInfo.previousIndex = rowInfo.currentIndex
        rowInfo.currentIndex = currentIndex
        rowInfo.agentValues = agentValues
        return rowInfo
      }).map((rowInfo) => {
        const { agentName, agentValues, currentIndex, previousIndex } = rowInfo
        const { [ 1 ]: statValue } = agentValues
        const agentInfo = rowInfo.agentInfo = this.#data[ agentName ]
        const { faction } = agentInfo

        const agentStatus = this.getAgentStatus(agentName, statName)
        let ranking
        if (lastValues === undefined) {
          ranking = lastRanking = 1
        } else {
          const areDifferent = areDifferentValues(agentValues, lastValues)
          if (areDifferent) {
            ranking = lastAgentStatus ? lastRanking : (lastRanking = floatingIndex + 1)
          } else {
            ranking = lastRanking
          }
        }
        if (!agentStatus) floatingIndex++
        lastValues = agentValues

        rowInfo.previousRanking = rowInfo.currentRanking
        rowInfo.currentRanking = ranking
        lastAgentStatus = agentStatus
        rowInfo.agentStatus = agentStatus
        rowInfo.statValue = statValue

        if (statValue) activeAgents[ faction ]++
        sumAgents[ faction ] += statValue
        return rowInfo
      })
      byStat[ statName ] = {
        rowInfos,
        activeAgents,
        sumAgents,
      }
    })
    this.#byStat = byStat
    console.timeEnd('analyze')
    this.updateDOM()
    console.time('absorb')
    let primaryIndex
    this.#statPanes.forEach((statPane, index) => {
      const statName = statPane.statName
      const isPrimaryStat = statName === primaryStat
      const order = primaryStat ? (isPrimaryStat ? 0 : primaryIndex !== undefined ? index : index + 1) : index
      if (isPrimaryStat) primaryIndex = index
      statPane.setStatList(byStat[ statName ], order, isPrimaryStat)
    })
    this.propagateSearch()
    console.timeEnd('absorb')
  }

  onEventChange(e) {
    const { target: { value } } = e
    if (this.#currentEvent !== value) {
      this.#previousEvent = this.#currentEvent
      this.#currentEvent = value
      this.loadData()
    }
  }

  setLocation(hash = '') {
    const [ all, hashSearch = '', hashIsolateList = '', hashChartList = ''] = hash.match(/^#(.*?)(?:;(?:_=(.*?))?(#)?)?$/) || []
    if (hashChartList) this.setToggle('#', true)
    if (hashIsolateList) this.setToggle('_', hashIsolateList)
    this.setSearch(hashSearch)
  }

  onSearch(e) {
    const { target: { value } } = e
    e.preventDefault()
    e.stopPropagation()
    if (this.#rawSearch === value) return
    this.#rawSearch = value
    this.debouncedPropagateSearch()
  }

  setSearch(rawSearch) {
    if (this.#rawSearch === rawSearch) return
    this.#rawSearch = rawSearch
    document.querySelector('.agent-search input').value = rawSearch
    this.debouncedPropagateSearch()
  }

  propagateSearch() {
    const rawSearch = this.#rawSearch
    const toggles = Object.entries(this.#toggles).sort((a, b) => a[0].localeCompare(b[0])).map(([ key, value ]) => {
      return value === true ? key : `${key}=${value}`
    }).join('')
    let newHash = this.#rawSearch
    if (toggles) newHash += ';' + toggles
    history.replaceState(null, '', newHash ? '#' + newHash : '#')
    const rawSearchLower = rawSearch.toLowerCase()
    const searchTerms = rawSearchLower ? rawSearchLower.split('&') : []
    const matchedAgents = searchTerms.length && this.#allAgents ? this.#allAgents.filter((agentName) => {
      const agentNameLower = agentName.toLowerCase()
      return searchTerms.filter(searchTerm => searchTerm.length && agentNameLower.indexOf(searchTerm) !== -1).length
    }).reduce((result, matchedAgent) => (result[ matchedAgent ] = true, result), {}) : null
    this.#statPanes.forEach((statPane) => statPane.setSearch(matchedAgents))
  }

  clearSearch() {
    this.setSearch('')
  }

  toggleHelp() {
    const appNode = document.querySelector('#iwwc-app')
    appNode.classList.toggle('display-help')
    /*
    const toggleElement = document.querySelector(toggle === '_' ? '.iwwc-content' : this.#toggleSelectors[ toggle ])
    if (value) {
      toggleElement.classList.add('toggle-selected')
      this.#toggles[ toggle ] = value
    } else {
      delete this.#toggles[ toggle ]
      toggleElement.classList.remove('toggle-selected')
    }
    */

  }

  toggleWindow(statName, e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const { _: currentWindow } = this.#toggles
    if (currentWindow === statName) {
      this.setToggle('_', false)
    } else {
      this.setToggle('_', statName)
    }
    this.propagateSearch()
  }

  toggle(toggle, e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const { [ toggle ]: value = false } = this.#toggles
    this.setToggle(toggle, !value)
    this.propagateSearch()
  }

  getToggle(toggle) {
    return this.#toggles[ toggle ]
  }

  // internal
  setToggle(toggle, value) {
    const toggleElement = document.querySelector(toggle === '_' ? '.iwwc-content' : this.#toggleSelectors[ toggle ])
    if (value) {
      toggleElement.classList.add('toggle-selected')
      this.#toggles[ toggle ] = value
    } else {
      delete this.#toggles[ toggle ]
      toggleElement.classList.remove('toggle-selected')
    }
  }

  getAgentStatus(agentName, statName) {
    const { [ agentName ]: agentStatus = {} } = this.#agentStatus
    const { [ statName ]: statStatus = agentStatus[ '*' ] } = agentStatus
    return statStatus
  }
}

class StatPane {
  #app
  #statName
  #statTitle
  #pages
  #currentPage
  #pageSize
  #statPaneNode
  #statList
  #firstRow
  #lastRow
  #matchedAgents

  constructor({ app, statName, statTitle }) {
    this.#app = app
    this.#statName = statName
    this.#statTitle = statTitle
    makeHandlers(this, 'onScroll', 'onKeyDown')
    this.#pages = {
      full: { start: 0, rowInfos: [], scrollTop: 0, exactMatchedAgents: {} },
      search: { start: 0, rowInfos: undefined, scrollTop: 0, exactMatchedAgents: {} },
    }
    this.#currentPage = undefined
    this.#pageSize = 50
  }

  get statName() {
    return this.#statName
  }

  set statTitle(statTitle) {
    this.#statTitle = statTitle
  }

  attachToDOM(appContentNode) {
    if (this.#statPaneNode) return
    const statPaneFragment = this.#app.statPaneTemplate.content.cloneNode(true)
    const statPaneNode = this.#statPaneNode = statPaneFragment.querySelector('.stat-pane')

    const headerNode = statPaneFragment.querySelector('.stat-header')
    const contentNode = statPaneNode.querySelector('.stat-content')
    contentNode.tabIndex = 0

    statPaneNode.dataset.medal = this.#statName
    headerNode.querySelector('.title').textContent = this.#statTitle
    appContentNode.appendChild(statPaneFragment)

    if (this.#statName === 'SEPARATOR') {
      statPaneNode.classList.remove('stat-loading')
    }

    contentNode.addEventListener('scroll', this.onScroll)
    contentNode.addEventListener('keydown', this.onKeyDown)
    headerNode.querySelectorAll('.window-toggle').forEach((element) => element.addEventListener('click', (e) => this.#app.toggleWindow(this.#statName)))
    headerNode.querySelector('.jump-up').addEventListener('click', (e) => this.jumpUp(e))
    headerNode.querySelector('.jump-down').addEventListener('click', (e) => this.jumpDown(e))

    this.checkRender()
  }

  detachFromDOM() {
    if (!this.#statPaneNode) return
    const statPaneNode = this.#statPaneNode
    const contentNode = statPaneNode.querySelector('.stat-content')
    contentNode.removeEventListener('scroll', this.onScroll)
    contentNode.removeEventListener('keydown', this.onKeyDown)
    const headerNode = statPaneNode.querySelector('.stat-header')
    headerNode.querySelectorAll('.window-toggle').forEach((element) => element.removeEventListener('click'))
    headerNode.querySelector('.jump-up').removeEventListener('click')
    headerNode.querySelector('.jump-down').removeEventListener('click')
    statPaneNode.parentNode.removeChild(statPaneNode)
    this.#statPaneNode = undefined
    delete this.#pages.current
    delete this.#pages.full.rowInfos
    delete this.#pages.search.rowInfos
  }

  setStatList({ rowInfos = [], activeAgents = {}, sumAgents = {} } = {}, order, isPrimaryStat) {
    const statPaneNode = this.#statPaneNode
    statPaneNode.style.setProperty('order', order)
    if (isPrimaryStat) {
      statPaneNode.classList.add('primary-stat')
    } else {
      statPaneNode.classList.remove('primary-stat')
    }

    const statName = this.#statName
    const data = this.#app.data
    const statListRowTemplate = this.#app.statListRowTemplate

    const rolloverBuilder = rollovers[ statName ]
    let needsAnimation = 0
    this.#pages.full.rowInfos = rowInfos.map((rowInfo) => {
      if (!rowInfo.rowNode) {
        const rowNode = rowInfo.rowNode = statListRowTemplate.content.cloneNode(true).querySelector('.stat-row')
        const agentNode = rowNode.querySelector('.agent')
        agentNode.addEventListener('click', e => {
          this.#app.setSearch(agentName)
        })
      }

      const { rowNode, agentName, agentValues, agentInfo, agentStatus, statValue, currentRanking, currentIndex, previousIndex } = rowInfo
      const faction = agentInfo.faction
      const { [ statName ]: statValueDisplay = (agentName, agentInfo, value) => numberFormat.format(value) } = statValueDisplays
      const valueNode = rowNode.querySelector('.stat-value')
      const rankingNode = rowNode.querySelector('.stat-ranking')
      const agentNode = rowNode.querySelector('.agent')
      const rolloverNode = rowNode.querySelector('.rollover')

      const rolloverValue = rolloverBuilder ? rolloverBuilder(agentInfo) : null
      rowNode.dataset.value = statValue
      if (agentValues.length === 3) rowNode.dataset.tieValue = agentValues[ 2 ]
      rowNode.dataset.agent = agentName
      rowNode.dataset.faction = faction
      rowNode.dataset.currentIndex = currentIndex
      if (previousIndex !== undefined) {
        if (currentIndex !== previousIndex) needsAnimation++
        rowNode.dataset.previousIndex = previousIndex
        rowNode.style.setProperty('--index-delta', currentIndex - previousIndex)
      } else {
        rowNode.style.setProperty('--index-delta', currentIndex - (this.#pageSize ? this.#pageSize : rowInfos.length))
        delete rowNode.dataset.previousIndex
      }
      if (agentStatus) {
        rowNode.dataset.status = ""
        agentStatus.forEach((statusItem) => {
          rowNode.dataset[ `status_${statusItem}` ] = ""
        })
      } else {
        delete rowNode.dataset.status
      }
      rankingNode.textContent = currentRanking
      rowNode.classList.remove('onyx', 'platinum', 'gold', 'silver', 'none')
      if (currentRanking === 1) {
        rowNode.classList.add('onyx')
      } else if (currentRanking === 2) {
        rowNode.classList.add('platinum')
      } else if (currentRanking === 3) {
        rowNode.classList.add('gold')
      } else if (currentRanking < 21) {
        rowNode.classList.add('silver')
      } else {
        rowNode.classList.add('none')
      }
      valueNode.textContent = statValueDisplay(agentName, agentInfo, statValue)
      agentNode.className += ' faction-' + agentInfo.faction
      agentNode.textContent = agentName
      rolloverNode.textContent = rolloverValue ? rolloverValue : ''
      return rowInfo
    })
    const footerNode = statPaneNode.querySelector('.stat-footer')
    footerNode.querySelector('.enl-stat .sum').textContent = numberFormat.format(sumAgents.enl)
    footerNode.querySelector('.enl-stat .agent').textContent = activeAgents.enl
    footerNode.querySelector('.res-stat .sum').textContent = numberFormat.format(sumAgents.res)
    footerNode.querySelector('.res-stat .agent').textContent = activeAgents.res
    if (rowInfos.length) {
      this.#firstRow = rowInfos[ 0 ].rowNode.cloneNode(true)
      this.#lastRow = rowInfos[ rowInfos.length - 1 ].rowNode.cloneNode(true)
    } else {
      this.#firstRow = this.#lastRow = undefined
    }

    this.checkRender()
    if (needsAnimation) {
      if (true) {
        this.#statPaneNode.classList.add('data-updated')
        requestAnimationFrame(() => {
          this.#statPaneNode.classList.remove('data-updated')
        })
      } else {
        this.#statPaneNode.classList.add('data-updated')
        setTimeout(() => {
          this.#statPaneNode.classList.remove('data-updated')
        }, 0.5)
      }
    }
  }

  setSearch(matchedAgents) {
    //if (this.#matchedAgents === matchedAgents) return
    this.#matchedAgents = matchedAgents
    if (this.#app.getToggle('_') === this.#statName) {
      this.#pageSize = null
    } else {
      this.#pageSize = 50
    }
    this.checkRender()
  }

  renderPage() {
    const contentNode = this.#statPaneNode.querySelector('.stat-content')
    const listNode = this.#statPaneNode.querySelector('.stat-list')
    const { start, rowInfos, scrollTop } = this.#currentPage
    const pageSize = this.#pageSize || rowInfos.length

    while (listNode.lastChild) {
      listNode.removeChild(listNode.lastChild)
    }

    const currentWindow = this.#app.getToggle('_')
    if (currentWindow) {
      if (currentWindow !== this.#statName) {
        this.#statPaneNode.classList.add('minimize-window')
        this.#statPaneNode.classList.remove('maximize-window')
        return
      } else {
        this.#statPaneNode.classList.remove('minimize-window')
        this.#statPaneNode.classList.add('maximize-window')
      }
    } else {
      this.#statPaneNode.classList.remove('minimize-window')
      this.#statPaneNode.classList.remove('maximize-window')
    }
    if (this.#matchedAgents) {
      listNode.classList.add('searching')
    } else {
      listNode.classList.remove('searching')
    }
    if (!this.#firstRow) return
    const firstRow = this.#firstRow
    firstRow.classList.add('for-sizing')
    listNode.appendChild(firstRow)
    const lastRow = this.#lastRow
    lastRow.classList.add('for-sizing')
    listNode.appendChild(lastRow)
    for (let i = start, j = pageSize; j && i < rowInfos.length; i++, j--) {
      const { [ i ]: rowInfo } = rowInfos[ i ]
      const { agentName, rowNode } = rowInfos[ i ]
      if (this.#matchedAgents?.[ agentName ]) {
        rowNode.classList.add('matched')
      } else {
        rowNode.classList.remove('matched')
      }
      listNode.appendChild(rowNode)
    }
    contentNode.scrollTop = scrollTop
  }

  checkRender() {
    if (!this.#statPaneNode) return
    if (!this.#pages.full.rowInfos) return
    this.applySearch()
    this.renderPage()
  }

  applySearch() {
    if (!this.#pages.full.rowInfos) return
    const matchedAgents = this.#matchedAgents
    if (matchedAgents) {
      const searchPage = this.#pages.search
      searchPage.start = 0
      const allRows = this.#pages.full.rowInfos
      const chartRankingToggle = this.#app.getToggle('#')
      const matchedRows = []
      searchPage.exactMatchedAgents = {}
      let minMatchIndex
      const matchedIndexes = allRows.reduce((result, rowInfo) => {
        const { currentIndex } = rowInfo
        if (matchedAgents[ rowInfo.agentName ]) {
          result[ currentIndex ] = true
          if (chartRankingToggle) {
            if (currentIndex > 19 && minMatchIndex === undefined) minMatchIndex = currentIndex
            if (currentIndex > 0) result[ currentIndex - 1 ] = true
            if (currentIndex + 1 !== allRows.length) result[ currentIndex + 1 ] = true
          }
        }
        return result
      }, [])
      if (minMatchIndex !== undefined) {
        matchedIndexes[ 18 ] = true
        matchedIndexes[ 19 ] = true
      }
      searchPage.rowInfos = allRows.filter((rowInfo, index) => matchedIndexes[ index ])
      this.#currentPage = searchPage
    } else {
      this.#currentPage = this.#pages.full
    }
    const pageSize = this.#pageSize || this.#currentPage.rowInfos.length
    if (this.#currentPage.start + pageSize > this.#currentPage.rowInfos.length) {
      this.#currentPage.start = this.#currentPage.rowInfos.length - pageSize
      if (this.#currentPage.start < 0) this.#currentPage.start = 0
    }
  }

  onScroll(e) {
    let { target, target: { offsetTop, scrollTop, scrollHeight } } = e
    const current = this.#currentPage
    const pageSize = this.#pageSize || current.rowInfos.length
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
    if (!this.#pages.full.rowInfos) return
    const current = this.#currentPage
    current.scrollTop = 0
    current.start = 0
    this.renderPage()
    e.stopPropagation()
    e.preventDefault()
    return false
  }

  jumpDown(e) {
    if (!this.#pages.full.rowInfos) return
    const current = this.#currentPage
    const pageSize = this.#pageSize || currentPage.rowInfos.length
    const end = Math.min(current.start + pageSize, current.rowInfos.length)
    current.start = current.rowInfos.length - pageSize
    this.renderPage()
    const listNode = this.#statPaneNode.querySelector('.stat-list')
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

const apRollover = (agentInfo) => {
  const { [ 'lifetime_ap' ]: lifetimeAp } = agentInfo
  return numberFormat.format(lifetimeAp) + ' AP'
}

const statRollover = (statName) => (agentInfo) => {
  const { [ statName ]: statValue } = agentInfo
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
  const json = await fetch(url, {_mode: 'no-cors'}).then(response => response.json()).catch(e => {
    console.error(e)
    return undefined
  })
  return handler(json)
}

function debounce(func, timeout = 300, self = this){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(self, args) }, timeout)
  }
}
