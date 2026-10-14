import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../weekend-ideas.html',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const us=fs.readFileSync(new URL('../united-states.html',import.meta.url),'utf8');
const ca=fs.readFileSync(new URL('../canada.html',import.meta.url),'utf8');
const sitemap=fs.readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const affiliate=fs.readFileSync(new URL('../dealzy-affiliates.js',import.meta.url),'utf8');

test('Weekend guide is discoverable through country pages, home and sitemap',()=>{
  assert.match(page,/<link rel="canonical" href="https:\/\/dealzyai.com\/weekend-ideas.html">/);
  assert.match(sitemap,/<loc>https:\/\/dealzyai.com\/weekend-ideas.html<\/loc>/);
  for(const source of [home,us,ca])assert.match(source,/href="\/weekend-ideas.html"/);
  for(const id of ['miami','new-york','toronto','montreal']) assert.match(page,new RegExp('id="'+id+'"'));
});

test('Country links retain the right market and do not promise unavailable pricing',()=>{
  assert.match(page,/country=US&amp;city=Miami&amp;lang=en/);
  assert.match(page,/country=US&amp;city=New%20York&amp;lang=en/);
  assert.match(page,/country=CA&amp;city=Toronto&amp;lang=en/);
  assert.match(page,/country=CA&amp;city=Montreal&amp;lang=en/);
  assert.doesNotMatch(page,/guaranteed savings|guaranteed lowest|exclusive deal|\d+% off/i);
  assert.match(page,/Affiliate disclosure:/);
  assert.match(page,/Prices and availability are set by the partner/);
});

test('All four named affiliate destinations reuse existing approved registry URLs',()=>{
  const urls=[
    'https://pelago.pxf.io/4ajAW1',
    'https://pelago.pxf.io/6k51gN',
    'https://www.expedia.com/shop/dealzy-ai/usa-city-stays-dealzy-ai',
    'https://www.expedia.com/shop/dealzy-ai/canada-city-stays-dealzy-ai'
  ];
  for(const url of urls){
    assert.ok(affiliate.includes(url),url+' must match the existing affiliate registry');
    assert.ok(page.includes(url),url+' must appear in the guide');
  }
  assert.equal((page.match(/rel="sponsored noopener noreferrer"/g)||[]).length,4);
  assert.match(page,/SIM CORP ©/);
});
