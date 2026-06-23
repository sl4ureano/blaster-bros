const params = new URLSearchParams(location.search);
let code = (params.get("code") || "").toUpperCase();

const statusEl = document.getElementById("status");
const playerEl = document.getElementById("player");
const colorChoicesEl = document.getElementById("colorChoices");
const manualCode = document.getElementById("manualCode");
const connectBtn = document.getElementById("connectBtn");
const startOverlay = document.getElementById("startOverlay");
const moveStick = document.getElementById("moveStick");
const aimStick = document.getElementById("aimStick");
const grenadeBtn = document.getElementById("bombBtn");
const jumpBtn = document.getElementById("jumpBtn");
const readyBtn = document.getElementById("readyBtn");
const restartBtn = document.getElementById("restartBtn");
const difficultyEl = document.getElementById("difficulty");
const controllerEl = document.querySelector(".controller");

const PLAYER_COLOR_KEY = "blasterbros.preferredPlayerColor.v1";
const BLASTER_CLIENT_ID_KEY = "blasterbros.controllerClientId.v1";
let clientId = localStorage.getItem(BLASTER_CLIENT_ID_KEY);
if (!clientId) {
  clientId = `bb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  localStorage.setItem(BLASTER_CLIENT_ID_KEY, clientId);
}

let preferredPlayerId = Number(localStorage.getItem(PLAYER_COLOR_KEY) || 0) || 0;
let takenPlayers = [];
let currentPlayerId = 0;

let ws = null;
let connecting = false;
let input = {
  move:{x:0,y:0},
  aim:{x:1,y:0},
  shooting:false,
  jump:false,
  jumpSeq:0,
  grenade:false,
  grenadeSeq:0,
  ready:false,
  start:false,
  restart:false,
  difficulty:'normal',
  down:false,
  pauseMenu:false
};
let lastSent = 0;
const LOW_LATENCY_INPUT_MS = 16;
let inputDirty = true;
let inputTick = null;
let lastMoveTap = 0;
let jumpPulseTimer = null;
let tvGameState = { started:false, lobby:true, levelIndex:0, levelName:"" };
manualCode.value = code;

function setStatus(text){ statusEl.textContent = text; }
function wsUrl(){ return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`; }


function enterLobbyMode(message = "Game over. Toque em COMEÇAR para reiniciar.") {
  stopControlLayoutEditing();
  controllerEl?.classList.remove("playing");
  clearAppliedControlLayout();
  setStatus(message);
  if (readyBtn) {
    readyBtn.textContent = "COMEÇAR";
    readyBtn.disabled = false;
    readyBtn.classList.remove("selected");
  }
  input.ready = false;
  input.start = false;
  resizeSticks();
  setTimeout(clearAppliedControlLayout, 80);
}


function applySavedControlLayoutAfterGameplayStart(){
  // Reaplica só durante gameplay; se voltar para lobby, limpa.
  const safeApply = () => {
    if(canEditControlLayout()) forceApplySavedControlLayout();
    else clearAppliedControlLayout();
  };
  setTimeout(safeApply, 60);
  setTimeout(safeApply, 250);
  setTimeout(safeApply, 700);
}

function enterGameplayMode() {
  controllerEl?.classList.add("playing");
  setStatus("Controle ativo.");
  if (readyBtn) {
    readyBtn.textContent = "JOGO INICIADO";
    readyBtn.disabled = true;
  }
  resizeSticks();
  applySavedControlLayoutAfterGameplayStart();
}

function applyTvGameState(state = {}) {
  tvGameState = {
    ...tvGameState,
    ...state,
    started: !!state.started,
    lobby: !!state.lobby
  };

  if (tvGameState.started && !tvGameState.lobby) {
    enterGameplayMode();
    const level = tvGameState.levelName ? ` · ${tvGameState.levelName}` : "";
    setStatus(`Controle ativo${level}.`);
  } else {
    enterLobbyMode("Lobby. Toque em COMEÇAR para iniciar.");
  }
}

async function fullscreen(){
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {}
  try { await screen.orientation.lock("landscape"); } catch {}
}

function resizeSticks(){
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const size = Math.max(165, Math.min(vh * 0.58, vw * 0.30, 310));
  moveStick.style.setProperty("--size", `${size}px`);
  aimStick.style.setProperty("--size", `${size}px`);
}

function cleanup(){
  stopInputPump();
  if (!ws) return;
  ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
  try { ws.close(); } catch {}
  ws = null;
}

function updateColorChoices(players = takenPlayers){
  takenPlayers = players || [];
  const used = new Set(takenPlayers.filter(p => p.clientId !== clientId).map(p => Number(p.playerId)));
  const own = takenPlayers.find(p => p.clientId === clientId);
  if (own?.playerId) currentPlayerId = Number(own.playerId);

  colorChoicesEl?.querySelectorAll("button[data-player-id]").forEach(btn => {
    const id = Number(btn.dataset.playerId);
    const unavailable = used.has(id);
    btn.disabled = unavailable;
    btn.classList.toggle("used", unavailable);
    btn.classList.toggle("selected", id === currentPlayerId || (!currentPlayerId && id === preferredPlayerId));
  });
}

function chooseColor(playerId){
  preferredPlayerId = Number(playerId);
  localStorage.setItem(PLAYER_COLOR_KEY, String(preferredPlayerId));
  updateColorChoices();

  if (ws && ws.readyState === WebSocket.OPEN && currentPlayerId && currentPlayerId !== preferredPlayerId) {
    ws.send(JSON.stringify({type:"color-select", playerId: preferredPlayerId}));
  }
}

colorChoicesEl?.addEventListener("click", e => {
  const btn = e.target.closest("button[data-player-id]");
  if (!btn || btn.disabled) return;
  chooseColor(Number(btn.dataset.playerId));
});

updateColorChoices();

function connect(){
  code = (manualCode.value || code || "").trim().toUpperCase();
  if (!code) return setStatus("Digite o código da TV.");
  if (connecting) return;
  connecting = true;
  cleanup();
  resizeSticks();
  setStatus("Conectando...");

  ws = new WebSocket(wsUrl());
  const timer = setTimeout(() => {
    if (connecting) {
      connecting = false;
      setStatus("Não conectou. Confira Wi-Fi/IP.");
      cleanup();
    }
  }, 5000);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type:"join-controller", code, clientId, preferredPlayerId }));
    setStatus("Entrando na sala...");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "tv-event" && msg.event === "game-over") {
      applyTvGameState({started:false, lobby:true});
      return;
    }

    if (msg.type === "tv-event" && msg.event === "game-state") {
      applyTvGameState(msg);
      return;
    }

    if (msg.type === "controller-ready") {
      clearTimeout(timer);
      connecting = false;
      currentPlayerId = Number(msg.playerId || 0);
      preferredPlayerId = currentPlayerId || preferredPlayerId;
      localStorage.setItem(PLAYER_COLOR_KEY, String(preferredPlayerId));
      playerEl.textContent = `Jogador ${msg.playerId}`;
      updateColorChoices(msg.players || takenPlayers);
      setStatus(tvGameState.started && !tvGameState.lobby ? "Reconectado. Continuando partida." : "Conectado. Escolha dificuldade e COMEÇAR.");
      connectBtn.textContent = "Reconectar";
      startInputPump();
      send(true);
    }

    if (msg.type === "players") {
      updateColorChoices(msg.players || []);
    }

    if (msg.type === "color-denied") {
      setStatus(msg.message || "Cor já está em uso.");
      updateColorChoices();
    }
    if (msg.type === "error") {
      clearTimeout(timer);
      connecting = false;
      setStatus(msg.message || "Erro.");
      cleanup();
    }
  };

  ws.onerror = () => {
    clearTimeout(timer);
    connecting = false;
    setStatus("Erro. Use o IP do PC, não localhost.");
    cleanup();
  };

  ws.onclose = () => {
    if (connecting) return;
    setStatus("Desconectado.");
  };
}

function send(force=false){
  const now = performance.now();
  if (!force && !inputDirty && now - lastSent < 48) return;
  if (!force && now - lastSent < LOW_LATENCY_INPUT_MS) return;

  lastSent = now;
  inputDirty = false;
  input.down = input.move.y > 0.55;

  if (ws && ws.readyState === WebSocket.OPEN) {
    // Payload compacto, mas mantém nomes para compatibilidade.
    ws.send(JSON.stringify({type:"control",...input}));
  }
}

function markInputDirty(){
  inputDirty = true;
  send(false);
}

function startInputPump(){
  if(inputTick) clearInterval(inputTick);
  inputTick = setInterval(() => send(false), LOW_LATENCY_INPUT_MS);
}

function stopInputPump(){
  if(inputTick) clearInterval(inputTick);
  inputTick = null;
}

function bindStick(el, key, options={}){
  const knob = el.querySelector(".knob");
  let active = false;

  function set(clientX, clientY){
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.32;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const l = Math.hypot(dx, dy);
    if (l > max) {
      dx = dx / l * max;
      dy = dy / l * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input[key].x = dx / max;
    input[key].y = dy / max;
    markInputDirty();

    if (key === "aim") {
      input.shooting = Math.hypot(input.aim.x, input.aim.y) > 0.22;
    }

    send();
  }

  function reset(){
    active = false;
    knob.style.transform = "translate(0,0)";
    if (options.reset) {
      input[key].x = 0;
      input[key].y = 0;
    }
    if (key === "aim") {
      input.shooting = false;
    }

    send(true);
  }

  el.addEventListener("pointerdown", e => {
    e.preventDefault();
    e.stopPropagation();

    active = true;
    try { el.setPointerCapture(e.pointerId); } catch {}
    set(e.clientX, e.clientY);
  }, {passive:false});
  el.addEventListener("pointermove", e => {
    e.preventDefault();
    e.stopPropagation();
    if (!active) return;
    set(e.clientX, e.clientY);
  }, {passive:false});
  el.addEventListener("pointerup", e => { e.preventDefault(); e.stopPropagation(); reset(); }, {passive:false});
  el.addEventListener("pointercancel", e => { e?.preventDefault?.(); e?.stopPropagation?.(); reset(); }, {passive:false});
}



bindStick(moveStick, "move", { reset:true });
bindStick(aimStick, "aim", { reset:false });



function pressJump(e){
  e.preventDefault();
  e.stopPropagation();

  // Evento de pulo separado do estado do botão.
  // Isso permite andar + pular ao mesmo tempo e não perde pulo em multi-touch.
  input.jump = true;
  input.jumpSeq = (input.jumpSeq || 0) + 1;
  send(true);

  clearTimeout(jumpPulseTimer);
  jumpPulseTimer = setTimeout(() => {
    input.jump = false;
    send(true);
  }, 170);

  navigator.vibrate?.(25);
}

function releaseJump(e){
  e?.preventDefault?.();
  e?.stopPropagation?.();

  clearTimeout(jumpPulseTimer);
  input.jump = false;
  send(true);
}

jumpBtn.addEventListener("pointerdown", pressJump, {passive:false});
jumpBtn.addEventListener("pointerup", releaseJump, {passive:false});
jumpBtn.addEventListener("pointercancel", releaseJump, {passive:false});
jumpBtn.addEventListener("lostpointercapture", releaseJump, {passive:false});

let grenadePulseTimer = null;

function pressGrenade(e){
  e.preventDefault();
  e.stopPropagation();

  if (layoutEditing) return;

  // Evento independente, igual ao pulo.
  // Evita perder a bomba se o toque for rápido ou junto com andar/mirar.
  input.grenade = true;
  input.grenadeSeq = (input.grenadeSeq || 0) + 1;
  send(true);

  clearTimeout(grenadePulseTimer);
  grenadePulseTimer = setTimeout(() => {
    input.grenade = false;
    send(true);
  }, 190);

  navigator.vibrate?.(55);
}

function releaseGrenade(e){
  e?.preventDefault?.();
  e?.stopPropagation?.();

  clearTimeout(grenadePulseTimer);
  input.grenade = false;
  send(true);
}

grenadeBtn.addEventListener("pointerdown", pressGrenade, {passive:false});
grenadeBtn.addEventListener("pointerup", releaseGrenade, {passive:false});
grenadeBtn.addEventListener("pointercancel", releaseGrenade, {passive:false});
grenadeBtn.addEventListener("lostpointercapture", releaseGrenade, {passive:false});

readyBtn.addEventListener("click", e => {
  e.preventDefault();

  if (tvGameState.started && !tvGameState.lobby) {
    enterGameplayMode();
    send(true);
    return;
  }

  input.ready = true;
  input.start = true;
  send(true);

  setStatus(`Iniciando no ${input.difficulty.toUpperCase()}...`);
  navigator.vibrate?.(90);

  // Esconde dificuldade e COMEÇAR imediatamente após enviar início.
  enterGameplayMode();

  // start é pulso; depois volta para false para não reenviar infinitamente
  setTimeout(() => {
    input.start = false;
    input.ready = false;
    send(true);
  }, 120);
});

restartBtn?.addEventListener("click", e => {
  e.preventDefault();
  if (!confirm("Reiniciar a fase atual?")) return;

  input.restart = true;
  send(true);
  navigator.vibrate?.(120);
  setStatus("Reiniciando fase atual...");

  setTimeout(() => {
    input.restart = false;
    send(true);
  }, 120);
});




difficultyEl?.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    input.difficulty = btn.dataset.difficulty || "normal";
    difficultyEl.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    setStatus(`Dificuldade: ${btn.textContent}`);
    send(true);
    navigator.vibrate?.(30);
  });
});

startOverlay.addEventListener("click", async () => {
  await fullscreen();
  startOverlay.classList.add("hidden");
  resizeSticks();
  connect();
});



startOverlay.addEventListener("touchend", async e => {
  e.preventDefault();
  await fullscreen();
  startOverlay.classList.add("hidden");
  resizeSticks();
  connect();
}, { passive:false });

connectBtn.onclick = async () => { await fullscreen(); connect(); };
window.addEventListener("resize", resizeSticks);
window.addEventListener("orientationchange", () => setTimeout(resizeSticks, 250));
resizeSticks();
setStatus(code ? "Toque para ativar." : "Digite o código.");


// ===== Layout customizável do controle =====
const CONTROL_LAYOUT_KEY = "blasterbros.controlLayout.v1";
const layoutEditBtn = document.getElementById("layoutEditBtn");
const layoutSaveBtn = document.getElementById("layoutSaveBtn");
const layoutResetBtn = document.getElementById("layoutResetBtn");

let layoutEditing = false;
let layoutDrag = null;

function canEditControlLayout(){
  return controllerEl?.classList.contains("playing");
}

function stopControlLayoutEditing(){
  layoutEditing = false;
  layoutDrag = null;
  controllerEl?.classList.remove("layout-editing");
}

function closeConnectionMenu(){
  const manual = document.querySelector(".compact-manual");
  if (manual && manual.open) {
    manual.open = false;
    sendPauseMenuState(false);
  }
}

function sendPauseMenuState(open){
  input.pauseMenu = !!open;
  send(true);
}

function clearAppliedControlLayout(){
  // Remove posições absolutas quando volta para lobby.
  // Isso evita analógico/botões trepando no COMEÇAR.
  for(const [, el] of layoutTargets()){
    el.classList.remove("layout-floating");
    el.style.left = "";
    el.style.top = "";
    el.style.right = "";
    el.style.bottom = "";
    el.style.transform = "";
    el.style.width = "";
    el.style.height = "";
    el.style.minWidth = "";
    el.style.minHeight = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";
    el.style.display = "";
    el.style.placeItems = "";
    el.style.opacity = "";
    el.style.visibility = "";
    el.style.width = "";
    el.style.height = "";
    el.style.minWidth = "";
    el.style.minHeight = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";
    el.style.display = "";
    el.style.placeItems = "";
    el.style.opacity = "";
    el.style.visibility = "";
  }
}

function showLayoutToast(text){
  let el = document.querySelector(".layout-toast");
  if(!el){
    el = document.createElement("div");
    el.className = "layout-toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.remove(), 1400);
}

function layoutTargets(){
  return [
    ["move", document.querySelector(".move-zone")],
    ["aim", document.querySelector(".aim-zone")],
    ["jump", document.getElementById("jumpBtn")],
    ["grenade", document.getElementById("bombBtn")]
  ].filter(([,el]) => el);
}

function prepareLayoutTargets(){
  for(const [id, el] of layoutTargets()){
    el.dataset.layoutId = id;
  }
}

function migrateOldActionLayout(saved){
  // Mantém compatibilidade com versões em que Pular+Bomba eram um grupo.
  // Se existir "actions", usa como ponto inicial para os dois botões apenas quando eles ainda não têm posição.
  if (!saved) return saved;
  if (saved.actions) {
    if (!saved.grenade) saved.grenade = saved.actions;
    if (!saved.jump) saved.jump = {
      left: `${(parseInt(saved.actions.left, 10) || 0) + 86}px`,
      top: saved.actions.top
    };
    delete saved.actions;
  }
  return saved;
}

function applySavedControlLayout(){
  prepareLayoutTargets();

  if(!canEditControlLayout()){
    clearAppliedControlLayout();
    return;
  }

  forceApplySavedControlLayout();
}

function forceApplySavedControlLayout(){
  if(!canEditControlLayout()){
    clearAppliedControlLayout();
    return;
  }

  prepareLayoutTargets();

  let saved = null;
  try { saved = migrateOldActionLayout(JSON.parse(localStorage.getItem(CONTROL_LAYOUT_KEY) || "{}")); } catch {}

  for(const [id, el] of layoutTargets()){
    const pos = saved?.[id];
    if(!pos) continue;
    el.classList.add("layout-floating");

    const isActionButton = el.id === "bombBtn" || el.id === "jumpBtn";
    const current = el.getBoundingClientRect();
    const fallback = isActionButton ? Math.max(70, Math.min(104, innerHeight * 0.18)) : 80;
    const w = current.width || el.offsetWidth || fallback;
    const h = current.height || el.offsetHeight || fallback;
    const left = Math.max(8, Math.min(innerWidth - w - 8, parseInt(pos.left, 10) || 8));
    const top = Math.max(8, Math.min(innerHeight - h - 8, parseInt(pos.top, 10) || 8));

    el.style.display = isActionButton ? "grid" : "";
    el.style.placeItems = isActionButton ? "center" : "";
    el.style.width = `${Math.round(w)}px`;
    el.style.height = `${Math.round(h)}px`;
    el.style.minWidth = `${Math.round(w)}px`;
    el.style.minHeight = `${Math.round(h)}px`;
    el.style.maxWidth = `${Math.round(w)}px`;
    el.style.maxHeight = `${Math.round(h)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.transform = "none";
    el.style.opacity = "1";
    el.style.visibility = "visible";
  }
}

function saveControlLayout(){
  if(!canEditControlLayout()){
    showLayoutToast("Salve o layout durante o jogo");
    closeConnectionMenu();
    return;
  }

  const data = {};
  for(const [id, el] of layoutTargets()){
    const r = el.getBoundingClientRect();
    data[id] = { left:`${Math.round(r.left)}px`, top:`${Math.round(r.top)}px` };
  }

  localStorage.setItem(CONTROL_LAYOUT_KEY, JSON.stringify(data));

  // Depois de salvar, sai do modo edição, fecha o menu e mantém o layout aplicado.
  stopControlLayoutEditing();
  forceApplySavedControlLayout();
  closeConnectionMenu();

  showLayoutToast("Layout salvo");
}

function resetControlLayout(){
  localStorage.removeItem(CONTROL_LAYOUT_KEY);
  for(const [, el] of layoutTargets()){
    el.classList.remove("layout-floating");
    el.style.left = "";
    el.style.top = "";
    el.style.right = "";
    el.style.bottom = "";
    el.style.transform = "";
    el.style.width = "";
    el.style.height = "";
    el.style.minWidth = "";
    el.style.minHeight = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";
    el.style.display = "";
    el.style.placeItems = "";
    el.style.opacity = "";
    el.style.visibility = "";
    el.style.width = "";
    el.style.height = "";
    el.style.minWidth = "";
    el.style.minHeight = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";
    el.style.display = "";
    el.style.placeItems = "";
    el.style.opacity = "";
    el.style.visibility = "";
  }
  stopControlLayoutEditing();
  closeConnectionMenu();
  showLayoutToast("Layout resetado");
}

function toggleLayoutEditing(){
  if(!canEditControlLayout()){
    stopControlLayoutEditing();
    showLayoutToast("Layout só pode ser editado durante o jogo");
    return;
  }

  layoutEditing = !layoutEditing;
  controllerEl?.classList.toggle("layout-editing", layoutEditing);
  prepareLayoutTargets();
  showLayoutToast(layoutEditing ? "Modo edição: arraste os controles" : "Modo edição desligado");
}

function pointerLayoutTarget(e){
  if(!canEditControlLayout()){
    stopControlLayoutEditing();
    return null;
  }

  let target = e.target.closest?.("[data-layout-id]");
  if(!layoutEditing || !target) return null;

  // Cada elemento é editável individualmente.
  // Bomba e pular devem ser arrastados sozinhos, não em grupo.

  // Nunca deixa editar controles de lobby.
  if(target.closest(".lobby-only") || target.id === "readyBtn" || target.closest(".difficulty-panel")){
    return null;
  }

  return target;
}

document.addEventListener("pointerdown", e => {
  const target = pointerLayoutTarget(e);
  if(!target) return;
  e.preventDefault();
  e.stopPropagation();

  const r = target.getBoundingClientRect();
  const isActionButton = target.id === "bombBtn" || target.id === "jumpBtn";

  // Preserva tamanho antes de virar fixed.
  // Sem isso, botão redondo pode perder regra de grid/flex e parecer que sumiu.
  target.classList.add("layout-floating");
  target.style.display = isActionButton ? "grid" : "";
  target.style.placeItems = isActionButton ? "center" : "";
  target.style.width = `${Math.round(r.width || 82)}px`;
  target.style.height = `${Math.round(r.height || 82)}px`;
  target.style.minWidth = `${Math.round(r.width || 82)}px`;
  target.style.minHeight = `${Math.round(r.height || 82)}px`;
  target.style.maxWidth = `${Math.round(r.width || 82)}px`;
  target.style.maxHeight = `${Math.round(r.height || 82)}px`;
  target.style.left = `${Math.round(r.left)}px`;
  target.style.top = `${Math.round(r.top)}px`;
  target.style.right = "auto";
  target.style.bottom = "auto";
  target.style.transform = "none";
  target.style.opacity = "1";
  target.style.visibility = "visible";

  layoutDrag = {
    el: target,
    pointerId: e.pointerId,
    dx: e.clientX - r.left,
    dy: e.clientY - r.top
  };
  try { target.setPointerCapture?.(e.pointerId); } catch {}
}, true);

document.addEventListener("pointermove", e => {
  if(!layoutDrag) return;
  e.preventDefault();
  const w = layoutDrag.el.offsetWidth || layoutDrag.el.getBoundingClientRect().width || 80;
  const h = layoutDrag.el.offsetHeight || layoutDrag.el.getBoundingClientRect().height || 80;
  const margin = 8;
  const left = Math.max(margin, Math.min(innerWidth - w - margin, e.clientX - layoutDrag.dx));
  const top = Math.max(margin, Math.min(innerHeight - h - margin, e.clientY - layoutDrag.dy));
  layoutDrag.el.style.left = `${Math.round(left)}px`;
  layoutDrag.el.style.top = `${Math.round(top)}px`;
}, true);

document.addEventListener("pointerup", e => {
  if(!layoutDrag) return;
  layoutDrag = null;
}, true);

layoutEditBtn?.addEventListener("click", e => { e.preventDefault(); toggleLayoutEditing(); });
layoutSaveBtn?.addEventListener("click", e => { e.preventDefault(); saveControlLayout(); });
layoutResetBtn?.addEventListener("click", e => { e.preventDefault(); resetControlLayout(); });

addEventListener("resize", () => setTimeout(() => {
  if (canEditControlLayout()) applySavedControlLayout();
  else clearAppliedControlLayout();
}, 120));
setTimeout(() => {
  if (canEditControlLayout()) applySavedControlLayout();
  else clearAppliedControlLayout();
}, 250);





// Pausa a TV enquanto o menu Conexão está aberto.
const manualConnectionDetails = document.querySelector(".compact-manual");
manualConnectionDetails?.addEventListener("toggle", () => {
  sendPauseMenuState(!!manualConnectionDetails.open);
});
