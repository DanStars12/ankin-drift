/* Logic-only host for the shipped game. DOM/canvas are stubs: never use this for UI/FPS claims. */
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import {BALANCE_HARNESS,BALANCE_HARNESS_ANCHOR} from './balance-harness.mjs';
import {BALANCE_AI_HARNESS} from './balance-ai-harness.mjs';
export function runtimeHarness(){
 const store=new Map(),elements=new Map(),noop=()=>{};
 const drawing=new Proxy({measureText:s=>({width:String(s).length*7}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 function element(id=''){if(elements.has(id))return elements.get(id);const classes=new Set();const e={id,innerHTML:'',textContent:'',hidden:false,style:{setProperty:noop},dataset:{},width:1280,height:800,clientWidth:1280,clientHeight:800,offsetWidth:1280,offsetHeight:800,scrollTop:0,
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on??!classes.has(x))classes.add(x);else classes.delete(x);}},
 getContext:()=>drawing,getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,right:1280,bottom:800,width:1280,height:800}),addEventListener:noop,removeEventListener:noop,append:noop,appendChild:noop,remove:noop,click:noop,focus:noop,contains:()=>false,setAttribute:noop,getAttribute:()=>null,closest:()=>null,querySelector:()=>null,querySelectorAll:()=>[],setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false};elements.set(id,e);return e;}
 const ctx=createContext({console,performance,structuredClone,URL,URLSearchParams,Blob,Path2D:class{constructor(){return new Proxy(this,{get:(o,k)=>o[k]??noop})}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,screen:{width:1280,height:800},navigator:{userAgent:'VM logic tests',onLine:true},location:{href:'http://localhost/ankin-drift/',search:'',protocol:'http:',pathname:'/ankin-drift/'},matchMedia:()=>({matches:false,addEventListener:noop}),requestAnimationFrame:noop,cancelAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,addEventListener:noop,removeEventListener:noop,
 document:{getElementById:element,createElement:()=>element(Symbol()),querySelector:()=>null,querySelectorAll:()=>[],body:element('body'),documentElement:element('html'),addEventListener:noop,hidden:false},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 ctx.window=ctx;ctx.globalThis=ctx;
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/<script src="\.\/([^"]+)"/g))runInContext(readFileSync(new URL('../'+match[1],import.meta.url),'utf8'),ctx,{filename:match[1]});
 const source=html.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 const hook=`globalThis.__runtime={get player(){return player},get game(){return game},get enemies(){return enemies},get pickups(){return pickups},get shots(){return shots},get hostile(){return hostile},get mode(){return mode},get recipes(){return FUSIONS},get catalog(){return ALL_SKILL_DEFS()},get ships(){return SHIPS},get fusionLevels(){return ELEMENT_FUSION_LEVELS},
 reset(ship='phantom'){selectedShip=ship;newRun();mode='playing';game.autoBank=true;game.nextVacuumAt=1e9;return player;},
 acquire(id,n=1){const c=skillById(id);if(!c)throw Error(id);for(let i=0;i<n;i++){const pool=['power','legendary','unique','relic'].includes(c.rarity)?({power:'powers',legendary:'legends',unique:'uniques',relic:'relics'})[c.rarity]:'skills';game[pool][id]=(game[pool][id]||0)+1;game.acquisitionLog.push(id);c.apply(player);}activateUpgrades();},
 fuse(main,sub,slot){game.level=40;game.lastChoice='normal';game.pendingLevels=Math.max(1,game.pendingLevels);choices=offerCards('normal');mode='choice';if(!enterElementChoice())throw Error('fusion unavailable');chooseFusionMain(main);selectElementFusion(sub);selectFusionWeapon(slot);confirmElementFusion();return game.elementCombos.length;},
 clear(){enemies=[];shots=[];hostile=[];pickups=[];hazards=[];zones=[];boss=null;enemyIndex.clear();enemyIndexReady=false;},
 enemy(type='drone',props={}){const e=spawnEnemy(type,{x:player.x+180,y:player.y});Object.assign(e,props);refreshEnemyIndex();return e;},
 advanceSimulation,drive,render,hudUpdate,dash,nova,shoot,restorePlayerBuild,orb,compactPickups,availableElementPairs,fusionOutcome,selectable,activeFusions,phantomWorld,darkWorld,applyElementFusionStats,applyDarkFusionHit,drawOverlay,
 setMode(m){mode=m},setKeys(values){keys=new Set(values)},stopSpawns(){game.spawn=1e9;game.nextBossAt=1e9;game.nextRaidAt=1e9;game.nextRelicAt=1e9},setClock(n){game.total=n;runClock=n},get time(){return runClock}
};`;
 runInContext(source.replace(BALANCE_HARNESS_ANCHOR,BALANCE_HARNESS+'\n'+BALANCE_AI_HARNESS+'\n'+hook+'\n})();'),ctx,{filename:'index.html'});
 return {ctx,api:ctx.__runtime,eval:s=>runInContext(s,ctx),storage:store};
}
