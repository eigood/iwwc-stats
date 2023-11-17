var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom.json';
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
  const response = await fetch(url, {mode: 'no-cors'})
  const json = await response.json()
  return handler(json)
}

function handleLoad() {
  //fetchText(ghPagesBase + '/app.html', setHtml);
  loadData();
  document.querySelector('.reloadButton').addListener('click', loadData)
}

function loadData() {
  fetchJSON(iwwcCustomURL, handleData)
}

function handleData(iwwcData) {
  if (!iwwcData) return;
  const app = document.querySelector('#iwwc-app')
  app.className = ''

  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  const byAgent = {}
  const byStat = {};

  Object.entries(iwwcData).forEach(([ agentName, agentData ]) => {
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
  appContentNode.innerHtml = '';
  displayStats.forEach(([ statName, statTitle ]) => {
    const statList = byStat[ statName ]
    const newStatPaneFragment = statPaneTemplate.content.cloneNode(true)
    newStatPaneFragment.querySelector('.stat-header').textContent = statTitle
    const newStatListNode = newStatPaneFragment.querySelector('.stat-list')
    statList.forEach(([ statValue, agentName ]) => {
      const newStatRowFragment = statListRowTemplate.content.cloneNode(true)
      newStatRowFragment.querySelector('.stat-row').setAttribute('data-value', statValue)
      const agentInfo = iwwcData[ agentName ]
      newStatRowFragment.querySelector('.stat-value').textContent = statValue.toLocaleString({ useGrouping:true })
      const agentNode = newStatRowFragment.querySelector('.agent')
      agentNode.className += ' faction-' + agentInfo.faction
      agentNode.textContent = agentName
      newStatListNode.appendChild(newStatRowFragment)
    })
    appContentNode.appendChild(newStatPaneFragment)
  })
}
window.addEventListener('load', handleLoad);
