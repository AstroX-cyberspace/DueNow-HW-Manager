/* The demo uses its own session storage. The real workspace keeps every v1 key. */
const IS_DEMO = new URLSearchParams(location.search).get('demo') === '1';
const DUENOW_STORE = IS_DEMO ? {
  getItem: key => sessionStorage.getItem('duenow_demo_' + key),
  setItem: (key, value) => sessionStorage.setItem('duenow_demo_' + key, value),
  removeItem: key => sessionStorage.removeItem('duenow_demo_' + key)
} : localStorage;
