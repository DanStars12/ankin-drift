/* v13.33: pure tactical decisions used ONLY by developer-injected AI harness. */
export function decideAbilityUse(s) {
 const readyDash=s.dashLeft<=0 && s.dashTime<=0 && s.iframes<.12;
 const danger=s.imminent>0 || (s.threats>0 && s.hpRatio<.38);
 let dashReason=null,novaReason=null;
 if(readyDash) {
  if(danger)dashReason='emergency-evade';
  else if(s.ship==='drill' && s.drillOverdrive<=0 && s.drillPlasmaRatio>=.34
   && s.targetDist>75 && s.targetDist<230 && s.safeApproach)dashReason='plasma-strike';
 }
 if(s.energy>=100 && s.novaCooldown<=0) {
  switch(s.ship) {
   case 'shot':
    if(s.bossDist<=s.novaRadius*.90)novaReason='boss-in-radius';
    else if(s.enemiesInNova>=3)novaReason='crowd-in-radius';
    else if(s.imminent>=2 && s.enemiesInNova>0)novaReason='emergency-clear';
    break;
   case 'laser':
    if(s.bossDist<=Math.min(620,s.laserReach*.82))novaReason='boss-overdrive';
    else if(s.enemiesNear>=3)novaReason='multi-target-overdrive';
    else if(s.imminent>=2)novaReason='projectile-clear';
    break;
   case 'charge':
    if(s.bossDist<=620)novaReason='boss-comet';
    else if(s.enemiesForward>=3)novaReason='comet-volley';
    else if(s.imminent>=2)novaReason='projectile-clear';
    break;
   case 'drill':
    if(s.drillOverdrive>0)break;
    if(s.bossDist<=330)novaReason='boss-overdrive';
    else if(s.enemiesNear>=3)novaReason='mob-overdrive';
    else if(danger&&s.hpRatio<.55)novaReason='defensive-overdrive';
    break;
   case 'dog':
    if(s.bossDist<=265)novaReason='boss-bow-shock';
    else if(s.enemiesNear>=4)novaReason='radial-bow-shock';
    break;
  }
 }
 return {dashReason,novaReason};
}
