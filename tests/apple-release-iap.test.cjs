const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
function fixture(response = {success:true,isActive:true,plan:'premium_monthly'}) {
  const state = {handlers:{},events:[],finished:[],requests:[],purchases:[],response};
  const store = {
    on: (_name, fn) => state.listener=fn,
    canMakePayments:()=>true, getReceiptURL:()=>'/fixture/receipt',
    purchaseProduct:async (id,opts)=>{state.purchases.push({id,opts});return true;},
    restoreCompletedTransactions:()=>{}, finishTransactionByDate:x=>state.finished.push(x),
  };
  const https = {request(options,cb) {
    state.requests.push(options);
    const request=new EventEmitter(); request.write=()=>{};request.destroy=()=>{};
    request.end=()=>queueMicrotask(()=>{
      const result=new EventEmitter();result.statusCode=options.path.includes('/verify')?200:(state.status || 200);
      cb(result);result.emit('data',JSON.stringify(options.path.includes('/verify')?{valid:true}:state.response));result.emit('end');
    });return request;
  }};
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../frontend/tvanddesktop/desktop/electron/iap.js'),'utf8'), {
    module,process:{platform:'darwin',mas:true},Buffer,console:{log(){},warn(){}},
    setTimeout:()=>1,clearTimeout(){},
    require(name){if(name==='electron')return {inAppPurchase:store};if(name==='https')return https;if(name==='fs')return {existsSync:()=>true,readFileSync:()=>Buffer.from('app-receipt')};return require(name);}
  });
  module.exports.registerIpc({handle:(name,fn)=>state.handlers[name]=fn},()=>({isDestroyed:()=>false,webContents:{send:(...args)=>state.events.push(args)}}));
  state.auth=t=>state.handlers['mr-iap-set-auth'](null,t);
  state.buy=()=>state.handlers['mr-iap-purchase'](null,{productId:'megaradio_premium_monthly1',token:'account-a'});
  state.tx=(override={})=>({transactionIdentifier:'txn-1',transactionDate:'date-1',transactionState:'purchased',payment:{productIdentifier:'megaradio_premium_monthly1',applicationUsername:state.purchases[0]?.opts.username},...override});
  return state;
}
test('App Store receipt is finished only after an active backend entitlement',async()=>{
 const f=fixture();f.auth('account-a');await f.buy();await f.listener(null,[f.tx()]);
 assert.equal(f.finished.length,1);assert.equal(f.events[0][0],'mr-iap-completed');assert.ok(f.purchases[0].opts.username);
});
for(const [label,response,status] of [
 ['missing success',{isActive:true,plan:'premium_monthly'},200],
 ['inactive',{success:true,isActive:false,plan:'premium_monthly'},200],
 ['unrecognized plan',{success:true,isActive:true,plan:'invented'},200],
 ['unavailable',{error:'unavailable'},503],
 ['conflicting owner',{error:'receipt_replay'},409],
]) test(`${label} neither finishes nor grants the purchase, and permits retry`,async()=>{
 const f=fixture(response);f.status=status;f.auth('account-a');await f.buy();await f.listener(null,[f.tx()]);
 assert.equal(f.finished.length,0);assert.equal(f.events[0][0],'mr-iap-failed');assert.equal((await f.buy()).ok,true);
});
test('unsolicited and old-account transactions are not assigned to a new login',async()=>{
 const f=fixture();f.auth('account-a');await f.buy();const old=f.tx();f.auth('account-b');await f.listener(null,[old]);
 assert.equal(f.requests.filter(x=>x.path==='/api/user/subscription').length,0);assert.equal(f.finished.length,0);
});
test('transaction for a different purchase owner requires explicit restore',async()=>{
 const f=fixture();f.auth('account-a');await f.buy();await f.listener(null,[f.tx({payment:{productIdentifier:'megaradio_premium_monthly1',applicationUsername:'different-owner'}})]);
 assert.equal(f.finished.length,0);assert.equal(f.requests.length,1);
});
test('explicit restore verifies the actual product before finishing',async()=>{
 const f=fixture();f.auth('account-a');await f.handlers['mr-iap-restore'](null,{token:'account-a'});await f.listener(null,[f.tx({transactionState:'restored'})]);
 assert.equal(f.finished.length,1);assert.equal(f.events[0][0],'mr-iap-restored');
});

test('hidden rating prompt never translates before i18next initialization', () => {
  const ts = require('../frontend/node_modules/typescript');
  const i18next = require('../frontend/node_modules/i18next');
  const translation = i18next.createInstance();
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../frontend/src/components/RateUsModal.tsx'),'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
  }).outputText;
  let ready=false;
  const runtime={exports:{},console,require(name){
    if(name==='react')return {};
    if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name==='react-native')return {StyleSheet:{create:s=>s},Platform:{OS:'ios'}};
    if(name==='react-i18next')return {useTranslation:()=>({ready,t:translation.getFixedT(null,'translation')})};
    if(name==='@expo/vector-icons'||name==='expo-store-review')return {};
    throw Error(name);
  }};
  vm.runInNewContext(source,runtime);
  const props={visible:false,onClose(){}};
  assert.equal(runtime.exports.RateUsModal(props),null);
  assert.equal(runtime.exports.RateUsModal({...props,visible:true}),null);
  translation.init({lng:'en',resources:{en:{translation:{rate_us_title:'Ready'}}},initImmediate:false});
  ready=true;
  assert.equal(runtime.exports.RateUsModal(props),null);
  assert.ok(runtime.exports.RateUsModal({...props,visible:true}));
});
