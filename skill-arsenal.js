/* v13.36 — bounded, once-per-run arsenal definitions. No combat timers or rendering.
   New cards declare final stat gains directly, so text and effects agree without
   the legacy catalog's implicit rarity gain multiplier. */
(function(root){'use strict';
const cards = [
 {
  "id": "arsGyro",
  "rarity": "common",
  "name": "姿勢ジャイロ",
  "desc": "移動速度+8、ダッシュ再使用-0.06秒。",
  "tags": [
   "機動",
   "回避"
  ],
  "effects": [
   [
    "spd",
    "add",
    8,
    null,
    null
   ],
   [
    "dashCd",
    "add",
    -0.06,
    0.7,
    null
   ]
  ]
 },
 {
  "id": "arsPlating",
  "rarity": "common",
  "name": "予備外板",
  "desc": "最大HP+12、シールド+4。",
  "tags": [
   "装甲",
   "防御"
  ],
  "effects": [
   [
    "maxHp",
    "add",
    12,
    null,
    null
   ],
   [
    "hp",
    "add",
    12,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    4,
    null,
    null
   ],
   [
    "shield",
    "add",
    4,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsOptics",
  "rarity": "common",
  "name": "照準校正",
  "desc": "会心率+2%、弾速+25。",
  "tags": [
   "会心",
   "射撃性能"
  ],
  "effects": [
   [
    "crit",
    "add",
    0.02,
    0,
    0.969
   ],
   [
    "shotSpeed",
    "add",
    25,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsCollector",
  "rarity": "common",
  "name": "回収アンテナ",
  "desc": "回収範囲+24、経験値+3%。",
  "tags": [
   "回収",
   "経験値"
  ],
  "effects": [
   [
    "magnet",
    "add",
    24,
    null,
    null
   ],
   [
    "xpBonus",
    "add",
    0.03,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsCoolant",
  "rarity": "uncommon",
  "name": "冷却パッキン",
  "desc": "ダッシュ再使用-0.1秒、最大HP+8。",
  "tags": [
   "機動",
   "装甲"
  ],
  "effects": [
   [
    "dashCd",
    "add",
    -0.1,
    0.7,
    null
   ],
   [
    "maxHp",
    "add",
    8,
    null,
    null
   ],
   [
    "hp",
    "add",
    8,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsCapacitor",
  "rarity": "uncommon",
  "name": "補助蓄電器",
  "desc": "NOVAゲージ獲得倍率+0.03、シールド+8。",
  "tags": [
   "ノヴァ",
   "防御"
  ],
  "effects": [
   [
    "novaGain",
    "add",
    0.03,
    0,
    1.55
   ],
   [
    "shieldMax",
    "add",
    8,
    null,
    null
   ],
   [
    "shield",
    "add",
    8,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsRepairMesh",
  "rarity": "uncommon",
  "name": "修復メッシュ",
  "desc": "HP回復+0.35/秒、最大HP+8。",
  "tags": [
   "回復",
   "装甲"
  ],
  "effects": [
   [
    "regen",
    "add",
    0.35,
    null,
    null
   ],
   [
    "maxHp",
    "add",
    8,
    null,
    null
   ],
   [
    "hp",
    "add",
    8,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsShieldSeal",
  "rarity": "uncommon",
  "name": "絶縁シール",
  "desc": "シールド+10、再充填+0.35/秒。",
  "tags": [
   "防御",
   "再生"
  ],
  "effects": [
   [
    "shieldMax",
    "add",
    10,
    null,
    null
   ],
   [
    "shield",
    "add",
    10,
    null,
    null
   ],
   [
    "shieldRecharge",
    "add",
    0.35,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsNovaLens",
  "rarity": "rare",
  "name": "NOVA整流レンズ",
  "desc": "NOVA基礎威力+25、範囲+10。",
  "tags": [
   "ノヴァ",
   "火力"
  ],
  "effects": [
   [
    "novaDamage",
    "add",
    25,
    null,
    null
   ],
   [
    "novaRadius",
    "add",
    10,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsCriticalMap",
  "rarity": "rare",
  "name": "弱点マップ",
  "desc": "会心率+3%、会心倍率+0.12。",
  "tags": [
   "会心"
  ],
  "effects": [
   [
    "crit",
    "add",
    0.03,
    0,
    0.969
   ],
   [
    "critMult",
    "add",
    0.12,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsShotGuide",
  "rarity": "common",
  "name": "軽量ガイドレール",
  "desc": "弾速+35、基本威力+3。",
  "tags": [
   "射撃",
   "射撃性能"
  ],
  "effects": [
   [
    "shotSpeed",
    "add",
    35,
    null,
    null
   ],
   [
    "dmg",
    "add",
    3,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsShotFeed",
  "rarity": "uncommon",
  "name": "給弾スプリング",
  "desc": "射撃間隔-3%、回収範囲+15。",
  "tags": [
   "射撃",
   "連射",
   "回収"
  ],
  "effects": [
   [
    "rate",
    "mul",
    0.97,
    "limitRate",
    null
   ],
   [
    "magnet",
    "add",
    15,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsLaserCoating",
  "rarity": "common",
  "name": "薄膜コーティング",
  "desc": "レーザー威力補正+0.04、射程+15。",
  "tags": [
   "レーザー",
   "火力"
  ],
  "effects": [
   [
    "laserScale",
    "add",
    0.04,
    null,
    null
   ],
   [
    "laserReach",
    "add",
    15,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsLaserFocus",
  "rarity": "uncommon",
  "name": "照射安定板",
  "desc": "レーザー線幅+0.3、シールド+8。",
  "tags": [
   "レーザー",
   "防御"
  ],
  "effects": [
   [
    "laserWidth",
    "add",
    0.3,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    8,
    null,
    null
   ],
   [
    "shield",
    "add",
    8,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsChargeCell",
  "rarity": "common",
  "name": "小型蓄電セル",
  "desc": "チャージ速度補正+0.04、最大HP+8。",
  "tags": [
   "チャージ",
   "装甲"
  ],
  "effects": [
   [
    "chargeRate",
    "add",
    0.04,
    null,
    null
   ],
   [
    "maxHp",
    "add",
    8,
    null,
    null
   ],
   [
    "hp",
    "add",
    8,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsChargeCase",
  "rarity": "uncommon",
  "name": "彗星保護殻",
  "desc": "チャージ威力補正+0.05、移動速度+6。",
  "tags": [
   "チャージ",
   "機動"
  ],
  "effects": [
   [
    "chargeScale",
    "add",
    0.05,
    null,
    null
   ],
   [
    "spd",
    "add",
    6,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsDrillBearing",
  "rarity": "common",
  "name": "低摩擦ベアリング",
  "desc": "プラズマ蓄積速度+0.015、接触威力+3。",
  "tags": [
   "ドリル",
   "ドリル蓄積",
   "近接"
  ],
  "effects": [
   [
    "drillGain",
    "add",
    0.015,
    null,
    null
   ],
   [
    "drillContact",
    "add",
    3,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsDrillCollar",
  "rarity": "uncommon",
  "name": "先端カラー",
  "desc": "ドリルリーチ+6、攻撃幅+2。",
  "tags": [
   "ドリル",
   "近接"
  ],
  "effects": [
   [
    "drillReach",
    "add",
    6,
    null,
    null
   ],
   [
    "drillWidth",
    "add",
    2,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsDogGrip",
  "rarity": "common",
  "name": "ほねっこ・にぎにぎ",
  "desc": "骨の速度+12、帰還威力補正+0.04。",
  "tags": [
   "骨ブーメラン"
  ],
  "effects": [
   [
    "dogBoneSpeed",
    "add",
    12,
    null,
    null
   ],
   [
    "dogBoneReturn",
    "add",
    0.04,
    null,
    null
   ]
  ],
  "shipOnly": "dog"
 },
 {
  "id": "arsDogLunch",
  "rarity": "uncommon",
  "name": "ぴよぴよ・おべんとう",
  "desc": "卵の威力+7、飛行速度+8。",
  "tags": [
   "アニマル",
   "ヒヨコ"
  ],
  "effects": [
   [
    "dogEggDamage",
    "add",
    7,
    null,
    null
   ],
   [
    "dogEggSpeed",
    "add",
    8,
    null,
    null
   ]
  ],
  "shipOnly": "dog",
  "requires": "dogChicks"
 },
 {
  "id": "arsPowerRecovery",
  "rarity": "power",
  "name": "予備シールド炉",
  "desc": "シールド+36、再充填+3.5/秒。",
  "tags": [
   "防御",
   "再生"
  ],
  "effects": [
   [
    "shieldMax",
    "add",
    36,
    null,
    null
   ],
   [
    "shield",
    "add",
    36,
    null,
    null
   ],
   [
    "shieldRecharge",
    "add",
    3.5,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsPowerMobility",
  "rarity": "power",
  "name": "巡航ブースター",
  "desc": "移動速度+26、ダッシュ再使用-0.26秒、最大HP+20。",
  "tags": [
   "機動",
   "回避"
  ],
  "effects": [
   [
    "spd",
    "add",
    26,
    null,
    null
   ],
   [
    "dashCd",
    "add",
    -0.26,
    0.7,
    null
   ],
   [
    "maxHp",
    "add",
    20,
    null,
    null
   ],
   [
    "hp",
    "add",
    20,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsPowerShotPrecision",
  "rarity": "power",
  "name": "精密射撃管",
  "desc": "基本威力+22、会心率+10%、弾速+70。",
  "tags": [
   "射撃",
   "会心"
  ],
  "effects": [
   [
    "dmg",
    "add",
    22,
    null,
    null
   ],
   [
    "crit",
    "add",
    0.1,
    0,
    0.969
   ],
   [
    "shotSpeed",
    "add",
    70,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsPowerShotSalvo",
  "rarity": "power",
  "name": "サルヴォ給弾機",
  "desc": "弾数+2、射撃間隔-4%。",
  "tags": [
   "射撃",
   "弾数",
   "連射"
  ],
  "effects": [
   [
    "multishot",
    "add",
    2,
    0,
    "limitShot"
   ],
   [
    "rate",
    "mul",
    0.96,
    "limitRate",
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsPowerLaserSweep",
  "rarity": "power",
  "name": "走査プリズム",
  "desc": "レーザー+1本、線幅+1.2、射程+65。",
  "tags": [
   "レーザー"
  ],
  "effects": [
   [
    "laserCount",
    "add",
    1,
    0,
    "laserLimit"
   ],
   [
    "laserWidth",
    "add",
    1.2,
    null,
    null
   ],
   [
    "laserReach",
    "add",
    65,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsPowerLaserSustain",
  "rarity": "power",
  "name": "持続照射炉",
  "desc": "レーザー威力補正+0.42、シールド+28。",
  "tags": [
   "レーザー",
   "防御"
  ],
  "effects": [
   [
    "laserScale",
    "add",
    0.42,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    28,
    null,
    null
   ],
   [
    "shield",
    "add",
    28,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsPowerChargeQuick",
  "rarity": "power",
  "name": "急速蓄電器",
  "desc": "チャージ速度補正+0.4、移動速度+16、シールド+24。",
  "tags": [
   "チャージ",
   "機動"
  ],
  "effects": [
   [
    "chargeRate",
    "add",
    0.4,
    null,
    null
   ],
   [
    "spd",
    "add",
    16,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    24,
    null,
    null
   ],
   [
    "shield",
    "add",
    24,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsPowerChargeBore",
  "rarity": "power",
  "name": "螺旋彗星核",
  "desc": "チャージ威力補正+0.36、貫通+4。",
  "tags": [
   "チャージ",
   "貫通"
  ],
  "effects": [
   [
    "chargeScale",
    "add",
    0.36,
    null,
    null
   ],
   [
    "chargePenetration",
    "add",
    4,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsPowerDrillTorque",
  "rarity": "power",
  "name": "トルク伝達軸",
  "desc": "接触威力+24、突進威力+40。",
  "tags": [
   "ドリル",
   "近接",
   "突進"
  ],
  "effects": [
   [
    "drillContact",
    "add",
    24,
    null,
    null
   ],
   [
    "drillDamage",
    "add",
    40,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsPowerDrillReserve",
  "rarity": "power",
  "name": "予備プラズマ槽",
  "desc": "プラズマ減衰-0.1、蓄積速度+0.07、攻撃幅+4。",
  "tags": [
   "ドリル",
   "ドリル蓄積"
  ],
  "effects": [
   [
    "drillDecay",
    "add",
    -0.1,
    0.1,
    null
   ],
   [
    "drillGain",
    "add",
    0.07,
    null,
    null
   ],
   [
    "drillWidth",
    "add",
    4,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsPowerDogReturn",
  "rarity": "power",
  "name": "ほねっこ・おかえり便",
  "desc": "骨の帰還威力補正+0.35、射程+40、速度+20。",
  "tags": [
   "骨ブーメラン"
  ],
  "effects": [
   [
    "dogBoneReturn",
    "add",
    0.35,
    null,
    null
   ],
   [
    "dogBoneRange",
    "add",
    40,
    0,
    480
   ],
   [
    "dogBoneSpeed",
    "add",
    20,
    null,
    null
   ]
  ],
  "shipOnly": "dog"
 },
 {
  "id": "arsPowerDogNest",
  "rarity": "power",
  "name": "ぴよぴよ・あんしん巣箱",
  "desc": "卵の威力+32、シールド+35。",
  "tags": [
   "アニマル",
   "ヒヨコ",
   "防御"
  ],
  "effects": [
   [
    "dogEggDamage",
    "add",
    32,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    35,
    null,
    null
   ],
   [
    "shield",
    "add",
    35,
    null,
    null
   ]
  ],
  "shipOnly": "dog",
  "requires": "dogChicks"
 },
 {
  "id": "arsLegendBulwark",
  "rarity": "legendary",
  "name": "不沈の隔壁",
  "desc": "最大HP+90、シールド+80、HP回復+2.4/秒。",
  "tags": [
   "装甲",
   "防御",
   "回復"
  ],
  "effects": [
   [
    "maxHp",
    "add",
    90,
    null,
    null
   ],
   [
    "hp",
    "add",
    90,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    80,
    null,
    null
   ],
   [
    "shield",
    "add",
    80,
    null,
    null
   ],
   [
    "regen",
    "add",
    2.4,
    null,
    null
   ]
  ]
 },
 {
  "id": "arsLegendNova",
  "rarity": "legendary",
  "name": "星雲の心臓",
  "desc": "NOVA基礎威力+200、獲得倍率+0.12、再使用-0.5秒。",
  "tags": [
   "ノヴァ",
   "火力"
  ],
  "effects": [
   [
    "novaDamage",
    "add",
    200,
    null,
    null
   ],
   [
    "novaGain",
    "add",
    0.12,
    0,
    1.55
   ],
   [
    "novaReuseDelay",
    "add",
    -0.5,
    10.5,
    null
   ]
  ]
 },
 {
  "id": "arsLegendShotHunter",
  "rarity": "legendary",
  "name": "星穿ちの照準",
  "desc": "基本威力+65、会心率+12%、会心倍率+0.35。",
  "tags": [
   "射撃",
   "会心"
  ],
  "effects": [
   [
    "dmg",
    "add",
    65,
    null,
    null
   ],
   [
    "crit",
    "add",
    0.12,
    0,
    0.969
   ],
   [
    "critMult",
    "add",
    0.35,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsLegendShotEscort",
  "rarity": "legendary",
  "name": "銀翼の護送隊",
  "desc": "僚機+3、僚機連射補正+0.3、シールド+50。",
  "tags": [
   "僚機",
   "防御"
  ],
  "effects": [
   [
    "droneCount",
    "add",
    3,
    0,
    "limitDrones"
   ],
   [
    "droneBoost",
    "add",
    0.3,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    50,
    null,
    null
   ],
   [
    "shield",
    "add",
    50,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsLegendLaserLighthouse",
  "rarity": "legendary",
  "name": "天頂の灯台",
  "desc": "レーザー+2本、射程+100、線幅+1.5。",
  "tags": [
   "レーザー"
  ],
  "effects": [
   [
    "laserCount",
    "add",
    2,
    0,
    "laserLimit"
   ],
   [
    "laserReach",
    "add",
    100,
    null,
    null
   ],
   [
    "laserWidth",
    "add",
    1.5,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsLegendLaserCitadel",
  "rarity": "legendary",
  "name": "光の城塞",
  "desc": "レーザー威力補正+0.65、シールド+85。",
  "tags": [
   "レーザー",
   "防御"
  ],
  "effects": [
   [
    "laserScale",
    "add",
    0.65,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    85,
    null,
    null
   ],
   [
    "shield",
    "add",
    85,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsLegendChargeHorizon",
  "rarity": "legendary",
  "name": "地平を割る彗星",
  "desc": "チャージ威力補正+0.65、半径補正+8、命中爆発+1。",
  "tags": [
   "チャージ",
   "貫通"
  ],
  "effects": [
   [
    "chargeScale",
    "add",
    0.65,
    null,
    null
   ],
   [
    "chargeSize",
    "add",
    8,
    null,
    null
   ],
   [
    "chargeBlast",
    "add",
    1,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsLegendChargeShelter",
  "rarity": "legendary",
  "name": "星屑の避難所",
  "desc": "チャージ速度補正+0.42、最大HP+70、回復+2/秒。",
  "tags": [
   "チャージ",
   "装甲",
   "回復"
  ],
  "effects": [
   [
    "chargeRate",
    "add",
    0.42,
    null,
    null
   ],
   [
    "maxHp",
    "add",
    70,
    null,
    null
   ],
   [
    "hp",
    "add",
    70,
    null,
    null
   ],
   [
    "regen",
    "add",
    2,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsLegendDrillChampion",
  "rarity": "legendary",
  "name": "穿孔の覇者",
  "desc": "接触威力+50、突進威力+105、リーチ+22。",
  "tags": [
   "ドリル",
   "近接",
   "突進"
  ],
  "effects": [
   [
    "drillContact",
    "add",
    50,
    null,
    null
   ],
   [
    "drillDamage",
    "add",
    105,
    null,
    null
   ],
   [
    "drillReach",
    "add",
    22,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsLegendDrillKeeper",
  "rarity": "legendary",
  "name": "鋼輪の守護者",
  "desc": "プラズマ蓄積速度+0.14、シールド+100、再充填+2/秒。",
  "tags": [
   "ドリル",
   "ドリル蓄積",
   "防御"
  ],
  "effects": [
   [
    "drillGain",
    "add",
    0.14,
    null,
    null
   ],
   [
    "shieldMax",
    "add",
    100,
    null,
    null
   ],
   [
    "shield",
    "add",
    100,
    null,
    null
   ],
   [
    "shieldRecharge",
    "add",
    2,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsLegendDogPromise",
  "rarity": "legendary",
  "name": "ほねっこ・やくそく",
  "desc": "骨+1本、骨の威力補正+0.35、帰還威力補正+0.4。",
  "tags": [
   "骨ブーメラン"
  ],
  "effects": [
   [
    "dogBones",
    "add",
    1,
    0,
    8
   ],
   [
    "dogBonePower",
    "add",
    0.35,
    null,
    null
   ],
   [
    "dogBoneReturn",
    "add",
    0.4,
    null,
    null
   ]
  ],
  "shipOnly": "dog"
 },
 {
  "id": "arsLegendDogParade",
  "rarity": "legendary",
  "name": "ぴよぴよ・おまつり行進",
  "desc": "卵の威力+65、発射間隔-18%、最大HP+55。",
  "tags": [
   "アニマル",
   "ヒヨコ",
   "装甲"
  ],
  "effects": [
   [
    "dogEggDamage",
    "add",
    65,
    null,
    null
   ],
   [
    "dogEggRate",
    "mul",
    0.82,
    0.58,
    null
   ],
   [
    "maxHp",
    "add",
    55,
    null,
    null
   ],
   [
    "hp",
    "add",
    55,
    null,
    null
   ]
  ],
  "shipOnly": "dog",
  "requires": "dogChicks"
 },
 {
  "id": "arsRelicShotConverge",
  "rarity": "relic",
  "name": "収束バレル",
  "desc": "基本威力×1.22、弾速+80、射撃間隔+5%。",
  "tags": [
   "射撃",
   "射撃性能",
   "火力"
  ],
  "effects": [
   [
    "dmg",
    "mul",
    1.22,
    null,
    null
   ],
   [
    "shotSpeed",
    "add",
    80,
    null,
    null
   ],
   [
    "rate",
    "mul",
    1.05,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsRelicShotBreach",
  "rarity": "relic",
  "name": "突破装填器",
  "desc": "貫通+3、会心率+10%、射撃間隔+5%。",
  "tags": [
   "射撃",
   "貫通",
   "会心"
  ],
  "effects": [
   [
    "pierce",
    "add",
    3,
    null,
    null
   ],
   [
    "crit",
    "add",
    0.1,
    0,
    0.969
   ],
   [
    "rate",
    "mul",
    1.05,
    null,
    null
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsRelicLaserNear",
  "rarity": "relic",
  "name": "近接焦点レンズ",
  "desc": "レーザー威力補正+0.28、射程-15%。",
  "tags": [
   "レーザー",
   "火力"
  ],
  "effects": [
   [
    "laserScale",
    "add",
    0.28,
    null,
    null
   ],
   [
    "laserReach",
    "mul",
    0.85,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsRelicLaserRibbon",
  "rarity": "relic",
  "name": "帯状プリズム",
  "desc": "レーザー線幅+6、威力補正-0.06。",
  "tags": [
   "レーザー"
  ],
  "effects": [
   [
    "laserWidth",
    "add",
    6,
    null,
    null
   ],
   [
    "laserScale",
    "add",
    -0.06,
    0.2,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsRelicChargeHeavy",
  "rarity": "relic",
  "name": "重質彗星殻",
  "desc": "チャージ威力×1.4、チャージ速度-10%。",
  "tags": [
   "チャージ",
   "火力"
  ],
  "effects": [
   [
    "chargeScale",
    "mul",
    1.4,
    null,
    null
   ],
   [
    "chargeRate",
    "mul",
    0.9,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsRelicChargeEscape",
  "rarity": "relic",
  "name": "離脱コンデンサー",
  "desc": "チャージ速度補正+0.3、移動速度+18、威力補正-0.06。",
  "tags": [
   "チャージ",
   "機動"
  ],
  "effects": [
   [
    "chargeRate",
    "add",
    0.3,
    null,
    null
   ],
   [
    "spd",
    "add",
    18,
    null,
    null
   ],
   [
    "chargeScale",
    "add",
    -0.06,
    0.2,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsRelicDrillNeedle",
  "rarity": "relic",
  "name": "針状スピンドル",
  "desc": "ドリルリーチ+28、接触威力+12、攻撃幅-6。",
  "tags": [
   "ドリル",
   "近接"
  ],
  "effects": [
   [
    "drillReach",
    "add",
    28,
    null,
    null
   ],
   [
    "drillContact",
    "add",
    12,
    null,
    null
   ],
   [
    "drillWidth",
    "add",
    -6,
    8,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsRelicDrillFlywheel",
  "rarity": "relic",
  "name": "慣性フライホイール",
  "desc": "突進威力+40、蓄積速度+0.06、突進速度-6%。",
  "tags": [
   "ドリル",
   "突進",
   "ドリル蓄積"
  ],
  "effects": [
   [
    "drillDamage",
    "add",
    40,
    null,
    null
   ],
   [
    "drillGain",
    "add",
    0.06,
    null,
    null
   ],
   [
    "drillDashSpeed",
    "mul",
    0.94,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsRelicDogLong",
  "rarity": "relic",
  "name": "ほねっこ・とおくまで",
  "desc": "骨の射程+80、帰還威力補正+0.45、速度-6%。",
  "tags": [
   "骨ブーメラン"
  ],
  "effects": [
   [
    "dogBoneRange",
    "add",
    80,
    0,
    480
   ],
   [
    "dogBoneReturn",
    "add",
    0.45,
    null,
    null
   ],
   [
    "dogBoneSpeed",
    "mul",
    0.94,
    null,
    null
   ]
  ],
  "shipOnly": "dog"
 },
 {
  "id": "arsRelicDogRapidEgg",
  "rarity": "relic",
  "name": "ぴよぴよ・はやおき時計",
  "desc": "卵の発射間隔-28%、威力-8%。",
  "tags": [
   "アニマル",
   "ヒヨコ",
   "連射"
  ],
  "effects": [
   [
    "dogEggRate",
    "mul",
    0.72,
    0.58,
    null
   ],
   [
    "dogEggDamage",
    "mul",
    0.92,
    null,
    null
   ]
  ],
  "shipOnly": "dog",
  "requires": "dogChicks"
 },
 {
  "id": "arsUniqueShot",
  "rarity": "unique",
  "name": "星火の一斉射撃",
  "desc": "弾数+3、基本威力+70、会心率+12%。",
  "tags": [
   "射撃",
   "弾数",
   "会心"
  ],
  "effects": [
   [
    "multishot",
    "add",
    3,
    0,
    "limitShot"
   ],
   [
    "dmg",
    "add",
    70,
    null,
    null
   ],
   [
    "crit",
    "add",
    0.12,
    0,
    0.969
   ]
  ],
  "shipOnly": "shot"
 },
 {
  "id": "arsUniqueLaser",
  "rarity": "unique",
  "name": "極光の連続照射",
  "desc": "レーザー+2本、威力補正+0.75、線幅+3。",
  "tags": [
   "レーザー",
   "火力"
  ],
  "effects": [
   [
    "laserCount",
    "add",
    2,
    0,
    "laserLimit"
   ],
   [
    "laserScale",
    "add",
    0.75,
    null,
    null
   ],
   [
    "laserWidth",
    "add",
    3,
    null,
    null
   ]
  ],
  "shipOnly": "laser"
 },
 {
  "id": "arsUniqueCharge",
  "rarity": "unique",
  "name": "流星の再点火",
  "desc": "チャージ速度補正+0.55、威力補正+0.85、貫通+4。",
  "tags": [
   "チャージ",
   "貫通"
  ],
  "effects": [
   [
    "chargeRate",
    "add",
    0.55,
    null,
    null
   ],
   [
    "chargeScale",
    "add",
    0.85,
    null,
    null
   ],
   [
    "chargePenetration",
    "add",
    4,
    null,
    null
   ]
  ],
  "shipOnly": "charge"
 },
 {
  "id": "arsUniqueDrill",
  "rarity": "unique",
  "name": "鋼星の回転核",
  "desc": "プラズマ蓄積速度+0.14、突進威力+120、リーチ+30。",
  "tags": [
   "ドリル",
   "ドリル蓄積",
   "突進"
  ],
  "effects": [
   [
    "drillGain",
    "add",
    0.14,
    null,
    null
   ],
   [
    "drillDamage",
    "add",
    120,
    null,
    null
   ],
   [
    "drillReach",
    "add",
    30,
    null,
    null
   ]
  ],
  "shipOnly": "drill"
 },
 {
  "id": "arsUniqueDog",
  "rarity": "unique",
  "name": "ほねっこ・きらきら大冒険",
  "desc": "骨+2本、骨の威力補正+0.55、帰還威力補正+0.65。",
  "tags": [
   "骨ブーメラン"
  ],
  "effects": [
   [
    "dogBones",
    "add",
    2,
    0,
    8
   ],
   [
    "dogBonePower",
    "add",
    0.55,
    null,
    null
   ],
   [
    "dogBoneReturn",
    "add",
    0.65,
    null,
    null
   ]
  ],
  "shipOnly": "dog"
 }
];
const descriptions = {
 "travel": "弾速を強化。",
 "thermal": "燃焼ダメージを強化。",
 "blizzard": "敵と敵弾を減速。",
 "rain": "燃焼ミサイルを集中発射。",
 "reaper": "与ダメージを吸収し、30体撃破ごとにHP回復。",
 "repair": "30体撃破ごとにHP回復。",
 "novaFastCycle": "NOVA再使用待機-0.7秒。最大3回、最短10.5秒。",
 "novaPulseRelay": "NOVA再使用待機-0.9秒。最大2回、最短10.5秒。",
 "dWideRotor": "ドリルの攻撃幅+8。",
 "dLongShaft": "ドリルの前方リーチ+18。",
 "iceBall": "アイスボール+1発。最大5発、基本凍結率23%。",
 "iceBallFocus": "アイスボールの威力と凍結率を強化。",
 "empAmplifier": "電磁パルスの威力と範囲を強化。",
 "empPulse": "機体周辺に持続雷撃。最大半径290。",
 "chain": "電磁パルスを起動・強化。",
 "storm": "電磁パルスの威力・範囲、雷撃威力を強化。",
 "tempest": "電磁パルスの威力・範囲、連鎖雷撃の威力を強化。",
 "rLaserFrost": "レーザーの線幅と威力を強化。",
 "rLaserFork": "照射先から別の敵へレーザーが分岐。",
 "rLaserOrbit": "独立照準レーザー+2本。",
 "rShotHoming": "主砲・補助弾・分裂弾・追撃弾が敵を追尾。",
 "rShotBounce": "主砲・補助弾・分裂弾・追撃弾が画面端で最大2回反射。",
 "rShotGrow": "主砲・補助弾・分裂弾・追撃弾が飛行中に成長。",
 "rShotBurst": "ショットで撃破すると小弾3発に分裂。再分裂なし。",
 "rChargeEcho": "最大チャージ時、0.18秒後に同方向へ追撃彗星。",
 "rChargeGravity": "最大チャージ弾が周囲の通常敵を吸引。",
 "rChargeFlame": "最大チャージ弾の威力を強化。プラズマ換装中は火炎軌跡を追加。",
 "rDrillHeat": "ドリル接触威力+24。炎換装中は燃焼も強化。",
 "rDrillIce": "ドリルリーチ+18。氷換装中はスロウ時間も延長。",
 "dogRelicReturnBone": "骨の帰還威力・射程・速度を強化。",
 "fan": "弾数+1。通常上限16、限界突破後32。12発を超える分は火力に変換。",
 "wider": "弾数+2、会心率を強化。",
 "orbit": "機体周囲を旋回する風属性ブレード+1。",
 "satellite": "旋回ブレード+2。",
 "radius": "NOVAの範囲と基礎威力を強化。",
 "novaEpic": "NOVAの基礎威力とゲージ獲得効率を強化。",
 "novaAmp": "NOVAの基礎威力と範囲を強化。",
 "void": "NOVAの基礎威力・範囲・撃破時ゲージを強化。",
 "endHull": "最大HPとHPを増加、基本威力を小幅強化。",
 "dogEndHedgeGlow": "EMP威力+46。"
};
const removeTags = {"thermal": ["爆発"], "rain": ["マグマ床"], "freeze": ["スロウ"], "iceBallFocus": ["スロウ"]};
for(const c of cards){if(c.id==='arsOptics')c.excludeShips=['laser'];if(['arsNovaLens','arsLegendNova'].includes(c.id))c.excludeShips=['drill'];c.stackable=false;c.tags=[...new Set([...c.tags,'一度限り',...(c.rarity==='relic'?['レリック']:[])])];for(const e of c.effects)Object.freeze(e);Object.freeze(c.effects);Object.freeze(c.tags);Object.freeze(c);}
const byId=new Map(cards.map(c=>[c.id,c]));
function apply(p,id){
 const c=byId.get(id);if(!c)throw Error('Unknown arsenal card '+id);
 for(const [stat,operation,value,minimum,maximum] of c.effects){
  const current=Number.isFinite(p[stat])?p[stat]:(operation==='mul'||stat==='droneBoost'?1:0);
  let next=operation==='mul'?current*value:current+value;
  const bound=v=>typeof v==='string'?p[v]:v;
  if(minimum!==null&&minimum!==undefined)next=Math.max(bound(minimum),next);
  if(maximum!==null&&maximum!==undefined)next=Math.min(bound(maximum),next);
  if(!Number.isFinite(next))throw Error('Invalid arsenal stat '+stat);
  p[stat]=next;
 }
 p.hp=Math.min(p.hp,p.maxHp);p.shield=Math.min(p.shield,p.shieldMax);
 return p;
}
function available(p,id){const c=byId.get(id);return !!c&&(!c.requires||p[c.requires]>0)&&c.effects.some(([stat,op,v,lo,hi])=>{
 const before=p[stat]??(stat==='droneBoost'?1:0),bound=x=>typeof x==='string'?p[x]:x;
 let after=op==='mul'?before*v:before+v;
 if(lo!==null&&lo!==undefined)after=Math.max(bound(lo),after);
 if(hi!==null&&hi!==undefined)after=Math.min(bound(hi),after);
 const lowerIsBetter=['rate','dogEggRate','dashCd','drillDecay','novaReuseDelay'].includes(stat);
 return lowerIsBetter?after<before-1e-8:after>before+1e-8;
});}
root.AnkinArsenal=Object.freeze({cards:Object.freeze(cards),descriptions:Object.freeze(descriptions),removeTags:Object.freeze(removeTags),apply,available});
})(globalThis);
