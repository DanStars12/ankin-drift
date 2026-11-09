import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
// Use the same reproducible workload as the ordinary before/after benchmark.
const source=readFileSync(new URL('./performance.spec.mjs',import.meta.url),'utf8');
const workload=JSON.parse(source.match(/^const TEST_HOOK = ("[^\n]+");/)[1]);
const flags={
 shot:{shotFar:.06,shotNear:.05,shotSlip:1,shotPierce:1,shotFocus:1,shotStrafe:.14,shotRearm:.3,shotLane:1,shotOpener:.25,shotLong:1,shotNeedle:1,shotStar:.6,evolvedShot:1},
 laser:{laserLock:.07,laserGlide:.05,laserSwitch:.08,laserCycle:1,laserClose:.2,laserTrack:.18,laserWake:.22,laserFinish:.35,laserBrace:.5,laserLong:1,laserPulse:1,laserPolaris:.45,evolvedLaser:1},
 charge:{chargeBank:1,chargeMid:1,chargeStride:1,chargeCover:.05,chargeMobile:.18,chargeVent:1,chargeMidPower:.22,chargeAfterglow:1,chargeBastion:.18,chargeFeather:1,chargeAnchor:1,chargeMemory:1,evolvedCharge:1},
 drill:{drillExit:1,drillMark:.06,drillReserve:.04,drillRhythm:1,drillFinish:.22,drillTag:.22,drillRelease:.12,drillArmor:.18,drillHunter:.35,drillBrawler:1,drillRunner:1,drillFlywheel:1,evolvedDrill:1},
 dog:{dogRecall:1,dogCatch:1,dogPiyo:1,dogHome:.06,dogFlock:.18,dogRetrieve:1,dogPounce:.25,dogWelcome:1,dogLeader:.35,dogReturnDock:1,dogForward:1,dogOrbit:.4,evolvedDog:1}
};
const hook=workload+String.raw`
window.__tacticalPerfSetup=({ship,flags})=>{
 selectedShip=ship;const out=window.__ankinPerfTestScenario({total:3600,count:220,bullets:300,withRaid:true,doubleTime:true,engage:true});
 player.tacticFlags={...flags};player.iframes=1e8;player.dmg=80;player.multishot=6;player.laserCount=6;player.chargeRate=2;
 player.dogBones=6;player.dogChicks=3;player.orbit=3;player.shieldMax=player.shield=100;player.shieldRecharge=5;
 for(const e of enemies)e.hp=e.maxHp=1e8;
 return out;
};
`;
test('tactical active hooks: five ships, 2x ballistic ENGAGE triple-raid stress with equal native weapon budgets',async({page},testInfo)=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{const response=await route.fetch(),html=await response.text();
 const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
 expect(html).toContain(anchor);await route.fulfill({response,body:html.replace(anchor,hook+anchor)});});
 await page.goto('./');const results=[];
 for(const ship of Object.keys(flags)){
 const config=await page.evaluate(args=>window.__tacticalPerfSetup(args),{ship,flags:flags[ship]});
 for(let i=0;i<8;i++){await page.keyboard.press('Space');await page.waitForTimeout(500);}
 expect(config.initialWalls).toBeGreaterThan(0);const report=await page.evaluate(()=>window.ankinPerformanceReport());expect(report.raid.effects).toContain('engage');expect(report.frame.samples).toBeGreaterThan(15);
 expect(report.timing.requestedSpeed).toBe(2);expect(report.timing.discardedGameSeconds).toBe(0);
 results.push({ship,config,report});expect(errors).toEqual([]);
 }
 await testInfo.attach('tactical-active-performance.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 console.log('TACTICAL_ACTIVE_PERFORMANCE='+JSON.stringify(results));
});
