import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dealzy-live.js',import.meta.url),'utf8');
const start=source.indexOf('  async function reverseGpsLocation(');
const end=source.indexOf('  const h=',start);
assert.ok(start>0&&end>start,'location code is available');

function harness({choice=null,permission='prompt',country='us',position={latitude:25.76,longitude:-80.19},error=null}={}){
  const storage=new Map(choice?[['dealzyLocationChoice',choice]]:[]);
  const elements=new Map();
  const calls={gps:0,market:[],picker:[],refresh:0,toasts:[]};
  const node=(id='')=>({
    id, value:'US', textContent:'', disabled:false, isConnected:false,
    remove(){this.isConnected=false;elements.delete(this.id);},
    focus(){},
    set innerHTML(value){
      this.html=value;
      if(this.id==='dealzyLocationPrompt'){
        this.children=new Map([
          ['.dz-location-primary',node()],['.dz-location-status',node()],
          ['#dzLocationCountry',node()],['.dz-location-city',node()],
          ['.dz-location-later',node()]
        ]);
      }
    },
    querySelector(selector){return this.children?.get(selector)||null;}
  });
  const document={
    createElement:()=>node(),
    getElementById:id=>elements.get(id)||null,
    addEventListener(){},removeEventListener(){},
    head:{appendChild(el){el.isConnected=true;elements.set(el.id,el);}},
    body:{appendChild(el){el.isConnected=true;elements.set(el.id,el);}}
  };
  const context=vm.createContext({
    document,URLSearchParams,CustomEvent:class {},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    navigator:{
      permissions:{query:async()=>({state:permission})},
      geolocation:{getCurrentPosition(success,failure){calls.gps++;if(error) failure(error);else success({coords:position});}}
    },
    fetch:async()=>({ok:true,json:async()=>({address:{country_code:country,city:country==='ca'?'Toronto':'Miami'}})}),
    market:{country:'US',city:'Miami'},state:{coords:null},
    MARKET_CITIES:{US:[{value:'Miami'}],CA:[{value:'Toronto'}]},
    persistMarket:(country,city,mode='manual')=>{
      calls.market.push({country,city,mode});
      storage.set('dealzyLocationChoice',mode);
      storage.set('dealzyLocationMode',mode);
    },
    updateMarketUI(){},updateGeoUI(){},
    hydrateHome(){calls.refresh++;},openMarketPicker:kind=>calls.picker.push(kind),
    toast:message=>calls.toasts.push(message),locale:()=> 'en',
    window:{dispatchEvent(){}}
  });
  vm.runInContext(source.slice(start,end),context);
  return {context,document,storage,calls,prompt:()=>document.getElementById('dealzyLocationPrompt')};
}

test('first visit explains location before requesting native permission',async()=>{
  const app=harness();
  await vm.runInContext('maybeShowLocationPrompt()',app.context);
  const prompt=app.prompt();
  assert.ok(prompt);
  assert.match(prompt.html,/Find deals around you/);
  assert.equal(app.calls.gps,0);
  await prompt.querySelector('.dz-location-primary').onclick();
  assert.equal(app.calls.gps,1);
  assert.deepEqual(app.calls.market,[{country:'US',city:'Miami',mode:'gps'}]);
  assert.equal(app.storage.get('dealzyLocationChoice'),'gps');
  assert.equal(app.prompt(),null);
});

test('denied permission leaves a usable city choice',async()=>{
  const app=harness({error:{code:1}});
  await vm.runInContext('maybeShowLocationPrompt()',app.context);
  const prompt=app.prompt();
  await prompt.querySelector('.dz-location-primary').onclick();
  assert.match(prompt.querySelector('.dz-location-status').textContent,/permission/);
  prompt.querySelector('#dzLocationCountry').value='CA';
  prompt.querySelector('.dz-location-city').onclick();
  assert.deepEqual(app.calls.market,[{country:'CA',city:'Toronto',mode:'manual'}]);
  assert.deepEqual(app.calls.picker,['city']);
  assert.equal(app.prompt(),null);
});

test('outside the supported markets does not use foreign GPS for nearby deals',async()=>{
  const app=harness({country:'fr'});
  await vm.runInContext('maybeShowLocationPrompt()',app.context);
  const prompt=app.prompt();
  await prompt.querySelector('.dz-location-primary').onclick();
  assert.match(prompt.querySelector('.dz-location-status').textContent,/outside the available markets/);
  assert.equal(app.context.state.coords,null);
  assert.equal(app.storage.get('dealzyLocationMode'),'manual');
  assert.equal(app.storage.has('dealzyLocationChoice'),false);
  assert.ok(app.prompt());
});

test('a chosen city skips the prompt; granted GPS refreshes without a prompt',async()=>{
  const manual=harness({choice:'manual'});
  await vm.runInContext('maybeShowLocationPrompt()',manual.context);
  assert.equal(manual.prompt(),null);
  assert.equal(manual.calls.gps,0);

  const gps=harness({choice:'gps',permission:'granted'});
  await vm.runInContext('maybeShowLocationPrompt()',gps.context);
  assert.equal(gps.prompt(),null);
  assert.equal(gps.calls.gps,1);
});
