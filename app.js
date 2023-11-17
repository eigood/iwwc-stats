var iwwcCustomURL = 'https://drive.google.com/uc?export=download&id=11ds9bn7JQ0GQkdQmoGgGQ3Z1dFvvSILf';
function handleLoad() {
  console.log('handleLoad');
  var style = document.createElement('style');
  style.textContent = '
.faction-enl { color: green; }
.faction-res { color: blue; }
.iwwc-app.loading .iwwc-content { display: none; }
.iwwc-app:not(.loading) > .loading { display: none; }
';

  document.querySelector('html > head').appendChild(style);


  var app = document.createElement('div');
  app.setAttribute('id', 'iwwc-app');
  app.className = 'loading';
  document.body.appendChild(app);
  app.innerHtml = '
  <div class="loading">Loading, please wait.</div>
  <div class="iwwc-content">
  </div>
';
  
  /*

  var statPaneTemplate = document.querySelector('#stat-pane');
  var statListRowTemplate = document.querySelector('#stat-list-row');
  console.log('about to call fetch');
  try {
    fetch(iwwcCustomURL, {mode: 'no-cors'}).then(function(r) { return r.json(); }).then(parseIwwc);
  } catch (e) {
    console.error(e);
  }
  */
}
function parseIwwc(r) {
  console.log('r', r);
}
window.addEventListener('load', handleLoad);
