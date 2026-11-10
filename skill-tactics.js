/* v13.37: ship-specific tactical cards. Effects use fixed simulation time. */
(function(root){'use strict';
const cards=[
{"id":"tacShotFar","shipOnly":"shot","rarity":"uncommon","name":"レンジファインダー","desc":"260以上離れた敵への主砲威力+6%。","tags":["射撃","位置取り","一度限り"],"params":{"shotFar":0.06},"stats":[]},
{"id":"tacShotNear","shipOnly":"shot","rarity":"uncommon","name":"インファイト照準","desc":"150以内の敵への主砲威力+5%。","tags":["射撃","近接","一度限り"],"params":{"shotNear":0.05},"stats":[]},
{"id":"tacShotSlip","shipOnly":"shot","rarity":"rare","name":"スライド給弾","desc":"ダッシュ終了後1秒、主砲の弾速+15%。","tags":["射撃","ダッシュ反撃","一度限り"],"params":{"shotSlip":1},"stats":[]},
{"id":"tacShotPierce","shipOnly":"shot","rarity":"rare","name":"ブリーチ装填","desc":"ダッシュ終了後1.2秒以内の1斉射は貫通+1。","tags":["射撃","貫通","ダッシュ反撃","一度限り"],"params":{"shotPierce":1},"stats":[]},
{"id":"tacShotFocus","shipOnly":"shot","rarity":"power","name":"一点収束照準","desc":"基本威力+16。0.8秒以内に同じ敵へ連続命中すると、主砲威力が最大12%上昇。","tags":["射撃","集中射撃","一度限り"],"params":{"shotFocus":1},"stats":[["dmg","add",16,null,null]]},
{"id":"tacShotStrafe","shipOnly":"shot","rarity":"power","name":"横滑り射撃管","desc":"移動中の主砲威力+14%、弾速+60。","tags":["射撃","機動","一度限り"],"params":{"shotStrafe":0.14},"stats":[["shotSpeed","add",60,null,null]]},
{"id":"tacShotRearm","shipOnly":"shot","rarity":"power","name":"反撃弾倉","desc":"射撃間隔-6%。ダッシュ終了後1.2秒以内の1斉射は威力+30%。","tags":["射撃","ダッシュ反撃","一度限り"],"params":{"shotRearm":0.3},"stats":[["rate","mul",0.94,"limitRate",null]]},
{"id":"tacShotLane","shipOnly":"shot","rarity":"legendary","name":"星路の貫通弾倉","desc":"基本威力+45、弾数+1。ダッシュ終了後1.2秒内の1斉射は貫通+2。","tags":["射撃","弾数","ダッシュ反撃","一度限り"],"params":{"shotLane":1},"stats":[["dmg","add",45,null,null],["multishot","add",1,null,"limitShot"]]},
{"id":"tacShotOpener","shipOnly":"shot","rarity":"legendary","name":"ファーストライト","desc":"会心率+10%、会心倍率+0.3。HP75%以上の敵への主砲威力+25%。","tags":["射撃","会心","一度限り"],"params":{"shotOpener":0.25},"stats":[["crit","add",0.1,null,0.969],["critMult","add",0.3,null,null]]},
{"id":"tacShotLongLens","shipOnly":"shot","rarity":"relic","name":"遠射の照準器","desc":"260以上離れた敵への主砲威力+30%、150以内では-10%。","tags":["射撃","位置取り","レリック","一度限り"],"params":{"shotLong":1},"stats":[]},
{"id":"tacShotNeedle","shipOnly":"shot","rarity":"relic","name":"反撃の針薬莢","desc":"主砲威力-8%。ダッシュ終了後1.2秒内の1斉射は威力+35%、貫通+3。","tags":["射撃","貫通","ダッシュ反撃","レリック","一度限り"],"params":{"shotNeedle":1},"stats":[]},
{"id":"tacShotStar","shipOnly":"shot","rarity":"unique","name":"星渡りの反撃","desc":"基本威力+120、弾数+2。ダッシュ終了後1.2秒内の1斉射は威力+60%、貫通+2。","tags":["射撃","弾数","ダッシュ反撃","一度限り"],"params":{"shotStar":0.6},"stats":[["dmg","add",120,null,null],["multishot","add",2,null,"limitShot"]]},
{"id":"tacLaserLock","shipOnly":"laser","rarity":"uncommon","name":"照準のしおり","desc":"主照準を0.8秒維持すると、その敵へのレーザー威力+7%。","tags":["レーザー","照準維持","一度限り"],"params":{"laserLock":0.07},"stats":[]},
{"id":"tacLaserGlide","shipOnly":"laser","rarity":"uncommon","name":"滑走レンズ","desc":"移動中のレーザー威力+5%。","tags":["レーザー","機動","一度限り"],"params":{"laserGlide":0.05},"stats":[]},
{"id":"tacLaserSwitch","shipOnly":"laser","rarity":"rare","name":"再照準プリズム","desc":"主照準の切替後0.45秒、レーザー威力+8%。","tags":["レーザー","照準切替","一度限り"],"params":{"laserSwitch":0.08},"stats":[]},
{"id":"tacLaserCycle","shipOnly":"laser","rarity":"rare","name":"照準回生","desc":"主照準を1秒維持するとダッシュ待機-0.08秒。4秒ごと。","tags":["レーザー","照準維持","回避","一度限り"],"params":{"laserCycle":1},"stats":[]},
{"id":"tacLaserClose","shipOnly":"laser","rarity":"power","name":"接近照射レンズ","desc":"線幅+1.2。180以内の敵へのレーザー威力+20%。","tags":["レーザー","近接","一度限り"],"params":{"laserClose":0.2},"stats":[["laserWidth","add",1.2,null,null]]},
{"id":"tacLaserTrack","shipOnly":"laser","rarity":"power","name":"追従分光器","desc":"レーザー威力補正+0.2。主照準維持中の同じ敵への威力+18%。","tags":["レーザー","照準維持","一度限り"],"params":{"laserTrack":0.18},"stats":[["laserScale","add",0.2,null,null]]},
{"id":"tacLaserWake","shipOnly":"laser","rarity":"power","name":"離脱照射炉","desc":"シールド+35。ダッシュ終了後1.5秒、レーザー威力+22%。","tags":["レーザー","ダッシュ反撃","防御","一度限り"],"params":{"laserWake":0.22},"stats":[["shieldMax","add",35,null,null],["shield","add",35,null,null]]},
{"id":"tacLaserFinish","shipOnly":"laser","rarity":"legendary","name":"薄明の照射","desc":"レーザー威力補正+0.45。HP40%以下の敵への照射威力+35%。","tags":["レーザー","火力","一度限り"],"params":{"laserFinish":0.35},"stats":[["laserScale","add",0.45,null,null]]},
{"id":"tacLaserBrace","shipOnly":"laser","rarity":"legendary","name":"巡航光学城","desc":"シールド+70。移動しながら照準維持すると再充填速度+50%。","tags":["レーザー","照準維持","防御","一度限り"],"params":{"laserBrace":0.5},"stats":[["shieldMax","add",70,null,null],["shield","add",70,null,null]]},
{"id":"tacLaserLongLens","shipOnly":"laser","rarity":"relic","name":"遠光の分光器","desc":"300以上離れた敵への照射威力+30%、180以内では-12%。","tags":["レーザー","位置取り","レリック","一度限り"],"params":{"laserLong":1},"stats":[]},
{"id":"tacLaserPulse","shipOnly":"laser","rarity":"relic","name":"転光プリズム","desc":"標的切替後0.45秒は照射威力+40%。同じ標的を1.2秒照射すると-10%。","tags":["レーザー","照準切替","レリック","一度限り"],"params":{"laserPulse":1},"stats":[]},
{"id":"tacLaserPolaris","shipOnly":"laser","rarity":"unique","name":"ポラリスの追従光","desc":"レーザー+3本、威力補正+1.1、線幅+1.5。主照準維持0.5秒で威力+45%。","tags":["レーザー","照準維持","一度限り"],"params":{"laserPolaris":0.45},"stats":[["laserCount","add",3,null,"laserLimit"],["laserScale","add",1.1,null,null],["laserWidth","add",1.5,null,null]]},
{"id":"tacChargeBank","shipOnly":"charge","rarity":"uncommon","name":"安全蓄電器","desc":"ダッシュ中は蓄えたチャージを保持する。","tags":["チャージ","チャージ保持","回避","一度限り"],"params":{"chargeBank":1},"stats":[]},
{"id":"tacChargeMid","shipOnly":"charge","rarity":"uncommon","name":"中間解放リング","desc":"40〜85%チャージで放つ彗星は貫通+1。","tags":["チャージ","中間解放","貫通","一度限り"],"params":{"chargeMid":1},"stats":[]},
{"id":"tacChargeStride","shipOnly":"charge","rarity":"rare","name":"解放スラスター","desc":"最大チャージ解放後1秒、移動速度+8%。","tags":["チャージ","機動","一度限り"],"params":{"chargeStride":1},"stats":[]},
{"id":"tacChargeCover","shipOnly":"charge","rarity":"rare","name":"蓄電姿勢","desc":"静止して50%以上チャージ中、被ダメージ-5%（蓄電軽減は合計22%まで）。","tags":["チャージ","防御","一度限り"],"params":{"chargeCover":0.05},"stats":[]},
{"id":"tacChargeMobile","shipOnly":"charge","rarity":"power","name":"歩行蓄電炉","desc":"移動蓄電18%、チャージ速度補正+0.2。","tags":["チャージ","移動蓄電","一度限り"],"params":{"chargeMobile":0.18},"stats":[["chargeRate","add",0.2,null,null]]},
{"id":"tacChargeVent","shipOnly":"charge","rarity":"power","name":"解放回生器","desc":"最大HP+35。最大チャージ解放でダッシュ待機-0.3秒。1.5秒ごと。","tags":["チャージ","回避","一度限り"],"params":{"chargeVent":1},"stats":[["maxHp","add",35,null,null],["hp","add",35,null,null]]},
{"id":"tacChargeMidPower","shipOnly":"charge","rarity":"power","name":"臨界手前の彗星","desc":"チャージ貫通+2。40〜85%チャージの彗星威力+22%。","tags":["チャージ","中間解放","貫通","一度限り"],"params":{"chargeMidPower":0.22},"stats":[["chargePenetration","add",2,null,null]]},
{"id":"tacChargeAfterglow","shipOnly":"charge","rarity":"legendary","name":"彗星の離脱光","desc":"チャージ威力補正+0.65。最大解放後1.5秒、移動速度+15%。","tags":["チャージ","機動","一度限り"],"params":{"chargeAfterglow":1},"stats":[["chargeScale","add",0.65,null,null]]},
{"id":"tacChargeBastion","shipOnly":"charge","rarity":"legendary","name":"静星の蓄電殻","desc":"最大HP+70。静止して50%以上チャージ中、被ダメージ-18%（蓄電軽減は合計22%まで）。","tags":["チャージ","防御","一度限り"],"params":{"chargeBastion":0.18},"stats":[["maxHp","add",70,null,null],["hp","add",70,null,null]]},
{"id":"tacChargeFeather","shipOnly":"charge","rarity":"relic","name":"軽星の核","desc":"40〜85%チャージの彗星威力+35%、最大チャージでは-12%。","tags":["チャージ","中間解放","レリック","一度限り"],"params":{"chargeFeather":1},"stats":[]},
{"id":"tacChargeAnchor","shipOnly":"charge","rarity":"relic","name":"重星の核","desc":"最大チャージの彗星威力+40%、10%未満では-18%。","tags":["チャージ","チャージ保持","レリック","一度限り"],"params":{"chargeAnchor":1},"stats":[]},
{"id":"tacChargeMemory","shipOnly":"charge","rarity":"unique","name":"彗星の記憶炉","desc":"チャージ速度補正+0.6、威力補正+0.9、貫通+3。ダッシュで蓄電保持、終了後1.2秒は最大解放威力+60%。","tags":["チャージ","チャージ保持","ダッシュ反撃","一度限り"],"params":{"chargeBank":1,"chargeMemory":1},"stats":[["chargeRate","add",0.6,null,null],["chargeScale","add",0.9,null,null],["chargePenetration","add",3,null,null]]},
{"id":"tacDrillExit","shipOnly":"drill","rarity":"uncommon","name":"離脱ローター","desc":"ダッシュ終了後0.8秒、移動速度+8%。","tags":["ドリル","機動","一度限り"],"params":{"drillExit":1},"stats":[]},
{"id":"tacDrillMark","shipOnly":"drill","rarity":"uncommon","name":"接触マーカー","desc":"最後に接触した敵を1.2秒標識し、その敵への突進威力+6%。","tags":["ドリル","接触標識","突進","一度限り"],"params":{"drillMark":0.06},"stats":[]},
{"id":"tacDrillReserve","shipOnly":"drill","rarity":"rare","name":"回収プラズマ管","desc":"通常のプラズマ突進終了時、消費量の4%を回収。","tags":["ドリル","プラズマ回収","一度限り"],"params":{"drillReserve":0.04},"stats":[]},
{"id":"tacDrillRhythm","shipOnly":"drill","rarity":"rare","name":"接近リズム","desc":"接触命中でダッシュ待機-0.04秒。1秒ごと。","tags":["ドリル","近接","回避","一度限り"],"params":{"drillRhythm":1},"stats":[]},
{"id":"tacDrillFinish","shipOnly":"drill","rarity":"power","name":"突進後の回転刃","desc":"接触威力+20。ダッシュ終了後1.2秒、接触威力+22%。","tags":["ドリル","近接","ダッシュ反撃","一度限り"],"params":{"drillFinish":0.22},"stats":[["drillContact","add",20,null,null]]},
{"id":"tacDrillTag","shipOnly":"drill","rarity":"power","name":"刻印スピンドル","desc":"接触威力+20、最大HP+35。標識した敵への突進威力+22%。","tags":["ドリル","接触標識","突進","一度限り"],"params":{"drillTag":0.22},"stats":[["drillContact","add",20,null,null],["maxHp","add",35,null,null],["hp","add",35,null,null]]},
{"id":"tacDrillRelease","shipOnly":"drill","rarity":"power","name":"循環プラズマ炉","desc":"突進威力+50。通常の突進終了時、プラズマ消費量の12%を回収。","tags":["ドリル","プラズマ回収","突進","一度限り"],"params":{"drillRelease":0.12},"stats":[["drillDamage","add",50,null,null]]},
{"id":"tacDrillArmor","shipOnly":"drill","rarity":"legendary","name":"離脱装甲スピン","desc":"シールド+90、再充填+2.5/秒。ダッシュ終了後1秒、被ダメージ-18%。","tags":["ドリル","防御","回避","一度限り"],"params":{"drillArmor":0.18},"stats":[["shieldMax","add",90,null,null],["shield","add",90,null,null],["shieldRecharge","add",2.5,null,null]]},
{"id":"tacDrillHunter","shipOnly":"drill","rarity":"legendary","name":"刻星の回転槍","desc":"リーチ+30、突進威力+75。標識した敵への突進威力+35%。","tags":["ドリル","接触標識","突進","一度限り"],"params":{"drillHunter":0.35},"stats":[["drillReach","add",30,null,null],["drillDamage","add",75,null,null]]},
{"id":"tacDrillBrawler","shipOnly":"drill","rarity":"relic","name":"接近戦の軸受","desc":"接触威力+35%、突進威力-10%。","tags":["ドリル","近接","レリック","一度限り"],"params":{"drillBrawler":1},"stats":[]},
{"id":"tacDrillRunner","shipOnly":"drill","rarity":"relic","name":"通過戦の軸受","desc":"突進威力+35%、接触威力-10%。","tags":["ドリル","突進","レリック","一度限り"],"params":{"drillRunner":1},"stats":[]},
{"id":"tacDrillFlywheel","shipOnly":"drill","rarity":"unique","name":"不滅の循環軸","desc":"突進威力+220、蓄積速度+0.12、リーチ+25。消費量の18%を回収し、離脱後の接触威力+35%。","tags":["ドリル","プラズマ回収","近接","一度限り"],"params":{"drillFlywheel":1},"stats":[["drillDamage","add",220,null,null],["drillGain","add",0.12,null,null],["drillReach","add",25,null,null]]},
{"id":"tacDogRecall","shipOnly":"dog","rarity":"uncommon","name":"ほねっこ・よびもどし","desc":"ダッシュで飛行中の通常骨を帰還させる。","tags":["骨ブーメラン","捕球","回避","一度限り"],"params":{"dogRecall":1},"stats":[]},
{"id":"tacDogCatch","shipOnly":"dog","rarity":"uncommon","name":"ほねっこ・キャッチラン","desc":"通常骨の捕球後0.8秒、移動速度+6%。0.7秒ごと。","tags":["骨ブーメラン","捕球","機動","一度限り"],"params":{"dogCatch":1},"stats":[]},
{"id":"tacDogPiyo","shipOnly":"dog","rarity":"rare","name":"ぴよぴよ・捕球サイン","desc":"通常骨の捕球後1秒、卵の発射間隔-10%。","tags":["アニマル","ヒヨコ","捕球","一度限り"],"params":{"dogPiyo":1},"stats":[],"requires":"chicks"},
{"id":"tacDogHome","shipOnly":"dog","rarity":"rare","name":"ほねっこ・おうちの軌道","desc":"自機から140以内で、帰還中の通常骨の威力+6%。","tags":["骨ブーメラン","帰還軌道","一度限り"],"params":{"dogHome":0.06},"stats":[]},
{"id":"tacDogFlock","shipOnly":"dog","rarity":"power","name":"みんなで・キャッチコール","desc":"仲間威力補正+0.12。通常骨の捕球後1.5秒、仲間威力+18%。","tags":["アニマル","捕球","一度限り"],"params":{"dogFlock":0.18},"stats":[["dogAnimalBoost","add",0.12,null,null]],"requires":"animal"},
{"id":"tacDogRetrieve","shipOnly":"dog","rarity":"power","name":"ほねっこ・おみやげ便","desc":"最大HP+35。帰還中の通常骨が命中するとNOVA+0.5。0.8秒ごと。","tags":["骨ブーメラン","帰還軌道","ノヴァ","一度限り"],"params":{"dogRetrieve":1},"stats":[["maxHp","add",35,null,null],["hp","add",35,null,null]]},
{"id":"tacDogPounce","shipOnly":"dog","rarity":"power","name":"ほねっこ・かけっこリターン","desc":"骨威力補正+0.2。ダッシュ終了後1.2秒、通常骨の帰還威力+25%。","tags":["骨ブーメラン","帰還軌道","ダッシュ反撃","一度限り"],"params":{"dogPounce":0.25},"stats":[["dogBonePower","add",0.2,null,null]]},
{"id":"tacDogWelcome","shipOnly":"dog","rarity":"legendary","name":"おかえり・おまもり隊","desc":"シールド+60、再充填+2/秒。ダッシュ直後の捕球で待機-0.18秒とシールドを補給。","tags":["骨ブーメラン","捕球","防御","一度限り"],"params":{"dogWelcome":1},"stats":[["shieldMax","add",60,null,null],["shield","add",60,null,null],["shieldRecharge","add",2,null,null]]},
{"id":"tacDogLeader","shipOnly":"dog","rarity":"legendary","name":"みんなの・捕球応援団","desc":"仲間威力補正+0.3。通常骨の捕球後1.5秒、仲間威力+35%。","tags":["アニマル","捕球","一度限り"],"params":{"dogLeader":0.35},"stats":[["dogAnimalBoost","add",0.3,null,null]],"requires":"animal"},
{"id":"tacDogReturnDock","shipOnly":"dog","rarity":"relic","name":"ほねっこ・帰り道のしるし","desc":"通常骨の帰還威力+35%、往路威力-10%。","tags":["骨ブーメラン","帰還軌道","レリック","一度限り"],"params":{"dogReturnDock":1},"stats":[]},
{"id":"tacDogForward","shipOnly":"dog","rarity":"relic","name":"ほねっこ・出発のしるし","desc":"通常骨の往路威力+30%、帰還威力-15%。","tags":["骨ブーメラン","帰還軌道","レリック","一度限り"],"params":{"dogForward":1},"stats":[]},
{"id":"tacDogOrbit","shipOnly":"dog","rarity":"unique","name":"ほねっこ・みんなの帰る場所","desc":"骨+3本、威力補正+0.85、帰還補正+0.75。ダッシュで回収し、捕球後1.5秒は仲間威力+40%。","tags":["骨ブーメラン","捕球","アニマル","一度限り"],"params":{"dogRecall":1,"dogOrbit":0.4},"stats":[["dogBones","add",3,null,8],["dogBonePower","add",0.85,null,null],["dogBoneReturn","add",0.75,null,null]]}
];
const byId=new Map(cards.map(c=>[c.id,c]));
const animalSources=new Set(['dogEgg','blade','meteor','rock','missile','iceball','magma','pulseField','element','explosion']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function flags(p){return p?.tacticFlags;}
function state(p){if(!flags(p))return null;return p.tacticState||(p.tacticState={clock:0,moving:false,laserTarget:null,laserAge:0,switchUntil:-1,afterDashAt:-99,chargeStrideAt:-99,catchAt:-99,markUntil:-1,markEnemy:null,focusAt:-99,focusEnemy:null,focusHits:0,laserCycleAt:0,catchReadyAt:0,welcomeAt:0,energyAt:0,rhythmAt:0,ventAt:0,dashing:false,spent:0,volleyReady:false,volleyUntil:-1,nextCue:0,counters:{}});}
function count(s,key){s.counters[key]=(s.counters[key]||0)+1;}
function cue(s,text){if(s.clock>=s.nextCue){s.nextCue=s.clock+.8;s.cue=text;}}
function available(p,id){const c=byId.get(id);if(!c||p.shipType!==c.shipOnly)return false;if(c.requires==='chicks')return p.dogChicks>0;if(c.requires==='animal')return ['dogChicks','orbit','rocketCd','iceBallCount','rockWalls','spikeCount','boltCount','meteorCount','empRadius'].some(k=>p[k]>0);return true;}
function apply(p,id){const c=byId.get(id);if(!c)throw Error('Unknown tactical skill '+id);const next={...(flags(p)||{})};for(const[k,v]of Object.entries(c.params))next[k]=Math.max(next[k]||0,v);p.tacticFlags=next;root.AnkinArsenal.applyEffects(p,c.stats);return p;}
function lockDelay(f){return f.laserPolaris?.5:f.evolvedLaser?.6:.8;}
function tick(p,dt,moving){const f=flags(p);if(!f)return;const s=state(p);s.clock+=dt;s.moving=!!moving;
 if(s.laserTarget&&!s.laserTarget.dead)s.laserAge+=dt;else{s.laserAge=0;}
 if(p.shipType==='laser'&&(f.laserLock||f.laserTrack||f.laserCycle||f.laserBrace||f.laserPolaris)&&s.laserAge>=lockDelay(f)&&!s.lockCue){s.lockCue=true;count(s,'laserLock');cue(s,'照準維持');}
 if(f.laserCycle&&p.dashLeft>0&&s.laserAge>=1&&s.clock>=s.laserCycleAt){p.dashLeft=Math.max(0,p.dashLeft-.08);s.laserCycleAt=s.clock+4;count(s,'laserCycle');}
 if(s.dashing&&p.dashTime<=0){s.dashing=false;s.afterDashAt=s.clock;s.volleyUntil=s.clock+(f.evolvedShot?1.7:1.2);
  if(p.shipType==='drill'&&s.spent>0){const rate=Math.max(f.drillReserve||0,f.drillRelease||0,f.drillFlywheel?.18:0);if(rate){p.drillPlasma=Math.min(p.drillCap,p.drillPlasma+s.spent*rate);count(s,'plasmaReturn');cue(s,'プラズマ回収');}s.spent=0;}
 }
}
function onDash(p,shots){const f=flags(p);if(!f)return;const s=state(p);s.dashing=true;s.volleyReady=true;s.volleyUntil=s.clock+2;
 s.spent=p.shipType==='drill'&&p.drillOverdriveTime<=0&&p.drillPlasma/Math.max(.001,p.drillCap)>=.22?p.drillPlasma:0;
 if(p.shipType==='dog'&&f.dogRecall){let recalled=0;for(const b of shots){if(b.kind==='bone'&&!b.novaBone&&b.ttl>0&&!b.returning){b.returning=true;b.hit.clear();recalled++;}}if(recalled){count(s,'recall');cue(s,'よびもどし');}}
}
function shotVolley(p){const f=flags(p);if(!f)return null;const s=state(p),out={damage:1,speed:1,pierce:0};
 if(f.shotSlip&&s.clock-s.afterDashAt<1)out.speed=1.15;
 if(s.volleyReady&&p.dashTime<=0&&s.clock<=s.volleyUntil){s.volleyReady=false;out.pierce=Math.min(f.evolvedShot?4:3,(f.shotPierce||0)+(f.shotLane?2:0)+(f.shotNeedle?3:0)+(f.shotStar?2:0)+(f.evolvedShot?1:0));out.damage=1+Math.min(.8,(f.shotRearm||0)+(f.shotStar||0)+(f.shotNeedle?.35:0));if(out.pierce||out.damage>1){count(s,'counterVolley');cue(s,'反撃射撃');}}
 return out;
}
function laserTarget(p,target){if(!flags(p))return;const s=state(p);if(target===s.laserTarget)return;if(s.laserTarget&&target)s.switchUntil=s.clock+.45;s.laserTarget=target;s.laserAge=0;s.lockCue=false;}
function chargeFire(p,q,nova){const f=flags(p);if(!f||nova)return null;const s=state(p),mid=q>=.4&&q<=.85,full=q>=.995;let bonus=mid?(f.chargeMidPower||0)+(f.chargeFeather?.35:0):0;
 if(full){if(f.chargeFeather)bonus-=.12;if(f.chargeAnchor)bonus+=.4;if(f.chargeMemory&&s.clock-s.afterDashAt<1.2)bonus+=.6;
  if(f.chargeStride||f.chargeAfterglow){s.chargeStrideAt=s.clock;cue(s,'解放加速');}
  if(f.chargeVent&&s.clock>=s.ventAt){p.dashLeft=Math.max(0,p.dashLeft-.3);s.ventAt=s.clock+(f.evolvedCharge?1:1.5);count(s,'chargeVent');}
 }
 if(q<.1&&f.chargeAnchor)bonus-=.18;if(mid&&f.chargeMid)count(s,'middleRelease');
 return {damage:clamp(1+bonus,.7,1.8),pierce:mid&&f.chargeMid?1:0};
}
function holdsCharge(p){const f=flags(p);return !!(f?.chargeBank&&p.dashTime>0);}
function mobileCharge(p){const f=flags(p);return Math.max(p.relicChargeMomentum?.25:0,f?.chargeMobile||0);}
function onContact(p,e){const f=flags(p);if(!f)return;const s=state(p);s.markEnemy=e;s.markUntil=s.clock+(f.evolvedDrill?2:1.2);
 if(f.drillRhythm&&s.clock>=s.rhythmAt){p.dashLeft=Math.max(0,p.dashLeft-.04);s.rhythmAt=s.clock+1;count(s,'contactRhythm');}
}
function onCatch(p,b){const f=flags(p);if(!f||b.novaBone)return;const s=state(p);if(s.clock<s.catchReadyAt)return;s.catchReadyAt=s.clock+.7;s.catchAt=s.clock;count(s,'catch');
 if(f.dogCatch||f.dogPiyo||f.dogFlock||f.dogLeader||f.dogOrbit)cue(s,'捕球連携');
 if(f.dogWelcome&&s.clock-s.afterDashAt<1.2&&s.clock>=s.welcomeAt){s.welcomeAt=s.clock+(f.evolvedDog?2:2.5);p.dashLeft=Math.max(0,p.dashLeft-.18);p.shield=Math.min(p.shieldMax,p.shield+Math.min(f.evolvedDog?16:12,p.shieldMax*.1));count(s,'welcome');cue(s,'おかえり');}
}
function damageMultiplier(p,e,meta={},giveEnergy=null){const f=flags(p);if(!f||meta.dot)return 1;const s=state(p);let bonus=0;
 if(p.shipType==='shot'&&meta.tacticalPrimary){const d=Math.hypot(p.x-e.x,p.y-e.y);if(d>=260)bonus+=(f.shotFar||0)+(f.shotLong?.3:0);if(d<=150)bonus+=(f.shotNear||0)-(f.shotLong?.1:0);if(f.shotNeedle)bonus-=.08;if(s.moving)bonus+=f.shotStrafe||0;if(e.hp>=e.maxHp*.75)bonus+=f.shotOpener||0;
  if(f.shotFocus){s.focusHits=s.focusEnemy===e&&s.clock-s.focusAt<=.8?Math.min(6,s.focusHits+1):1;s.focusEnemy=e;s.focusAt=s.clock;bonus+=s.focusHits*.02;}
 }
 if(p.shipType==='laser'&&meta.source==='laser'){const d=Math.hypot(p.x-e.x,p.y-e.y),locked=s.laserTarget===e&&s.laserAge>=lockDelay(f);if(locked){bonus+=(f.laserLock||0)+(f.laserTrack||0)+(f.laserPolaris||0);if(f.laserLock||f.laserTrack||f.laserPolaris)count(s,'laserLockedHit');}if(s.moving)bonus+=f.laserGlide||0;if(d<=180)bonus+=(f.laserClose||0)-(f.laserLong?.12:0);if(d>=300&&f.laserLong)bonus+=.3;if(s.clock<=s.switchUntil)bonus+=(f.laserSwitch||0)+(f.laserPulse?.4:0);if(f.laserPulse&&s.laserTarget===e&&s.laserAge>=1.2)bonus-=.1;if(s.clock-s.afterDashAt<1.5)bonus+=f.laserWake||0;if(e.hp<=e.maxHp*.4)bonus+=f.laserFinish||0;}
 if(p.shipType==='drill'&&meta.source==='drill'){
  if(meta.tacticalRush){if(s.markEnemy===e&&s.clock<=s.markUntil)bonus+=(f.drillMark||0)+(f.drillTag||0)+(f.drillHunter||0);bonus+=(f.drillRunner?.35:0)-(f.drillBrawler?.1:0);}
  else if(meta.tacticalContact){if(s.clock-s.afterDashAt<1.2)bonus+=(f.drillFinish||0)+(f.drillFlywheel?.35:0);bonus+=(f.drillBrawler?.35:0)-(f.drillRunner?.1:0);}
 }
 if(p.shipType==='dog'){
  if(meta.source==='bone'){
   if(meta.tacticalReturning){if(Math.hypot(p.x-e.x,p.y-e.y)<=140)bonus+=f.dogHome||0;if(s.clock-s.afterDashAt<1.2)bonus+=f.dogPounce||0;bonus+=(f.dogReturnDock?.35:0)-(f.dogForward?.15:0);
    if(!meta.tacticalExtra&&f.dogRetrieve&&s.clock>=s.energyAt){s.energyAt=s.clock+.8;if(giveEnergy)giveEnergy(.5,'tactic');else p.energy=Math.min(100,p.energy+.5);count(s,'returnEnergy');}
   }else bonus+=(f.dogForward?.3:0)-(f.dogReturnDock?.1:0);
  }else if(animalSources.has(meta.source)&&s.clock-s.catchAt<(f.evolvedDog?2.2:1.5))bonus+=Math.max(f.dogFlock||0,f.dogLeader||0,f.dogOrbit||0);
 }
 const multiplier=clamp(1+bonus,.7,1.8);return meta.tacticalPrimary?Math.min(multiplier,1.8/Math.max(1,meta.tacticalVolleyFactor||1)):multiplier;
}
function speedMultiplier(p){const f=flags(p);if(!f)return 1;const s=state(p);let bonus=0;if(p.shipType==='charge'){if(f.chargeAfterglow&&s.clock-s.chargeStrideAt<1.5)bonus=f.evolvedCharge?.2:.15;else if(f.chargeStride&&s.clock-s.chargeStrideAt<1)bonus=.08;}if(p.shipType==='drill'&&f.drillExit&&s.clock-s.afterDashAt<.8)bonus=.08;if(p.shipType==='dog'&&f.dogCatch&&s.clock-s.catchAt<.8)bonus=.06;return 1+bonus;}
function incomingMultiplier(p){const f=flags(p);if(!f)return 1;const s=state(p);let reduction=0;if(p.shipType==='charge'&&p.chargeStationary&&p.charge>=.5&&p.dashTime<=0)reduction=(f.chargeCover||0)+(f.chargeBastion||0);if(p.shipType==='drill'&&s.clock-s.afterDashAt<1)reduction=Math.max(f.drillArmor||0,f.evolvedDrill&&s.clock-s.afterDashAt<.8?.08:0);return 1-Math.min(.22,reduction);}
function shieldMultiplier(p){const f=flags(p);if(!f?.laserBrace)return 1;const s=state(p);return p.shipType==='laser'&&s.moving&&s.laserAge>=lockDelay(f)?(f.evolvedLaser?1.75:1.5):1;}
function eggMultiplier(p){const f=flags(p);return f?.dogPiyo&&state(p).clock-state(p).catchAt<1?.9:1;}
function pollCue(p){if(!flags(p))return null;const s=state(p),v=s.cue;s.cue=null;return v;}
function metrics(p){return p.tacticState?{...p.tacticState.counters}:{};}
const tagGuides={
 'ダッシュ反撃':{name:'ダッシュ反撃',desc:'ダッシュを終えてからの攻撃に短い強化窓を作る、機体固有の連携です。',details:['ショットの装填は終了後1.2秒以内の主砲1斉射だけ。進化後は1.7秒。','後方弾・補助弾・NOVAは反撃装填を消費しません。条件付き威力は合計1.8倍まで。','追加貫通は合計+3まで。星路の逆襲へ進化後は+4まで。','ダッシュ反撃タグの各カードは、主砲・彗星・接触攻撃・帰還骨をそれぞれ強化します。']},
 '照準維持':{name:'主照準の維持',desc:'最初の照射器が同じ敵を追い続けると成立する、位置取り向けの強化です。',details:['通常は0.8秒。光学城の進化後は0.6秒、ポラリス所持時は0.5秒。','遮蔽や標的変更で蓄積を失います。維持威力は主照準の敵だけが対象です。','照準維持タグの強化対象は、最初の照射器が照準している敵です。']},
 '照準切替':{name:'主照準の切替',desc:'すでに照準していた敵から別の敵へ切り替えることで、短い強化を得ます。',details:['切替後の強化は0.45秒。最初に敵を捕捉しただけでは発動しません。','転光プリズムは切替に強く、同じ主照準を1.2秒維持すると威力が下がります。','照準切替タグは、敵を倒した後に別の敵を捉えた場合にも発動します。']},
 'チャージ保持':{name:'チャージ保持',desc:'蓄電したままダッシュで危険を離れ、次の停止や解放につなげる機構です。',details:['保持中のダッシュでは追加の蓄電をしません。','ダッシュ終了後、動き続ければ解放し、停止すれば蓄電を再開します。','チャージ保持タグは通常の蓄電が対象。NOVA・追撃彗星は保持できません。']},
 '移動蓄電':{name:'移動中の蓄電',desc:'移動中も蓄電を進め、停止チャージと組み合わせて解放位置を選べます。',details:['歩行蓄電炉は通常の18%の速度で蓄電します。','既存のモーション・キャパシターの25%とは加算せず、高い方を使います。','移動蓄電タグの蓄電速度は、停止時のチャージ速度を基準にします。']},
 '中間解放':{name:'中間チャージの解放',desc:'40〜85%の蓄電で解放する主彗星を強化し、待ち時間と射線を選び分けます。',details:['40%と85%を含みます。最大解放や連射する小弾は対象外です。','条件付き威力は複数取得でも最大1.8倍。NOVA・追撃には乗りません。','中間解放タグは、最大解放を待たずに射線へ弾を通す連携に向いています。']},
 '接触標識':{name:'接触標識',desc:'最後に接触攻撃を命中させた1体を記憶し、その敵への突進を強化します。',details:['標識は通常1.2秒、刻星の再突入へ進化後は2秒です。','別の敵へ接触すると標識が移ります。画面内の全敵を強化する効果ではありません。','接触標識タグは、接触した敵への再突入に向いています。']},
 'プラズマ回収':{name:'消費プラズマの回収',desc:'通常のプラズマ突進が終わると、実際に消費した量の一部を戻します。',details:['4%・12%・18%は加算せず、最も高い回収率を使います。','NOVAのオーバードライブ中には消費量がないため回収しません。','プラズマ回収タグは突進終了時に作用し、回収量はプラズマ上限までです。']},
 '捕球':{name:'骨の捕球連携',desc:'帰還した通常骨を自機で受け取り、移動・卵・仲間の連携へつなぎます。',details:['同時に多数の骨を受けても0.7秒に1回だけ発動。NOVAの骨は対象外です。','仲間の威力強化は1.5秒、進化後2.2秒。同系の威力強化は最も高い値を使います。','帰還補給はダッシュ終了後1.2秒以内。2.5秒ごと、最大シールドの10%（上限12、進化後16）を補給します。','捕球タグの効果は通常骨を受け取った直後に発動します。']},
 '帰還軌道':{name:'帰還する骨の軌道',desc:'往路と帰路の違いを使い、自機の位置や回収時機で命中経路を選ぶ強化です。',details:['ダッシュで呼び戻せるのは飛行中の通常骨だけです。','帰還時のNOVA獲得は0.8秒に1回まで。帰還威力の追加分で重複獲得しません。','帰還軌道タグの威力補正は、現在の骨の往路・帰路に応じて判定します。']}
};
function tagDetails(tag){const x=tagGuides[tag];return x?{...x,details:[...x.details]}:null;}
function evolve(p,ship){p.tacticFlags={...(flags(p)||{}),['evolved'+ship[0].toUpperCase()+ship.slice(1)]:1};}
for(const c of cards){Object.freeze(c.params);for(const s of c.stats)Object.freeze(s);Object.freeze(c.stats);Object.freeze(c.tags);Object.freeze(c);}
root.AnkinTactics=Object.freeze({cards:Object.freeze(cards),available,apply,tick,onDash,shotVolley,laserTarget,chargeFire,holdsCharge,mobileCharge,onContact,onCatch,damageMultiplier,speedMultiplier,incomingMultiplier,shieldMultiplier,eggMultiplier,pollCue,metrics,evolve,tagDetails});
})(globalThis);
