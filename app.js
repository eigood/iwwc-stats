var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom.json';
const skipStats = {
  'ap': true,
  'level': true,
  'faction': true,
  'last_submit': true,
}

const awardStats = {
  'lifetime_ap': 'AP',
  'explorer': 'Explorer',
  'recon': 'Recon',
  'scout': 'Scout',
  'scout_controller': 'Scout Controller',
  'builder': 'Builder',
  'connector': 'Connector',
  'mind-controller': 'Mind Controller',
  'llluminator': 'Illuminator',
  'recharger': 'Recharger',
  'liberator': 'Liberator',
  'pioneer': 'Pioneer',
  'engineer': 'Engineer',
  'hacker': 'Hacker',
  'maverick': 'Maverick',
  'translator': 'Translator',
  'purifier': 'Purifier',
  'trekker': 'Trekker',
  'specops': 'Specops',
  'recursions': 'Recursions',
  'crafter': 'Kinetic Capsules Completed',
}

async function fetchJSON(url, handler) {
  const response = await fetch(url, {mode: 'no-cors'})
  const json = await response.json()
  return handler(json)
}

function handleLoad() {
  console.log('handleLoad');
  //fetchText(ghPagesBase + '/app.html', setHtml);
  loadData();
}

function loadData() {
  fetchJSON(iwwcCustomURL, handleData)
}

function handleData(iwwcData) {
  console.log('checkApp', {iwwcData: iwwcData});
  if (!iwwcData) return;
  const app = document.querySelector('#iwwc-app')
  app.className = ''

  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  console.log('templates', { statPaneTemplate, statListRowTemplate });
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
  const statEntries = Object.entries(byStat)
  statEntries.forEach(([ statName, statList ]) => {
    statList.sort(statSorter)
    statList.forEach(([ statValue, agentName ], index) => {
      byAgent[ agentName ][ statName ][ 1 ] = index
    })
  })
  console.log('by', {byAgent, byStat})
  statEntries.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  const appContentNode = document.querySelector('#iwwc-app .iwwc-content')
  appContentNode.innerHtml = '';
  statEntries.forEach(([ statName, statList ]) => {
    const statDesc = awardStats[ statName ]
    if (!statDesc) return
    const newStatPaneFragment = statPaneTemplate.content.cloneNode(true)
    newStatPaneFragment.querySelector('.stat-header').textContent = statDesc
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
