var iwwcCustomURL = 'https://drive.google.com/uc?export=download&id=11ds9bn7JQ0GQkdQmoGgGQ3Z1dFvvSILf';
var iwwcData = null;

function fetchNoCors(url, handler) {
  return fetch(url, {mode: 'no-cors'}).then(handler);
}

function fetchText(url, handler) {
  return fetchNoCors(url, function(r) { return r.text().then(handler); } );
}

function fetchJSON(url, handler) {
  return fetchNoCors(url, function(r) { return r.json().then(handler); } );
}

function handleLoad() {
  console.log('handleLoad');
  var style = document.createElement('style');
  style.src = ghPagesBase + '/app.css';
  document.getElementsByTagName('head')[0].appendChild(style);
  //fetchText(ghPagesBase + '/app.html', setHtml);
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
