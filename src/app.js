var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom.json';
var iwwcInfoURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-info.json';
const skipStats = {
  'ap': true,
  'level': true,
  'faction': true,
  'last_submit': true,
}

const displayStats = [
  ['lifetime_ap', 'AP'],
  ['explorer', 'Explorer'],
  ['recon', 'Recon'],
  ['scout', 'Scout'],
  ['scout_controller', 'Scout Controller'],
  ['builder', 'Builder'],
  ['connector', 'Connector'],
  ['mind-controller', 'Mind Controller'],
  ['illuminator', 'Illuminator'],
  ['recharger', 'Recharger'],
  ['liberator', 'Liberator'],
  ['pioneer', 'Pioneer'],
  ['engineer', 'Engineer'],
  ['hacker', 'Hacker'],
  ['maverick', 'Maverick'],
  ['translator', 'Translator'],
  ['purifier', 'Purifier'],
  ['trekker', 'Trekker'],
  ['specops', 'Specops'],
  ['recursions', 'Recursions'],
  ['crafter', 'Kinetic Capsules Completed'],
]

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
  document.querySelector('.last-refresh').textContent = new Date(iwwcInfo.lastRefresh + 'Z').toLocaleString(navigator.language, fullFormatOptions)
  document.querySelector('.start-date').textContent = new Date(iwwcInfo.startDate).toLocaleString(navigator.language, shortFormatOptions)
  document.querySelector('.end-date').textContent = new Date(iwwcInfo.endDate).toLocaleString(navigator.language, shortFormatOptions)
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
  Object.entries(iwwcCustom).forEach(([ agentName, agentData ]) => {
    factionCounts[ agentData.faction ]++
    const forAgent = byAgent[ agentName ] = { index: undefined, rows: [] }
    Object.entries(agentData).forEach(([ statName, statValue ]) => {
      if (skipStats[ statName ]) return
      byStat[ statName ] = null;
    })
  })
  const allAgents = Object.keys(iwwcCustom)
  const statSorter = statName => (a, b) => {
    const valueDiff = iwwcCustom[ b ][ statName ] - iwwcCustom[ a ][ statName ]
    if (valueDiff) return valueDiff
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
  //console.log('by', {byAgent, byStat})
   //<span class="enl-sum"></span>[<span class="enl-agent"></span>/<span class="enl-total">]</span>
   //<span class="res-sum"></span>[<span class="res-agent"></span>/<span class="res-total">]</span>

    console.time('getNewNodes')
    const statInfos = displayStats.map(([ statName, statTitle ]) => {
      const statList = byStat[ statName ]
      const paneFragment = statPaneTemplate.content.cloneNode(true)
      const paneNode = paneFragment.querySelector('.stat-pane')
      const headerNode = paneFragment.querySelector('.stat-header')
      const footerNode = paneFragment.querySelector('.stat-footer')
      const listNode = paneFragment.querySelector('.stat-list')
      const activeAgents = { enl: 0, res: 0 }
      const sumAgents = { enl: 0, res: 0 }
      let lastValue = undefined, lastPosition = undefined
      console.time(`statList:${statName}`)
      const rowInfos = statList.map((agentName, index) => {
        const forAgent = byAgent[ agentName ]
        const agentInfo = iwwcCustom[ agentName ]
        const faction = agentInfo.faction
        const statValue = agentInfo[ statName ]
        const rowFragment = statListRowTemplate.content.cloneNode(true)
        const rowNode = rowFragment.querySelector('.stat-row')
        const valueNode = rowFragment.querySelector('.stat-value')
        const positionNode = rowFragment.querySelector('.stat-position')
        const agentNode = rowFragment.querySelector('.agent')

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
        const updateDOM = () => {
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
          valueNode.textContent = statValue.toLocaleString({ useGrouping:true })
          agentNode.className += ' faction-' + agentInfo.faction
          agentNode.textContent = agentName
          agentNode.addEventListener('click', e => {
            console.log('click agent', {agentName})
            setSearch(agentName)
          })
        }
        return { rowFragment, updateDOM }
      })
      console.timeEnd(`statList:${statName}`)
      const updateDOM = () => {
        paneNode.dataset.medal = statName
        headerNode.querySelector('.title').textContent = statTitle
        footerNode.querySelector('.enl-stat .sum').textContent = sumAgents.enl.toLocaleString({ useGrouping:true })
        footerNode.querySelector('.enl-stat .total').textContent = factionCounts.enl
        footerNode.querySelector('.enl-stat .agent').textContent = activeAgents.enl
        footerNode.querySelector('.res-stat .sum').textContent = sumAgents.res.toLocaleString({ useGrouping:true })
        footerNode.querySelector('.res-stat .total').textContent = factionCounts.res
        footerNode.querySelector('.res-stat .agent').textContent = activeAgents.res
        setTimeout(async () => {
          console.time(`statNode:${statName}`)
          try {
            const rowUpdaters = rowInfos.map(({ rowFragment, updateDOM }) => {
              listNode.appendChild(rowFragment)
              return updateDOM()
            })
            await Promise.all(rowUpdaters)
            setTimeout(() => paneNode.classList.remove('stat-loading'), 0)
          } finally {
            console.timeEnd(`statNode:${statName}`)
          }
        }, 0)
      }
      return { paneFragment, updateDOM }
    })
  console.timeEnd('getNewNodes')

  setTimeout(function() {
    console.time('replaceNodes')
    const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
    while (appContentNode.firstChild) {
      appContentNode.removeChild(appContentNode.lastChild)
    }
    const statUpdaters = statInfos.map(({ paneFragment, updateDOM }) => {
      appContentNode.appendChild(paneFragment)
      return updateDOM()
    })
    Promise.all(statUpdaters).then(() => {
      console.timeEnd('replaceNodes')
    })
  }, 0)
}
window.addEventListener('load', handleLoad);