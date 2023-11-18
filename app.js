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
  document.querySelector('.agent-search input').addEventListener('keyup', agentSearch)
}

function loadData(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  fetchJSON(iwwcCustomURL, handleCustom)
  fetchJSON(iwwcInfoURL, handleInfo)
}

const agentSearch = debounce((e) => {
  e.preventDefault()
  e.stopPropagation()
  console.log('search', e)
  const agentSearch = e.target.value.toUpperCase()
  document.querySelectorAll('.stat-row').forEach(statRowNode => {
    const agentName = statRowNode.getAttribute('data-agent');
    if (!agentSearch || agentName.toUpperCase().indexOf(agentSearch) !== -1) {
      statRowNode.className = 'stat-row'
    } else {
      statRowNode.className = 'stat-row hidden'
    }
  })
})

function handleInfo(iwwcInfo) {
  if (!iwwcInfo) return;
  const fullFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric", hour: "2-digit", minute: "numeric", second: "numeric" }
  const shortFormatOptions = { weekday:"short", year:"numeric", month:"short", day:"numeric" }
  document.querySelector('.last-refresh').textContent = new Date(iwwcInfo.lastRefresh + 'Z').toLocaleString(navigator.language, fullFormatOptions)
  document.querySelector('.start-date').textContent = new Date(iwwcInfo.startDate).toLocaleString(navigator.language, shortFormatOptions)
  document.querySelector('.end-date').textContent = new Date(iwwcInfo.endDate).toLocaleString(navigator.language, shortFormatOptions)
}

function handleCustom(iwwcCustom) {
  if (!iwwcCustom) return;
  const app = document.querySelector('#iwwc-app')
  app.className = ''

  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  const byAgent = {}
  const byStat = {};

  Object.entries(iwwcCustom).forEach(([ agentName, agentData ]) => {
    const forAgent = byAgent[ agentName ] = {}
    Object.entries(agentData).forEach(([ statName, statValue ]) => {
      if (skipStats[ statName ]) return
      forAgent[ statName ] = [ statValue ]
      const statList = byStat[ statName ] || (byStat[ statName ] = [])
      statList.push([ statValue, agentName ])
    })
  })
  const statSorter = (a, b) => b[0] - a[0]
  Object.entries(byStat).forEach(([ statName, statList ]) => {
    statList.sort(statSorter)
    statList.forEach(([ statValue, agentName ], index) => {
      byAgent[ agentName ][ statName ][ 1 ] = index
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
      statList.forEach(([ statValue, agentName ], index) => {
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
        newStatListNode.appendChild(newStatRowFragment)
      })
      appContentNode.appendChild(newStatPaneFragment)
    })
  }, 0)
}
window.addEventListener('load', handleLoad);
