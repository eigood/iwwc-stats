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
  loadData();
  document.querySelector('.reload-button').addEventListener('click', loadData)
  document.querySelector('.agent-search input').addEventListener('keyup', handleAgentSearch)
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

const handleAgentSearch = debounce((e) => {
  e.preventDefault()
  e.stopPropagation()
  console.log('search', e)
  filterDisplay(e.target.value)
})

function handleClearSearch(e) {
  console.log('handleClearSearch', e)
  setSearch('')
}

function setSearch(value) {
  document.querySelector('.agent-search input').value = value
  filterDisplay(value)
}

function filterDisplay(search) {
  console.log('searching', { search })
  const agentSearch = search.toUpperCase()
  document.querySelector('#iwwc-app').classList.remove('searching')
  if (agentSearch) {
    document.querySelector('#iwwc-app').classList.add('searching')
    const foundAgents = Object.keys(byAgent).filter(agentName => agentName.toUpperCase().indexOf(agentSearch) !== -1)
    console.log('foundAgents', foundAgents)
    removeClassFromList(document.querySelectorAll('.stat-row.matched'), 'matched')
    for (const agentName of foundAgents) {
      addClassToList(document.querySelectorAll('.stat-row[data-agent="' + agentName + '"]'), 'matched')
    }
  }
}

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

  Object.entries(iwwcCustom).forEach(([ agentName, agentData ]) => {
    const forAgent = byAgent[ agentName ] = {}
    Object.entries(agentData).forEach(([ statName, statValue ]) => {
      if (skipStats[ statName ]) return
      byStat[ statName ] = null;
    })
  })
  const allAgents = Object.keys(iwwcCustom)
  const statSorter = statName => (a, b) => iwwcCustom[ b ][ statName ] - iwwcCustom[ a ][ statName ]

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
  setTimeout(function() {
    displayStats.forEach(([ statName, statTitle ]) => {
      const statList = byStat[ statName ]
      const newStatPaneFragment = statPaneTemplate.content.cloneNode(true)
      const newStatPaneNode = newStatPaneFragment.querySelector('.stat-pane')
      newStatPaneNode.dataset.medal = statName
      newStatPaneFragment.querySelector('.stat-header .title').textContent = statTitle
      const newStatListNode = newStatPaneFragment.querySelector('.stat-list')
      statList.forEach((agentName, index) => {
        const statValue = iwwcCustom[ agentName ][ statName ]
        const newStatRowFragment = statListRowTemplate.content.cloneNode(true)
        const statRowNode = newStatRowFragment.querySelector('.stat-row')
        statRowNode.dataset.value = statValue
        statRowNode.dataset.agent = agentName
        if (index === 0) {
          statRowNode.className += ' onyx'
        } else if (index === 1) {
          statRowNode.className += ' platinum'
        } else if (index === 2) {
          statRowNode.className += ' gold'
        } else if (index < 20) {
          statRowNode.className += ' silver'
        } else {
          statRowNode.className += ' none'
        }
        const agentInfo = iwwcCustom[ agentName ]
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
      appContentNode.appendChild(newStatPaneFragment)
    })
    filterDisplay(document.querySelector('.agent-search input').value)
  }, 0)
}
window.addEventListener('load', handleLoad);
