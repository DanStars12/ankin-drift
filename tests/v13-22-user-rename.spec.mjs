import {test,expect} from '@playwright/test';
const requested={
  "dogEggTempo": "コッコ・リズム",
  "dogHurricanePlus": "いるかのしぶきジャンプ",
  "dogCatFort": "にゃんこ・おまもり隊",
  "dogHamMeteor": "ころころ・ハムスターメテオ",
  "dogHedgehog": "びりびり・ハリネズミ",
  "dogPwrRabbit": "雪うさぎの行進",
  "dogPwrCat": "にゃんこのおしろ",
  "dogPwrLava": "ぽかぽかにくきゅう",
  "dogLegendRabbit": "雪うさぎの大行進",
  "dogUniquePack": "アニマルわくわくパラダイス",
  "dogRelicFox": "こんこん・きつね火のおたから",
  "dogRelicDolphin": "いるかのみんな集合",
  "dogHareFocus": "ぴょんと・野ウサギ行進",
  "dogHareFissure": "ぴょんぴょん・うさぎ耳",
  "dogHarePower": "ぴょんぴょんフロスト・ヘア",
  "dogSnakePower": "へびさんのビリビリハウス",
  "dogHareLegend": "まんまる・うさぎのおうさま",
  "dogSnakeLegend": "ぴかぴか・だいじゃおう",
  "dogMutMoon": "おつきさま・ムーンラビット行進",
  "dogMutNineTail": "こんこん・九尾のちから",
  "dogMutHam": "ころころ・ギガハム・スターメテオ",
  "dogLegendBoneKing": "ほねっこのおうさま",
  "dogLegendFlockWard": "ぴよぴよ・おまもり大隊",
  "dogRelicWhaleFlute": "くじらさんの潮吹き",
  "dogRelicFoxTalisman": "きつねさんのおふだ",
  "dogRelicReturnBone": "ほねっこ・おかえりブーメラン",
  "dogEndEggCare": "たまごのお世話係",
  "dogEndGuard": "おさんぽ・おまもり隊",
  "dogEndFoxEmber": "こんこん・きつね火の追い風",
  "dogEndHedgeGlow": "ぱちぱち・ハリネズミ応援団",
  "dogEndMutation": "みんなのきずな",
  "dogFoxPaw": "こんこん・肉球マーク",
  "dogRabbitHedge": "びりびり・ぴょんぴょん",
  "dogFoxEvo": "きゅうびの・フォックスストーム",
  "dogHareEvo": "ムーンシャドウ・フロストヘア",
  "dogWindWake": "あおいうみの輪舞",
  "dogWhaleDuet": "うみなりのうた",
  "dogFoxPawTrail": "きつね火の足跡",
  "dogNineTailFire": "九尾のほのお",
  "dogRabbitMoon": "雪原の大ジャンプ",
  "dogMoonTracks": "ムーンシャドウ・スキップ",
  "dogSnakeHedge": "かみなりのキバ",
  "dogViperChain": "キング・サンダースネーク",
  "dogHamCatShield": "ごろごろキャッスル",
  "dogBoneMoon": "月まで届け！",
  "dogWhaleArmor": "ハム・スターホエール",
  "dogMoonApex": "永月・フロストヘア",
  "dogViperApex": "おおあらしのだいじゃ",
  "dogFoxApex": "いなりのかみさま",
  "dogHamApex": "ちいさなおうさま"
};
const anchor="document.body.classList.toggle('pilot-mobile',controlMode==='mobile');state('menu');requestAnimationFrame(frame);\n})();";
const hook="window.__v1322={\n definitions(){return {\n  cards:ALL_SKILL_DEFS().filter(c=>c.shipOnly==='dog').map(c=>({id:c.id,name:c.name,rarity:c.rarity,effect:typeof c.apply,tagCount:c.tags.length})),\n  recipes:[...SYNERGIES,...FUSIONS].filter(c=>c.shipOnly==='dog').map(c=>({id:c.id,name:c.name,requirements:c.need||[c.power,c.legend,...(c.required||[])]}))\n };},\n tags(){return [...new Set(ALL_SKILL_DEFS().flatMap(c=>c.tags||[]))].map(t=>({tag:t,...attrDetails(t)}));},\n sampleSnake(form){\n  const c=document.createElement('canvas');c.width=180;c.height=110;\n  const g=c.getContext('2d',{willReadFrequently:true}),p={dogViper:form!=='normal',dogViperAscended:form==='apex'};\n  g.globalAlpha=.78;g.lineWidth=3;const before={alpha:g.globalAlpha,width:g.lineWidth,tf:g.getTransform().toString()};\n  drawDogLightningSnake(p,{x:20,y:55,x2:116,y2:55,life:.33},g,1);\n  const after={alpha:g.globalAlpha,width:g.lineWidth,tf:g.getTransform().toString()};\n  const img=g.getImageData(0,0,c.width,c.height).data;let hash=0,pixels=0;\n  for(let i=0;i<img.length;i+=4){hash=(Math.imul(hash,33)+img[i]+img[i+1]*3+img[i+2]*5+img[i+3])>>>0;if(img[i+3]>5)pixels++;}\n  return {before,after,hash,pixels,face:Array.from(g.getImageData(130,55,1,1).data)};\n },\n snapshot(){return JSON.stringify({ship:selectedShip,skills:game?.skills,legends:game?.legends,powers:game?.powers,save:AnkinArchive.exported()});}\n};";
async function open(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/ankin-drift/',async route=>{
  const res=await route.fetch(),html=await res.text();expect(html.includes(anchor)).toBe(true);
  await route.fulfill({response:res,body:html.replace(anchor,hook+'\n'+anchor)});
 });
 await page.goto('./');await page.locator('#openTitleLab').click();return errors;
}
test('all 50 exact user-requested DOG names apply to their stable IDs',async({page})=>{
 const errors=await open(page),data=await page.evaluate(()=>window.__v1322.definitions());
 const cards=Object.fromEntries(data.cards.map(c=>[c.id,c]));
 const recipes=Object.fromEntries(data.recipes.map(c=>[c.id,c]));
 expect(Object.keys(requested)).toHaveLength(50);
 expect(data.cards).toHaveLength(75);
 expect(new Set(data.cards.map(c=>c.id)).size).toBe(75);
 expect(new Set(data.cards.map(c=>c.name)).size).toBe(75);
 let countCards=0,countRecipes=0;
 for(const [id,name] of Object.entries(requested)){
  const actual=cards[id]||recipes[id];
  expect(actual,'missing stable ID '+id).toBeTruthy();
  expect(actual.name,id).toBe(name);
  if(cards[id]){countCards++;expect(cards[id].effect).toBe('function');expect(cards[id].tagCount).toBeGreaterThan(0);expect(cards[id].rarity).toBeTruthy();}
  else{countRecipes++;expect(recipes[id].requirements.length).toBeGreaterThanOrEqual(2);}
 }
 expect({countCards,countRecipes}).toEqual({countCards:31,countRecipes:19});
 expect(errors).toEqual([]);
});
test('no tag details print specific skill examples or example-count entries',async({page})=>{
 const errors=await open(page),tags=await page.evaluate(()=>window.__v1322.tags());
 expect(tags.length).toBeGreaterThan(45);
 for(const t of tags){
  expect(t.desc.length,t.tag).toBeGreaterThan(20);
  expect(t.details.length,t.tag).toBeGreaterThanOrEqual(3);
  expect(t.details.join('\n'),t.tag).not.toContain('具体例｜');
  expect(t.details.join('\n'),t.tag).not.toContain('例は最大');
  expect(t.details.join('\n'),t.tag).not.toContain('このタグを持つスキル：');
 }
 const enduring=tags.find(t=>t.tag==='継戦');
 expect(enduring.details.join(' ')).toContain('Lv20');
 expect(enduring.details.join(' ')).toContain('600秒');
 await page.locator('[data-tab="atlas"]').click();
 await page.locator('#atlasAttr').selectOption('継戦');
 await page.locator('[data-atlas-card="dogEndBoneTorque"] [data-attr-peek="継戦"]').click();
 await expect(page.locator('.attr-stats')).not.toContainText('具体例');
 expect(errors).toEqual([]);
});
test('soft snake face keeps the tongue and canvas state; gallery never changes gameplay',async({page},testInfo)=>{
 const errors=await open(page);
 const before=await page.evaluate(()=>window.__v1322.snapshot());
 const forms=await page.evaluate(()=>['normal','mutation','apex'].map(form=>window.__v1322.sampleSnake(form)));
 expect(new Set(forms.map(f=>f.hash)).size).toBe(3);
 for(const sample of forms){
  expect(sample.before).toEqual(sample.after);
  expect(sample.pixels).toBeGreaterThan(250);
  expect(sample.face[3]).toBeGreaterThan(120);
 }
 await page.locator('[data-tab="visual"]').click();
 await page.locator('[data-visual-ship="dog"]').click();
 await page.locator('[data-visual-group="animal"]').click();
 await page.locator('[data-visual-id="dogSnake"]').click();
 if(testInfo.project.name==='desktop')
  await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath('friendly-snake-normal.png')});
 await page.locator('[data-visual-group="mutation"]').click();
 for(const id of ['dogViper','dogViperApex']){
  await page.locator('[data-visual-id="'+id+'"]').click();
  if(testInfo.project.name==='desktop')
   await page.locator('#weaponVisualCanvas').screenshot({path:testInfo.outputPath('friendly-'+id+'.png')});
 }
 expect(await page.evaluate(()=>window.__v1322.snapshot())).toBe(before);
 expect(errors).toEqual([]);
});
