var iwwcCustomURL = 'https://eigood.github.io/iwwc-stats-data/iwwc-custom.json';

async function fetchJSON(url, handler) {
  const response = await fetch(url, {mode: 'no-cors'})
  return await response.json();
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
  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  console.log('templates', {
    statPaneTemplate,
    statListRowTemplate,
  });
  const byAgent = {}
  const byStat = {};
  Object.entries(iwwcData).forEach(([ agentName, agentData ]) => {
    const forAgent = byAgent[ agentName ] = {}
    Object.entries(agentData).forEach(([ statName, statValue ]) => {
      forAgent[ statName ] = [ statValue ]
      const statList = byStat[ statName ] || (byStat[ statName ] = [])
      statList.push([ statValue, agentName ])
    })
  })
  const statSorter = (a, b) => a[0] - b[0]
  Object.entries(byStat).forEach(([ statName, statList ]) => {
    statList.sort(statSorter)
    statList.forEach(([ statValue, agentName ], index) => {
      byAgent[ agentName ][ statName ][ 1 ] = index
    })
  })
  console.log('by', {byAgent, byStat})
}
window.addEventListener('load', handleLoad);
