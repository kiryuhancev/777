'use strict';
const fs = require('node:fs');
const path = require('node:path');
function loadMath(htmlPath = path.join(__dirname, '..', 'index.html')) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.indexOf('const SYMBOLS=');
  const end = html.indexOf('const PRANK_IMAGE=', start);
  const coreStart = html.indexOf('// CONFIG / RNG / HEADLESS MATH');
  const coreEnd = html.indexOf('// STATE ADAPTER', coreStart);
  if ([start,end,coreStart,coreEnd].some(i=>i<0)) throw new Error('Cannot find slot math in HTML');
  // The app remains a single offline HTML. These optional Node tools load its actual core,
  // not an independent copy of the probabilities or payout logic.
  return new Function('EMBEDDED_ASSETS', html.slice(start,end) + html.slice(coreStart,coreEnd) + '\nreturn SLOT_MATH;')({});
}
module.exports = {loadMath};
