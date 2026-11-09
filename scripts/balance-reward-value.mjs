// Developer-only estimate for normal rewards. Actual combat remains the acceptance measurement.
export function normalRewardValue(before,after){
 const n=(p,k,f=0)=>Number.isFinite(p[k])?p[k]:f;
 function primary(p){
  const dmg=n(p,'dmg',1),crit=1+n(p,'crit')*(n(p,'critMult',1)-1),rate=Math.max(.05,n(p,'rate',1));
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
 score+=10*relative('spd')+5*relative('magnet')+8*relative('xpBonus')+4*relative('novaDamage')+3*relative('novaRadius')+5*relative('novaGain');
 score+=5*(n(before,'dashCd',1)/Math.max(.1,n(after,'dashCd',1))-1);
 for(const k of ['chain','rocketCd','orbit','iceBallCount','boltCount','spikeCount','meteorCount','droneCount','dogChicks','windCount'])score+=Math.max(0,delta(k))*1.5;
 for(const k of ['chainDamage','iceBallDamage','boltDamage','spikeDamage','meteorDamage','dogEggDamage','dogAnimalBoost'])score+=Math.max(0,relative(k))*3;
 // Expected conditional uptime, kept conservative rather than treating a tactical tag as raw DPS.
 const a=after.tacticFlags||{},b=before.tacticFlags||{};
 const conditional={shotFar:.525,shotNear:.375,shotSlip:.15,shotPierce:.45,laserLock:.875,laserGlide:.875,laserSwitch:.7,laserCycle:.2,
  chargeBank:.8,chargeMid:.5,chargeStride:.32,chargeCover:.18,drillExit:.4,drillMark:.3,drillReserve:1,drillRhythm:.2,
  dogRecall:1.25,dogCatch:.36,dogPiyo:.375,dogHome:.6};
 for(const[k,value]of Object.entries(conditional))if(a[k]&&!b[k])score+=value;
 return score;
}
