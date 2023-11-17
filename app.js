var iwwcCustomURL = 'https://drive.google.com/uc?export=download&id=11ds9bn7JQ0GQkdQmoGgGQ3Z1dFvvSILf';
var iwwcData = null;

function fetchNoCors(url, handler) {
  return fetch(url, {mode: 'no-cors'}).then(handler);
}

async function fetchJSON(url, handler) {
  try {
    const r = await fetchNoCors(url)
    console.log('r', r)
    const json = await r.json()
    console.log('json');
    return await handler(json);
  } catch (e) {
    console.error(e);
  } finally {
    console.log('finally', url);
  }
}

function handleLoad() {
  console.log('handleLoad');
  //fetchText(ghPagesBase + '/app.html', setHtml);
  loadData();
}

function loadData() {
  fetchJSON(iwwcCustomURL, setIwwcCustom);
}

function setIwwcCustom(json) {
  iwwcData = json;
  checkApp();
}

function checkApp() {
  console.log('checkApp', {iwwcData: iwwcData});
  if (!iwwcData) return;
  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  console.log('templates', {
    statPaneTemplate: statPaneTemplate,
    statListRowTemplate: statListRowTemplate,
  });
  /*

  console.log('about to call fetch');
  try {
    fetch(iwwcCustomURL, {mode: 'no-cors'}).then(function(r) { return r.json(); }).then(parseIwwc);
  } catch (e) {
    console.error(e);
  }
  */
}
window.addEventListener('load', handleLoad);
