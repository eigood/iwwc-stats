var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom-2024.json';
var iwwcInfoURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-info-2024.json';
const skipStats = {
  'ap': true,
  'level': true,
  'faction': true,
  'last_submit': true,
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
  loadData();
  document.querySelector('.reload-button').addEventListener('click', loadData)
  const searchInput = document.querySelector('.agent-search input')
  searchInput.addEventListener('keyup', handleAgentSearch)
  const location = document.location
  console.log('location', location)
  const hash = location.hash
  if (hash) {
    setSearch(hash.substring(1))
  }
  document.querySelector('.clear-search').addEventListener('click', handleClearSearch)
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
  console.log('search', e)
  filterDisplay(e.target.value)
}

function handleClearSearch(e) {
  console.log('handleClearSearch', e)
  setSearch('')
}

function setSearch(value) {
  document.querySelector('.agent-search input').value = value
  filterDisplay(value)
}

let lastMatchRows = []

const filterDisplay = debounce(search => {
  const newHash = search ? '#' + search : '#'
  console.log('searching', { search, newHash })
  history.replaceState(null, '', newHash)
  const agentSearch = search.toUpperCase()
  document.querySelector('#iwwc-app').classList.remove('searching')
  removeClassFromList(lastMatchRows, 'matched')
  lastMatchRows = []
  if (agentSearch) {
    document.querySelector('#iwwc-app').classList.add('searching')
    const foundAgents = Object.keys(byAgent).filter(agentName => agentName.toUpperCase().indexOf(agentSearch) !== -1)
    console.log('foundAgents', foundAgents)
    for (const agentName of foundAgents) {
      const agentRows = byAgent[ agentName ].rows
      lastMatchRows.splice(lastMatchRows.length, 0, ...agentRows)
      addClassToList(agentRows, 'matched')
    }
  }
})

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
  app.className = ''

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
  const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
  while (appContentNode.firstChild) {
    appContentNode.removeChild(appContentNode.lastChild)
  }
   //<span class="enl-sum"></span>[<span class="enl-agent"></span>/<span class="enl-total">]</span>
   //<span class="res-sum"></span>[<span class="res-agent"></span>/<span class="res-total">]</span>
  setTimeout(function() {
    displayStats.forEach(([ statName, statTitle ]) => {
      const statList = byStat[ statName ]
      const newStatPaneFragment = statPaneTemplate.content.cloneNode(true)
      const newStatPaneNode = newStatPaneFragment.querySelector('.stat-pane')
      newStatPaneNode.dataset.medal = statName
      newStatPaneFragment.querySelector('.stat-header .title').textContent = statTitle
      const newStatListNode = newStatPaneFragment.querySelector('.stat-list')
      const activeAgents = { enl: 0, res: 0 }
      const sumAgents = { enl: 0, res: 0 }
      let lastValue = undefined, lastPosition = undefined
      statList.forEach((agentName, index) => {
        const forAgent = byAgent[ agentName ]
        const agentInfo = iwwcCustom[ agentName ]
        const faction = agentInfo.faction
        const statValue = agentInfo[ statName ]
        const newStatRowFragment = statListRowTemplate.content.cloneNode(true)
        const statRowNode = newStatRowFragment.querySelector('.stat-row')
        if (statValue) activeAgents[ faction ]++
        sumAgents[ faction ] += statValue
        statRowNode.dataset.value = statValue
        statRowNode.dataset.agent = agentName
        forAgent.rows.push(statRowNode)
        if (lastValue === undefined) {
          lastValue = statValue
          lastPosition = index + 1
        } else if (statValue !== lastValue) {
          lastValue = statValue
          lastPosition = index + 1
        }
        newStatRowFragment.querySelector('.stat-position').textContent = lastPosition
        if (lastPosition === 1) {
          statRowNode.className += ' onyx'
        } else if (lastPosition === 2) {
          statRowNode.className += ' platinum'
        } else if (lastPosition === 3) {
          statRowNode.className += ' gold'
        } else if (lastPosition < 21) {
          statRowNode.className += ' silver'
        } else {
          statRowNode.className += ' none'
        }
        newStatRowFragment.querySelector('.stat-value').textContent = statValue.toLocaleString({ useGrouping:true })
        const agentNode = newStatRowFragment.querySelector('.agent')
        agentNode.className += ' faction-' + agentInfo.faction
        agentNode.textContent = agentName
        agentNode.addEventListener('click', e => {
          console.log('click agent', {agentName})
          setSearch(agentName)
        })
        newStatListNode.appendChild(newStatRowFragment)
      })
      newStatPaneFragment.querySelector('.stat-footer .enl-stat .sum').textContent = sumAgents.enl.toLocaleString({ useGrouping:true })
      newStatPaneFragment.querySelector('.stat-footer .enl-stat .total').textContent = factionCounts.enl
      newStatPaneFragment.querySelector('.stat-footer .enl-stat .agent').textContent = activeAgents.enl
      newStatPaneFragment.querySelector('.stat-footer .res-stat .sum').textContent = sumAgents.res.toLocaleString({ useGrouping:true })
      newStatPaneFragment.querySelector('.stat-footer .res-stat .total').textContent = factionCounts.res
      newStatPaneFragment.querySelector('.stat-footer .res-stat .agent').textContent = activeAgents.res
      appContentNode.appendChild(newStatPaneFragment)
    })
    filterDisplay(document.querySelector('.agent-search input').value)
  }, 0)
}
window.addEventListener('load', handleLoad);
