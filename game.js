/* 游戏配置数据请编辑 config.js */
const state = {
  setup: {
    family: null,
    income: 10000,
    tiers: { feeding: "low", gear: "low", supplies: "low", medical: "low" },
  },
  running: false,
  speed: 1,
  day: 1,
  minute: 360,
  lastTick: 0,
  eventQueue: [],
  cooldowns: {},
  ignoreCry: 0,
};

const baby = {
  hunger: 82,
  energy: 78,
  comfort: 80,
  security: 80,
  health: 100,
  development: 0,
};

const parent = {
  energy: 120,
  energyMax: 120,
  mood: 100,
};

let derived = {};

const $ = (id) => document.getElementById(id);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function selectedTier(category) {
  return PURCHASES[category].tiers.find((tier) => tier.id === state.setup.tiers[category]);
}

function calcDerived() {
  if (!state.setup.family) {
    return {
      spent: 0,
      startMoney: Number(state.setup.income) || 0,
      feedBonus: 0,
      dailyMilk: 0,
      safetyCap: 100,
      comfortDecayReduction: 0,
      dailyDiaper: 0,
      healthBonus: 0,
      medicalDiscount: 1,
    };
  }
  const feeding = selectedTier("feeding");
  const gear = selectedTier("gear");
  const supplies = selectedTier("supplies");
  const medical = selectedTier("medical");
  const spent = feeding.cost + gear.cost + supplies.cost + medical.cost;
  return {
    spent,
    startMoney: (Number(state.setup.income) || 0) - spent,
    feedBonus: feeding.feedBonus || 0,
    dailyMilk: feeding.dailyMilk || 0,
    safetyCap: 100 + (gear.safetyCap || 0),
    comfortDecayReduction: supplies.comfortDecayReduction || 0,
    dailyDiaper: supplies.dailyDiaper || 0,
    healthBonus: medical.healthBonus || 0,
    medicalDiscount: medical.medicalDiscount,
  };
}

function initSetup() {
  $("familyOptions").innerHTML = FAMILIES.map((family) => `
    <button class="option-card ${family.id === state.setup.family?.id ? "is-selected" : ""}" data-family="${family.id}">
      <strong>${escapeHtml(family.name)}</strong>
      <span>${escapeHtml(`父母精力上限 ${family.energyMax} / 恢复倍率 ${family.recovery}`)}<br>${escapeHtml(family.note)}</span>
    </button>
  `).join("");

  renderPurchaseOptions();

  document.querySelectorAll("[data-family]").forEach((button) => {
    button.addEventListener("click", () => {
      state.setup.family = FAMILIES.find((family) => family.id === button.dataset.family);
      initSetup();
    });
  });
  $("familyIncome").value = state.setup.income || "";
  $("familyIncome").oninput = (event) => {
    state.setup.income = Math.max(0, Number(event.target.value) || 0);
    updateSetupSummary();
  };
  updateSetupSummary();
}

function renderPurchaseOptions() {
  $("purchaseOptions").innerHTML = Object.entries(PURCHASES).map(([key, category]) => `
    <div class="purchase-category">
      <h3>${escapeHtml(category.label)}</h3>
      <div class="tier-row">
        ${category.tiers.map((tier) => `
          <button class="tier-card ${tier.id === state.setup.tiers[key] ? "is-selected" : ""}" data-category="${key}" data-tier="${tier.id}">
            <strong>${escapeHtml(tier.name)}</strong>
            <span>${escapeHtml(money(tier.cost))}<br>${escapeHtml(tier.note)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.setup.tiers[button.dataset.category] = button.dataset.tier;
      renderPurchaseOptions();
      updateSetupSummary();
    });
  });
}

function updateSetupSummary() {
  derived = calcDerived();
  $("setupMoney").textContent = money(derived.startMoney);
  $("setupMoney").style.color = derived.startMoney < 0 ? "var(--bad)" : "var(--ink)";
  $("startGame").disabled = derived.startMoney < -20000;
  $("confirmFamily").disabled = !state.setup.family || state.setup.income <= 0;
  $("setupEffects").innerHTML = [
    `家庭总收入：${money(state.setup.income || 0)}`,
    `开局采购：${money(derived.spent)}`,
    `喂奶加成：+${derived.feedBonus} 饱腹`,
    `每日固定消耗：${money(derived.dailyMilk + derived.dailyDiaper)}`,
    `安全感上限：${derived.safetyCap}`,
    `医疗折扣：${derived.medicalDiscount === 0 ? "全免" : `${Math.round(derived.medicalDiscount * 10)} 折`}`,
  ].map((line) => `<span>${escapeHtml(line)}</span>`).join("");
}

function confirmFamilySelection() {
  if (!state.setup.family || state.setup.income <= 0) return;
  $("familyModal").classList.add("hidden");
  $("purchaseModal").classList.remove("hidden");
  updateSetupSummary();
}

function startGame() {
  if (!state.setup.family || state.setup.income <= 0) return;
  derived = calcDerived();
  state.running = true;
  state.day = 1;
  state.minute = 360;
  state.lastTick = performance.now();
  state.eventQueue = [];
  state.cooldowns = {};
  state.ignoreCry = 0;
  Object.assign(baby, {
    hunger: 82,
    energy: 78,
    comfort: 80,
    security: 80,
    health: clamp(92 + derived.healthBonus, 0, 100),
    development: 0,
  });
  Object.assign(parent, {
    energy: state.setup.family.energyMax,
    energyMax: state.setup.family.energyMax,
    mood: 94,
  });
  state.money = derived.startMoney;
  $("setup").classList.add("hidden");
  $("purchaseModal").classList.add("hidden");
  $("game").classList.remove("hidden");
  renderSpeedControls();
  renderActions();
  renderGuide();
  log("第 1 天 06:00，育儿正式开始。", true);
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!state.running) return;
  const delta = Math.min((now - state.lastTick) / 1000, 0.25);
  state.lastTick = now;
  tick(delta);
  render();
  requestAnimationFrame(loop);
}

function tick(delta) {
  if (!$("eventModal").classList.contains("hidden") || !$("endingModal").classList.contains("hidden")) return;
  const gameMinutes = delta * 2 * state.speed;
  const prevMinute = state.minute;
  state.minute += gameMinutes;
  while (state.minute >= 1440) {
    state.minute -= 1440;
    state.day += 1;
    chargeDaily();
  }

  if (crossed(prevMinute, state.minute, 360)) {
    morningReset();
    queueEvents();
  }
  if (crossed(prevMinute, state.minute, 1200)) {
    queueEvents();
  }

  decay(delta * state.speed);
  updateCooldowns(delta);
  maybeShowEvent();
  checkEnding();
}

function crossed(prev, current, target) {
  return prev < target && current >= target;
}

function decay(seconds) {
  const night = state.minute < 360 || state.minute >= 1200;
  const nightMul = night ? 1.35 : 1;
  const moneyPunish = state.money <= 0 ? 2 : 1;
  const active = activeStatus();
  let hungerDecay = 1.3;
  let energyDecay = 0.9;
  let comfortDecay = Math.max(0.15, 0.7 - derived.comfortDecayReduction);
  let securityDecay = 0.5;

  if (active === "黄疸") comfortDecay += 0.25;
  if (active === "睡眠倒退") energyDecay += 0.55;
  if (active === "出牙") comfortDecay += 0.6;
  if (active === "分离焦虑") securityDecay += 0.65;
  if (active === "挑食") hungerDecay += 0.4;

  baby.hunger -= hungerDecay * nightMul * moneyPunish * seconds;
  baby.energy -= energyDecay * nightMul * seconds;
  baby.comfort -= comfortDecay * nightMul * moneyPunish * seconds;
  baby.security -= securityDecay * nightMul * seconds;
  baby.development += 0.015 * seconds;

  const avg = (baby.hunger + baby.energy + baby.comfort + baby.security) / 4;
  if (avg < 22) baby.health -= 2.1 * seconds;

  if (isCrying()) {
    state.ignoreCry += seconds;
    parent.mood -= 0.45 * seconds;
    if (state.ignoreCry > 18) baby.health -= 2.5 * seconds;
  } else {
    state.ignoreCry = Math.max(0, state.ignoreCry - 2 * seconds);
  }

  if (state.minute >= 360 && state.minute < 1200) {
    parent.energy += 0.9 * state.setup.family.recovery * seconds;
  }

  clampAll();
}

function updateCooldowns(delta) {
  Object.keys(state.cooldowns).forEach((key) => {
    state.cooldowns[key] = Math.max(0, state.cooldowns[key] - delta * state.speed);
  });
}

function chargeDaily() {
  const cost = derived.dailyMilk + derived.dailyDiaper;
  state.money -= cost;
  log(`每日消耗扣除 ${money(cost)}。${state.money <= 0 ? "资金见底，日常供应开始恶化。" : ""}`);
}

function morningReset() {
  parent.energy = parent.energyMax;
  parent.mood = clamp(parent.mood + 8, 0, 100);
  log(`第 ${state.day} 天 06:00，父母勉强恢复了一点秩序。`, true);
}

function queueEvents() {
  const pool = currentEventPool();
  const count = randomInt(1, 3);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  state.eventQueue.push(...shuffled.slice(0, count));
}

function maybeShowEvent() {
  if (state.eventQueue.length && $("eventModal").classList.contains("hidden")) {
    showEvent(state.eventQueue.shift());
  }
}

function showEvent(evt) {
  $("eventModal").classList.remove("hidden");
  $("eventTitle").textContent = evt.title;
  $("eventBody").textContent = evt.body;
  $("eventPhase").textContent = `${currentStage().name} · 突发事件`;
  $("eventChoices").innerHTML = evt.choices.map((option, index) => {
    const realCost = actualCost(option);
    const locked = realCost > state.money && realCost > 0;
    return `
      <button class="choice" data-choice="${index}" ${locked ? "disabled" : ""}>
        <strong>${escapeHtml(option.label)}${realCost > 0 ? `（${escapeHtml(money(realCost))}）` : ""}</strong>
        <span>${locked ? "资金不足，无法选择。" : escapeHtml(option.desc)}</span>
      </button>
    `;
  }).join("");
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => resolveEvent(evt.choices[Number(button.dataset.choice)]));
  });
}

function resolveEvent(option) {
  const cost = actualCost(option);
  state.money -= cost;
  applyEffects(option.effects);
  log(`事件选择：${option.label}${cost ? `，花费 ${money(cost)}` : ""}。`);
  $("eventModal").classList.add("hidden");
  maybeShowEvent();
}

function actualCost(option) {
  return Math.round(option.cost * (option.medical ? derived.medicalDiscount : 1));
}

function performAction(action) {
  if (state.cooldowns[action.id] > 0) return;
  if (action.unlockDay && state.day < action.unlockDay) return;
  if (!action.parent && parent.energy < action.cost) {
    log("父母精力不够，手已经抬不起来了。");
    return;
  }
  if (action.parent) {
    parent.energy = clamp(parent.energy + action.effects.parentEnergy, 0, parent.energyMax);
    parent.mood = clamp(parent.mood + action.effects.parentMood, 0, 100);
  } else {
    parent.energy -= action.cost;
    parent.mood -= 0.5;
    const effects = { ...action.effects };
    if (action.id === "feed") effects.hunger += derived.feedBonus;
    if (action.id === "feed" && activeStatus() === "挑食") effects.hunger *= 0.5;
    if (action.id === "sleep" && activeStatus() === "睡眠倒退") effects.energy *= 0.6;
    if (action.id === "play" && activeStatus() === "分离焦虑") effects.security += 4;
    applyEffects(effects);
  }
  state.cooldowns[action.id] = action.cooldown;
  log(`${action.icon} ${action.name} 完成。`);
  clampAll();
}

function applyEffects(effects) {
  Object.entries(effects).forEach(([key, value]) => {
    if (key in baby) baby[key] += value;
  });
  clampAll();
}

function comfortTap() {
  baby.security += 2.2;
  baby.comfort += 0.8;
  parent.mood -= 0.08;
  clampAll();
}

function clampAll() {
  baby.hunger = clamp(baby.hunger, 0, 100);
  baby.energy = clamp(baby.energy, 0, 100);
  baby.comfort = clamp(baby.comfort, 0, 100);
  baby.security = clamp(baby.security, 0, derived.safetyCap || 100);
  baby.health = clamp(baby.health, 0, 100);
  baby.development = clamp(baby.development, 0, 100);
  parent.energy = clamp(parent.energy, 0, parent.energyMax);
  parent.mood = clamp(parent.mood, 0, 100);
}

function render() {
  $("dayText").textContent = state.day;
  $("clockText").textContent = formatTime(state.minute);
  $("moneyText").textContent = money(state.money);
  $("moneyText").style.color = state.money <= 0 ? "var(--bad)" : "var(--ink)";
  $("parentEnergyText").textContent = `${Math.round(parent.energy)}/${parent.energyMax}`;
  $("parentMoodText").textContent = Math.round(parent.mood);
  $("stageTitle").textContent = currentStage().name;
  $("stageHint").textContent = `${currentStage().hint} 当前状态：${activeStatus() || "平稳"}`;
  renderStats();
  renderActions();
  renderBaby();
  const danger = Math.min(32, state.ignoreCry * 1.5);
  $("dangerPulse").style.boxShadow = `inset 0 0 ${danger}px ${danger / 2}px rgba(239, 98, 98, ${Math.min(0.45, danger / 80)})`;
}

function renderStats() {
  const stats = [
    ["饱腹度", baby.hunger],
    ["精力值", baby.energy],
    ["舒适度", baby.comfort],
    ["安全感", baby.security, derived.safetyCap],
    ["健康值", baby.health],
    ["发育进度", baby.development],
  ];
  $("stats").innerHTML = stats.map(([label, value, max = 100]) => {
    const pct = clamp((value / max) * 100, 0, 100);
    const level = pct < 25 ? "is-bad" : pct < 45 ? "is-warn" : "";
    return `
      <div class="stat">
        <div class="stat__label"><span>${escapeHtml(label)}</span><strong>${Math.round(value)}</strong></div>
        <div class="bar ${level}"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join("");
}

function renderActions() {
  if (!$("actions")) return;
  $("actions").innerHTML = ACTIONS.map((action) => {
    const locked = action.unlockDay && state.day < action.unlockDay;
    const cooldown = state.cooldowns[action.id] || 0;
    const disabled = locked || cooldown > 0;
    const suggested = (
      (action.id === "feed" && baby.hunger < 35) ||
      (action.id === "sleep" && baby.energy < 35) ||
      (action.id === "diaper" && baby.comfort < 35) ||
      (action.id === "play" && baby.security < 35)
    );
    const pct = cooldown > 0 ? (cooldown / action.cooldown) * 100 : 0;
    return `
      <button class="action ${suggested ? "is-suggested" : ""}" data-action="${action.id}" ${disabled ? "disabled" : ""}>
        <span class="action__icon">${escapeHtml(action.icon)}</span>
        <span class="action__name">${escapeHtml(action.name)}</span>
        <span class="action__meta">${locked ? "6 月后解锁" : `冷却 ${action.cooldown}s / ${action.cost < 0 ? "恢复" : "消耗"} ${Math.abs(action.cost)}`}</span>
        <span class="cooldown" style="width:${pct}%"></span>
      </button>
    `;
  }).join("");
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => performAction(ACTIONS.find((action) => action.id === button.dataset.action)));
  });
}

function renderSpeedControls() {
  const speeds = [0.2, 0.5, 1, 2, 4];
  $("speedControls").innerHTML = speeds.map((speed) => `
    <button class="${speed === state.speed ? "is-active" : ""}" data-speed="${speed}">${speed}x</button>
  `).join("");
  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
  });
}

function setSpeed(speed) {
  state.speed = speed;
  renderSpeedControls();
}

function renderGuide() {
  $("guidePanel").innerHTML = STAGES.map((stage) => `
    <h3>${escapeHtml(stage.name)}</h3>
    <p>${escapeHtml(stage.guide)}</p>
  `).join("");
}

function renderBaby() {
  const canvas = $("babyCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const month = currentMonth();
  const expression = baby.health < 35 ? "sick" : isCrying() ? "cry" : baby.energy < 28 ? "sleepy" : "happy";
  const status = activeStatus();
  ctx.clearRect(0, 0, w, h);

  const night = state.minute < 360 || state.minute >= 1200;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, night ? "#111827" : "#23333d");
  bg.addColorStop(0.55, night ? "#151921" : "#1b252b");
  bg.addColorStop(1, night ? "#090d12" : "#11171b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const lamp = ctx.createRadialGradient(180, 70, 10, 180, 70, 260);
  lamp.addColorStop(0, night ? "rgba(239,178,106,0.22)" : "rgba(255,229,174,0.2)");
  lamp.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 20; x < w; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, h);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(260, 318, 188, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#252e38";
  roundRect(ctx, 66, 248, 388, 108, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(123,139,151,0.36)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(92, 268);
  ctx.lineTo(92, 346);
  ctx.moveTo(428, 268);
  ctx.lineTo(428, 346);
  ctx.stroke();

  const blanket = ctx.createLinearGradient(116, 186, 404, 318);
  blanket.addColorStop(0, month > 7 ? "#c79062" : "#d9a064");
  blanket.addColorStop(0.52, status === "黄疸" ? "#e0b75f" : "#d49b73");
  blanket.addColorStop(1, "#9a6b5e");
  ctx.fillStyle = blanket;
  roundRect(ctx, 118, 186, 284, 126, 56);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(152 + i * 46, 204);
    ctx.quadraticCurveTo(170 + i * 46, 250, 150 + i * 46, 296);
    ctx.stroke();
  }

  const headSize = 118 + month * 3;
  const headX = 260;
  const headY = 148 - Math.min(month, 8) * 3;
  let skin = "#f1c1a4";
  if (status === "黄疸") skin = "#e9c779";
  if (status === "出牙") skin = "#f0b394";
  if (baby.health < 35) skin = "#d9a091";
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(headX, headY, headSize * 0.55, headSize * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.11)";
  ctx.beginPath();
  ctx.ellipse(headX - 28, headY - 32, headSize * 0.24, headSize * 0.14, -0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(headX - headSize * 0.56, headY + 4, 14, 20, -0.18, 0, Math.PI * 2);
  ctx.ellipse(headX + headSize * 0.56, headY + 4, 14, 20, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3b2822";
  for (let i = 0; i < month + 2; i += 1) {
    ctx.beginPath();
    ctx.arc(headX - 42 + i * 12, headY - headSize * 0.56 + Math.sin(i) * 5, 5 + month * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFace(ctx, headX, headY, expression);

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(148, 238, 24, 18, -0.35, 0, Math.PI * 2);
  ctx.ellipse(372, 238, 24, 18, 0.35, 0, Math.PI * 2);
  ctx.fill();

  if (baby.health < 35) {
    drawThermometer(ctx, 382, 116);
    drawSweat(ctx, headX + 54, headY - 18);
  }
  if (status === "出牙") {
    drawDrool(ctx, headX + 18, headY + 34);
  }
  if (status === "分离焦虑") {
    drawSeparationHalo(ctx, headX, headY);
  }
  if (baby.hunger < 30) {
    drawNeedBadge(ctx, 82, 72, "饿");
  }
  if (baby.comfort < 30) {
    drawNeedBadge(ctx, 82, 116, "脏");
  }
  if (baby.security < 30) {
    drawNeedBadge(ctx, 82, 160, "怕");
  }

  drawStatusPill(ctx, `${currentStage().name} · ${status || "平稳"}`, 24, 28);
}

function drawFace(ctx, x, y, expression) {
  ctx.strokeStyle = "#3a2722";
  ctx.fillStyle = "#3a2722";
  ctx.lineWidth = 5;
  if (expression === "sleepy") {
    eyeArc(ctx, x - 32, y - 6);
    eyeArc(ctx, x + 32, y - 6);
  } else {
    ctx.beginPath();
    ctx.arc(x - 32, y - 8, 6, 0, Math.PI * 2);
    ctx.arc(x + 32, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  if (expression === "happy") ctx.arc(x, y + 22, 25, 0.15, Math.PI - 0.15);
  if (expression === "cry") ctx.arc(x, y + 44, 24, Math.PI + 0.1, Math.PI * 2 - 0.1);
  if (expression === "sick") ctx.moveTo(x - 20, y + 30), ctx.lineTo(x + 20, y + 30);
  if (expression === "sleepy") ctx.arc(x, y + 26, 18, 0.1, Math.PI - 0.1);
  ctx.stroke();
  if (expression === "cry") {
    ctx.strokeStyle = "#75c9e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 42, y + 8);
    ctx.lineTo(x - 48, y + 44);
    ctx.moveTo(x + 42, y + 8);
    ctx.lineTo(x + 48, y + 44);
    ctx.stroke();
    ctx.fillStyle = "rgba(117,201,232,0.72)";
    ctx.beginPath();
    ctx.ellipse(x - 49, y + 48, 4, 7, 0.2, 0, Math.PI * 2);
    ctx.ellipse(x + 49, y + 48, 4, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStatusPill(ctx, text, x, y) {
  ctx.font = "16px Microsoft YaHei, sans-serif";
  const width = Math.max(128, ctx.measureText(text).width + 28);
  ctx.fillStyle = "rgba(12,16,22,0.68)";
  roundRect(ctx, x, y, width, 34, 17);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,208,200,0.34)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, 34, 17);
  ctx.stroke();
  ctx.fillStyle = "rgba(244,234,220,0.9)";
  ctx.fillText(text, x + 14, y + 23);
}

function drawNeedBadge(ctx, x, y, text) {
  ctx.fillStyle = "rgba(239,93,93,0.82)";
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4ea";
  ctx.font = "700 16px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawThermometer(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.45);
  ctx.strokeStyle = "rgba(255,244,234,0.86)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 44);
  ctx.stroke();
  ctx.fillStyle = "#ef5d5d";
  ctx.beginPath();
  ctx.arc(0, 48, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSweat(ctx, x, y) {
  ctx.fillStyle = "rgba(124,208,234,0.76)";
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 12, 0.18, 0, Math.PI * 2);
  ctx.ellipse(x + 18, y + 26, 4, 8, -0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawDrool(ctx, x, y) {
  ctx.strokeStyle = "rgba(177,229,238,0.82)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 8, y + 16, x + 4, y + 32);
  ctx.stroke();
  ctx.fillStyle = "rgba(177,229,238,0.72)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 36, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSeparationHalo(ctx, x, y) {
  ctx.strokeStyle = "rgba(240,182,91,0.35)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x, y, 82 + i * 16, -0.7, 0.7);
    ctx.stroke();
  }
}

function eyeArc(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0.15, Math.PI - 0.15);
  ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function isCrying() {
  return baby.hunger < 25 || baby.energy < 18 || baby.comfort < 25 || baby.security < 22 || baby.health < 32;
}

function currentMonth() {
  return Math.min(11, Math.floor((state.day - 1) / 30.4));
}

function currentStage() {
  const month = currentMonth();
  return STAGES.find((stage) => month >= stage.minMonth && month <= stage.maxMonth) || STAGES.at(-1);
}

function activeStatus() {
  const stage = currentStage();
  const dayInStage = state.day - Math.floor(stage.minMonth * 30.4);
  return dayInStage <= stage.duration ? stage.status : "";
}

function currentEventPool() {
  const month = currentMonth();
  if (month === 0) return EVENT_POOLS.newborn;
  if (month <= 3) return EVENT_POOLS.sleep;
  if (month <= 5) return EVENT_POOLS.teething;
  if (month <= 8) return EVENT_POOLS.anxiety;
  return EVENT_POOLS.toddler;
}

function checkEnding() {
  if (baby.health <= 0) {
    endGame("残酷结局", "健康值归零，照护系统彻底崩溃。这不是一次轻松失败，而是提醒：长期忽视会迅速吞掉所有余地。");
  } else if (state.day >= 365) {
    const score = baby.development + Math.max(0, state.money / 1000);
    const title = score > 92 ? "了不起的父母" : score > 65 ? "温暖的家庭" : "新手爸妈辛苦了";
    endGame(title, `宝宝迎来 1 岁生日。发育进度 ${Math.round(baby.development)}，剩余资金 ${money(state.money)}。`);
  }
}

function endGame(title, body) {
  state.running = false;
  $("endingTitle").textContent = title;
  $("endingBody").textContent = body;
  $("endingModal").classList.remove("hidden");
}

function log(message, important = false) {
  const entry = document.createElement("div");
  entry.className = "log-entry";

  if (important) {
    const strong = document.createElement("strong");
    strong.textContent = message;
    entry.appendChild(strong);
  } else {
    entry.textContent = message;
  }

  $("logPanel").prepend(entry);
}

function formatTime(value) {
  const total = Math.floor(value);
  const hours = Math.floor(total / 60).toString().padStart(2, "0");
  const minutes = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function money(value) {
  return `${value < 0 ? "-" : ""}¥${Math.abs(Math.round(value)).toLocaleString("zh-CN")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.addEventListener("keydown", (event) => {
  const speeds = [0.2, 0.5, 1, 2, 4];
  const index = speeds.indexOf(state.speed);
  if (event.key === "[") setSpeed(speeds[Math.max(0, index - 1)]);
  if (event.key === "]") setSpeed(speeds[Math.min(speeds.length - 1, index + 1)]);
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    $("logPanel").classList.toggle("hidden", tab.dataset.tab !== "log");
    $("guidePanel").classList.toggle("hidden", tab.dataset.tab !== "guide");
  });
});

$("startGame").addEventListener("click", startGame);
$("confirmFamily").addEventListener("click", confirmFamilySelection);
$("restartGame").addEventListener("click", () => window.location.reload());
$("comfortBaby").addEventListener("click", comfortTap);

initSetup();
