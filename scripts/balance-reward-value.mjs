// Developer-only estimate for normal rewards. Actual combat remains the acceptance measurement.
export function normalRewardValue(before,after){
 const n=(p,k,f=0)=>Number.isFinite(p[k])?p[k]:f;
 function primary(p){
  const dmg=n(p,'dmg',1),crit=1+Math.min(.969,Math.max(0,n(p,'crit')))*(n(p,'critMult',1)-1),rate=Math.max(.05,n(p,'rate',1));
  switch(p.shipType){
   case 'laser':return dmg*n(p,'laserScale',1)*Math.sqrt(Math.max(1,n(p,'laserCount',1)))*(1+n(p,'laserBonus')/100);
   case 'charge':return dmg*n(p,'chargeScale',1)*Math.sqrt(Math.max(.1,n(p,'chargeRate',1)))*(1+Math.min(12,n(p,'chargePenetration'))*.025);
   case 'drill':return (n(p,'drillDamage')*Math.min(1,n(p,'drillGain'))/Math.max(.5,n(p,'dashCd',1))+n(p,'drillContact')*2)*(1+n(p,'drillReach')/200);
   case 'dog':return dmg*n(p,'dogBonePower',1)*Math.sqrt(Math.max(1,n(p,'dogBones',1)))*(1+n(p,'dogBoneReturn',1)) / rate;
   default:return dmg*Math.sqrt(Math.max(1,n(p,'multishot',1)))*crit/rate;
  }
 }
 const hpRatio=n(before,'hp')/Math.max(1,n(before,'maxHp',1)),delta=(k)=>n(after,k)-n(before,k);
 const relative=k=>delta(k)/Math.max(1,Math.abs(n(before,k)));
 let score=25*(primary(after)/Math.max(.001,primary(before))-1);
 score+=(hpRatio<.45?24:hpRatio<.75?16:10)*delta('maxHp')/Math.max(100,n(before,'maxHp'));
 score+=(hpRatio<.45?20:8)*Math.max(0,delta('hp')-delta('maxHp'))/Math.max(100,n(before,'maxHp'));
 score+=10*delta('shieldMax')/Math.max(100,n(before,'maxHp'))+delta('shieldRecharge')*.4+delta('regen')*.75;
 score+=(hpRatio<.75?1:.4)*Math.min(2000,Math.max(40,primary(before)))*Math.max(0,delta('lifeSteal'))*.7;
 score+=Math.max(0,delta('killHeal'))*.04+Math.max(0,delta('expShield'))*.3;
 score+=5*relative('bossBane')+4*relative('shotSpeed')+8*Math.max(0,delta('echoShots'))+4*Math.max(0,delta('explosion'));
 if(before.shipType==='laser')score+=3*relative('laserWidth')+2*relative('laserReach');
 if(before.shipType==='drill')score+=2*relative('drillWidth');
 else score+=Math.max(0,delta('pierce'))*.45;
 score+=5*(n(before,'novaReuseDelay',13.6)/Math.max(10.5,n(after,'novaReuseDelay',13.6))-1);
 score+=10*relative('spd')+5*relative('magnet')+8*relative('xpBonus')+4*relative('novaDamage')+3*relative('novaRadius')+5*relative('novaGain');
 score+=5*(n(before,'dashCd',1)/Math.max(.1,n(after,'dashCd',1))-1);
 for(const k of ['chain','rocketCd','orbit','iceBallCount','boltCount','spikeCount','meteorCount','droneCount','dogChicks','windCount'])score+=Math.max(0,delta(k))*1.5;
 for(const k of ['chainDamage','iceBallDamage','boltDamage','spikeDamage','meteorDamage','dogEggDamage'])score+=Math.max(0,delta(k))/Math.max(30,Math.abs(n(before,k)))*3;
 score+=Math.max(0,relative('dogAnimalBoost'))*3;
 for(const k of ['empDps','magmaDps','windDps','rockDamage'])if(n(after,k)>0)score+=Math.max(0,delta(k))*.025;
 for(const[k,weight]of Object.entries({dashPulse:2,dashFlow:1,slowField:.5,killBurst:.03,freezeChance:3,burnChance:3,slowChance:3,iceAttackSlow:2}))score+=Math.max(0,delta(k))*weight;
 // NOVA-only utility is conditional; do not value it like permanent main-weapon DPS.
 if(before.shipType==='charge')score+=Math.max(0,delta('novaChargeSalvo'))*1.2+Math.max(0,delta('novaChargeSize'))*.1;
 if(before.shipType==='drill')score+=Math.max(0,delta('novaDrillDash'))*.3+Math.max(0,delta('novaDrillClear'))*.9;
 if(n(before,'meteorCount')>0)score+=Math.max(0,delta('meteorArenaBounce'))*.9;
 // Expected conditional uptime, kept conservative rather than treating a tactical tag as raw DPS.
 const a=after.tacticFlags||{},b=before.tacticFlags||{};
 const conditional={shotFar:.525,shotNear:.375,shotSlip:.15,shotPierce:.45,laserLock:.875,laserGlide:.875,laserSwitch:.7,laserCycle:.2,
  chargeBank:.8,chargeMid:.5,chargeStride:.32,chargeCover:.18,drillExit:.4,drillMark:.3,drillReserve:1,drillRhythm:.2,
  dogRecall:1.25,dogCatch:.36,dogPiyo:.375,dogHome:.6};
 for(const[k,value]of Object.entries(conditional))if(a[k]&&!b[k])score+=value;
 return score;
}
