/* ================================================================
 *   config.js — 残酷育儿模拟器 · CSV 配置加载器
 *  ================================================================
 *  数据源: config/*.csv（可用 Excel / WPS 编辑后贴回下方对应变量）
 *  加载方式: 内嵌 CSV 字符串 → 解析 → 全局对象
 *  ================================================================ */

/* ---------- 通用 CSV 解析器 ---------- */
function parseCSV(csvText) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === "\n") { lines.push(current); current = ""; }
      else if (ch === "\r") { /* skip */ }
      else { current += ch; }
    }
  }
  if (current) lines.push(current);

  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let col = "";
    inQuotes = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (inQuotes) {
        if (ch === '"') {
          if (lines[i][j + 1] === '"') { col += '"'; j++; }
          else { inQuotes = false; }
        } else { col += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { cols.push(col); col = ""; }
        else { col += ch; }
      }
    }
    cols.push(col);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

/* 工具: 字符串→数字（空值返回 undefined） */
function num(val) {
  if (val === "" || val === undefined) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

/* 工具: 字符串→布尔 */
function bool(val) {
  return val === "true" || val === "TRUE";
}

/* ================================================================
 *  原始 CSV 数据（与 config/*.csv 文件内容一致，直接修改即可）
 *  ================================================================ */

const CSV_FAMILIES = `id,name,energyMax,recovery,note
single,单职工,120,1.2,"陪伴和体力更宽裕，但现金流取决于你输入的家庭总收入。"
dual,双职工,80,0.8,"家庭收入由你输入，父母精力上限更低，白天恢复也更慢。"`;

const CSV_PURCHASES = `category,categoryLabel,id,name,cost,feedBonus,dailyMilk,safetyCap,comfortDecayReduction,dailyDiaper,healthBonus,medicalDiscount,note
feeding,🍼 喂养,low,经济实用,500,5,0,,,,,,"喂奶额外 +5 饱腹"
feeding,🍼 喂养,mid,主流品质,15000,10,20,,,,,,"喂奶 +10，每日奶粉费 20"
feeding,🍼 喂养,high,顶配无忧,38000,15,50,,,,,,"喂奶 +15，每日奶粉费 50"
gear,🛏️ 大件,low,二手基础,1800,,,0,,,,"无额外安全加成"
gear,🛏️ 大件,mid,主流新购,4300,,,5,,,,"安全感上限 +5"
gear,🛏️ 大件,high,顶配大件,28500,,,12,,,,"安全感上限 +12"
supplies,🧻 消耗品,low,平价消耗,5700,,,,0,8,,,"每日尿布费 8"
supplies,🧻 消耗品,mid,主流消耗,10000,,,,0.3,15,,,"舒适衰减 -0.3，每日 15"
supplies,🧻 消耗品,high,高端消耗,17000,,,,0.5,25,,,"舒适衰减 -0.5，每日 25"
medical,🏥 医疗,low,基础医疗,4100,,,,,,0,1,看病不打折
medical,🏥 医疗,mid,疫苗加强,10000,,,,,,3,0.7,"健康 +3，医疗费 7 折"
medical,🏥 医疗,high,保险拉满,35500,,,,,,8,0,"健康 +8，事件医疗费全免"`;

const CSV_STAGES = `minMonth,maxMonth,name,status,duration,hint,guide
0,0,新生儿期,黄疸,5,"黄疸期持续中，舒适和健康需要盯紧。","少量多次喂养、观察肤色和精神状态，脐带护理不能靠偏方。"
1,3,胀气与睡眠期,睡眠倒退,4,"夜醒更频繁，拍嗝和哄睡价值很高。","肠绞痛和厌奶常见，拍嗝、安抚和规律睡眠比硬喂更重要。"
4,5,出牙与辅食期,出牙,6,"出牙会降低舒适度，6 月后解锁辅食。","发热、流口水和烦躁常见，辅食从少量单一食材开始观察过敏。"
6,8,分离焦虑期,分离焦虑,8,"安全感消耗变快，跌落和异物风险升高。","会坐会爬后危险更多，陪伴回应和环境安全同样关键。"
9,11,学步探索期,挑食,7,"挑食会削弱进食效果，摔碰事件变多。","学步探索带来磕碰，食物接受度波动很正常，别用强迫喂养换短期数值。"`;

const CSV_ACTIONS = `id,icon,name,cooldown,cost,parent,unlockDay,effect_hunger,effect_energy,effect_comfort,effect_security,effect_health,effect_development,effect_parentEnergy,effect_parentMood
feed,🍼,喂奶,7,6,false,,,,22,,4,7,,,
diaper,🧷,换尿布,3,3,false,,,,,18,,2,,
sleep,🌙,哄睡,10,5,false,,,,,28,5,,1.5,,
play,🧸,陪玩,5,7,false,,,-4,-6,,11,,3.5,,
burp,👋,拍嗝,2.5,2,false,,,,,10,2,,,,
massage,💆,抚触,6,4,false,,,,4,9,9,1.5,,,
bath,🛁,洗澡,13,6,false,,,-4,,14,,2.5,,
rest,☕,休息,18,-12,true,,,,,,,,,22,7
solid,🥣,辅食,9,5,false,,181,,,,14,,2.5,,`;

const CSV_EVENTS = `pool,eventTitle,eventBody,choiceLabel,choiceDesc,choiceCost,choiceMedical,effect_hunger,effect_energy,effect_comfort,effect_security,effect_health,effect_development
newborn,脐带红肿,"脐带周围有点红，宝宝一碰就哭。",酒精消毒并保持干燥,"免费，健康 +2",0,false,,,,,2,
newborn,脐带红肿,"脐带周围有点红，宝宝一碰就哭。",买药膏并观察,"-200 元，健康 +4",200,true,,,,,4,
newborn,脐带红肿,"脐带周围有点红，宝宝一碰就哭。",多洗澡冲干净,"错误，健康 -4",0,false,,,,,-4,
newborn,吐奶呛奶,"刚喂完奶后突然吐奶，呼吸有些急。",侧身清理并拍嗝,"舒适 +8，健康 +2",0,false,,,8,,2,
newborn,吐奶呛奶,"刚喂完奶后突然吐奶，呼吸有些急。",立刻去医院检查,"-800 元，健康 +6",800,true,,,,,6,
newborn,吐奶呛奶,"刚喂完奶后突然吐奶，呼吸有些急。",继续平躺观察,"错误，健康 -7",0,false,,,,,-7,
sleep,肠绞痛爆发,"傍晚开始长时间哭闹，抱着也很难安静。",飞机抱和拍嗝,"舒适 +10，安全 +5",0,false,,,10,5,,
sleep,肠绞痛爆发,"傍晚开始长时间哭闹，抱着也很难安静。",儿科问诊,"-500 元，健康 +4",500,true,,,,,4,
sleep,肠绞痛爆发,"傍晚开始长时间哭闹，抱着也很难安静。",强行喂奶压住哭声,"错误，饱腹 +3，舒适 -8",0,false,3,,-8,,,
sleep,厌奶期,"宝宝突然不愿意好好吃奶。",少量多次喂养,"饱腹 +8，安全 +3",0,false,8,,,,3,,
sleep,厌奶期,"宝宝突然不愿意好好吃奶。",检查口腔和精神状态,"-300 元，健康 +3",300,true,,,,,3,
sleep,厌奶期,"宝宝突然不愿意好好吃奶。",硬喂到喝完,"错误，安全 -8，舒适 -5",0,false,,,,-8,,
teething,出牙发烧,"体温升高，牙龈红肿，睡不踏实。",物理降温并补水,"舒适 +10",0,false,,,10,,,
teething,出牙发烧,"体温升高，牙龈红肿，睡不踏实。",看医生确认,"-500 元，健康 +5",500,true,,,,,5,
teething,出牙发烧,"体温升高，牙龈红肿，睡不踏实。",自行喂成人药,"错误，健康 -6",0,false,,,,,-6,
teething,辅食过敏,"新食材后出现皮疹和烦躁。",停止新食材并记录,"健康 +2，舒适 +3",0,false,,,3,,2,
teething,辅食过敏,"新食材后出现皮疹和烦躁。",过敏门诊,"-900 元，健康 +6",900,true,,,,,6,
teething,辅食过敏,"新食材后出现皮疹和烦躁。",继续喂看能否适应,"错误，健康 -8",0,false,,,,,-8,
anxiety,跌落受伤,"宝宝从低矮处翻落，哭得很厉害。",观察意识和活动,"健康 +1，安全 +2",0,false,,,,2,1,
anxiety,跌落受伤,"宝宝从低矮处翻落，哭得很厉害。",去医院排查,"-1000 元，健康 +7",1000,true,,,,,7
anxiety,跌落受伤,"宝宝从低矮处翻落，哭得很厉害。",哄一哄继续玩,"错误，健康 -8",0,false,,,,,-8
anxiety,异物入口,"宝宝把小物件塞进嘴里。",冷静取出并清理环境,"安全 +4，健康 +2",0,false,,,,4,2
anxiety,异物入口,"宝宝把小物件塞进嘴里。",急诊确认,"-700 元，健康 +5",700,true,,,,,5
anxiety,异物入口,"宝宝把小物件塞进嘴里。",用手深挖,"错误，健康 -6，舒适 -5",0,false,,,-5,,-6,
toddler,摔伤磕碰,"练站时磕到额头，出现明显红肿。",冷敷观察,"舒适 +6，健康 +2",0,false,,,6,,2
toddler,摔伤磕碰,"练站时磕到额头，出现明显红肿。",就医检查,"-600 元，健康 +5",600,true,,,,,5
toddler,摔伤磕碰,"练站时磕到额头，出现明显红肿。",揉开淤青,"错误，健康 -4",0,false,,,,,-4
toddler,挑食爆发,"今天看到勺子就扭头，奶量也下降。",换质地少量尝试,"饱腹 +8，发育 +1",0,false,8,,,,,1
toddler,挑食爆发,"今天看到勺子就扭头，奶量也下降。",营养咨询,"-400 元，健康 +3",400,true,,,,,3,
toddler,挑食爆发,"今天看到勺子就扭头，奶量也下降。",追着喂完,"错误，安全 -7",0,false,,,,-7,,"`;

/* ================================================================
 *  解析 CSV → 全局配置对象
 *  ================================================================ */

/* 一、家庭模式 */
const FAMILIES = parseCSV(CSV_FAMILIES).map(row => ({
  id: row.id,
  name: row.name,
  energyMax: num(row.energyMax),
  recovery: num(row.recovery),
  note: row.note,
}));

/* 二、开局采购（按类别分组） */
const _purchaseRows = parseCSV(CSV_PURCHASES);
const PURCHASES = {};
_purchaseRows.forEach(row => {
  if (!PURCHASES[row.category]) {
    PURCHASES[row.category] = { label: row.categoryLabel, tiers: [] };
  }
  PURCHASES[row.category].tiers.push({
    id: row.id,
    name: row.name,
    cost: num(row.cost),
    feedBonus: num(row.feedBonus),
    dailyMilk: num(row.dailyMilk),
    safetyCap: num(row.safetyCap),
    comfortDecayReduction: num(row.comfortDecayReduction),
    dailyDiaper: num(row.dailyDiaper),
    healthBonus: num(row.healthBonus),
    medicalDiscount: num(row.medicalDiscount),
    note: row.note,
  });
});

/* 三、发育阶段 */
const STAGES = parseCSV(CSV_STAGES).map(row => ({
  minMonth: num(row.minMonth),
  maxMonth: num(row.maxMonth),
  name: row.name,
  status: row.status,
  duration: num(row.duration),
  hint: row.hint,
  guide: row.guide,
}));

/* 四、行动列表 */
const ACTIONS = parseCSV(CSV_ACTIONS).map(row => {
  const action = {
    id: row.id,
    icon: row.icon,
    name: row.name,
    cooldown: num(row.cooldown),
    cost: num(row.cost),
    effects: {},
  };
  if (bool(row.parent)) action.parent = true;
  const unlockDay = num(row.unlockDay);
  if (unlockDay) action.unlockDay = unlockDay;

  const babyEffects = ["hunger","energy","comfort","security","health","development"];
  babyEffects.forEach(key => {
    const val = num(row["effect_" + key]);
    if (val !== undefined) action.effects[key] = val;
  });
  const parentEnergy = num(row.effect_parentEnergy);
  if (parentEnergy !== undefined) action.effects.parentEnergy = parentEnergy;
  const parentMood = num(row.effect_parentMood);
  if (parentMood !== undefined) action.effects.parentMood = parentMood;

  return action;
});

/* 五、事件池（按阶段分组 → 事件 → 选项） */
const _eventRows = parseCSV(CSV_EVENTS);
const EVENT_POOLS = {};

// 第一遍：按 pool 分组，按 eventTitle 去重
const _eventMeta = {}; // key: "pool|eventTitle"
_eventRows.forEach(row => {
  const poolKey = row.pool;
  const eventKey = row.pool + "||" + row.eventTitle;
  if (!_eventMeta[eventKey]) {
    _eventMeta[eventKey] = {
      title: row.eventTitle,
      body: row.eventBody,
      pool: row.pool,
      choices: [],
    };
  }
  const effects = {};
  ["hunger","energy","comfort","security","health","development"].forEach(key => {
    const val = num(row["effect_" + key]);
    if (val !== undefined) effects[key] = val;
  });
  _eventMeta[eventKey].choices.push({
    label: row.choiceLabel,
    desc: row.choiceDesc,
    cost: num(row.choiceCost),
    effects,
    medical: bool(row.choiceMedical),
  });
});

// 第二遍：按 pool 组装
Object.values(_eventMeta).forEach(ev => {
  if (!EVENT_POOLS[ev.pool]) EVENT_POOLS[ev.pool] = [];
  EVENT_POOLS[ev.pool].push({
    title: ev.title,
    body: ev.body,
    choices: ev.choices,
  });
});

/* 清理临时变量 */
let _purchaseRows, _eventRows, _eventMeta;
