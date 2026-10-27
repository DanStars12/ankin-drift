/* ANKIN DRIFT — PERSONAL ENDING v13.2
 * Pure, deterministic clear-identity generator. All output is based on actual
 * final-run facts, and the generated result is serialized at victory time.
 * No Math.random or current-time dependency. */
(function(root){
'use strict';
const SHIPS={
 shot:{name:'PULSE STRIKER',jp:'ショット型',epithet:'弾幕の航行者',weapon:'無数の弾丸'},
 laser:{name:'PRISM LANCER',jp:'レーザー型',epithet:'光条の狙撃手',weapon:'光の軌跡'},
 charge:{name:'COMET RAIDER',jp:'チャージ型',epithet:'彗星の砲撃手',weapon:'溜め込んだ一撃'},
 drill:{name:'PLASMA DRILL',jp:'プラズマドリル型',epithet:'鋼の突破者',weapon:'燃える刃先'},
 dog:{name:'BONE BUDDY β',jp:'ドッグ型',epithet:'アニマルの指揮官',weapon:'仲間と骨ブーメラン'}
};
const ELEMENTS={
 fire:{name:'炎',title:'紅蓮',scene:'焔の残光'},
 ice:{name:'氷',title:'氷晶',scene:'氷片の煌めき'},
 thunder:{name:'雷',title:'雷鳴',scene:'閃雷の残響'},
 wind:{name:'風',title:'疾風',scene:'旋風の輪郭'},
 rock:{name:'岩',title:'巌壁',scene:'砕けた岩の粒子'}
};
const SOURCE={
 dogEgg:'チック・タックの卵',bone:'骨ブーメラン',shot:'通常ショット',laser:'レーザー',charge:'チャージ弾',drill:'近接ドリル',nova:'NOVA',
 dot:'燃焼DoT',magma:'マグマ',element:'属性攻撃',drone:'僚機',
 missile:'ミサイル',iceball:'アイスボール',pulseField:'電磁パルス',meteor:'貫通隕石',blade:'旋回ブレード',rock:'岩壁',explosion:'爆発',other:'複合攻撃'
};
const STYLES={
 near_death:{name:'死線の生還者',lead:'消えかけた機体の灯を守り抜き',close:'残りわずかな力が、最後の勝利を引き寄せた。'},
 revived:{name:'不死鳥の継承者',lead:'一度崩れかけた戦線から立ち上がり',close:'蘇った翼は、ついに終焉を乗り越えた。'},
 untouched:{name:'無傷の伝説',lead:'最後まで致命的な被弾を許さず',close:'研ぎ澄まされた操縦が、静かな勝利を刻んだ。'},
 nova:{name:'星砕きの閃光',lead:'NOVAの光で包囲を切り裂き',close:'決戦の光は、すべての敵影を飲み込んだ。'},
 dash:{name:'閃避の達人',lead:'幾度もの加速と回避で戦場を渡り',close:'その軌跡を、誰も捉えることはできなかった。'},
 drone:{name:'星群の指揮官',lead:'随伴機と連携して戦場を制圧し',close:'仲間たちの光が一つの勝利に結ばれた。'},
 burn:{name:'灼熱の支配者',lead:'燃え続ける炎で敵陣を追い込み',close:'戦いの後にも、赤い熱だけが残った。'},
 area:{name:'大地の制圧者',lead:'広がる属性領域で進路を作り',close:'戦場そのものが勝利の証人となった。'},
 bombard:{name:'一撃の決定者',lead:'積み上げた火力を決定打に変え',close:'渾身の一撃が、長い戦いを終わらせた。'},
 barrage:{name:'弾幕の覇者',lead:'絶え間ない連射で道を開き',close:'星々を埋め尽くす弾幕が終焉を押し返した。'},
 laser:{name:'光線の覇者',lead:'敵の隙を正確な光線で射抜き',close:'まっすぐな光が、暗闇を貫いた。'},
 drill:{name:'近接の猛者',lead:'危険な距離から離れずに突破し',close:'鋼の一閃が、絶望を切り裂いた。'},
 storm:{name:'殲滅の覇者',lead:'次々と押し寄せる敵を退け',close:'尽きぬ敵の波の先で、勝利を掴み取った。'},
 endurance:{name:'不屈の守護者',lead:'幾度も衝撃を受け止めながら',close:'傷跡の一つひとつが生還の証になった。'},
 iceball:{name:'氷晶の名手',lead:'無数の氷晶を撃ち放ち',close:'冷たい光が戦いの結末を告げた。'},
 pulse:{name:'雷円の守り手',lead:'自機の周囲に雷の陣を敷き',close:'円環の雷が勝利を刻んだ。'},
 meteor:{name:'隕石の先導者',lead:'成長する隕石で道を切り開き',close:'長く続いた戦場に新しい軌跡が残った。'},
 dogfetch:{name:'ボーン・マスター',lead:'往復する骨ブーメランを自在に操り',close:'帰ってきた骨と仲間たちが、勝利を運んできた。'},
 dogpack:{name:'アニマルたちのリーダー',lead:'大切な動物の仲間たちと息を合わせ',close:'あたたかな足あとが、銀河に新しい物語を残した。'},
 adaptive:{name:'戦場の開拓者',lead:'多彩な武装を組み合わせて道を開き',close:'選び抜いた戦術が、その結末を導いた。'}
};
const sane=(v,max=1e12)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):0;
const str=(v,max=90)=>typeof v==='string'?v.slice(0,max):'';
const arr=v=>Array.isArray(v)?v:[];
const keys=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function normalize(source){
 const o=keys(source),ship=Object.hasOwn(SHIPS,o.ship)?o.ship:'shot',damageStats={};
 for(const [k,v] of Object.entries(keys(o.damageStats)))if(Object.hasOwn(SOURCE,k))damageStats[k]=sane(v);
 const fusions=arr(o.fusionIds).filter(x=>typeof x==='string'&&/^(fire|ice|thunder|wind|rock)_(fire|ice|thunder|wind|rock)$/.test(x)).slice(0,2);
 const elements={};for(const id of Object.keys(ELEMENTS))elements[id]=sane(keys(o.elementAffinities)[id],1e4);
 return {ship,mode:o.mode==='challenge'?'challenge':'normal',endless:!!o.endless,
  clearCount:Math.max(1,Math.floor(sane(o.clearCount,1e5))),
  level:Math.floor(sane(o.level,1e7)),seconds:Math.floor(sane(o.seconds,1e8)),
  damage:sane(o.damage),kills:Math.floor(sane(o.kills,1e8)),damageStats,
  fusionIds:fusions,elementAffinities:elements,evolutionIds:arr(o.evolutionIds).map(x=>str(x,70)).slice(0,20),
  evolutionNames:arr(o.evolutionNames).map(x=>str(x,90)).slice(0,8),
  relicNames:arr(o.relicNames).map(x=>str(x,90)).slice(0,8),
  featuredSkills:arr(o.featuredSkills).map(x=>str(x,90)).slice(0,6),
  dashCount:Math.floor(sane(o.dashCount,1e7)),novaCount:Math.floor(sane(o.novaCount,1e7)),
  hits:Math.floor(sane(o.hits,1e7)),revives:Math.floor(sane(o.revives,1e7)),
  hpPercent:sane(o.hpPercent,100),shieldPercent:sane(o.shieldPercent,100),
  damageTaken:sane(o.damageTaken),finisherSource:Object.hasOwn(SOURCE,o.finisherSource)?o.finisherSource:'',
  challenges:arr(o.challenges).filter(x=>['fragile','onslaught','armored'].includes(x)).slice(0,3)};
}
function chooseStyle(s,primary,share){
 if(s.revives>0)return 'revived';
 if(s.hits>0&&s.hpPercent<=15)return 'near_death';
 if(s.hits===0)return 'untouched';
 if(primary==='nova'&&share>=.22&&s.novaCount>=3)return 'nova';
 // A dash-focused victory needs sustained movement, not a few routine dodges over 30 minutes.
 if(s.dashCount>=Math.max(24,Math.floor(s.seconds/60*1.5))&&s.dashCount>=s.hits*2)return 'dash';
 if(s.ship==='dog'&&primary==='bone'&&share>=.25)return 'dogfetch';
 if(s.ship==='dog'&&primary==='dogEgg'&&share>=.25)return 'dogpack';
 if(primary==='drone'&&share>=.28)return 'drone';
 if(primary==='iceball'&&share>=.28)return 'iceball';
 if(primary==='pulseField'&&share>=.28)return 'pulse';
 if(primary==='meteor'&&share>=.28)return 'meteor';
 if(['dot','magma'].includes(primary)&&share>=.30)return 'burn';
 if(['rock','element','blade'].includes(primary)&&share>=.4)return 'area';
 if(primary==='charge'&&share>=.4)return 'bombard';
 if(primary==='shot'&&share>=.42)return 'barrage';
 if(primary==='laser'&&share>=.42)return 'laser';
 if(primary==='drill'&&share>=.42)return 'drill';
 if(s.kills>=1800)return 'storm';
 if(s.hits>=15)return 'endurance';
 return 'adaptive';
}
function elementSignature(s){
 if(!s.fusionIds.length){
  const strongest=Object.entries(s.elementAffinities).sort((a,b)=>b[1]-a[1])[0];
  if(strongest?.[1]>0){const el=ELEMENTS[strongest[0]];return {title:el.title+'の操者',scene:el.scene,label:'属性スキル：'+el.name,pairs:[]};}
  return {title:'',scene:'',label:'属性スキルなし',pairs:[]};
 }
 const pairs=s.fusionIds.map(id=>{
  const [main,sub]=id.split('_'),a=ELEMENTS[main],b=ELEMENTS[sub];
  return {id,main,sub,label:a.name+' × '+b.name,
   signature:a.title+'を核とした'+b.name+'の共鳴'};
 });
 if(pairs.length>=2)return {
  title:'双極の'+ELEMENTS[pairs[0].main].title+'と'+ELEMENTS[pairs[1].main].title,
  scene:ELEMENTS[pairs[0].main].scene+'と'+ELEMENTS[pairs[1].main].scene,
  label:pairs.map(x=>x.label).join(' / '),pairs};
 const p=pairs[0];
 return {title:ELEMENTS[p.main].title+'の'+ELEMENTS[p.sub].name+'使い',
  scene:ELEMENTS[p.main].scene,label:p.label,pairs};
}
function create(source){
 const s=normalize(source),ship=SHIPS[s.ship],
  all=Object.entries(s.damageStats).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),
  total=all.reduce((sum,[,v])=>sum+v,0),
  primary=all[0]?.[1]>0?all[0][0]:'other',
  percent=total>0?Math.round(all[0][1]/total*100):0,
  styleId=chooseStyle(s,primary,total>0?all[0][1]/total:0),
  style=STYLES[styleId],elem=elementSignature(s),
  sourceLabel=SOURCE[primary],finisherLabel=s.finisherSource?SOURCE[s.finisherSource]:null,
  motif=elem.title||ship.epithet,
  title=elem.title?motif+'・'+style.name+'・'+ship.epithet:style.name+'・'+ship.epithet,
  intense=s.clearCount>1?'終焉は再び現れた。それでも、':'長い戦いの果て、',
  route=s.mode==='challenge'?'高速の試練を越えた。':'最後の戦場を越えた。',
  details=s.evolutionNames.length?'進化合成「'+s.evolutionNames.slice(0,2).join('」「')+'」の力を携え、':
   s.relicNames.length?'レリック「'+s.relicNames[0]+'」と共に、':'',
  prose=intense+details+style.lead+'、'+ship.weapon+'と'+
   (elem.scene||'星の残光')+'が'+ 'THE・END・OF・ANKINを打ち破った。'+
   style.close+route,
  why=[
   '機体：'+ship.name,
   '戦闘：'+style.name,
   '主力：'+sourceLabel+' '+percent+'%',
   ...(elem.pairs.length?['属性融合：'+elem.label]:elem.title?['属性特化：'+elem.label]:[]),
   ...(s.evolutionNames.length?['進化：'+s.evolutionNames.slice(0,2).join(' / ')]:[]),
   ...(s.hits===0?['被弾なし']:s.revives?['復活 '+s.revives+'回']:s.hpPercent<=15?['残HP '+Math.round(s.hpPercent)+'%']:[]),
   ...(s.challenges.length?['追加試練：'+s.challenges.length+'件']:[])
  ],
  summary='主力 '+sourceLabel+' '+percent+'% ／ '+(elem.title?elem.label+' ／ ':'')+
   (finisherLabel?'決め手 '+finisherLabel:'撃破時の攻撃種別は未記録');
 return {version:1,styleId,styleName:style.name,title:title.slice(0,88),
  story:prose.slice(0,520),summary:summary.slice(0,190),why:why.slice(0,8),
  primarySource:primary,primaryPercent:percent,finisherSource:s.finisherSource,
  elementLabel:elem.label,frameName:ship.name,
  metrics:{kills:s.kills,remainingHpPct:Math.round(s.hpPercent),
   dashCount:s.dashCount,novaCount:s.novaCount,hits:s.hits,revives:s.revives,
   damageTaken:Math.round(s.damageTaken),damageStats:s.damageStats},
  evolutionNames:s.evolutionNames,featuredSkills:s.featuredSkills,
  relicNames:s.relicNames,
  fusionIds:s.fusionIds};
}
root.AnkinEnding={create,sourceNames:SOURCE,styles:STYLES,ships:SHIPS,elements:ELEMENTS};
})(globalThis);