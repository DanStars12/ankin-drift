/* v13.33: pure tactical decisions used ONLY by developer-injected AI harness. */
export function decideAbilityUse(s) {
 const readyDash=s.dashLeft<=0 && s.dashTime<=0 && (s.ship==='drill' || s.iframes<.12);
 // Preemptive evasions must start before projectiles actually overlap the hitbox.
 const danger=(s.ship==='phantom'&&(s.contactThreats||0)>0) || s.imminent>0 || (s.threats>0 && (s.ship==='drill' || s.ship==='laser' || s.ship==='dog' || s.hpRatio<.38));
 let dashReason=null,novaReason=null;
 if(readyDash) {
  if(danger)dashReason='emergency-evade';
  else if(s.ship==='drill' && (s.drillOverdrive>0 || s.drillPlasmaRatio>=.30)
   && s.targetDist>35 && s.targetDist<140)dashReason='plasma-strike';
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
    else if(s.enemiesNear>=2)novaReason='multi-target-overdrive';
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
    else if(s.enemiesNear>=2)novaReason='mob-overdrive';
    else if(danger&&s.hpRatio<.72)novaReason='defensive-overdrive';
    break;
   case 'phantom':
    if(s.bossDist<=700||s.enemiesNear>=2)novaReason='spectral-overdrive';
    else if(s.imminent>=2)novaReason='spectral-clear';
    break;
   case 'dog':
    if(s.bossDist<=285)novaReason='boss-bow-shock';
    else if(s.enemiesNear>=2)novaReason='radial-bow-shock';
    else if(s.novaHeldSeconds>=5 && s.enemiesNear>=1)novaReason='held-bow-shock';
    break;
  }
 }
 return {dashReason,novaReason};
}
