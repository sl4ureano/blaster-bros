const statusEl = document.getElementById("status");
const canvas = document.getElementById("remoteGame");
const ctx = canvas.getContext("2d");
const emptyEl = document.getElementById("empty");
const codeInput = document.getElementById("roomCode");
const joinBtn = document.getElementById("joinBtn");
const controllerLink = document.getElementById("controllerLink");
const fitBtn = document.getElementById("fitBtn");

let ws = null;
let currentCode = new URLSearchParams(location.search).get("code") || "";
let latestState = null;
let renderedStates = 0;
let lastFpsAt = performance.now();

function wsUrl(){
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

function normalizeCode(v){
  return String(v || "").trim().toUpperCase();
}

function setStatus(text){
  statusEl.textContent = text;
}

function connect(code){
  code = normalizeCode(code);
  if(!code){
    setStatus("Informe o código da sala.");
    return;
  }

  currentCode = code;
  codeInput.value = code;
  history.replaceState(null, "", `${location.pathname}?code=${code}`);
  controllerLink.href = `/controller.html?code=${code}`;

  if(ws) ws.close();
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    ws.send(JSON.stringify({type:"join-viewer", code}));
    setStatus(`Conectando na sala ${code}...`);
  };

  ws.onmessage = event => {
    const msg = JSON.parse(event.data);

    if(msg.type === "viewer-ready"){
      setStatus(`Assistindo sala ${msg.code}.`);
      if(msg.lastFrame?.type === "state") latestState = msg.lastFrame;
      return;
    }

    if(msg.type === "state"){
      // Guarda sempre só o estado mais recente. Estados velhos são descartados.
      latestState = msg;
      emptyEl.style.display = "none";
      return;
    }

    if(msg.type === "players"){
      setStatus(`Sala ${currentCode} · jogadores ${msg.players?.length || 0}/4`);
      return;
    }

    if(msg.type === "error"){
      setStatus(msg.message || "Erro.");
      emptyEl.style.display = "grid";
    }
  };

  ws.onclose = () => setStatus("Desconectado.");
}

function renderLoop(){
  if(latestState && window.BlasterSharedRenderer){
    window.BlasterSharedRenderer.draw(ctx, latestState, {width:canvas.width, height:canvas.height});
    emptyEl.style.display="none";
    renderedStates++;

    const now=performance.now();
    if(now-lastFpsAt>2000){
      setStatus(`Sala ${currentCode} · visual idêntico · ${Math.round(renderedStates*1000/(now-lastFpsAt))} fps`);
      renderedStates=0;
      lastFpsAt=now;
    }
  }
  requestAnimationFrame(renderLoop);
}

fitBtn?.addEventListener("click", async () => {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch {}
});

joinBtn.onclick = () => connect(codeInput.value);
codeInput.onkeydown = e => {
  if(e.key === "Enter") connect(codeInput.value);
};

if(currentCode) connect(currentCode);
else setStatus("Digite o código da sala.");

renderLoop();
