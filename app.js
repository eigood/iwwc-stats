var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2024.json';
var iwwcInfoURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2024.json';
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
  ['ratio@mu/field', 'MindUnits / Field'],
  ['ratio@fields/link', 'Fields / Link'],
  ['ratio@pioneer/explorer', 'Pioneeer / Explorer'],
  ['ratio@ap/hack', 'AP / Hack'],
  ['ratio@translator/hacker', 'Translator / Hacker'],
  ['ratio@purifier/builder', 'Purifier / Builder'],
  ['ratio@ap/trekker', 'AP / km'],
  ['last_submit', 'Last Submit'],
]

const numberFormat = Intl.NumberFormat(navigator.language, { useGrouping:true })
const dateFullFormat = Intl.DateTimeFormat(navigator.language, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" })
const dateShortFormat = Intl.DateTimeFormat(navigator.language, { weekday:"short", year:"numeric", month:"short", day:"numeric" })
const lastSubmitFormat = Intl.DateTimeFormat(navigator.language, { timeZone: 'UTC', year: 'numeric', month: '2-digit', day:"2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: 'h23' })

const apRollover = (agentName) => {
  const { [ agentName ]: { [ 'lifetime_ap' ]: lifetimeAp } } = iwwcCustom
  return numberFormat.format(lifetimeAp) + ' AP'
}

const statRollover = (statName) => (agentName) => {
  const { [ agentName ]: { [ statName ]: statValue } } = iwwcCustom
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

function handleLoad() {
  //fetchText(ghPagesBase + '/app.html', setHtml);
  document.querySelector('.reload-button').addEventListener('click', loadData)
  const searchInput = document.querySelector('.agent-search input')
  searchInput.addEventListener('keyup', handleAgentSearch)
  const location = document.location
  const hash = location.hash
  if (hash) {
    setSearch(hash.substring(1))
  }
  document.querySelector('.clear-search').addEventListener('click', handleClearSearch)
  loadData();
}

function loadData(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  fetchJSON(iwwcCustomURL, handleCustom)
  fetchJSON(iwwcInfoURL, handleInfo)
}

let byAgent = {}, byStat = {}, iwwcCustom = {}, iwwcInfo = {}

function removeClassFromList(nodeList, className) {
  for (const node of nodeList) {
    node.classList.remove(className)
  }
}

function addClassToList(nodeList, className) {
  for (const node of nodeList) {
    node.classList.add(className)
  }
}

function getInnerHeight(element){
  const { paddingTop, paddingBottom } = getComputedStyle(element)
  const padding = parseInt(paddingTop) + parseInt(paddingBottom)
  return element.clientHeight - padding
}

const handleAgentSearch = (e) => {
  e.preventDefault()
  e.stopPropagation()
  debouncedFilterDisplay(e.target.value)
}

function handleClearSearch(e) {
  console.log('handleClearSearch', e)
  setSearch('')
}

function setSearch(value) {
  document.querySelector('.agent-search input').value = value
  filterDisplay(value)
}

let lastSearch = null
let lastSearchStyleElement = null
const pageSize = 50

function filterDisplay(search) {
  const newHash = search ? '#' + search : '#'
  console.log('searching', { search, newHash, skip: lastSearch === search })
  if (lastSearch === search) return
  lastSearch = search
  console.time('filterDisplay')
  history.replaceState(null, '', newHash)
  const agentSearch = search.toUpperCase()
  //const foundAgents = agentSearch ? Object.keys(byAgent).filter(agentName => agentName.toUpperCase().indexOf(agentSearch) !== -1) : []
  //console.timeLog('filterDisplay', { foundAgents })

  setTimeout(() => {
    const iwwcAppNode = document.querySelector('#iwwc-app')
    if (agentSearch) {
      if (!iwwcAppNode.classList.contains('searching')) iwwcAppNode.classList.add('searching')
      const searchStyleNode = document.querySelector('#search-style')
      searchStyleNode.textContent = `
#iwwc-app.searching .stat-row:not([data-agent*='${agentSearch}' i]) {
        height:0;
        visibility:collapse;
}
      `
    } else {
      iwwcAppNode.classList.remove('searching')
    }
    const statPanes = document.querySelectorAll('.stat-pane')
    const searchEvent = new Event('search')
    for (const statPane of statPanes) {
      statPane.dispatchEvent(searchEvent)
    }
    /*
    if (lastSearchStyleElement) {
      lastSearchStyleElement.parentNode.removeChild(lastSearchStyleElement)
    }
    lastSearchStyleElement = null
    if (agentSearch) {
      iwwcAppNode.classList.add('searching')
      lastSearchStyleElement = document.createElement('style')
      document.querySelector('head').appendChild(lastSearchStyleElement)
      if (false) {
      for (const agentName of foundAgents) {
        const agentRows = byAgent[ agentName ].rows
        lastMatchRows.splice(lastMatchRows.length, 0, ...agentRows)
        addClassToList(agentRows, 'matched')
      }
      }
    }
    */
    console.timeEnd('filterDisplay')
  }, 0)
}
const debouncedFilterDisplay = debounce(filterDisplay)

function handleInfo(result) {
  if (!result) return;
  iwwcInfo = result
  const fullFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" }
  const shortFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric" }
  document.querySelector('.last-refresh').textContent = dateFullFormat.format(new Date(iwwcInfo.lastRefresh + 'Z'))
  document.querySelector('.start-date').textContent = dateShortFormat.format(new Date(iwwcInfo.startDate))
  document.querySelector('.end-date').textContent = dateShortFormat.format(new Date(iwwcInfo.endDate))
}

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

function handleCustom(result) {
  if (!result) return;
  iwwcCustom = result
  const app = document.querySelector('#iwwc-app')
  app.classList.remove('loading')

  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  byAgent = {}
  byStat = {};

  const factionCounts = { enl: 0, res: 0 }
  console.time('analyze')
  Object.entries(iwwcCustom).forEach(([ agentName, agentData ]) => {
    factionCounts[ agentData.faction ]++
    calculateInferredStats(agentData)
    const forAgent = byAgent[ agentName ] = { index: undefined, rows: [] }
    Object.entries(agentData).forEach(([ statName, statValue ]) => {
      const { [ statName ]: statParser } = statParsers
      if (statParser) {
        agentData[ statName ] = statParser(statValue)
      }
      if (skipStats[ statName ]) return
      byStat[ statName ] = null;
    })
  })
  const allAgents = Object.keys(iwwcCustom)
  const statSorter = statName => (a, b) => {
    const { [ a ]: agentA, [ b ]: agentB } = iwwcCustom
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
    const statSorted = byStat[ statName ] = [...allAgents].sort(statSorter(statName))
    statSorted.forEach((agentName, index) => {
      byAgent[ agentName ][ statName ] = index
    })
  })
  console.timeEnd('analyze')
  //console.log('by', {byAgent, byStat})
   //<span class="enl-sum"></span>[<span class="enl-agent"></span>/<span class="enl-total">]</span>
   //<span class="res-sum"></span>[<span class="res-agent"></span>/<span class="res-total">]</span>

    console.time('getNewNodes')
    const statInfos = displayStats.map(([ statName, statTitle ]) => {
      console.time(`statList:${statName}`)
      const statList = byStat[ statName ]
      const rolloverBuilder = rollovers[ statName ]
      const paneFragment = statPaneTemplate.content.cloneNode(true)
      const paneNode = paneFragment.querySelector('.stat-pane')
      const contentNode = paneFragment.querySelector('.stat-content')
      const headerNode = paneFragment.querySelector('.stat-header')
      const footerNode = paneFragment.querySelector('.stat-footer')
      const listNode = paneFragment.querySelector('.stat-list')
      const activeAgents = { enl: 0, res: 0 }
      const sumAgents = { enl: 0, res: 0 }
      let lastValue = undefined, lastPosition = undefined
      const rowInfos = statList.map((agentName, index) => {
        const forAgent = byAgent[ agentName ]
        const agentInfo = iwwcCustom[ agentName ]
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

        forAgent.rows.push(rowNode)
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
        const rolloverValue = rolloverBuilder ? rolloverBuilder(agentName) : null
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
            console.log('click agent', {agentName})
            setSearch(agentName)
          })
        }
        return { rowFragment, attachListeners, agentName }
      })
      const updateDOM = () => new Promise(async (resolve, reject) => {
        console.time(`statNode:${statName}`)
        try {
          paneNode.dataset.medal = statName
          headerNode.querySelector('.title').textContent = statTitle
          footerNode.querySelector('.enl-stat .sum').textContent = numberFormat.format(sumAgents.enl)
          footerNode.querySelector('.enl-stat .total').textContent = factionCounts.enl
          footerNode.querySelector('.enl-stat .agent').textContent = activeAgents.enl
          footerNode.querySelector('.res-stat .sum').textContent = numberFormat.format(sumAgents.res)
          footerNode.querySelector('.res-stat .total').textContent = factionCounts.res
          footerNode.querySelector('.res-stat .agent').textContent = activeAgents.res
          const page = { full: { start: 0, rowInfos, scrollTop: 0 }, search: { start: 0, scrollTop: 0 } }
          const updatePage = () => {
            const { current: { start, rowInfos, scrollTop } } = page
            while (listNode.lastChild) {
              listNode.removeChild(listNode.lastChild)
            }
            for (let i = start, j = pageSize; j && i < rowInfos.length; i++, j--) {
              const { rowFragment, attachListeners } = rowInfos[ i ]
              const rowFragmentCloned = rowFragment.cloneNode(true)
              attachListeners(rowFragmentCloned)
              listNode.appendChild(rowFragmentCloned)
            }
            contentNode.scrollTop = scrollTop
          }
          const paneOnChange = () => {
            const searchTerm = document.querySelector('.agent-search input').value
            if (searchTerm) {
              if (page.search.term === searchTerm) return
              page.search.start = 0
              page.search.rowInfos = rowInfos.filter(({ agentName }) => agentName.indexOf(searchTerm) !== -1)
              page.current = page.search
              updatePage()
            } else {
              page.current = page.full
              updatePage()
            }
          }
          paneNode.addEventListener('search', (e) => {
            paneOnChange()
          })
          contentNode.addEventListener('scroll', (e) => {
            let { target, target: { offsetTop, scrollTop, scrollHeight } } = e
            const { current } = page
            current.scrollTop = scrollTop
            const end = Math.min(current.start + pageSize, current.rowInfos.length)
            const rowHeight = scrollHeight / (end - current.start)
            if (scrollTop > rowHeight * 8) {
              if (end !== current.rowInfos.length) {
                current.start++
                current.scrollTop = scrollTop - rowHeight
                paneOnChange()
              }
            } else if (scrollTop < rowHeight * 4) {
              const newStart = Math.max(current.start - 4, 0)
              if (newStart !== current.start) {
                const diff = current.start - newStart
                current.start = newStart
                current.scrollTop = scrollTop + diff * rowHeight
                paneOnChange()
              }
            }
          })
          paneOnChange()
          resolve()
        } catch (e) {
          reject(e)
        } finally {
          setTimeout(() => paneNode.classList.remove('stat-loading'), 0)
          console.timeEnd(`statNode:${statName}`)
        }
      })
      console.timeEnd(`statList:${statName}`)
      return { paneFragment, updateDOM }
    })
  console.timeEnd('getNewNodes')

  setTimeout(function() {
    console.time('replaceNodes')
    const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
    while (appContentNode.firstChild) {
      appContentNode.removeChild(appContentNode.lastChild)
    }
    const statUpdaters = statInfos.map(({ paneFragment, updateDOM }) => new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          appContentNode.appendChild(paneFragment)
          await updateDOM()
          resolve()
        } catch (e) {
          reject(e)
        }
      }, 0)
    }))
    Promise.all(statUpdaters).then(() => {
      console.timeEnd('replaceNodes')
    })
  }, 0)
}
window.addEventListener('load', handleLoad);
