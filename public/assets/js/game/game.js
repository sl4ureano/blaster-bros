const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const HUD_LAYOUT_KEY = "blasterbros.hudLayout.v1";
const hudEditBtn = document.getElementById("hudEditBtn");
const hudSaveBtn = document.getElementById("hudSaveBtn");
const hudResetBtn = document.getElementById("hudResetBtn");
let hudEditing = false;
let hudDrag = null;
let hudZones = [];

function defaultHudLayout(){
  return {
    singlePlayer:{x:18,y:12},
    players:{x:18,y:14},
    arms:{x:430,y:14},
    bomb:{x:592,y:14},
    time:{x:770,y:14},
    enemies:{x:910,y:14},
    score:{x:1078,y:14},
    fase:{x:18,y:100}
  };
}

let hudLayout = loadHudLayout();

function loadHudLayout(){
  try {
    return {...defaultHudLayout(), ...(JSON.parse(localStorage.getItem(HUD_LAYOUT_KEY) || "{}"))};
  } catch {
    return defaultHudLayout();
  }
}

function saveHudLayout(){
  localStorage.setItem(HUD_LAYOUT_KEY, JSON.stringify(hudLayout));
  toast?.("HUD salva");
}

function resetHudLayout(){
  localStorage.removeItem(HUD_LAYOUT_KEY);
  hudLayout = defaultHudLayout();
  toast?.("HUD resetada");
}

function hudZone(id, x, y, w, h){
  if(!hudEditing) return;
  hudZones.push({id,x,y,w,h});
  ctx.save();
  ctx.strokeStyle = "#ffe66d";
  ctx.lineWidth = 3;
  ctx.setLineDash([8,6]);
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = "rgba(255,230,109,.12)";
  ctx.fillRect(x,y,w,h);
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffe66d";
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(id, x+6, y+15);
  hudZone(label.toLowerCase(), x, y, w, h);
  ctx.restore();
}

function hitHudZone(x,y){
  for(let i=hudZones.length-1;i>=0;i--){
    const z=hudZones[i];
    if(x>=z.x && x<=z.x+z.w && y>=z.y && y<=z.y+z.h) return z;
  }
  return null;
}

hudEditBtn?.addEventListener("click", () => {
  hudEditing = !hudEditing;
  hudEditBtn.textContent = hudEditing ? "Editando HUD" : "Editar HUD";
  toast?.(hudEditing ? "Arraste os blocos da HUD" : "Edição de HUD desligada");
});
hudSaveBtn?.addEventListener("click", saveHudLayout);
hudResetBtn?.addEventListener("click", resetHudLayout);

canvas.addEventListener("pointerdown", e => {
  if(!hudEditing) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  const z = hitHudZone(x,y);
  if(!z) return;
  e.preventDefault();
  hudDrag = {id:z.id, dx:x-z.x, dy:y-z.y};
});

canvas.addEventListener("pointermove", e => {
  if(!hudEditing || !hudDrag) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  hudLayout[hudDrag.id] = {
    x: Math.max(0, Math.min(W-40, Math.round(x-hudDrag.dx))),
    y: Math.max(0, Math.min(H-30, Math.round(y-hudDrag.dy)))
  };
});

canvas.addEventListener("pointerup", () => { hudDrag = null; });
canvas.addEventListener("pointercancel", () => { hudDrag = null; });

addEventListener("keydown", e => {
  if(e.key.toLowerCase() === "h"){
    hudEditing = !hudEditing;
    if(hudEditBtn) hudEditBtn.textContent = hudEditing ? "Editando HUD" : "Editar HUD";
  }
});

const qrEl = document.getElementById("qr");
const codeEl = document.getElementById("code");
const statusEl = document.getElementById("status");
const playersEl = document.getElementById("players");
const statsEl = document.getElementById("stats");
const inviteLinkEl = document.getElementById("inviteLink");
const playLinkEl = document.getElementById("playLink");

let ws, roomCode;
let playersConnected = [];
let playerColors = {};
let inputs = {};
let keys = {};
let mouse = { x: 640, y: 360, down: false };

const W = canvas.width;
const H = canvas.height;
const GRAVITY = 0.72;
const colors = ["#66d9ff", "#ff5a7a", "#ffe66d", "#57e389"];
const names = ["Azul", "Rosa", "Amarelo", "Verde"];
const START_BOMBS = 5;
const MAX_BOMBS = 15;

const defaultWeapon = {
  id:"default",
  name:"Pistola",
  ammo:Infinity,
  cd:13,
  shots:1,
  spread:0,
  speed:11,
  dmg:13,
  life:72,
  color:"#e9edf7",
  w:10,
  h:5
};

const weaponCatalog = [
  {id:"machine",name:"Metralha",ammo:153,cd:5,shots:1,spread:0.03,speed:13,dmg:9,life:70,color:"#66d9ff",w:11,h:5},
  {id:"shotgun",name:"Escopeta",ammo:40,cd:24,shots:5,spread:0.34,speed:11,dmg:9,life:42,color:"#ffb86b",w:10,h:5},
  {id:"laser",name:"Laser",ammo:102,cd:7,shots:1,spread:0,speed:17,dmg:12,life:54,color:"#ff5a7a",w:18,h:4},
  {id:"plasma",name:"Plasma",ammo:71,cd:11,shots:1,spread:0.02,speed:10,dmg:28,life:80,color:"#d386ff",w:16,h:10},
  {id:"burst",name:"Rajada",ammo:127,cd:8,shots:3,spread:0.09,speed:13,dmg:8,life:68,color:"#ffe66d",w:9,h:5},
  {id:"sniper",name:"Sniper",ammo:30,cd:28,shots:1,spread:0,speed:22,dmg:54,life:72,color:"#ffffff",w:24,h:4},
  {id:"flame",name:"Chamas",ammo:136,cd:4,shots:2,spread:0.25,speed:7,dmg:6,life:28,color:"#ff6b35",w:12,h:9},
  {id:"ice",name:"Gelo",ammo:76,cd:10,shots:1,spread:0.04,speed:10,dmg:18,life:70,color:"#9be7ff",w:13,h:7},
  {id:"acid",name:"Ácido",ammo:93,cd:9,shots:1,spread:0.07,speed:9,dmg:16,life:62,color:"#57e389",w:12,h:8},
  {id:"rocket",name:"Foguete",ammo:20,cd:32,shots:1,spread:0.02,speed:8,dmg:70,life:95,color:"#ff9f43",w:18,h:10,explode:95},
  {id:"rail",name:"Railgun",ammo:27,cd:24,shots:1,spread:0,speed:26,dmg:44,life:50,color:"#8be9fd",w:30,h:3},
  {id:"boomerang",name:"Bumerangue",ammo:59,cd:15,shots:1,spread:0.05,speed:9,dmg:20,life:90,color:"#f1fa8c",w:16,h:7},
  {id:"triple",name:"Tripla",ammo:91,cd:11,shots:3,spread:0.18,speed:12,dmg:12,life:66,color:"#ff79c6",w:10,h:5},
  {id:"needle",name:"Agulha",ammo:170,cd:4,shots:1,spread:0.04,speed:16,dmg:6,life:48,color:"#cfd7e6",w:8,h:3},
  {id:"cannon",name:"Canhão",ammo:23,cd:30,shots:1,spread:0.03,speed:9,dmg:76,life:80,color:"#bd93f9",w:20,h:12},
  {id:"spark",name:"Faísca",ammo:119,cd:6,shots:2,spread:0.22,speed:12,dmg:7,life:42,color:"#ffe66d",w:8,h:4},
  {id:"wave",name:"Onda",ammo:61,cd:14,shots:1,spread:0.04,speed:10,dmg:30,life:72,color:"#50fa7b",w:20,h:8},
  {id:"blade",name:"Lâmina",ammo:68,cd:13,shots:1,spread:0.02,speed:12,dmg:26,life:52,color:"#f8f8f2",w:18,h:8},
  {id:"pulse",name:"Pulso",ammo:81,cd:12,shots:1,spread:0.02,speed:11,dmg:24,life:65,color:"#66d9ff",w:15,h:15},
  {id:"thorn",name:"Espinho",ammo:142,cd:5,shots:2,spread:0.12,speed:14,dmg:7,life:58,color:"#57e389",w:8,h:4},
  {id:"magnum",name:"Magnum",ammo:51,cd:18,shots:1,spread:0.02,speed:15,dmg:36,life:66,color:"#ffb86b",w:14,h:6},
  {id:"minigun",name:"Minigun",ammo:272,cd:3,shots:1,spread:0.12,speed:13,dmg:5,life:52,color:"#bfc2d8",w:8,h:4},
  {id:"star",name:"Estrela",ammo:85,cd:10,shots:5,spread:0.42,speed:10,dmg:8,life:50,color:"#ffe66d",w:9,h:9},
  {id:"orb",name:"Orbe",ammo:44,cd:18,shots:1,spread:0.03,speed:8,dmg:42,life:95,color:"#d386ff",w:18,h:18},
  {id:"storm",name:"Tempestade",ammo:108,cd:7,shots:3,spread:0.28,speed:11,dmg:9,life:60,color:"#8be9fd",w:8,h:5},
  {id:"toxic",name:"Tóxica",ammo:98,cd:8,shots:1,spread:0.1,speed:9,dmg:18,life:70,color:"#57e389",w:13,h:9},
  {id:"saw",name:"Serra",ammo:54,cd:17,shots:1,spread:0.04,speed:10,dmg:34,life:74,color:"#cfd7e6",w:18,h:18},
  {id:"nova",name:"Nova",ammo:34,cd:25,shots:6,spread:0.55,speed:10,dmg:12,life:48,color:"#ff5a7a",w:9,h:9},
  {id:"ghost",name:"Fantasma",ammo:74,cd:12,shots:1,spread:0.02,speed:13,dmg:22,life:75,color:"#bd93f9",w:14,h:6},
  {id:"dragon",name:"Dragão",ammo:57,cd:16,shots:4,spread:0.35,speed:8,dmg:13,life:36,color:"#ff6b35",w:12,h:8}
];

function randomWeapon(){
  return weaponCatalog[Math.floor(Math.random()*weaponCatalog.length)];
}

function weaponById(id){
  if(!id || id === "default") return defaultWeapon;
  return weaponCatalog.find(w=>w.id===id) || defaultWeapon;
}


function weaponIconKind(id){
  const kinds = ["rifle","shotgun","laser","orb","rocket","blade","star","flame","sniper","saw"];
  let n = 0;
  for(const ch of String(id||"")) n = (n + ch.charCodeAt(0)) % 997;
  return kinds[n % kinds.length];
}

function drawDropIcon(ctx, item, sx, sy, time=0){
  if(!item) return;

  const iw = Number.isFinite(item.w) ? item.w : 24;
  const ih = Number.isFinite(item.h) ? item.h : 24;
  const ix = Number.isFinite(item.x) ? item.x : 0;
  const iy = Number.isFinite(item.y) ? item.y : 0;
  const safeSx = Number.isFinite(sx) ? sx : worldToScreen(ix);
  const safeSy = Number.isFinite(sy) ? sy : iy;

  const cx = safeSx + iw/2;
  const cy = safeSy + ih/2 + Math.sin(time*.08 + ix*.01)*2;
  const type = item.type || "unknown";
  ctx.save();

  ctx.shadowColor = type==="weapon" ? "#66d9ff" : type==="life" ? "#ff5a7a" : type==="heal" ? "#57e389" : type==="revive" ? "#d386ff" : "#ffe66d";
  ctx.shadowBlur = 12;

  if(type==="heal"){
    // Medkit / HP
    ctx.fillStyle="#f8f8f2";
    ctx.fillRect(cx-13,cy-10,26,20);
    ctx.strokeStyle="#57e389"; ctx.lineWidth=3; ctx.strokeRect(cx-13,cy-10,26,20);
    ctx.fillStyle="#57e389";
    ctx.fillRect(cx-3,cy-8,6,16);
    ctx.fillRect(cx-9,cy-2,18,6);
  } else if(type==="life"){
    // Coração / vida extra
    ctx.fillStyle="#ff5a7a";
    ctx.beginPath();
    ctx.moveTo(cx,cy+11);
    ctx.bezierCurveTo(cx-22,cy-2,cx-10,cy-18,cx,cy-8);
    ctx.bezierCurveTo(cx+10,cy-18,cx+22,cy-2,cx,cy+11);
    ctx.fill();
    ctx.fillStyle="#fff";
    ctx.font="900 11px system-ui";
    ctx.textAlign="center";
    ctx.fillText("1",cx,cy+4);
  } else if(type==="revive"){
    // Revive / cruz + setas
    ctx.fillStyle="#d386ff";
    ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#fff"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,11,-0.7,Math.PI*1.45); ctx.stroke();
    ctx.fillStyle="#fff";
    ctx.beginPath(); ctx.moveTo(cx+11,cy-9); ctx.lineTo(cx+17,cy-9); ctx.lineTo(cx+13,cy-3); ctx.fill();
    ctx.fillRect(cx-3,cy-9,6,18);
    ctx.fillRect(cx-9,cy-3,18,6);
  } else if(type==="bombs"){
    ctx.fillStyle="#ff9f43";
    ctx.beginPath(); ctx.arc(cx,cy,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#111";
    ctx.beginPath(); ctx.arc(cx,cy+2,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ff9f43"; ctx.fillRect(cx-3,cy-11,7,8);
    ctx.fillStyle="#fff"; ctx.font="900 10px system-ui"; ctx.textAlign="center";
    ctx.fillText(`+${item.amount||2}`,cx,cy+5);
  } else if(type==="weapon"){
    const id = item.weaponId || "weapon";
    const kind = weaponIconKind(id);
    const col = weaponById ? (weaponById(id).color || "#66d9ff") : "#66d9ff";
    ctx.fillStyle="rgba(0,0,0,.72)";
    ctx.beginPath(); ctx.roundRect?.(cx-18,cy-15,36,30,8) || ctx.rect(cx-18,cy-15,36,30); ctx.fill();
    ctx.strokeStyle=col; ctx.lineWidth=3; ctx.strokeRect(cx-18,cy-15,36,30);

    ctx.fillStyle=col;
    if(kind==="shotgun"){
      ctx.fillRect(cx-14,cy-3,24,7); ctx.fillRect(cx+6,cy-6,14,4); ctx.fillRect(cx-10,cy+4,8,6);
    } else if(kind==="laser"){
      ctx.fillRect(cx-17,cy-2,34,4); ctx.fillRect(cx+4,cy-7,10,14);
    } else if(kind==="orb"){
      ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(cx-3,cy-3,3,0,Math.PI*2); ctx.fill();
    } else if(kind==="rocket"){
      ctx.beginPath(); ctx.moveTo(cx+16,cy); ctx.lineTo(cx+3,cy-8); ctx.lineTo(cx-15,cy-6); ctx.lineTo(cx-15,cy+6); ctx.lineTo(cx+3,cy+8); ctx.closePath(); ctx.fill();
    } else if(kind==="blade"){
      ctx.beginPath(); ctx.moveTo(cx-14,cy+8); ctx.lineTo(cx+15,cy-8); ctx.lineTo(cx+8,cy+8); ctx.closePath(); ctx.fill();
    } else if(kind==="star"){
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2; ctx.fillRect(cx+Math.cos(a)*8-3,cy+Math.sin(a)*8-3,6,6);}
      ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fill();
    } else if(kind==="flame"){
      ctx.beginPath(); ctx.moveTo(cx,cy-14); ctx.bezierCurveTo(cx+15,cy-2,cx+5,cy+15,cx,cy+13); ctx.bezierCurveTo(cx-13,cy+7,cx-7,cy-4,cx,cy-14); ctx.fill();
    } else if(kind==="sniper"){
      ctx.fillRect(cx-18,cy-2,36,4); ctx.fillRect(cx-3,cy-8,8,16); ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(cx+10,cy,5,0,Math.PI*2); ctx.stroke();
    } else if(kind==="saw"){
      ctx.beginPath(); ctx.arc(cx,cy,12,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#111"; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillRect(cx-15,cy-4,28,8); ctx.fillRect(cx-6,cy+4,9,8);
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle="#fff";
    ctx.font="900 9px system-ui";
    ctx.textAlign="center";
    const label = String(item.weaponName || id).slice(0,5).toUpperCase();
    ctx.fillText(label,cx,cy+24);
  } else {
    ctx.fillStyle="#ffe66d";
    ctx.beginPath(); ctx.arc(cx,cy,13,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#111"; ctx.font="900 13px system-ui"; ctx.textAlign="center"; ctx.fillText("R",cx,cy+5);
  }

  ctx.restore();
}

const weaponShortNames = {"Pistola": "PST", "Metralha": "MET", "Escopeta": "ESC", "Laser": "LSR", "Plasma": "PLS", "Rajada": "RAJ", "Sniper": "SNP", "Chamas": "FGO", "Gelo": "GEL", "Ácido": "ACD", "Foguete": "FOG", "Railgun": "RAIL", "Bumerangue": "BUM", "Tripla": "TRI", "Agulha": "AGU", "Canhão": "CAN", "Faísca": "FAI", "Onda": "OND", "Lâmina": "LAM", "Pulso": "PUL", "Espinho": "ESP", "Magnum": "MAG", "Minigun": "MIN", "Estrela": "EST", "Orbe": "ORB", "Tempestade": "TMP", "Tóxica": "TOX", "Serra": "SER", "Nova": "NOV", "Fantasma": "FAN", "Dragão": "DRA"};
function weaponLabel(p){
  const w = weaponById(p.weaponId);
  const short = weaponShortNames[w.name] || String(w.name || "ARM").slice(0,4).toUpperCase();
  if(!p.weaponId || p.weaponId === "default") return short;
  return `${short} ${Math.max(0,p.weaponAmmo||0)}`;
}


window.addEventListener("error", (event) => {
  try {
    statusEl.textContent = `Erro JS: ${event.message}`;
  } catch {}
});

const game = {
  started:false,
  levelIndex:0,
  cameraX:0,
  time:0,
  score:0,
  shake:0,
  combo:1,
  level:null,
  exitPortal:null,
  levelClear:false,
  transitionTimer:0,
  players:new Map(),
  bullets:[],
  enemyBullets:[],
  enemies:[],
  particles:[],
  grenades:[],
  pickups:[],
  messages:[],
  lobby:true,
  readyPlayers:new Set(),
  difficulty:"normal",
  difficultyMultiplier:1,
  gameOverHandled:false,
  pausedByConnection:false
};

const levels = [
  {
    name:"Fase 1 - Cidade em Chamas", music:"fire", width:3600, bg:["#1b1418","#422018"], portalY:558,
    platforms:[[0,650,3900,80],[350,540,260,24],[700,450,260,24],[1080,560,280,24],[1480,470,260,24],[1880,380,260,24],[2260,520,320,24],[2740,440,280,24],[3180,560,250,24]],
    hazards:[{type:"fire",x:520,y:622,w:180,h:28,dmg:.9},{type:"fire",x:1320,y:622,w:220,h:28,dmg:.9},{type:"saw",x:2050,y:610,r:24,range:260,speed:.025,dmg:18},{type:"barrel",x:2480,y:594,w:36,h:56,hp:40},{type:"spikes",x:930,y:628,w:180,h:22,dmg:18,phase:0},{type:"blade_wall",x:1760,y:460,w:28,h:160,dmg:28,range:110,speed:.045},{type:"raptor",x:2880,y:610,w:58,h:36,dmg:18,minX:2760,maxX:3160,dir:1}],
    enemies:[["runner",620,500],["gunner",860,405],["bomber",1220,516],["runner",1590,430],["sniper",1970,335],["jetpack",2350,360],["bomber",2860,396],["runner",3150,516],["bruiser",1040,516],["charger",1740,516],["medic",2220,480],["boss_dragon",3420,520]]
  },
  {
    name:"Fase 2 - Esgoto Tóxico", music:"toxic", width:4000, bg:["#101b18","#193d2b"], portalY:558,
    platforms:[[0,650,4300,80],[420,560,260,24],[820,480,220,24],[1160,390,260,24],[1540,530,300,24],[1940,430,280,24],[2360,340,260,24],[2760,510,340,24],[3260,430,280,24],[3660,560,220,24]],
    hazards:[{type:"acid",x:300,y:624,w:420,h:26,dmg:1.2},{type:"acid",x:1700,y:624,w:360,h:26,dmg:1.2},{type:"crusher",x:1350,y:170,w:90,h:170,dmg:28,phase:0},{type:"crusher",x:3000,y:220,w:90,h:180,dmg:28,phase:1.5},{type:"snake",x:1180,y:620,w:70,h:24,dmg:15,minX:1000,maxX:1450,dir:1},{type:"mine",x:2240,y:612,w:28,h:28,dmg:70},{type:"laser_sweep",x:2550,y:80,w:18,h:570,dmg:24,vertical:true,range:240,speed:.038,phase:.4}],
    enemies:[["spitter",520,515],["crawler",910,438],["shielder",1240,350],["spitter",1650,490],["crawler",2050,390],["mortar",2480,300],["shielder",2920,470],["spitter",3360,390],["poisoner",1320,520],["spider",2260,604],["summoner",3020,390],["boss_spider",3820,540]]
  },
  {
    name:"Fase 3 - Fortaleza Neon", music:"neon", width:4600, bg:["#151025","#351d4f"], portalY:558,
    platforms:[[0,650,4900,80],[300,520,230,24],[670,430,230,24],[1040,540,260,24],[1420,430,220,24],[1780,330,300,24],[2240,520,260,24],[2620,430,220,24],[2980,330,260,24],[3400,500,280,24],[3820,410,260,24],[4200,560,240,24]],
    hazards:[{type:"laser",x:900,y:0,w:20,h:650,dmg:22,phase:0},{type:"laser",x:2140,y:0,w:20,h:650,dmg:22,phase:1.1},{type:"saw",x:3180,y:610,r:26,range:360,speed:.032,dmg:22},{type:"turret",x:3600,y:594,w:44,h:56,cd:0},{type:"pendulum",x:2450,y:300,r:34,range:220,dmg:30,speed:.043},{type:"laser_sweep",x:1450,y:300,w:520,h:16,dmg:22,vertical:false,range:130,speed:.04},{type:"bat_swarm",x:3350,y:250,w:68,h:28,dmg:14,minX:3200,maxX:3700,dir:1}],
    enemies:[["ninja",450,480],["sniper",760,390],["drone",1180,260],["ninja",1540,390],["laserbot",1900,290],["drone",2360,420],["sniper",2760,390],["laserbot",3140,290],["ninja",3520,460],["teleport",1350,390],["shocker",2460,420],["bat",3300,320],["boss_warlock",4400,520]]
  },
  {
    name:"Fase 4 - Inferno Final", music:"final", width:5200, bg:["#1b0808","#42111a"], portalY:558,
    platforms:[[0,650,5500,80],[360,520,220,24],[700,420,220,24],[1100,560,250,24],[1460,460,220,24],[1840,350,260,24],[2260,530,260,24],[2660,420,260,24],[3060,310,260,24],[3500,500,300,24],[3960,390,260,24],[4420,520,260,24],[4860,430,240,24]],
    hazards:[{type:"fire",x:620,y:622,w:220,h:28,dmg:1.4},{type:"acid",x:1600,y:624,w:320,h:26,dmg:1.4},{type:"laser",x:2500,y:0,w:22,h:650,dmg:26,phase:.4},{type:"crusher",x:3370,y:190,w:100,h:210,dmg:35,phase:.8},{type:"turret",x:4180,y:594,w:44,h:56,cd:0},{type:"spikes",x:1320,y:628,w:260,h:22,dmg:24,phase:.5},{type:"blade_wall",x:2880,y:420,w:30,h:190,dmg:34,range:150,speed:.052},{type:"beast",x:3960,y:610,w:64,h:38,dmg:22,minX:3800,maxX:4380,dir:-1},{type:"mine",x:4600,y:612,w:28,h:28,dmg:80}],
    enemies:[["runner",520,480],["spitter",820,380],["ninja",1220,520],["mortar",1640,420],["drone",2020,260],["shielder",2400,480],["laserbot",2820,270],["bomber",3220,460],["jetpack",3660,330],["sniper",4080,350],["samurai",1380,520],["flametrooper",2180,488],["cryotrooper",3020,270],["boss_train",5000,535]]
  },
  {
    name:"Fase 5 - Metrô Fantasma", music:"neon", width:4300, bg:["#0e1420","#182845"], portalY:558,
    platforms:[[0,650,4600,80],[420,540,250,24],[850,450,260,24],[1250,540,260,24],[1650,430,260,24],[2050,520,260,24],[2450,390,260,24],[2880,520,300,24],[3380,420,260,24],[3900,560,220,24]],
    hazards:[{type:"laser",x:760,y:0,w:18,h:650,dmg:20,phase:.2},{type:"turret",x:1850,y:594,w:44,h:56,cd:0},{type:"saw",x:2700,y:610,r:26,range:420,speed:.038,dmg:24},{type:"pendulum",x:2100,y:300,r:30,range:190,dmg:28,speed:.044},{type:"spikes",x:3450,y:628,w:230,h:22,dmg:20,phase:.2}],
    enemies:[["drone",520,380],["gunner",980,405],["ninja",1320,500],["sniper",1760,380],["drone",2150,300],["laserbot",2580,350],["ninja",3030,480],["shielder",3500,380],["turretbot",3100,460],["boss_mecha",4100,540]]
  },
  {
    name:"Fase 6 - Laboratório Mutante", music:"toxic", width:4400, bg:["#0d1f18","#27593b"], portalY:558,
    platforms:[[0,650,4700,80],[360,560,260,24],[760,470,220,24],[1120,380,260,24],[1500,540,260,24],[1920,450,280,24],[2360,360,260,24],[2780,530,300,24],[3260,430,260,24],[3820,560,250,24]],
    hazards:[{type:"acid",x:520,y:624,w:260,h:26,dmg:1.5},{type:"acid",x:2100,y:624,w:380,h:26,dmg:1.5},{type:"crusher",x:2860,y:190,w:95,h:210,dmg:34,phase:.7},{type:"barrel",x:3500,y:594,w:36,h:56,hp:35}],
    enemies:[["crawler",520,515],["spitter",860,430],["spitter",1220,340],["shielder",1600,500],["mortar",2050,410],["crawler",2500,320],["shielder",2920,490],["spitter",3400,390],["skull",2500,360],["boss_blob",4200,550]]
  },
  {
    name:"Fase 7 - Céu de Drones", music:"neon", width:4700, bg:["#121229","#203a5f"], portalY:558,
    platforms:[[0,650,5000,80],[320,530,220,24],[740,430,220,24],[1180,540,260,24],[1620,410,240,24],[2060,520,260,24],[2500,380,240,24],[2940,500,300,24],[3420,390,260,24],[3920,520,260,24],[4380,430,220,24]],
    hazards:[{type:"laser",x:1360,y:0,w:18,h:650,dmg:24,phase:.1},{type:"laser",x:3300,y:0,w:18,h:650,dmg:24,phase:1.4},{type:"turret",x:3780,y:594,w:44,h:56,cd:0}],
    enemies:[["drone",500,280],["jetpack",850,330],["drone",1240,260],["sniper",1720,370],["jetpack",2140,300],["drone",2620,260],["laserbot",3060,350],["jetpack",3550,420],["drone",4050,300],["turretbot",3100,460],["boss_mecha",4550,540]]
  },
  {
    name:"Fase 8 - Fundição Explosiva", music:"fire", width:4800, bg:["#20100d","#58301b"], portalY:558,
    platforms:[[0,650,5100,80],[380,540,260,24],[780,440,240,24],[1180,560,280,24],[1600,460,260,24],[2040,370,260,24],[2480,520,320,24],[2940,430,280,24],[3420,560,250,24],[3900,460,260,24],[4380,540,220,24]],
    hazards:[{type:"fire",x:400,y:622,w:260,h:28,dmg:1.6},{type:"fire",x:1760,y:622,w:300,h:28,dmg:1.6},{type:"barrel",x:1400,y:594,w:36,h:56,hp:30},{type:"barrel",x:2600,y:594,w:36,h:56,hp:30},{type:"saw",x:3600,y:610,r:28,range:460,speed:.042,dmg:28}],
    enemies:[["bomber",620,500],["runner",920,400],["bomber",1300,516],["gunner",1740,420],["runner",2160,330],["bomber",2580,480],["jetpack",3060,340],["sniper",3500,520],["runner",4000,420],["minebot",2600,604],["boss_tank",4600,550]]
  },
  {
    name:"Fase 9 - Prisão Laser", music:"final", width:5000, bg:["#170d1e","#3b1859"], portalY:558,
    platforms:[[0,650,5300,80],[340,530,230,24],[720,420,230,24],[1120,540,260,24],[1520,430,220,24],[1920,330,300,24],[2380,520,260,24],[2820,430,220,24],[3260,330,260,24],[3720,500,280,24],[4180,410,260,24],[4640,560,240,24]],
    hazards:[{type:"laser",x:620,y:0,w:18,h:650,dmg:28,phase:0},{type:"laser",x:1560,y:0,w:18,h:650,dmg:28,phase:.8},{type:"laser",x:2500,y:0,w:18,h:650,dmg:28,phase:1.6},{type:"crusher",x:3420,y:190,w:95,h:220,dmg:38,phase:.4},{type:"turret",x:4380,y:594,w:44,h:56,cd:0}],
    enemies:[["laserbot",520,480],["ninja",840,380],["sniper",1220,500],["laserbot",1680,390],["drone",2080,260],["ninja",2460,480],["laserbot",2920,390],["shielder",3360,290],["sniper",3860,460],["turretbot",3100,460],["boss_mecha",4820,540]]
  },
  {
    name:"Fase 10 - Núcleo Apocalipse", music:"final", width:5600, bg:["#220808","#5c0e1f"], portalY:558,
    platforms:[[0,650,5900,80],[360,520,220,24],[700,420,220,24],[1100,560,250,24],[1460,460,220,24],[1840,350,260,24],[2260,530,260,24],[2660,420,260,24],[3060,310,260,24],[3500,500,300,24],[3960,390,260,24],[4420,520,260,24],[4860,430,240,24],[5300,560,220,24]],
    hazards:[{type:"fire",x:580,y:622,w:250,h:28,dmg:1.8},{type:"acid",x:1500,y:624,w:340,h:26,dmg:1.8},{type:"laser",x:2380,y:0,w:22,h:650,dmg:32,phase:.4},{type:"crusher",x:3260,y:170,w:100,h:230,dmg:42,phase:.8},{type:"saw",x:4040,y:610,r:32,range:520,speed:.048,dmg:34},{type:"turret",x:4740,y:594,w:44,h:56,cd:0}],
    enemies:[["runner",520,480],["spitter",820,380],["ninja",1220,520],["mortar",1640,420],["drone",2020,260],["shielder",2400,480],["laserbot",2820,270],["bomber",3220,460],["jetpack",3660,330],["sniper",4080,350],["mimic",3600,430],["boss_queen",5420,520]]
  }
];

const enemyCfg = {
  runner:{w:34,h:42,hp:45,speed:2.0,score:60,color:"#ffb86b"},
  gunner:{w:34,h:44,hp:70,speed:.6,score:90,color:"#d386ff"},
  sniper:{w:34,h:44,hp:60,speed:.35,score:130,color:"#a6e3ff"},
  bomber:{w:38,h:42,hp:85,speed:.8,score:110,color:"#ff9f43"},
  jetpack:{w:36,h:38,hp:75,speed:1.25,score:140,color:"#66d9ff"},
  spitter:{w:36,h:44,hp:75,speed:.7,score:100,color:"#57e389"},
  crawler:{w:44,h:28,hp:55,speed:1.65,score:80,color:"#b8f27b"},
  shielder:{w:42,h:50,hp:140,speed:.55,score:130,color:"#f6f1d1"},
  mortar:{w:40,h:46,hp:95,speed:.45,score:160,color:"#c792ea"},
  ninja:{w:32,h:46,hp:70,speed:1.9,score:150,color:"#ff5a7a"},
  drone:{w:38,h:30,hp:65,speed:1.4,score:140,color:"#89ddff"},
  laserbot:{w:38,h:46,hp:100,speed:.5,score:180,color:"#f78c6c"},
  // Novos inimigos
  bruiser:{w:48,h:54,hp:170,speed:.55,score:170,color:"#ff7b72"},
  leaper:{w:34,h:46,hp:80,speed:1.7,score:145,color:"#7ee787"},
  charger:{w:46,h:42,hp:120,speed:2.35,score:150,color:"#ffa657"},
  medic:{w:34,h:44,hp:90,speed:.75,score:180,color:"#56d364"},
  summoner:{w:40,h:52,hp:130,speed:.45,score:220,color:"#bc8cff"},
  splitter:{w:42,h:42,hp:110,speed:.9,score:160,color:"#f2cc60"},
  bat:{w:34,h:28,hp:55,speed:1.9,score:120,color:"#a5d6ff"},
  skull:{w:36,h:36,hp:75,speed:1.25,score:150,color:"#f0f6fc"},
  minebot:{w:34,h:30,hp:65,speed:1.15,score:130,color:"#ffab70"},
  flametrooper:{w:40,h:48,hp:115,speed:.65,score:190,color:"#ff6b35"},
  cryotrooper:{w:40,h:48,hp:115,speed:.65,score:190,color:"#9be7ff"},
  shocker:{w:36,h:46,hp:95,speed:.9,score:180,color:"#ffe66d"},
  teleport:{w:34,h:46,hp:85,speed:1.1,score:210,color:"#d386ff"},
  spider:{w:46,h:26,hp:70,speed:2.1,score:120,color:"#7ddc9a"},
  turretbot:{w:42,h:44,hp:150,speed:.25,score:210,color:"#c9d1d9"},
  grenadier:{w:38,h:44,hp:100,speed:.7,score:175,color:"#ff9f43"},
  poisoner:{w:36,h:44,hp:95,speed:.8,score:170,color:"#39d353"},
  phantom:{w:34,h:46,hp:75,speed:1.35,score:220,color:"#c297ff"},
  samurai:{w:36,h:50,hp:130,speed:1.55,score:230,color:"#ff5a7a"},
  mimic:{w:38,h:40,hp:105,speed:1.05,score:185,color:"#ffe66d"},

  // Novos chefões
  boss_dragon:{w:160,h:120,hp:1350,speed:.52,score:1800,color:"#ff6b35",boss:true},
  boss_spider:{w:170,h:110,hp:1250,speed:.62,score:1750,color:"#57e389",boss:true},
  boss_warlock:{w:140,h:130,hp:1300,speed:.5,score:1850,color:"#d386ff",boss:true},
  boss_train:{w:190,h:105,hp:1500,speed:.38,score:2000,color:"#8be9fd",boss:true},
  boss_queen:{w:165,h:130,hp:1450,speed:.48,score:2100,color:"#ff79c6",boss:true},
  boss_tank:{w:110,h:100,hp:650,speed:.45,score:900,color:"#ff2d55",boss:true},
  boss_blob:{w:120,h:100,hp:720,speed:.4,score:950,color:"#57e389",boss:true},
  boss_mecha:{w:130,h:110,hp:850,speed:.42,score:1100,color:"#c792ea",boss:true},
  boss_final:{w:150,h:125,hp:1200,speed:.5,score:1600,color:"#ff1744",boss:true}
};


const enemyShape = {
  runner:"triangle",
  gunner:"square",
  sniper:"diamond",
  bomber:"hexagon",
  jetpack:"wingedRect",
  spitter:"pentagon",
  crawler:"flatRect",
  shielder:"shieldBox",
  mortar:"trapezoid",
  ninja:"star",
  drone:"cross",
  laserbot:"splitRect",
  bruiser:"hexagon",
  leaper:"triangle",
  charger:"trapezoid",
  medic:"cross",
  summoner:"diamond",
  splitter:"pentagon",
  bat:"wingedRect",
  skull:"diamond",
  minebot:"flatRect",
  flametrooper:"splitRect",
  cryotrooper:"splitRect",
  shocker:"star",
  teleport:"diamond",
  spider:"flatRect",
  turretbot:"shieldBox",
  grenadier:"hexagon",
  poisoner:"pentagon",
  phantom:"star",
  samurai:"star",
  mimic:"square",
  boss_dragon:"finalTotem",
  boss_spider:"mutantCluster",
  boss_warlock:"mechaParts",
  boss_train:"tankBlock",
  boss_queen:"mutantCluster",
  boss_tank:"tankBlock",
  boss_blob:"mutantCluster",
  boss_mecha:"mechaParts",
  boss_final:"finalTotem"
};

function polygonPath(points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function drawStarPath(cx, cy, spikes, outer, inner) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i=0;i<spikes;i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
}

function drawHeroBall(x, y, r, fill, options={}) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = options.stroke || "rgba(0,0,0,.45)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemyShape(e, sx, sy) {
  const shape = enemyShape[e.type] || "square";
  const w = e.w;
  const h = e.h;
  const r = Math.max(w, h) * 0.5;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = e.color;
  ctx.strokeStyle = e.boss ? "#ffe66d" : "rgba(0,0,0,.65)";
  ctx.lineWidth = e.boss ? 5 : 3;

  if (shape === "triangle") {
    polygonPath([[0,-h*.58],[w*.58,h*.45],[-w*.58,h*.45]]);
    ctx.fill(); ctx.stroke();
  } else if (shape === "square") {
    ctx.fillRect(-w*.5,-w*.5,w,w);
    ctx.strokeRect(-w*.5,-w*.5,w,w);
  } else if (shape === "diamond") {
    polygonPath([[0,-r],[r*.85,0],[0,r],[-r*.85,0]]);
    ctx.fill(); ctx.stroke();
  } else if (shape === "hexagon") {
    const pts = [];
    for (let i=0;i<6;i++) {
      const a = Math.PI/6 + i * Math.PI / 3;
      pts.push([Math.cos(a)*r, Math.sin(a)*r]);
    }
    polygonPath(pts); ctx.fill(); ctx.stroke();
  } else if (shape === "pentagon") {
    const pts = [];
    for (let i=0;i<5;i++) {
      const a = -Math.PI/2 + i * Math.PI * 2 / 5;
      pts.push([Math.cos(a)*r, Math.sin(a)*r]);
    }
    polygonPath(pts); ctx.fill(); ctx.stroke();
  } else if (shape === "flatRect") {
    ctx.fillRect(-w*.65,-h*.35,w*1.3,h*.7);
    ctx.strokeRect(-w*.65,-h*.35,w*1.3,h*.7);
  } else if (shape === "trapezoid") {
    polygonPath([[-w*.55,h*.45],[w*.55,h*.45],[w*.35,-h*.5],[-w*.35,-h*.5]]);
    ctx.fill(); ctx.stroke();
  } else if (shape === "star") {
    drawStarPath(0,0,5,r,r*.45);
    ctx.fill(); ctx.stroke();
  } else if (shape === "cross") {
    const s = r*.42;
    ctx.fillRect(-s*0.5,-r,s,r*2);
    ctx.fillRect(-r,-s*0.5,r*2,s);
    ctx.strokeRect(-s*0.5,-r,s,r*2);
    ctx.strokeRect(-r,-s*0.5,r*2,s);
  } else if (shape === "wingedRect") {
    ctx.fillRect(-w*.45,-h*.45,w*.9,h*.9);
    ctx.strokeRect(-w*.45,-h*.45,w*.9,h*.9);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    polygonPath([[-w*.45,-h*.1],[-w*.95,-h*.45],[-w*.75,h*.35]]);
    ctx.fill(); ctx.stroke();
    polygonPath([[w*.45,-h*.1],[w*.95,-h*.45],[w*.75,h*.35]]);
    ctx.fill(); ctx.stroke();
  } else if (shape === "shieldBox") {
    ctx.fillRect(-w*.48,-h*.48,w*.96,h*.96);
    ctx.strokeRect(-w*.48,-h*.48,w*.96,h*.96);
    ctx.strokeStyle = "#66d9ff";
    ctx.lineWidth = 5;
    ctx.strokeRect(-w*.65,-h*.65,w*1.3,h*1.3);
  } else if (shape === "splitRect") {
    ctx.fillRect(-w*.6,-h*.45,w*.48,h*.9);
    ctx.fillRect(w*.12,-h*.45,w*.48,h*.9);
    ctx.strokeRect(-w*.6,-h*.45,w*.48,h*.9);
    ctx.strokeRect(w*.12,-h*.45,w*.48,h*.9);
    ctx.strokeStyle="#ff5a7a";
    ctx.beginPath(); ctx.moveTo(-w*.05,-h*.6); ctx.lineTo(w*.05,h*.6); ctx.stroke();
  } else if (shape === "tankBlock") {
    ctx.fillRect(-w*.55,-h*.38,w*1.1,h*.76);
    ctx.strokeRect(-w*.55,-h*.38,w*1.1,h*.76);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(-w*.7,h*.35,w*1.4,h*.18);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.facing>0?w*.15:-w*.75,-h*.1,w*.6,h*.2);
  } else if (shape === "mutantCluster") {
    // conjunto de formatos, sem círculos
    const parts = [[-w*.28,-h*.12,w*.52,h*.52],[w*.12,-h*.30,w*.42,h*.46],[-w*.05,h*.16,w*.58,h*.42]];
    for (const p of parts) { ctx.fillRect(p[0],p[1],p[2],p[3]); ctx.strokeRect(p[0],p[1],p[2],p[3]); }
  } else if (shape === "mechaParts") {
    ctx.fillRect(-w*.55,-h*.42,w*.5,h*.84);
    ctx.fillRect(w*.05,-h*.42,w*.5,h*.84);
    ctx.fillRect(-w*.25,-h*.62,w*.5,h*.35);
    ctx.strokeRect(-w*.55,-h*.42,w*.5,h*.84);
    ctx.strokeRect(w*.05,-h*.42,w*.5,h*.84);
    ctx.strokeRect(-w*.25,-h*.62,w*.5,h*.35);
  } else if (shape === "finalTotem") {
    ctx.fillRect(-w*.45,-h*.55,w*.9,h*.32);
    ctx.fillRect(-w*.6,-h*.16,w*1.2,h*.32);
    ctx.fillRect(-w*.45,h*.23,w*.9,h*.32);
    ctx.strokeRect(-w*.45,-h*.55,w*.9,h*.32);
    ctx.strokeRect(-w*.6,-h*.16,w*1.2,h*.32);
    ctx.strokeRect(-w*.45,h*.23,w*.9,h*.32);
  } else {
    ctx.fillRect(-w*.5,-h*.5,w,h);
    ctx.strokeRect(-w*.5,-h*.5,w,h);
  }

  // Detalhes angulosos: olho retangular e boca
  ctx.fillStyle = "#fff";
  ctx.fillRect(e.facing * r*.16 - r*.12, -r*.22, r*.24, r*.16);
  ctx.fillStyle = "#111";
  ctx.fillRect(e.facing * r*.22 - r*.04, -r*.19, r*.08, r*.1);

  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r*.25, r*.22);
  ctx.lineTo(r*.25, r*.22);
  ctx.stroke();

  ctx.restore();
}

function wsUrl(){ return `${location.protocol==="https:"?"wss":"ws"}://${location.host}`; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return a+Math.random()*(b-a); }
function len(x,y){ return Math.hypot(x,y)||1; }
function color(id){
  const idx = (playerColors && playerColors[id]) ? playerColors[id] : id;
  return colors[(idx-1)%4];
}
function pname(id){
  const idx = (playerColors && playerColors[id]) ? playerColors[id] : id;
  return names[(idx-1)%4] || `J${id}`;
}

function ensureBombs(p){
  if(p.bombs === undefined || p.bombs === null) p.bombs = START_BOMBS;
}

function livesHudText(p){
  const lives = p.lives ?? 0;
  if(!p.alive && lives <= 0) return "❤️ x0 ☠";
  if(!p.alive && (p.respawnTimer || 0) > 0) return `❤️ x${lives} ⏳`;
  return `❤️ x${lives}   ${Math.max(0, Math.round(p.hp || 0))}%`;
}

function heartsForHp(hp, maxHp=100) {
  const safeMax = Math.max(1, maxHp || 100);
  const ratio = Math.max(0, Math.min(1, hp / safeMax));
  const count = Math.ceil(ratio * 5);
  return "♥".repeat(count) + "♡".repeat(5 - count);
}
function rects(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function worldToScreen(x){ return x - game.cameraX; }

function spawnPointForPlayer(id){
  const alive=[...game.players.values()].filter(p=>p.id!==id&&p.alive&&p.hp>0);
  const anchor = alive.length
    ? alive.reduce((sum,p)=>sum+p.x,0)/alive.length
    : game.cameraX + 130;
  return {
    x: clamp(anchor + (id-1)*38, 80, game.level.width - 140),
    y: 90
  };
}

function respawnPlayer(p, reason="respawn"){
  const sp = spawnPointForPlayer(p.id);
  p.x = sp.x;
  p.y = sp.y;
  p.vx = 0;
  p.vy = 0;
  p.hp = p.maxHp || 100;
  p.bombs = START_BOMBS;
  p.alive = true;
  p.inv = 180;
  p.deadAnimStarted = false;
  p.deadAt = 0;
  p.coyote = 0;
  p.jumpHeld = false;
  p.respawnTimer = 0;
  burst(p.x+p.w/2,p.y+p.h/2,color(p.id),28);
  toast(`${pname(p.id)} voltou (${p.lives} vidas)`);
}

function downPlayer(p){
  if(!p.alive) return;
  p.alive = false;
  p.hp = 0;
  p.deadAt = game.time;
  p.deadAnimStarted = true;
  p.vx = 0;
  p.vy = 0;
  burst(p.x+p.w/2,p.y+p.h/2,color(p.id),36);
  sfx.hit();

  if((p.lives || 0) > 0){
    p.lives--;
    p.respawnTimer = 105;
    toast(`${pname(p.id)} caiu · respawn em instantes`);
  } else {
    p.respawnTimer = 0;
    toast(`${pname(p.id)} sem vidas · precisa de REVIVE`);
  }
}

function livingPlayers(){
  return [...game.players.values()].filter(p=>p.alive&&p.hp>0);
}

function deadPlayersNeedingRevive(){
  return [...game.players.values()].filter(p=>!p.alive && (p.lives||0)<=0);
}

function spawnGuaranteedWeaponDrops(){
  const count = 1 + (Math.random() < 0.55 ? 1 : 0);
  const floorY = 610;
  for(let i=0;i<count;i++){
    const w = randomWeapon();
    const x = clamp(520 + i * 620 + Math.random()*260, 180, game.level.width - 220);
    game.pickups.push({type:"weapon",weaponId:w.id,weaponName:w.name,ammo:w.ammo,x,y:floorY,w:30,h:30});
  }
}

function dropLootFromEnemy(e){
  const x=e.x+e.w/2-12, y=e.y+e.h/2-12;
  const deadNeedRevive = deadPlayersNeedingRevive().length > 0;
  const roll = Math.random();

  if(e.boss){
    const wpn = randomWeapon();
    game.pickups.push({type:"life",x:x-34,y,w:24,h:24});
    game.pickups.push({type:deadNeedRevive?"revive":"heal",x:x,y,w:24,h:24});
    game.pickups.push({type:"weapon",weaponId:wpn.id,weaponName:wpn.name,ammo:wpn.ammo,x:x+34,y,w:30,h:30});
    game.pickups.push({type:"bombs",amount:10,x:x+72,y,w:26,h:26});
    return;
  }

  if(deadNeedRevive && roll < 0.12){
    game.pickups.push({type:"revive",x,y,w:26,h:26});
  } else if(roll < 0.20){
    game.pickups.push({type:"heal",x,y,w:24,h:24});
  } else if(roll < 0.26){
    game.pickups.push({type:"life",x,y,w:24,h:24});
  } else if(roll < 0.42){
    const wpn = randomWeapon();
    game.pickups.push({type:"weapon",weaponId:wpn.id,weaponName:wpn.name,ammo:wpn.ammo,x,y,w:30,h:30});
  } else if(roll < 0.54){
    game.pickups.push({type:"bombs",amount:Math.random()<0.8?2:5,x,y,w:26,h:26});
  } else if(roll < 0.62){
    game.pickups.push({type:"rapid",x,y,w:24,h:24});
  }
}

function reviveOnePlayer(byPlayer, item){
  const dead = deadPlayersNeedingRevive().sort((a,b)=>a.id-b.id)[0];
  if(!dead) {
    byPlayer.lives = Math.min(9, (byPlayer.lives || 0) + 1);
    toast(`${pname(byPlayer.id)} ganhou +1 vida`);
    return;
  }

  dead.lives = 1;
  respawnPlayer(dead, "revive");
  toast(`${pname(byPlayer.id)} reviveu ${pname(dead.id)}`);
}


function shakeOffset() {
  const amp = Math.max(0, game.shake || 0);
  return {
    x: Math.sin(game.time * 0.72) * amp,
    y: Math.cos(game.time * 0.53) * amp * 0.55
  };
}

function addShake(amount) {
  game.shake = Math.min(18, Math.max(game.shake || 0, amount));
}
function center(e){ return {x:e.x+e.w/2,y:e.y+e.h/2}; }

// ===== áudio WebAudio =====
let audioCtx=null, masterGain=null, musicGain=null, sfxGain=null, musicTimer=null, musicStep=0, currentMusic="";
function initAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=audioCtx.createGain(); masterGain.gain.value=.58; masterGain.connect(audioCtx.destination);
  musicGain=audioCtx.createGain(); musicGain.gain.value=.24; musicGain.connect(masterGain);
  sfxGain=audioCtx.createGain(); sfxGain.gain.value=.48; sfxGain.connect(masterGain);
  startMusic(levels[game.levelIndex].music);
}
function beep(freq,dur,type="square",gain=.15,dest=sfxGain,slide=null){
  if(!audioCtx) return;
  const now=audioCtx.currentTime, o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=(type==="square"?"triangle":type); o.frequency.setValueAtTime(freq,now);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),now+dur);
  g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(gain,now+.01); g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  o.connect(g); g.connect(dest); o.start(now); o.stop(now+dur+.03);
}
function noise(dur=.16,gain=.2,freq=900,dest=sfxGain){
  if(!audioCtx) return;
  const n=audioCtx.sampleRate*dur, buf=audioCtx.createBuffer(1,n,audioCtx.sampleRate), data=buf.getChannelData(0);
  for(let i=0;i<n;i++) data[i]=Math.random()*2-1;
  const src=audioCtx.createBufferSource(), filter=audioCtx.createBiquadFilter(), g=audioCtx.createGain();
  filter.type="bandpass"; filter.frequency.value=Math.min(freq,520); filter.Q.value=.65;
  const now=audioCtx.currentTime; g.gain.setValueAtTime(gain,now); g.gain.exponentialRampToValueAtTime(.0001,now+dur);
  src.buffer=buf; src.connect(filter); filter.connect(g); g.connect(dest); src.start(now); src.stop(now+dur);
}
const sfx={
  shoot:()=>{
    // tiro seco, sem tremido chato
    beep(980,.035,"square",.075,sfxGain,420);
    setTimeout(()=>beep(240,.025,"triangle",.035,sfxGain,180),18);
  },
  enemy:()=>{
    // ataque inimigo curto e menos irritante
    beep(260 + Math.random()*90,.045,"triangle",.055,sfxGain,150 + Math.random()*60);
  },
  hit:()=>{
    beep(115,.045,"triangle",.07,sfxGain,85);
  },
  kill:()=>{
    // plop/krak curto
    beep(210,.055,"square",.08,sfxGain,90);
    noise(.055,.09,700);
  },
  boom:()=>{
    // explosão em camadas: grave + ruído curto
    beep(82,.28,"sawtooth",.16,sfxGain,34);
    noise(.34,.32,520);
    setTimeout(()=>noise(.12,.10,1100),80);
  },
  jump:()=>beep(320,.055,"triangle",.075,sfxGain,560),
  pickup:()=>{
    beep(620,.045,"triangle",.07);
    setTimeout(()=>beep(920,.06,"triangle",.07),45);
  },
  portal:()=>{
    beep(440,.1,"sine",.09);
    setTimeout(()=>beep(660,.1,"sine",.09),70);
    setTimeout(()=>beep(990,.14,"sine",.08),140);
  },
  hazard:()=>noise(.07,.08,650)
};
function enemyWeirdVoice(type) {
  if (!audioCtx) return;

  const bank = {
    runner:[180,120],
    gunner:[260,180],
    sniper:[520,260],
    bomber:[95,65],
    jetpack:[430,620],
    spitter:[150,95],
    crawler:[75,110],
    shielder:[210,170],
    mortar:[115,80],
    ninja:[640,320],
    drone:[520,680],
    laserbot:[760,380],
    boss_tank:[70,45],
    boss_blob:[120,70],
    boss_mecha:[360,160],
    boss_final:[55,180]
  }[type] || [220,130];

  const [a,b] = bank;
  beep(a, .05, "triangle", .055, sfxGain, b);
  if (type.startsWith("boss")) {
    setTimeout(()=>noise(.11,.10,360), 55);
  }
}
function startMusic(kind){
  if(!audioCtx) return;
  if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
  currentMusic=kind; musicStep=0;

  const tracks={
    fire:{
      tempo:176,
      bass:[55,55,82,55,98,82,65,73,55,55,110,98,82,73,65,55],
      lead:[330,0,392,440,0,392,330,262,330,0,494,440,392,330,294,0],
      wave:"square"
    },
    toxic:{
      tempo:150,
      bass:[49,49,73,49,65,58,49,44,49,49,87,73,65,58,49,44],
      lead:[196,0,233,262,0,294,262,233,196,0,349,294,262,233,196,0],
      wave:"triangle"
    },
    neon:{
      tempo:188,
      bass:[65,65,98,65,117,98,78,98,65,65,131,117,98,78,65,98],
      lead:[523,392,330,392,659,523,392,330,523,392,784,659,523,392,330,0],
      wave:"square"
    },
    final:{
      tempo:198,
      bass:[41,41,62,41,82,74,62,55,41,41,98,82,74,62,55,41],
      lead:[330,370,392,494,587,494,392,370,330,247,330,392,494,587,659,0],
      wave:"sawtooth"
    }
  };

  const t=tracks[kind]||tracks.neon;
  const interval=60000/t.tempo/4;

  function hat(){
    noise(.025,.022,4500,musicGain);
  }

  function snare(){
    noise(.06,.055,1800,musicGain);
    beep(180,.035,"triangle",.035,musicGain,120);
  }

  function kick(){
    beep(105,.075,"sine",.11,musicGain,42);
  }

  function tick(){
    const i=musicStep;
    const b=t.bass[i%t.bass.length];
    const l=t.lead[i%t.lead.length];

    // kick em 4x4
    if(i%4===0) kick();

    // snare no contratempo
    if(i%8===4) snare();

    // hi-hat frequente para energia
    if(i%2===0) hat();

    // baixo pulsante
    if(i%2===0) {
      beep(b,.11,"sawtooth",.07,musicGain,b*.98);
    }

    // lead arcade curto
    if(l && i%2===1) {
      beep(l,.07,t.wave,.04,musicGain);
      if(kind==="neon" || kind==="final") {
        setTimeout(()=>beep(l*1.5,.045,"square",.025,musicGain), 35);
      }
    }

    // stabs por fase
    if(kind==="fire" && i%16===12) beep(220,.12,"square",.055,musicGain,110);
    if(kind==="toxic" && i%16===10) beep(147,.16,"triangle",.045,musicGain,98);
    if(kind==="final" && i%16===14) {
      beep(82,.18,"sawtooth",.08,musicGain,41);
      noise(.08,.055,900,musicGain);
    }

    musicStep++;
  }

  tick();
  musicTimer=setInterval(tick,interval);
}

function unlockAudio(){initAudio(); if(audioCtx?.state==="suspended") audioCtx.resume();}
window.addEventListener("pointerdown",unlockAudio,{once:true});
window.addEventListener("keydown",unlockAudio,{once:true});

// ===== rede =====

function handleRemoteHudAction(action) {
  if (action === "toggle") {
    hudEditing = !hudEditing;
    if (hudEditBtn) hudEditBtn.textContent = hudEditing ? "Editando HUD" : "Editar HUD";
    toast?.(hudEditing ? "Editando HUD pela TV" : "Edição de HUD desligada");
    return;
  }

  if (action === "save") {
    saveHudLayout();
    hudEditing = false;
    if (hudEditBtn) hudEditBtn.textContent = "Editar HUD";
    toast?.("HUD salva");
    return;
  }

  if (action === "reset") {
    resetHudLayout();
    hudEditing = false;
    if (hudEditBtn) hudEditBtn.textContent = "Editar HUD";
    toast?.("HUD resetada");
  }
}

async function initNetwork(){
  const res=await fetch("/new-session");
  const data=await res.json();
  roomCode=data.code;
  codeEl.textContent=data.code;
  qrEl.innerHTML=`<img src="${data.qr}" alt="QR">`;

  if (inviteLinkEl) {
    const url = data.controllerUrl || `${location.origin}/controller.html?code=${data.code}`;
    inviteLinkEl.textContent = url;
    inviteLinkEl.title = url;
    if ("href" in inviteLinkEl) inviteLinkEl.href = url;
  }

  if (playLinkEl) {
    const url = data.playUrl || `${location.origin}/play?code=${data.code}`;
    playLinkEl.textContent = url;
    playLinkEl.title = url;
    if ("href" in playLinkEl) playLinkEl.href = url;
  }
  ws=new WebSocket(wsUrl());
  ws.onopen=()=>{ws.send(JSON.stringify({type:"join-tv",code:roomCode}));statusEl.textContent="TV conectada. Escaneie o QR."};
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.type==="players"){
      playersConnected=msg.players || [];
      playerColors = {};
      for (const p of playersConnected) playerColors[p.playerId] = p.playerId;
      playersEl.textContent=`Jogadores: ${playersConnected.length}/4`;
      syncPlayers(); statusEl.textContent=playersConnected.length?"Partida iniciada!":"Aguardando controle";
    }
    if(msg.type==="input") {
      if (msg.input?.hudAction) {
        handleRemoteHudAction(msg.input.hudAction);
        return;
      }

      if (msg.input?.pauseMenu !== undefined) {
        game.pausedByConnection = !!msg.input.pauseMenu;
      }

      const previous = inputs[msg.playerId] || {move:{x:0,y:0}, aim:{x:1,y:0}, shooting:false, jump:false, grenade:false, down:false};
      inputs[msg.playerId] = {
        ...previous,
        ...msg.input,
        move: msg.input?.move || previous.move || {x:0,y:0},
        aim: msg.input?.aim || previous.aim || {x:1,y:0}
      };

      if (msg.input?.difficulty) {
        setDifficulty(msg.input.difficulty);
      }

      if (msg.input?.ready) {
        game.readyPlayers.add(msg.playerId);
        statusEl.textContent = `${pname(msg.playerId)} está pronto.`;
      }

      if (msg.input?.start) {
        game.readyPlayers.add(msg.playerId);
        startGameFromLobby(msg.input.difficulty || game.difficulty || "normal");
      }
    }
  };
}


function setDifficulty(mode) {
  game.difficulty = mode;
  game.difficultyMultiplier = mode === "easy" ? 0.75 : mode === "hard" ? 1.35 : mode === "insane" ? 1.75 : 1;
  // dificuldade escolhida no lobby; não exibir toast durante gameplay
}

function startGameFromLobby(mode = game.difficulty) {
  if (!game.readyPlayers || game.readyPlayers.size === 0) {
    statusEl.textContent = "Aguardando COMEÇAR no controle.";
    return;
  }

  // Garante que os jogadores conectados existam antes de carregar a fase.
  syncPlayers();

  for (const p of playersConnected) {
    if (!inputs[p.playerId]) {
      inputs[p.playerId] = {move:{x:0,y:0}, aim:{x:1,y:0}, shooting:false, jump:false, grenade:false, down:false};
    }
  }

  for (const p of game.players.values()) {
    p.lives = 3;
    p.respawnTimer = 0;
    p.alive = true;
    p.hp = p.maxHp || 100;
  }

  setDifficulty(mode);
  game.gameOverHandled = false;
  game.lobby = false;
  game.started = true;
  statusEl.textContent = "Jogo iniciado!";
  loadLevel(0);
  for (const p of game.players.values()) ensureBombs(p);
  renderStats();
}


function normalizeEditorLevel(data) {
  return {
    name: data.name || "Fase customizada",
    music: data.music || "fire",
    width: data.width || 3600,
    bg: data.bg || ["#151520","#1c2235"],
    portalY: data.portalY || data.portal?.y || 558,
    platforms: data.platforms || [[0,650,3600,80]],
    enemies: data.enemies || [],
    hazards: (data.hazards || []).map(h => ({...h})),
    pickups: (data.pickups || []).map(p => ({...p})),
    decor: (data.decor || []).map(d => ({...d})),
    _editorPortal: data.portal || null
  };
}

function loadCustomLevelFromStorage() {
  try {
    const raw = localStorage.getItem("customLevel");
    if (!raw) return false;
    const custom = normalizeEditorLevel(JSON.parse(raw));
    levels.unshift(custom);
    return true;
  } catch (err) {
    console.warn("Falha ao carregar fase customizada", err);
    return false;
  }
}

function loadLevel(index){
  game.levelIndex=index%levels.length;
  game.level=JSON.parse(JSON.stringify(levels[game.levelIndex]));
  game.cameraX=0; game.time=0; game.levelClear=false; game.transitionTimer=0;
  game.exitPortal=game.level._editorPortal
    ? {...game.level._editorPortal, active:false}
    : {x:game.level.width-130,y:game.level.portalY,w:86,h:92,active:false};
  game.bullets=[]; game.enemyBullets=[]; game.enemies=[]; game.particles=[]; game.grenades=[]; game.pickups=[]; game.messages=[];
  if (game.level.pickups) {
    game.pickups = game.level.pickups.map(p => ({...p, w:p.w||24, h:p.h||24}));
  }
  spawnGuaranteedWeaponDrops();
  for(const e of game.level.enemies) spawnEnemy(e[0],e[1],e[2]);
  for(const p of game.players.values()){
    p.x=110+(p.id-1)*38; p.y=560; p.vx=p.vy=0; p.hp=100; p.alive=true; p.onGround=false; p.lastJumpSeq=0; p.lastGrenadeSeq=0; p.coyote=0; p.deadAnimStarted=false; p.deadAt=0; p.respawnTimer=0; if(p.lives===undefined)p.lives=3; p.weaponId="default"; p.weaponAmmo=0; p.bombs=START_BOMBS;
  }
  if(audioCtx) startMusic(game.level.music);
  toast(game.level.name);
}

function syncPlayers(){
  playersConnected = playersConnected
    .filter(p => p && p.playerId >= 1 && p.playerId <= 4)
    .sort((a,b)=>a.playerId-b.playerId);

  for(const p of playersConnected){
    if(!game.players.has(p.playerId)){
      game.players.set(p.playerId,{id:p.playerId,x:110+(p.playerId-1)*38,y:560,w:32,h:48,vx:0,vy:0,hp:100,maxHp:100,alive:!game.started?true:true,deadAnimStarted:false,deadAt:0,facing:1,aimX:1,aimY:0,onGround:false,fireCd:0,grenadeCd:0,inv:90,kills:0,score:0,jumpHeld:false,lastJumpSeq:0,lastGrenadeSeq:0,coyote:0,lives:3,respawnTimer:0,weaponId:"default",weaponAmmo:0,bombs:START_BOMBS});
      inputs[p.playerId]={move:{x:0,y:0}, aim:{x:1,y:0}, shooting:false, jump:false, jumpSeq:0, grenade:false, grenadeSeq:0, down:false};
      const np = game.players.get(p.playerId);
      if (game.started && !game.lobby && np) {
        np.x = Math.max(90, game.cameraX + 120 + (p.playerId - 1) * 44);
        np.y = 120;
        np.vx = 0;
        np.vy = 0;
        np.inv = 150;
        np.alive = true;
        np.hp = np.maxHp || 100;
        np.bombs = START_BOMBS;
        np.deadAnimStarted = false;
        np.deadAt = 0;
        toast(`${pname(p.playerId)} entrou na partida`);
      }
    }
  }
  for(const id of [...game.players.keys()]) {
    if(!playersConnected.some(p=>p.playerId===id) && !game.started) game.players.get(id).alive=false;
  }
  if (playersConnected.length === 0) {
    game.started = false;
    game.lobby = true;
    game.readyPlayers.clear();
  }
  renderStats();
}

function spawnEnemy(type,x,y){
  const c=enemyCfg[type];
  const mult = game.difficultyMultiplier || 1;
  const hp = Math.round(c.hp * mult);
  game.enemies.push({type,x,y,w:c.w,h:c.h,vx:0,vy:0,hp,maxHp:hp,speed:c.speed*(0.92+mult*0.12),score:c.score,color:c.color,boss:!!c.boss,alive:true,facing:-1,cd:Math.floor(rand(20,100)/mult),phase:rand(0,6.28),shield:type==="shielder"?70:0});
}

function solidAt(ent){
  for(const p of game.level.platforms){
    const r={x:p[0],y:p[1],w:p[2],h:p[3]};
    if(rects(ent,r)) return r;
  }
  return null;
}


function groundAhead(e, dir){
  const foot = {x:e.x + (dir>0 ? e.w + 8 : -8), y:e.y + e.h + 6, w:8, h:10};
  return !!solidAt(foot);
}

function obstacleAhead(e, dir){
  return !!solidAt({x:e.x + (dir>0 ? e.w + 2 : -4), y:e.y + 8, w:5, h:e.h-12});
}

function smartEnemyUnstuck(e, target){
  e.ai = e.ai || {stuck:0,lastX:e.x,jumpCd:0,turnCd:0};
  const moved = Math.abs(e.x - e.ai.lastX);
  e.ai.lastX = e.x;
  e.ai.jumpCd = Math.max(0,(e.ai.jumpCd||0)-1);
  e.ai.turnCd = Math.max(0,(e.ai.turnCd||0)-1);

  if(moved < .18 && Math.abs(e.vx) > .2) e.ai.stuck++;
  else e.ai.stuck = Math.max(0,e.ai.stuck-2);

  const dir = e.facing || 1;
  const blocked = obstacleAhead(e, dir);
  const noGround = e.onGround && !e.boss && !groundAhead(e, dir) && !["drone","bat","skull","phantom","jetpack","boss_dragon"].includes(e.type);

  if(e.onGround && e.ai.jumpCd<=0 && (blocked || noGround || e.ai.stuck>18)){
    e.vy = noGround ? -10 : -12.5;
    e.x += -dir * 3;
    e.ai.jumpCd = 34;
    e.ai.stuck = 0;
    return;
  }

  if(e.ai.stuck>40 && e.ai.turnCd<=0){
    e.x = clamp(e.x - dir*24, 0, game.level.width-e.w);
    e.vx = -dir * Math.max(.8,e.speed||1);
    e.ai.turnCd = 45;
    e.ai.stuck = 0;
  }

  // se o player está em plataforma acima/abaixo, tenta ajustar movimento com mais intenção
  if(target && e.onGround && Math.abs((target.y||0)-e.y)>80 && Math.abs((target.x||0)-e.x)<360 && e.ai.jumpCd<=0){
    e.vy = target.y < e.y ? -13 : e.vy;
    e.ai.jumpCd = 40;
  }
}

function moveEntity(e){
  e.x+=e.vx;
  let r=solidAt(e);
  if(r){if(e.vx>0)e.x=r.x-e.w;if(e.vx<0)e.x=r.x+r.w;e.vx=0;}
  e.y+=e.vy;
  e.onGround=false;
  r=solidAt(e);
  if(r){if(e.vy>0){e.y=r.y-e.h;e.onGround=true;} if(e.vy<0)e.y=r.y+r.h; e.vy=0;}
  e.x=clamp(e.x,0,game.level.width-e.w);
}

function nearestPlayer(e){
  let best=null,bd=Infinity;
  for(const p of game.players.values()){
    if(!p.alive||p.hp<=0) continue;
    const d=Math.hypot((p.x+p.w/2)-(e.x+e.w/2),(p.y+p.h/2)-(e.y+e.h/2));
    if(d<bd){bd=d;best=p;}
  }
  return best;
}

function separateEnemyFromPlayer(e,p){
  const ex=e.x+e.w/2, ey=e.y+e.h/2;
  const px=p.x+p.w/2, py=p.y+p.h/2;
  const overlapX = (e.w+p.w)/2 - Math.abs(ex-px);
  const overlapY = (e.h+p.h)/2 - Math.abs(ey-py);

  if(overlapX <= 0 || overlapY <= 0) return false;

  // direção do empurrão baseada no centro; nunca deixa 0
  const dir = ex < px ? -1 : 1;

  // separação forte o suficiente para sair da hitbox no mesmo frame
  const pushEnemy = Math.max(26, Math.min(72, overlapX + 34));
  const pushPlayer = Math.max(5, Math.min(16, overlapX * .35));

  e.x = clamp(e.x + dir * pushEnemy, 0, game.level.width - e.w);
  p.x = clamp(p.x - dir * pushPlayer, 0, game.level.width - p.w);

  // Estado de repulsão: por alguns frames o inimigo foge do player,
  // impedindo que a IA volte imediatamente para cima dele.
  e.repelDir = dir;
  const assassin = e.type === "ninja" || e.type === "samurai" || e.type === "phantom";
  e.repelTimer = e.boss ? 14 : assassin ? 12 : 24;
  e.contactCd = e.boss ? 28 : assassin ? 46 : 38;
  e.vx = dir * Math.max(e.boss ? 3.5 : assassin ? 4.2 : 6.5, (e.speed || 1) * (e.boss ? 2.2 : assassin ? 2.6 : 4.2));
  p.vx += -dir * 5.5;

  if(overlapY > 10) {
    if(ey < py) {
      e.y = Math.max(0, e.y - Math.min(18, overlapY + 4));
      e.vy = -7;
    } else {
      p.vy = Math.min(p.vy || 0, -5);
    }
  }

  e.ai = e.ai || {};
  e.ai.stuck = 0;
  e.ai.jumpCd = Math.max(e.ai.jumpCd || 0, 22);
  return true;
}

function enemyContactDamage(e){
  const table = {
    ninja: 42,
    samurai: 58,
    charger: 34,
    raptor: 38,
    beast: 45,
    spider: 30,
    leaper: 30,
    bruiser: 36,
    flametrooper: 34,
    cryotrooper: 32,
    shocker: 38,
    phantom: 40,
    boss_dragon: 72,
    boss_spider: 64,
    boss_warlock: 66,
    boss_train: 85,
    boss_queen: 78,
    boss_tank: 60,
    boss_blob: 62,
    boss_mecha: 70,
    boss_final: 90
  };
  if(e.type === "ninja" && Math.random() < .18) return 999; // golpe crítico mortal raro
  if(e.type === "samurai" && Math.random() < .12) return 999; // corte mortal raro
  return table[e.type] || (e.boss ? 50 : 13);
}

function enemyContactToast(e,p,dmg){
  if(dmg >= 999){
    toast(`${e.type.toUpperCase()} aplicou golpe fatal em ${pname(p.id)}`);
  } else if(dmg >= 40){
    toast(`${e.type.toUpperCase()} causou dano pesado`);
  }
}



function updatePlayer(p){
  if(!p.alive || p.hp<=0){
    p.alive=false;
    if((p.respawnTimer || 0) > 0){
      p.respawnTimer--;
      if(p.respawnTimer <= 0 && (p.lives || 0) >= 0) respawnPlayer(p);
    }
    return;
  }
  let input=inputs[p.id]||{}, move=input.move||{x:0,y:0}, aim=input.aim||{x:p.facing,y:0};
  if(playersConnected.length===0&&p.id===1){
    const mx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0);
    move={x:mx,y:keys.s||keys.ArrowDown?1:0};
    const ax=mouse.x+game.cameraX-(p.x+p.w/2), ay=mouse.y-(p.y+p.h/2), l=len(ax,ay);
    aim={x:ax/l,y:ay/l}; input.shooting=mouse.down||keys.Control; input.jump=keys.w||keys.ArrowUp||keys[" "]; input.grenade=keys.g; input.down=keys.s||keys.ArrowDown;
  }
  const speed=input.down?2.1:4.25;
  p.vx=(move.x||0)*speed; p.vy+=GRAVITY; p.vy=Math.min(p.vy,18);
  if((move.x||0)>0.2)p.facing=1;if((move.x||0)<-0.2)p.facing=-1;
  if(Math.hypot(aim.x||0,aim.y||0)>0.2){const l=len(aim.x,aim.y);p.aimX=aim.x/l;p.aimY=aim.y/l;if(Math.abs(p.aimX)>0.2)p.facing=Math.sign(p.aimX);}
  if (p.onGround) p.coyote = 8;
  else p.coyote = Math.max(0, (p.coyote || 0) - 1);

  const seq = input.jumpSeq || 0;
  const seqPressed = seq !== (p.lastJumpSeq || 0);
  const heldPressed = !!input.jump && !p.jumpHeld;
  const wantsJump = seqPressed || heldPressed;

  if(wantsJump && (p.onGround || (p.coyote || 0) > 0)){
    p.vy=-14.8;
    p.onGround=false;
    p.coyote=0;
    burst(p.x+p.w/2,p.y+p.h,"#fff",10);
    sfx.jump();
  }

  if(seqPressed) p.lastJumpSeq = seq;
  p.jumpHeld=!!input.jump;
  if(p.fireCd>0)p.fireCd--;
  const activeWeapon = weaponById(p.weaponId);
  if(input.shooting&&p.fireCd<=0){
    shoot(p);
    sfx.shoot();
    p.fireCd=activeWeapon.cd || defaultWeapon.cd;
  }
  if(p.grenadeCd>0)p.grenadeCd--;

  const grenadeSeq = input.grenadeSeq || 0;
  const grenadeSeqPressed = grenadeSeq !== (p.lastGrenadeSeq || 0);
  const grenadeHeldPressed = !!input.grenade && !p.grenadeHeld;
  const wantsGrenade = grenadeSeqPressed || grenadeHeldPressed;

  ensureBombs(p);
  if(wantsGrenade && p.grenadeCd<=0 && p.bombs > 0){
    p.bombs--;
    game.grenades.push({owner:p.id,x:p.x+p.w/2,y:p.y+18,w:12,h:12,vx:p.facing*8,vy:-7,t:66});
    p.grenadeCd=135;
  } else if(wantsGrenade && p.grenadeCd<=0 && p.bombs <= 0) {
    p.grenadeCd = 20;
    toast(`${pname(p.id)} sem bombas`);
  }

  if(grenadeSeqPressed) p.lastGrenadeSeq = grenadeSeq;
  p.grenadeHeld=!!input.grenade;
  if(p.inv>0)p.inv--;
  moveEntity(p);

  // Se alguém ficou muito atrás da câmera, não mata.
  // Puxa de volta suavemente para a borda visível.
  const minVisibleX = game.cameraX + 24;
  if (game.started && p.x + p.w < minVisibleX) {
    p.x = minVisibleX;
    p.vx = Math.max(0, p.vx);
  }

  applyHazardsToPlayer(p);
  if(p.y>H+250){
    damagePlayer(p,35);
    if(p.alive){
      const sp = spawnPointForPlayer(p.id);
      p.x=sp.x;
      p.y=80;
      p.vx=p.vy=0;
      p.inv=120;
    }
  }
  for(const item of game.pickups){
    if(!item.dead&&rects(p,item)){
      item.dead=true;
      if(item.type==="heal") {
        p.hp=Math.min(p.maxHp,p.hp+40);
        toast(`${pname(p.id)} pegou sangue`);
      }
      if(item.type==="life") {
        p.lives=Math.min(9,(p.lives||0)+1);
        toast(`${pname(p.id)} ganhou +1 vida`);
      }
      if(item.type==="revive") reviveOnePlayer(p,item);
      if(item.type==="weapon") {
        const wpn = weaponById(item.weaponId);
        p.weaponId = wpn.id;
        p.weaponAmmo = item.ammo || wpn.ammo;
        toast(`${pname(p.id)} pegou ${wpn.name} (${p.weaponAmmo} balas)`);
      }
      if(item.type==="bombs") {
        const amount = item.amount || 2;
        ensureBombs(p);
        p.bombs = Math.min(MAX_BOMBS, p.bombs + amount);
        toast(`${pname(p.id)} pegou 💣 +${amount}`);
      }
      if(item.type==="rapid") p.fireCd=0;
      const pc = item.type==="heal"?"#57e389":item.type==="life"?"#ffe66d":item.type==="revive"?"#d386ff":item.type==="weapon"?"#66d9ff":item.type==="bombs"?"#ff9f43":"#66d9ff";
      burst(item.x,item.y,pc,22);
      sfx.pickup();
    }
  }
}

function shoot(p){
  let weapon = weaponById(p.weaponId);
  if((p.weaponId && p.weaponId !== "default") && (p.weaponAmmo || 0) <= 0){
    p.weaponId = "default";
    p.weaponAmmo = 0;
    weapon = defaultWeapon;
  }

  const sx=p.x+p.w/2+p.aimX*24, sy=p.y+p.h/2+p.aimY*16;
  const baseAng = Math.atan2(p.aimY || 0, p.aimX || p.facing || 1);

  for(let i=0;i<weapon.shots;i++){
    const mid = (weapon.shots-1)/2;
    const offset = (i-mid) * (weapon.spread || 0);
    const jitter = weapon.shots === 1 ? (Math.random()-.5)*(weapon.spread||0) : 0;
    const a = baseAng + offset + jitter;
    const vx = Math.cos(a) * weapon.speed;
    const vy = Math.sin(a) * weapon.speed;
    game.bullets.push({
      owner:p.id,
      x:sx,
      y:sy,
      w:weapon.w || 12,
      h:weapon.h || 6,
      vx,vy,
      dmg:weapon.dmg,
      life:weapon.life,
      color:weapon.color || color(p.id),
      weaponId:weapon.id,
      explode:weapon.explode || 0
    });
  }

  if(p.weaponId && p.weaponId !== "default"){
    p.weaponAmmo = Math.max(0, (p.weaponAmmo || 0) - 1);
    if(p.weaponAmmo <= 0){
      toast(`${pname(p.id)} voltou para ${defaultWeapon.name}`);
      p.weaponId = "default";
      p.weaponAmmo = 0;
    }
  }
}

function enemyShoot(e,target,kind="bullet",speed=7){
  const a=center(e), b=center(target), l=len(b.x-a.x,b.y-a.y);
  game.enemyBullets.push({x:a.x,y:a.y,w:kind==="rocket"?18:kind==="acid"?14:10,h:kind==="rocket"?18:kind==="acid"?14:10,vx:(b.x-a.x)/l*speed,vy:(b.y-a.y)/l*speed,dmg:kind==="rocket"?22:kind==="acid"?16:11,life:150,kind,owner:"enemy"});
  sfx.enemy();
}

function updateEnemy(e){
  if(!e.alive||e.hp<=0)return;
  const t=nearestPlayer(e);
  if(!t)return;
  const ec=center(e), tc=center(t), dx=tc.x-ec.x, dy=tc.y-ec.y, ad=Math.abs(dx), d=Math.hypot(dx,dy);
  e.facing=dx>=0?1:-1;
  e.phase+=0.04;
  e.vy+=GRAVITY; e.vy=Math.min(e.vy,18);

  if((e.repelTimer || 0) > 0){
    e.repelTimer--;
    e.vx = (e.repelDir || -e.facing || 1) * Math.max(e.boss ? 3.5 : 6.5, (e.speed || 1) * (e.boss ? 2.2 : 4.2));
    if(e.onGround && e.repelTimer === 18 && !e.boss) e.vy = -8;
  } else {
  switch(e.type){
    case "runner": e.vx=e.facing*e.speed; break;
    case "crawler": e.vx=e.facing*e.speed*1.25; break;
    case "ninja": e.vx=e.facing*e.speed; if(e.onGround&&ad<340&&Math.random()<.025)e.vy=-13; break;
    case "jetpack": e.vx=e.facing*e.speed; e.vy+=Math.sin(e.phase)*.7 - .52; break;
    case "drone":
    case "bat":
    case "skull":
    case "phantom":
      e.vx=e.facing*e.speed; e.vy=Math.sin(e.phase*1.7)*2.4 - .18; break;
    case "shielder":
    case "turretbot":
      e.vx=ad>220?e.facing*e.speed:0; break;
    case "leaper":
    case "spider":
      e.vx=e.facing*e.speed; if(e.onGround&&ad<360&&Math.random()<.035)e.vy=-13.5; break;
    case "charger":
      e.vx=e.facing*(ad<520?e.speed*1.8:e.speed*.55); break;
    case "bruiser":
      e.vx=ad>180?e.facing*e.speed:0; break;
    case "teleport":
      e.vx=e.facing*e.speed*.65; if(ad<500&&Math.random()<.012){e.x=clamp(t.x- e.facing*rand(120,220),0,game.level.width-e.w); burst(e.x,e.y,"#d386ff",18);} break;
    case "samurai":
      e.vx=e.facing*e.speed; if(e.onGround&&ad<300&&Math.random()<.025)e.vy=-10; break;
    case "boss_blob":
    case "boss_spider":
      e.vx=e.facing*e.speed; if(e.onGround&&Math.random()<.012)e.vy=-12; break;
    case "boss_dragon":
      e.vx=e.facing*e.speed; e.vy+=Math.sin(e.phase)*.42-.2; break;
    case "boss_train":
      e.vx=e.facing*e.speed*1.25; break;
    default: e.vx=ad>280?e.facing*e.speed:0;
  }
  }
  e.cd--;
  if(e.cd<=0){
    if(e.type==="gunner") {enemyShoot(e,t,"bullet",7); e.cd=75;}
    else if(e.type==="sniper") {enemyShoot(e,t,"laser",10); e.cd=120;}
    else if(e.type==="spitter") {enemyShoot(e,t,"acid",5); e.cd=85;}
    else if(e.type==="mortar") {game.enemyBullets.push({x:ec.x,y:ec.y,w:16,h:16,vx:e.facing*3.5,vy:-9,dmg:20,life:150,kind:"mortar"});sfx.enemy();e.cd=105;}
    else if(e.type==="bomber") {game.enemyBullets.push({x:ec.x,y:ec.y,w:18,h:18,vx:e.facing*4.2,vy:-6,dmg:24,life:95,kind:"bomb"});sfx.enemy();e.cd=95;}
    else if(e.type==="laserbot") {enemyShoot(e,t,"laser",11); e.cd=70;}
    else if(e.type==="medic") {
      const ally=game.enemies.find(o=>o!==e&&o.alive&&o.hp>0&&!o.boss&&Math.abs(o.x-e.x)<260);
      if(ally){ally.hp=Math.min(ally.maxHp,ally.hp+35); burst(ally.x+ally.w/2,ally.y+ally.h/2,"#57e389",12);}
      e.cd=95;
    }
    else if(e.type==="summoner") {
      spawnEnemy(Math.random()<.5?"crawler":"bat", clamp(e.x+e.facing*80,0,game.level.width-80), e.y+10);
      e.cd=180;
    }
    else if(e.type==="splitter") {enemyShoot(e,t,"bullet",6); e.cd=70;}
    else if(e.type==="bat"||e.type==="skull"||e.type==="phantom") {enemyShoot(e,t,"bullet",6.5); e.cd=95;}
    else if(e.type==="minebot") {game.enemyBullets.push({x:ec.x,y:ec.y,w:20,h:20,vx:e.facing*2.2,vy:-5,dmg:24,life:110,kind:"bomb"});sfx.enemy();e.cd=125;}
    else if(e.type==="flametrooper") {for(let i=-1;i<=1;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:12,h:12,vx:e.facing*(4+i),vy:i*1.1,dmg:12,life:55,kind:"rocket"});sfx.enemy();e.cd=65;}
    else if(e.type==="cryotrooper") {enemyShoot(e,t,"acid",6); e.cd=80;}
    else if(e.type==="shocker") {for(let i=-1;i<=1;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:10,h:10,vx:e.facing*7,vy:i*3,dmg:12,life:90,kind:"laser"});sfx.enemy();e.cd=85;}
    else if(e.type==="teleport") {enemyShoot(e,t,"laser",9); e.cd=85;}
    else if(e.type==="turretbot") {enemyShoot(e,t,"rocket",5.5); e.cd=95;}
    else if(e.type==="grenadier") {game.enemyBullets.push({x:ec.x,y:ec.y,w:16,h:16,vx:e.facing*4.8,vy:-7,dmg:22,life:120,kind:"bomb"});sfx.enemy();e.cd=90;}
    else if(e.type==="poisoner") {for(let i=-1;i<=1;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:13,h:13,vx:e.facing*(4.8+i),vy:-4+i*2,dmg:14,life:120,kind:"acid"});sfx.enemy();e.cd=95;}
    else if(e.type==="samurai") {if(ad<170) damagePlayer(t,18,e.facing*12,-8); else enemyShoot(e,t,"laser",8); e.cd=80;}
    else if(e.type==="mimic") {enemyShoot(e,t,Math.random()<.5?"bullet":"acid",7); e.cd=75;}
    else if(e.type==="boss_tank") {enemyShoot(e,t,"rocket",6); setTimeout(()=>enemyShoot(e,t,"rocket",6),160); e.cd=90;}
    else if(e.type==="boss_blob") {for(let i=-1;i<=1;i++){game.enemyBullets.push({x:ec.x,y:ec.y,w:15,h:15,vx:e.facing*(4+i),vy:-6+i*2,dmg:17,life:140,kind:"acid"});}sfx.enemy();e.cd=75;}
    else if(e.type==="boss_mecha") {for(let i=-2;i<=2;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:10,h:10,vx:e.facing*8,vy:i*2,dmg:13,life:110,kind:"laser"});sfx.enemy();e.cd=58;}
    else if(e.type==="boss_final") {for(let i=-3;i<=3;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:14,h:14,vx:e.facing*(5+Math.abs(i)),vy:i*2.3,dmg:18,life:140,kind:i%2?"rocket":"acid"});sfx.enemy();e.cd=48;}
    else if(e.type==="boss_dragon") {for(let i=-2;i<=2;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:16,h:16,vx:e.facing*(6+Math.abs(i)),vy:i*2,dmg:20,life:120,kind:"rocket"});sfx.enemy();e.cd=60;}
    else if(e.type==="boss_spider") {for(let i=-3;i<=3;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:12,h:12,vx:e.facing*(4+Math.abs(i)*.7),vy:-5+i*1.8,dmg:16,life:135,kind:"acid"}); if(Math.random()<.45)spawnEnemy("spider",clamp(e.x+e.facing*120,0,game.level.width-100),e.y+40); sfx.enemy();e.cd=72;}
    else if(e.type==="boss_warlock") {for(let i=0;i<4;i++)enemyShoot(e,t,i%2?"laser":"acid",7+i); if(Math.random()<.35)spawnEnemy("phantom",clamp(e.x+rand(-180,180),0,game.level.width-80),e.y); e.cd=68;}
    else if(e.type==="boss_train") {enemyShoot(e,t,"rocket",7); game.enemyBullets.push({x:ec.x,y:ec.y,w:18,h:18,vx:e.facing*7,vy:-9,dmg:24,life:120,kind:"bomb"});sfx.enemy();e.cd=55;}
    else if(e.type==="boss_queen") {for(let i=-2;i<=2;i++)game.enemyBullets.push({x:ec.x,y:ec.y,w:13,h:13,vx:e.facing*6,vy:i*2.4,dmg:17,life:120,kind:i%2?"acid":"laser"}); if(Math.random()<.4)spawnEnemy("leaper",clamp(e.x+e.facing*140,0,game.level.width-100),e.y+30); sfx.enemy();e.cd=62;}
  }
  moveEntity(e);
  smartEnemyUnstuck(e,t);

  e.contactCd = Math.max(0, (e.contactCd || 0) - 1);
  for(const p of game.players.values()) {
    if(!p.alive || p.hp<=0 || !rects(e,p)) continue;

    const canHit = p.inv<=0 && e.contactCd<=0;
    const dirBefore = (p.x+p.w/2) >= (e.x+e.w/2) ? 1 : -1;

    if(canHit) {
      const dmg = enemyContactDamage(e);
      enemyContactToast(e,p,dmg);
      damagePlayer(p,dmg,dirBefore*14,-10);
    }

    separateEnemyFromPlayer(e,p);

    // garante que mesmo se ainda encostar por causa de parede, ele continua sendo expulso
    if(rects(e,p)){
      e.x = clamp(e.x - dirBefore * 38, 0, game.level.width - e.w);
      e.vx = -dirBefore * Math.max(e.boss ? 4 : 7, (e.speed || 1) * 4);
      e.repelDir = -dirBefore;
      e.repelTimer = Math.max(e.repelTimer || 0, 20);
    }
  }
}

function damagePlayer(p,dmg,kx=0,ky=0){
  if(p.inv>0 || !p.alive)return;
  p.hp-=dmg;
  p.inv=38;
  p.vx+=kx;
  p.vy+=ky;
  addShake(5);
  burst(p.x+p.w/2,p.y+p.h/2,"#ff5a7a",15);
  sfx.hit();
  if(p.hp<=0) downPlayer(p);
}

function updateProjectiles(){
  for(const b of game.bullets){
    b.x+=b.vx;b.y+=b.vy;b.life--;
    if(solidAt(b)){if(b.explode) explode({x:b.x,y:b.y,owner:b.owner,dead:false},b.explode,b.dmg*1.2); b.life=0;burst(b.x,b.y,b.color,4);}
    for(const e of game.enemies){
      if(!e.alive||e.hp<=0)continue;
      if(rects(b,e)){
        let dmg=b.dmg;
        if(e.type==="shielder"&&Math.sign(b.vx)!==e.facing)dmg*=.35;
        e.hp-=dmg;if(b.explode) explode({x:b.x,y:b.y,owner:b.owner,dead:false},b.explode,b.dmg*1.2); b.life=0;burst(b.x,b.y,b.color,5);sfx.hit();
        if(e.hp<=0) killEnemy(e,b.owner);
        break;
      }
    }
  }
  game.bullets=game.bullets.filter(b=>b.life>0);
  for(const b of game.enemyBullets){
    b.vy += (b.kind==="mortar"||b.kind==="bomb") ? .38 : 0;
    b.x+=b.vx;b.y+=b.vy;b.life--;
    if(solidAt(b)){ if(b.kind==="bomb"||b.kind==="rocket"||b.kind==="mortar") explode({x:b.x,y:b.y,owner:0,dead:false},90,60); b.life=0; }
    for(const p of game.players.values()) if(p.alive&&p.inv<=0&&rects(b,p)){damagePlayer(p,b.dmg);b.life=0;break;}
  }
  game.enemyBullets=game.enemyBullets.filter(b=>b.life>0);
  for(const g of game.grenades){
    g.vy+=.45;g.x+=g.vx;g.y+=g.vy;g.t--;
    if(g.t===45 || g.t===25 || g.t===10) beep(760,.035,"square",.04,sfxGain,520);
    const hit=solidAt(g);
    if(hit){g.vy*=-.45;g.vx*=.75;g.y=hit.y-g.h-1;}
    if(g.t<=0)explode(g,155,140);
  }
  game.grenades=game.grenades.filter(g=>!g.dead);
}

function explode(g,radius=155,dmg=140){
  if(g.dead)return;g.dead=true;addShake(13);burst(g.x,g.y,"#ffb86b",42);sfx.boom();

  // Só explosões de players podem ferir inimigos.
  // Explosões de inimigos/hazards não dão friendly-fire nos próprios inimigos.
  const playerOwned = Number(g.owner) >= 1 && Number(g.owner) <= 4;
  if(playerOwned){
    for(const e of game.enemies){
      const d=Math.hypot((e.x+e.w/2)-g.x,(e.y+e.h/2)-g.y);
      if(d<radius){
        e.hp-=dmg*(1-d/(radius+20));
        if(e.hp<=0)killEnemy(e,g.owner);
      }
    }
  }
}

function killEnemy(e,owner){
  if(!e.alive)return;
  e.alive=false;
  const points = e.score || enemyPointValue(e.type);
  game.score += points;
  const p=game.players.get(owner);
  if(p){
    p.kills++;
    p.score += points;
    if (p.kills % 5 === 0 || e.boss) toast(`+${points} pontos · ${p.kills} kills`);
  }
  if(e.type==="splitter"){
    spawnEnemy("crawler",clamp(e.x-30,0,game.level.width-80),e.y);
    spawnEnemy("crawler",clamp(e.x+30,0,game.level.width-80),e.y);
  }
  burst(e.x+e.w/2,e.y+e.h/2,e.boss?"#ff5a7a":"#f6f1d1",e.boss?80:25);sfx.kill();
  dropLootFromEnemy(e);
  if(e.boss) openPortal("Chefe derrotado! Portal liberado à direita.");
}

function updateHazards(){
  for(const h of game.level.hazards){
    if(h.type==="turret"){
      h.cd=(h.cd||0)-1;
      if(h.cd<=0){
        const fake={x:h.x,y:h.y,w:h.w,h:h.h}, t=nearestPlayer(fake);
        if(t){enemyShoot(fake,t,"laser",8);h.cd=70;}
      }
    }
    if(h.type==="barrel"&&h.hp<=0&&!h.dead){h.dead=true;explode({x:h.x+h.w/2,y:h.y+h.h/2,owner:0,dead:false},190,180);}

    if(h.type==="beast"||h.type==="raptor"||h.type==="snake"||h.type==="bat_swarm"){
      h.phase=(h.phase||0)+0.045;
      h.vx = h.vx || (h.type==="snake"?1.2:h.type==="bat_swarm"?1.6:2.1);
      h.x += h.dir ? h.vx*h.dir : h.vx;
      if(!h.dir) h.dir = 1;
      if(h.x < (h.minX ?? h.x-160)){h.dir=1;}
      if(h.x > (h.maxX ?? h.x+160)){h.dir=-1;}
      if(h.type==="bat_swarm") h.y += Math.sin(game.time*.08+h.phase)*0.7;
    }

    if(h.type==="mine" && !h.dead){
      h.pulse=(h.pulse||0)+0.08;
    }
  }
}

function applyHazardsToPlayer(p){
  for(const h of game.level.hazards){
    if(h.dead)continue;
    if(h.type==="fire"||h.type==="acid"){
      if(rects(p,h)&&p.inv<=0){damagePlayer(p,h.dmg,0,0); if(Math.random()<.08){sfx.hazard();burst(p.x+p.w/2,p.y+p.h/2,h.type==="fire"?"#ff6b35":"#57e389",5);}}
    } else if(h.type==="saw"){
      const sx=h.x+Math.sin(game.time*h.speed)*(h.range||200), sy=h.y, d=Math.hypot((p.x+p.w/2)-sx,(p.y+p.h/2)-sy);
      if(d<h.r+18) damagePlayer(p,h.dmg,Math.sign((p.x+p.w/2)-sx)*10,-9);
    } else if(h.type==="crusher"){
      const down=(Math.sin(game.time*.035+h.phase)>0.15);
      const y=h.y+(down?250:0), r={x:h.x,y,w:h.w,h:h.h};
      if(rects(p,r)) damagePlayer(p,h.dmg,0,8);
    } else if(h.type==="laser"){
      const on=Math.sin(game.time*.055+h.phase)>-.15, r={x:h.x,y:h.y,w:h.w,h:h.h};
      if(on&&rects(p,r)) damagePlayer(p,h.dmg,0,-4);
    } else if(h.type==="blade_wall"){
      const yy=h.y+Math.sin(game.time*(h.speed||.04)+(h.phase||0))*(h.range||160);
      const r={x:h.x,y:yy,w:h.w,h:h.h};
      if(rects(p,r)) damagePlayer(p,h.dmg||26,Math.sign((p.x+p.w/2)-(h.x+h.w/2))*12,-8);
    } else if(h.type==="spikes"){
      const active=Math.sin(game.time*(h.speed||.05)+(h.phase||0))>-.35;
      if(active&&rects(p,h)) damagePlayer(p,h.dmg||18,0,-12);
    } else if(h.type==="laser_sweep"){
      const lx=h.x+Math.sin(game.time*(h.speed||.035)+(h.phase||0))*(h.range||260);
      const r=h.vertical?{x:lx,y:h.y,w:h.w||18,h:h.h||620}:{x:h.x,y:h.y+Math.sin(game.time*(h.speed||.035)+(h.phase||0))*(h.range||180),w:h.w||420,h:h.h||16};
      if(rects(p,r)) damagePlayer(p,h.dmg||24,0,-5);
    } else if(h.type==="pendulum"){
      const px=h.x+Math.sin(game.time*(h.speed||.045)+(h.phase||0))*(h.range||180);
      const py=h.y+Math.abs(Math.cos(game.time*(h.speed||.045)+(h.phase||0)))*60;
      const d=Math.hypot((p.x+p.w/2)-px,(p.y+p.h/2)-py);
      if(d<(h.r||30)+16) damagePlayer(p,h.dmg||28,Math.sign((p.x+p.w/2)-px)*14,-9);
    } else if(h.type==="mine"){
      if(!h.dead&&rects(p,{x:h.x,y:h.y,w:h.w||28,h:h.h||28})){
        h.dead=true;
        explode({x:h.x+14,y:h.y+14,owner:0,dead:false},110,h.dmg||75);
        damagePlayer(p,h.dmg||40,0,-14);
      }
    } else if(h.type==="beast"||h.type==="raptor"||h.type==="snake"||h.type==="bat_swarm"){
      const r={x:h.x,y:h.y,w:h.w||50,h:h.h||34};
      if(rects(p,r)) damagePlayer(p,h.dmg||18,Math.sign((p.x+p.w/2)-(h.x+(h.w||50)/2))*10,-7);
    }
  }
}

function damageHazards(){
  for(const b of game.bullets){
    for(const h of game.level.hazards){
      if(h.type==="barrel"&&!h.dead&&rects(b,h)){h.hp-=b.dmg;b.life=0;burst(b.x,b.y,"#ffb86b",5);}
    }
  }
}

function burst(x,y,c,n){
  for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(1,6);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:Math.floor(rand(15,45)),color:c});}
}
function toast(text){game.messages.push({text,life:160});}

function aliveEnemies(){return game.enemies.filter(e=>e.alive&&e.hp>0);}
function openPortal(text){
  if(game.levelClear)return;
  game.levelClear=true;game.exitPortal.active=true;statusEl.textContent=text;toast("PORTAL LIBERADO");sfx.portal();
}
function goNextLevel(){loadLevel(game.levelIndex+1);}

function notifyControllers(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type:"tv-event", ...payload}));
    }
  } catch {}
}

function enterGameOverLobby() {
  if (game.gameOverHandled) return;
  game.gameOverHandled = true;

  game.lobby = true;
  game.started = false;
  game.readyPlayers.clear();
  game.levelClear = false;
  game.transitionTimer = 0;

  statusEl.textContent = "Game over. Aperte COMEÇAR no controle para reiniciar.";
  toast("GAME OVER");

  notifyControllers({event:"game-over"});
}


function updateCamera(){
  const alive=[...game.players.values()].filter(p=>p.alive&&p.hp>0);
  if(!alive.length)return;

  const xs=alive.map(p=>p.x);
  const lead=Math.max(...xs);
  const tail=Math.min(...xs);
  const avg=alive.reduce((s,p)=>s+p.x,0)/alive.length;

  // A câmera não segue só quem disparou na frente.
  // Mantém o grupo no quadro e evita deixar companheiro atrasado morrer fora da tela.
  let target;
  if(alive.length > 1 && lead - tail > W * 0.68) {
    target = tail - 110;
  } else {
    target = Math.max(avg - 410, lead - 790);
  }

  target=clamp(target,0,game.level.width-W);
  game.cameraX+=(target-game.cameraX)*.075;
}

function update(){
  if(game.pausedByConnection && game.started && !game.lobby){
    for(const m of game.messages)m.life--;
    game.messages=game.messages.filter(m=>m.life>0);
    return;
  }

  if (game.lobby) {
    for(const m of game.messages)m.life--;
    game.messages=game.messages.filter(m=>m.life>0);
    return;
  }

  if(!game.started&&playersConnected.length===0&&!game.players.has(1)){
    game.players.set(1,{id:1,x:110,y:560,w:32,h:48,vx:0,vy:0,hp:100,maxHp:100,alive:true,facing:1,aimX:1,aimY:0,onGround:false,fireCd:0,grenadeCd:0,inv:0,kills:0,score:0,jumpHeld:false,lastJumpSeq:0,lastGrenadeSeq:0,coyote:0,lives:3,respawnTimer:0,weaponId:"default",weaponAmmo:0,bombs:START_BOMBS});
  }
  game.time++;
  updateHazards();
  for(const p of game.players.values()) updatePlayer(p);
  for(const e of game.enemies) updateEnemy(e);
  updateProjectiles();
  damageHazards();
  game.enemies=game.enemies.filter(e=>e.alive&&e.hp>0);
  game.pickups=game.pickups.filter(p=>!p.dead);
  for(const p of game.particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.vx*=.94;p.life--;}
  game.particles=game.particles.filter(p=>p.life>0);
  for(const m of game.messages)m.life--;game.messages=game.messages.filter(m=>m.life>0);
  updateCamera();
  if(!game.levelClear && aliveEnemies().length===0) openPortal("Todos inimigos derrotados! Portal liberado.");
  if(game.levelClear&&game.exitPortal){
    const inside=[...game.players.values()].some(p=>p.alive&&p.hp>0&&rects(p,game.exitPortal));
    if(inside){game.transitionTimer++; if(game.transitionTimer>25)goNextLevel();} else game.transitionTimer=0;
  }
  const canContinue=[...game.players.values()].some(p=>(p.alive&&p.hp>0) || (p.respawnTimer||0)>0 || (p.lives||0)>0);
  if(game.started && !canContinue) {
    enterGameOverLobby();
  }

  if(game.time%20===0) renderStats();
}

function renderStats(){
  statsEl.innerHTML="";
  const totalKills = [...game.players.values()].reduce((s,p)=>s+(p.kills||0),0);
  const score = document.createElement("div");
  score.className = "pill";
  score.style.border = "2px solid #ffe66d";
  score.textContent = `Pontos ${game.score} · Kills ${totalKills}`;
  statsEl.appendChild(score);
}


function drawDecorObject(d) {
  const x = worldToScreen(d.x), y = d.y;
  ctx.save();
  ctx.globalAlpha = 0.82;
  if (d.type === "torch") {
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(x + d.w*.42, y + d.h*.35, d.w*.16, d.h*.65);
    ctx.fillStyle = "#ffb86b";
    ctx.beginPath();
    ctx.arc(x + d.w/2, y + d.h*.25, d.w*.28, 0, Math.PI*2);
    ctx.fill();
  } else if (d.type === "light") {
    ctx.fillStyle = "rgba(255,230,109,.22)";
    ctx.beginPath();
    ctx.arc(x+d.w/2,y+d.h/2,d.w*.7,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(x+d.w/2,y+d.h/2,d.w*.2,0,Math.PI*2);
    ctx.fill();
  } else if (d.type === "rock") {
    ctx.fillStyle = "#777";
    ctx.beginPath();
    ctx.ellipse(x+d.w/2,y+d.h*.7,d.w*.5,d.h*.35,0,0,Math.PI*2);
    ctx.fill();
  } else if (d.type === "tree") {
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(x+d.w*.35,y,d.w*.3,d.h);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x,y+d.h*.15,d.w,d.h*.25);
  } else {
    ctx.fillStyle = d.type === "crate" ? "#8b5a2b" : d.type === "barrel" ? "#795548" : "#8b6b3e";
    ctx.fillRect(x,y,d.w||60,d.h||60);
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.strokeRect(x,y,d.w||60,d.h||60);
  }
  ctx.restore();
}

function drawHazards(){
  for(const h of game.level.hazards){
    if(h.dead)continue;
    if(h.type==="fire"||h.type==="acid"){
      ctx.fillStyle=h.type==="fire"?"rgba(255,90,40,.78)":"rgba(87,227,137,.72)";
      ctx.fillRect(worldToScreen(h.x),h.y,h.w,h.h);
      for(let i=0;i<6;i++){ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(worldToScreen(h.x+rand(0,h.w)),h.y+rand(0,h.h),rand(5,14),0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
    } else if(h.type==="saw"){
      const sx=worldToScreen(h.x+Math.sin(game.time*h.speed)*(h.range||200)), sy=h.y;
      ctx.strokeStyle="rgba(255,255,255,.2)";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(worldToScreen(h.x-(h.range||200)),sy);ctx.lineTo(worldToScreen(h.x+(h.range||200)),sy);ctx.stroke();
      ctx.fillStyle="#ddd";ctx.beginPath();ctx.arc(sx,sy,h.r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#333";ctx.beginPath();ctx.arc(sx,sy,h.r*.45,0,Math.PI*2);ctx.fill();
    } else if(h.type==="crusher"){
      const y=h.y+(Math.sin(game.time*.035+h.phase)>0.15?250:0);
      ctx.fillStyle="#69697f";ctx.fillRect(worldToScreen(h.x),y,h.w,h.h);ctx.fillStyle="#ff5a7a";ctx.fillRect(worldToScreen(h.x),y+h.h-12,h.w,12);
    } else if(h.type==="laser"){
      const on=Math.sin(game.time*.055+h.phase)>-.15;
      ctx.fillStyle=on?"rgba(255,82,122,.85)":"rgba(255,255,255,.12)";
      ctx.fillRect(worldToScreen(h.x),h.y,h.w,h.h);
    } else if(h.type==="turret"){
      ctx.fillStyle="#9999aa";ctx.fillRect(worldToScreen(h.x),h.y,h.w,h.h);ctx.fillStyle="#ff5a7a";ctx.fillRect(worldToScreen(h.x)-8,h.y+15,18,10);
    } else if(h.type==="barrel"){
      ctx.fillStyle="#ff9f43";ctx.fillRect(worldToScreen(h.x),h.y,h.w,h.h);ctx.fillStyle="#111";ctx.font="900 16px system-ui";ctx.textAlign="center";ctx.fillText("!",worldToScreen(h.x+h.w/2),h.y+34);
    } else if(h.type==="blade_wall"){
      const y=h.y+Math.sin(game.time*(h.speed||.04)+(h.phase||0))*(h.range||160);
      ctx.fillStyle="#d7dde8";ctx.fillRect(worldToScreen(h.x),y,h.w,h.h);
      ctx.fillStyle="#ff5a7a";for(let i=0;i<h.h;i+=18){ctx.beginPath();ctx.moveTo(worldToScreen(h.x),y+i);ctx.lineTo(worldToScreen(h.x+h.w),y+i+9);ctx.lineTo(worldToScreen(h.x),y+i+18);ctx.fill();}
    } else if(h.type==="spikes"){
      const active=Math.sin(game.time*(h.speed||.05)+(h.phase||0))>-.35;
      ctx.fillStyle=active?"#cfd7e6":"rgba(207,215,230,.35)";
      for(let x=0;x<h.w;x+=18){ctx.beginPath();ctx.moveTo(worldToScreen(h.x+x),h.y+h.h);ctx.lineTo(worldToScreen(h.x+x+9),h.y);ctx.lineTo(worldToScreen(h.x+x+18),h.y+h.h);ctx.fill();}
    } else if(h.type==="laser_sweep"){
      const lx=h.x+Math.sin(game.time*(h.speed||.035)+(h.phase||0))*(h.range||260);
      ctx.fillStyle="rgba(255,60,120,.82)";
      if(h.vertical) ctx.fillRect(worldToScreen(lx),h.y,h.w||18,h.h||620);
      else ctx.fillRect(worldToScreen(h.x),h.y+Math.sin(game.time*(h.speed||.035)+(h.phase||0))*(h.range||180),h.w||420,h.h||16);
    } else if(h.type==="pendulum"){
      const px=h.x+Math.sin(game.time*(h.speed||.045)+(h.phase||0))*(h.range||180);
      const py=h.y+Math.abs(Math.cos(game.time*(h.speed||.045)+(h.phase||0)))*60;
      ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(worldToScreen(h.x),h.y-120);ctx.lineTo(worldToScreen(px),py);ctx.stroke();
      ctx.fillStyle="#d7dde8";ctx.beginPath();ctx.arc(worldToScreen(px),py,h.r||30,0,Math.PI*2);ctx.fill();ctx.fillStyle="#333";ctx.beginPath();ctx.arc(worldToScreen(px),py,(h.r||30)*.45,0,Math.PI*2);ctx.fill();
    } else if(h.type==="mine"){
      ctx.fillStyle="#ff9f43";ctx.beginPath();ctx.arc(worldToScreen(h.x+14),h.y+14,14+Math.sin((h.pulse||0))*2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";ctx.font="900 14px system-ui";ctx.textAlign="center";ctx.fillText("!",worldToScreen(h.x+14),h.y+19);
    } else if(h.type==="beast"||h.type==="raptor"||h.type==="snake"||h.type==="bat_swarm"){
      const sx=worldToScreen(h.x), y=h.y, w=h.w||50, hh=h.h||34;
      ctx.fillStyle=h.type==="snake"?"#57e389":h.type==="bat_swarm"?"#8be9fd":h.type==="raptor"?"#ffb86b":"#ff5a7a";
      if(h.type==="snake"){ctx.beginPath();ctx.ellipse(sx+w/2,y+hh/2,w/2,hh/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";ctx.fillRect(sx+w-12,y+8,5,5);}
      else if(h.type==="bat_swarm"){for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(sx+i*14,y+Math.sin(game.time*.12+i)*10,8,0,Math.PI*2);ctx.fill();}}
      else {ctx.fillRect(sx,y,w,hh);ctx.fillStyle="#111";ctx.fillRect(sx+w-12,y+8,6,6);ctx.fillRect(sx+8,y+hh-4,10,8);ctx.fillRect(sx+w-18,y+hh-4,10,8);}
    }
  }
}


function drawHudPanel(x, y, w, h, label, value, accent="#ffe66d") {
  ctx.save();

  ctx.fillStyle = "rgba(8,8,12,.86)";
  ctx.fillRect(x, y, w, h);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x + 5, y + 5, w - 10, 12);

  ctx.fillStyle = "#d9d9d9";
  ctx.font = "900 13px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 12, y + 18);

  ctx.fillStyle = accent;
  ctx.font = "900 25px system-ui";
  ctx.fillText(value, x + 12, y + 48);

  ctx.restore();
}

function drawHpBar(x, y, w, h, ratio, color="#66d9ff") {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,.72)";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "rgba(255,255,255,.32)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  const fillW = Math.max(0, Math.min(w - 6, (w - 6) * ratio));
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 3, fillW, h - 6);

  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.fillRect(x + 3, y + 3, fillW, Math.max(2, (h - 6) * .35));

  ctx.restore();
}

function drawHeroPortrait(x, y, p) {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,.85)";
  ctx.fillRect(x, y, 68, 68);
  ctx.strokeStyle = color(p.id);
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, 68, 68);

  drawHeroBall(x + 34, y + 34, 22, color(p.id), {stroke:"#111"});

  ctx.fillStyle = "#fff";
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${pname(p.id)}`, x + 34, y + 63);

  ctx.restore();
}


function drawPlayerHudCard(p, x, y) {
  const w = 170, h = 34;
  const hpRatio = Math.max(0, Math.min(1, p.hp / p.maxHp));

  ctx.save();
  ctx.fillStyle = "rgba(8,8,12,.78)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = p.alive ? color(p.id) : "rgba(255,255,255,.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = color(p.id);
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`P${p.id} ${pname(p.id)}`, x + 8, y + 13);

  ctx.fillStyle = p.alive ? "#fff" : "#ff5a7a";
  ctx.font = "800 11px system-ui";
  ctx.fillText(p.alive ? `K ${p.kills || 0}` : "DOWN", x + w - 42, y + 13);

  ctx.fillStyle = "rgba(0,0,0,.75)";
  ctx.fillRect(x + 8, y + 20, w - 16, 8);
  ctx.fillStyle = p.alive ? color(p.id) : "#555";
  ctx.fillRect(x + 10, y + 22, Math.max(0, (w - 20) * hpRatio), 4);

  ctx.fillStyle = "#fff";
  ctx.font = "900 9px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.max(0, Math.round(p.hp))}%`, x + w/2, y + 28);
  ctx.restore();
}

function drawPlayersStrip(panelX = 18, panelY = 14) {
  const players = [...game.players.values()].sort((a,b)=>a.id-b.id);
  if (players.length <= 1) return;

  ctx.save();

  const cardW = players.length >= 4 ? 142 : players.length === 3 ? 160 : 180;
  const panelW = 76 + Math.min(players.length,4) * (cardW + 8) + 10;
  const panelH = 64;

  ctx.fillStyle = "rgba(0,0,0,.58)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#ffe66d";
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("PLAYERS", panelX + 10, panelY + 35);

  let x = panelX + 76;
  const y = panelY + 9;

  for (const p of players.slice(0,4)) {
    drawPlayerHudCardCompact(p, x, y, cardW);
    x += cardW + 8;
  }

  hudZone("players", panelX, panelY, panelW, panelH);
  ctx.restore();
}

function drawPlayerHudCardCompact(p, x, y, w = 160) {
  const h = 46;
  const hpRatio = Math.max(0, Math.min(1, p.hp / p.maxHp));

  ctx.save();
  ctx.fillStyle = "rgba(8,8,12,.82)";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = p.alive ? color(p.id) : "rgba(255,255,255,.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = color(p.id);
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`P${p.id} ${pname(p.id)}`, x + 8, y + 15);

  ctx.fillStyle = p.alive ? "#fff" : "#ff5a7a";
  ctx.font = "800 11px system-ui";
  ctx.fillText(p.alive ? `K ${p.kills || 0}` : "DOWN", x + w - 36, y + 15);

  ctx.fillStyle = "rgba(0,0,0,.75)";
  ctx.fillRect(x + 8, y + 26, w - 16, 10);
  ctx.fillStyle = p.alive ? color(p.id) : "#555";
  ctx.fillRect(x + 10, y + 28, Math.max(0, (w - 20) * hpRatio), 6);

  ctx.fillStyle = "#fff";
  ctx.font = "900 9px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(livesHudText(p), x + w/2, y + 35);
  ctx.restore();
}

function drawArcadeHud() {
  hudZones = [];
  const players = [...game.players.values()].sort((a,b)=>a.id-b.id);
  const isMultiplayer = players.length > 1;
  const alivePlayers = players.filter(p => p.alive);
  const mainPlayer = alivePlayers[0] || players[0];
  const totalKills = players.reduce((s,p)=>s+(p.kills||0),0);
  const alive = aliveEnemies();
  const bossAlive = alive.some(e=>e.boss);
  const objective = game.levelClear ? "PORTAL" : bossAlive ? "BOSS" : `${alive.length}`;

  ctx.save();

  // Barra superior estilo arcade
  ctx.fillStyle = "rgba(0,0,0,.58)";
  ctx.fillRect(0, 0, W, 92);

  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 92);
  ctx.lineTo(W, 92);
  ctx.stroke();

  if (isMultiplayer) {
    // Multiplayer: não mostra 1UP individual para não duplicar P1.
    drawPlayersStrip(hudLayout.players.x, hudLayout.players.y);
  } else if (mainPlayer) {
    // Single player: mantém HUD 1UP clássica.
    drawHeroPortrait(hudLayout.singlePlayer.x, hudLayout.singlePlayer.y, mainPlayer);

    ctx.fillStyle = "#fff";
    ctx.font = "900 22px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`1UP`, hudLayout.singlePlayer.x + 78, hudLayout.singlePlayer.y + 19);

    ctx.fillStyle = "#ffe66d";
    ctx.font = "900 22px system-ui";
    ctx.fillText(livesHudText(mainPlayer), hudLayout.singlePlayer.x + 78, hudLayout.singlePlayer.y + 56);

    drawHpBar(hudLayout.singlePlayer.x + 147, hudLayout.singlePlayer.y + 30, 230, 26, Math.max(0, mainPlayer.hp / mainPlayer.maxHp), color(mainPlayer.id));
    hudZone("singlePlayer", hudLayout.singlePlayer.x, hudLayout.singlePlayer.y, 390, 70);
  }

  const panelStart = isMultiplayer ? 880 : 430;
  const hudWeaponPlayer = mainPlayer || players[0];
  const weaponValue = hudWeaponPlayer ? weaponLabel(hudWeaponPlayer) : defaultWeapon.name;
  drawHudPanel(hudLayout.arms.x, hudLayout.arms.y, 120, 64, "ARMS", weaponValue, "#66d9ff");
  const bombValue = hudWeaponPlayer ? `💣 x${hudWeaponPlayer.bombs ?? START_BOMBS}` : "💣 x0";
  drawHudPanel(hudLayout.bomb.x, hudLayout.bomb.y, 120, 64, "BOMB", bombValue, "#ff5a7a");

  const timeLeft = Math.max(0, 600 - Math.floor(game.time / 60));
  drawHudPanel(hudLayout.time.x, hudLayout.time.y, 110, 64, "TIME", String(timeLeft), "#ffe66d");
  drawHudPanel(hudLayout.enemies.x, hudLayout.enemies.y, 140, 64, "ENEMIES", objective, game.levelClear ? "#66d9ff" : "#ffe66d");
  drawHudPanel(hudLayout.score.x, hudLayout.score.y, 184, 64, "SCORE", String(game.score).padStart(6, "0"), "#ffe66d");

  // Linha inferior da HUD
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(hudLayout.fase.x, hudLayout.fase.y, 760, 34);

  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.strokeRect(hudLayout.fase.x, hudLayout.fase.y, 760, 34);

  ctx.fillStyle = "#fff";
  ctx.font = "900 15px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`FASE ${game.levelIndex + 1}/10  ·  ${game.level.name}  ·  KILLS ${totalKills}`, hudLayout.fase.x + 14, hudLayout.fase.y + 23);
  hudZone("fase", hudLayout.fase.x, hudLayout.fase.y, 760, 34);

  ctx.restore();
}

function pxRect(x,y,w,h,c,scale=1){
  ctx.fillStyle=c;
  ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}

function drawPixelHero(p){
  const sx = worldToScreen(p.x);
  const sy = p.y;
  const flip = p.facing < 0;
  const runSpeed = Math.min(1, Math.abs(p.vx || 0) / 4.25);
  const run = Math.sin(game.time * .45);
  const bob = p.onGround ? Math.abs(run) * 2.2 * runSpeed : -3 + Math.sin(game.time*.12);
  const recoil = Math.max(0, (p.fireCd || 0) / 12);
  const x = sx + p.w/2;
  const y = sy + p.h/2 + bob;

  ctx.save();
  ctx.translate(x,y);
  ctx.scale(flip?-1:1,1);

  const suit = color(p.id);
  const dark = "#121827";
  const visor = "#d7f9ff";
  const gun = "#e9edf7";
  const legA = p.onGround ? run * 6 * runSpeed : -7;
  const legB = p.onGround ? -run * 6 * runSpeed : 7;
  const armSwing = p.onGround ? -run * 3 * runSpeed : 2;

  // sombra dinâmica
  ctx.globalAlpha=.28;
  ctx.fillStyle="#000";
  ctx.beginPath();
  ctx.ellipse(0,27,20 + runSpeed*3,6,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;

  // pernas animadas
  pxRect(-12 + legA*.15,11,9,17 + Math.abs(legA)*.08,dark);
  pxRect(4 + legB*.15,11,9,17 + Math.abs(legB)*.08,dark);
  pxRect(-15 + legA,25,13,6,"#0b0f18");
  pxRect(3 + legB,25,14,6,"#0b0f18");

  // corpo com leve squash no pulo/corrida
  ctx.save();
  ctx.translate(0, p.onGround ? 0 : -1);
  pxRect(-16,-12,32,28,suit);
  pxRect(-13,-8,26,8,"rgba(255,255,255,.20)");

  // braços animados
  pxRect(-18,-6 + armSwing,7,21,dark);
  pxRect(11,-6 - armSwing*.4,7,21,dark);

  // cabeça/capacete com micro inclinação
  ctx.save();
  ctx.translate(0, -1 - runSpeed*Math.abs(run));
  pxRect(-15,-32,30,22,suit);
  pxRect(-11,-36,22,8,suit);
  pxRect(-10,-27,21,8,visor);
  pxRect(3,-25,8,4,"#ffffff");
  ctx.restore();

  // arma com recoil
  ctx.save();
  const ang = Math.atan2(p.aimY || 0,p.aimX || p.facing || 1) * (flip?-1:1);
  ctx.translate(14 - recoil*2,-4);
  ctx.rotate(ang);
  pxRect(0,-4,26,8,gun);
  pxRect(22,-2,10,4,"#9aa4b2");
  pxRect(5,4,8,8,dark);
  if(recoil>.4){
    ctx.fillStyle="#ffe66d";
    ctx.beginPath();
    ctx.moveTo(34,0); ctx.lineTo(44,-6); ctx.lineTo(40,0); ctx.lineTo(44,6);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  // contorno pixel
  ctx.strokeStyle="rgba(0,0,0,.55)";
  ctx.lineWidth=2;
  ctx.strokeRect(-16,-32,32,48);

  ctx.restore();

  // HUD mini acima
  ctx.fillStyle="#fff";
  ctx.font="900 12px system-ui";
  ctx.textAlign="center";
  ctx.fillText(`${pname(p.id)} ${Math.max(0,Math.round(p.hp))}%`, sx+p.w/2, sy-16);
}

function drawPixelEnemy(e){
  const sx = worldToScreen(e.x);
  const sy = e.y;
  const x = sx + e.w/2;
  const y = sy + e.h/2;
  const w = e.w, h = e.h;
  const c = e.color || "#ffb86b";

  ctx.save();
  ctx.translate(x,y);

  // sombra
  ctx.globalAlpha=.25;
  ctx.fillStyle="#000";
  ctx.beginPath();
  ctx.ellipse(0,h*.42,w*.45,5,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;

  if(e.boss){
    drawBossSprite(e,w,h,c);
  } else if(e.type === "drone" || e.type === "jetpack"){
    drawDroneSprite(e,w,h,c);
  } else if(e.type === "ninja"){
    drawNinjaSprite(e,w,h,c);
  } else if(e.type === "crawler"){
    drawCrawlerSprite(e,w,h,c);
  } else if(e.type === "shielder"){
    drawShieldSprite(e,w,h,c);
  } else {
    drawEnemySoldierSprite(e,w,h,c);
  }

  if(e.boss){
    ctx.fillStyle="#000";
    ctx.fillRect(-w/2-14,-h/2-20,w+28,8);
    ctx.fillStyle="#ff5a7a";
    ctx.fillRect(-w/2-14,-h/2-20,(w+28)*(e.hp/e.maxHp),8);
  }

  ctx.restore();
}

function drawEnemySoldierSprite(e,w,h,c){
  const dark="#111827";
  pxRect(-w*.32,-h*.32,w*.64,h*.52,c);
  pxRect(-w*.24,-h*.52,w*.48,h*.26,c);
  pxRect(-w*.18,-h*.45,w*.36,h*.1,"#fff");
  pxRect(e.facing*w*.06,-h*.43,w*.12,h*.06,"#111");
  pxRect(-w*.45,h*.18,w*.28,h*.28,dark);
  pxRect(w*.17,h*.18,w*.28,h*.28,dark);
  pxRect(e.facing>0?w*.18:-w*.75,-h*.1,w*.58,h*.11,"#e9edf7");
}

function drawDroneSprite(e,w,h,c){
  pxRect(-w*.42,-h*.25,w*.84,h*.5,c);
  pxRect(-w*.62,-h*.05,w*.32,h*.14,"#d7f9ff");
  pxRect(w*.30,-h*.05,w*.32,h*.14,"#d7f9ff");
  pxRect(-w*.16,-h*.12,w*.32,h*.24,"#111827");
  pxRect(-w*.08,-h*.04,w*.16,h*.08,"#66d9ff");
}

function drawNinjaSprite(e,w,h,c){
  const dark="#05070b";
  pxRect(-w*.35,-h*.45,w*.7,h*.72,dark);
  pxRect(-w*.32,-h*.28,w*.64,h*.16,c);
  pxRect(-w*.20,-h*.22,w*.12,h*.07,"#fff");
  pxRect(w*.08,-h*.22,w*.12,h*.07,"#fff");
  pxRect(e.facing>0?w*.15:-w*.95,-h*.02,w*.8,h*.06,"#cfd7e6");
  pxRect(-w*.32,h*.28,w*.22,h*.25,dark);
  pxRect(w*.10,h*.28,w*.22,h*.25,dark);
}

function drawCrawlerSprite(e,w,h,c){
  pxRect(-w*.50,-h*.20,w,h*.4,c);
  pxRect(-w*.35,-h*.36,w*.7,h*.18,c);
  for(let i=0;i<4;i++) pxRect(-w*.42+i*w*.28,h*.18,w*.13,h*.18,"#111827");
  pxRect(w*.25,-h*.1,w*.14,h*.08,"#fff");
}

function drawShieldSprite(e,w,h,c){
  drawEnemySoldierSprite(e,w,h,c);
  ctx.strokeStyle="#66d9ff";
  ctx.lineWidth=5;
  ctx.strokeRect(-w*.55,-h*.55,w*1.1,h*1.1);
}

function drawBossSprite(e,w,h,c){
  const dark="#111827";
  pxRect(-w*.45,-h*.36,w*.9,h*.65,c);
  pxRect(-w*.34,-h*.58,w*.68,h*.28,c);
  pxRect(-w*.22,-h*.48,w*.44,h*.12,"#fff");
  pxRect(e.facing*w*.05,-h*.45,w*.14,h*.07,"#111");
  pxRect(-w*.62,h*.16,w*.35,h*.30,dark);
  pxRect(w*.27,h*.16,w*.35,h*.30,dark);
  pxRect(e.facing>0?w*.25:-w*.95,-h*.06,w*.7,h*.12,"#e9edf7");
  pxRect(e.facing>0?w*.88:-w*1.08,-h*.03,w*.22,h*.06,"#ffb86b");
}

function drawBetterPlatform(p){
  const x = worldToScreen(p[0]), y = p[1], w = p[2], h = p[3];
  ctx.fillStyle="#242435";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle="#3a3a52";
  ctx.fillRect(x,y,w,Math.min(10,h*.25));
  ctx.fillStyle="rgba(255,255,255,.10)";
  ctx.fillRect(x,y,w,3);

  // tiles
  ctx.strokeStyle="rgba(0,0,0,.22)";
  ctx.lineWidth=1;
  for(let tx=0; tx<w; tx+=64){
    ctx.beginPath();
    ctx.moveTo(x+tx,y);
    ctx.lineTo(x+tx,y+h);
    ctx.stroke();
  }

  // grama/metal top por fase
  if(game.level.music==="toxic") ctx.fillStyle="#57e389";
  else if(game.level.music==="neon") ctx.fillStyle="#66d9ff";
  else if(game.level.music==="final") ctx.fillStyle="#ff5a7a";
  else ctx.fillStyle="#ffb86b";
  ctx.fillRect(x,y,w,4);
}

function drawBetterBackground(){
  const bg = game.level.bg;
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,bg[0]);
  grad.addColorStop(1,bg[1]);
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,H);

  // lua/sol neon
  ctx.save();
  ctx.globalAlpha=.22;
  ctx.fillStyle=game.level.music==="neon"?"#66d9ff":game.level.music==="toxic"?"#57e389":"#ffe66d";
  ctx.beginPath();
  ctx.arc(W-180,120,70,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  // skyline/parallax
  for(let layer=0; layer<3; layer++){
    const speed = .12 + layer*.09;
    const baseY = 170 + layer*95;
    const height = 240 - layer*35;
    ctx.fillStyle = `rgba(255,255,255,${0.035 + layer*.025})`;
    for(let i=0;i<28;i++){
      const bw = 60 + (i%5)*22;
      const bh = height - (i%7)*18;
      const x = (i*150 - game.cameraX*speed) % (W+220) - 120;
      ctx.fillRect(x,baseY+height-bh,bw,bh);
      if(layer===2){
        ctx.fillStyle="rgba(255,230,109,.10)";
        ctx.fillRect(x+10,baseY+height-bh+25,8,8);
        ctx.fillRect(x+32,baseY+height-bh+55,8,8);
        ctx.fillStyle=`rgba(255,255,255,${0.035 + layer*.025})`;
      }
    }
  }
}

function draw(){
  ctx.save();
  if(game.shake>0){
    const s = shakeOffset();
    ctx.translate(s.x, s.y);
    game.shake *= .86;
    if(game.shake < .25) game.shake = 0;
  }
  drawBetterBackground();
  for(const p of game.level.platforms){drawBetterPlatform(p);}
  if (game.level.decor) {
    for (const d of game.level.decor) drawDecorObject(d);
  }
  drawHazards();
  if(game.exitPortal){
    const portal=game.exitPortal,sx=worldToScreen(portal.x),active=portal.active;
    ctx.globalAlpha=active?1:.35;ctx.fillStyle=active?"rgba(102,217,255,.25)":"rgba(255,255,255,.08)";ctx.fillRect(sx,portal.y,portal.w,portal.h);
    ctx.strokeStyle=active?"#66d9ff":"rgba(255,255,255,.25)";ctx.lineWidth=4;ctx.strokeRect(sx,portal.y,portal.w,portal.h);
    ctx.fillStyle=active?"#66d9ff":"rgba(255,255,255,.55)";ctx.font="900 16px system-ui";ctx.textAlign="center";ctx.fillText(active?"PORTAL":"BLOQUEADO",sx+portal.w/2,portal.y-12);ctx.globalAlpha=1;
  }
  for(const item of game.pickups || []){
    if(!item || item.dead) continue;
    drawDropIcon(ctx, item, worldToScreen(Number.isFinite(item.x) ? item.x : 0), Number.isFinite(item.y) ? item.y : 0, game.time);
  }
  for(const g of game.grenades){ctx.fillStyle="#ffb86b";ctx.beginPath();ctx.arc(worldToScreen(g.x+6),g.y+6,8,0,Math.PI*2);ctx.fill();}
  for(const b of game.bullets){
    const bx=worldToScreen(b.x);
    ctx.fillStyle="rgba(255,255,255,.35)";
    ctx.fillRect(bx-b.vx*.8,b.y+1,Math.abs(b.vx*.8)+b.w,b.h-2);
    ctx.fillStyle=b.color;
    ctx.fillRect(bx,b.y,b.w,b.h);
  }
  for(const b of game.enemyBullets){ctx.fillStyle=b.kind==="acid"?"#57e389":b.kind==="laser"?"#ff5a7a":b.kind==="rocket"?"#ff9f43":"#d386ff";ctx.beginPath();ctx.arc(worldToScreen(b.x+b.w/2),b.y+b.h/2,b.w/2,0,Math.PI*2);ctx.fill();}
  for(const e of game.enemies) drawEnemy(e);
  for(const p of game.players.values()) drawPlayer(p);
  for(const part of game.particles){ctx.globalAlpha=Math.max(0,part.life/40);ctx.fillStyle=part.color;ctx.fillRect(worldToScreen(part.x),part.y,4,4);ctx.globalAlpha=1;}
  ctx.restore();
  drawArcadeHud();
  if(game.messages[0]){ctx.textAlign="center";ctx.font="900 42px system-ui";ctx.fillStyle="#ffe66d";ctx.fillText(game.messages[0].text,W/2,160);}
  if(!game.started&&playersConnected.length===0){ctx.fillStyle="rgba(0,0,0,.58)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 52px system-ui";ctx.fillText("Aguardando controles",W/2,H/2-18);ctx.font="600 24px system-ui";ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText("Escaneie o QR ou teste no teclado",W/2,H/2+30);}

  if(game.pausedByConnection && game.started && !game.lobby){
    ctx.fillStyle="rgba(0,0,0,.48)";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#ffe66d";
    ctx.textAlign="center";
    ctx.font="900 42px system-ui";
    ctx.fillText("PAUSADO", W/2, H/2 - 10);
    ctx.font="700 20px system-ui";
    ctx.fillStyle="rgba(255,255,255,.86)";
    ctx.fillText("Menu Conexão aberto no controle", W/2, H/2 + 32);
  }

  if(game.lobby){
    ctx.fillStyle="rgba(0,0,0,.78)";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#fff";
    ctx.textAlign="center";
    ctx.font="900 42px system-ui";
    ctx.fillText("LOBBY",W/2,210);
    ctx.font="700 20px system-ui";
    ctx.fillStyle="rgba(255,255,255,.86)";
    const connected = playersConnected.length;
    const ready = game.readyPlayers.size;
    ctx.fillText(`Controles conectados: ${connected}/4 · Prontos: ${ready}/${Math.max(connected,1)}`,W/2,260);
    ctx.fillText("Escolha a dificuldade no celular e toque em COMEÇAR.",W/2,305);

    const modeLabel = {
      easy:"FÁCIL",
      normal:"NORMAL",
      hard:"DIFÍCIL",
      insane:"INSANO"
    }[game.difficulty] || "NORMAL";

    const modeColor = {
      easy:"#57e389",
      normal:"#66d9ff",
      hard:"#ffe66d",
      insane:"#ff5a7a"
    }[game.difficulty] || "#66d9ff";

    ctx.fillStyle=modeColor;
    ctx.fillRect(W/2-180,360,360,95);
    ctx.strokeStyle="#fff";
    ctx.lineWidth=4;
    ctx.strokeRect(W/2-180,360,360,95);
    ctx.fillStyle="#111";
    ctx.font="900 28px system-ui";
    ctx.fillText(`DIFICULDADE: ${modeLabel}`,W/2,418);

    ctx.fillStyle="#ffe66d";
    ctx.font="900 25px system-ui";
    ctx.fillText("Aguardando COMEÇAR pelo controle.",W/2,505);
    ctx.fillStyle="rgba(255,255,255,.7)";
    ctx.font="600 18px system-ui";
    ctx.fillText("A tela da TV agora é só exibição; não precisa usar teclado para iniciar.",W/2,540);
  }

  const anyAlive=[...game.players.values()].some(p=>p.alive&&p.hp>0);
  if(game.started&&!anyAlive){ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 46px system-ui";ctx.fillText("GAME OVER",W/2,H/2-10);ctx.font="600 24px system-ui";ctx.fillText("Aperte R para reiniciar",W/2,H/2+40);}
}


function shouldDrawPlayer(p) {
  if (!p) return false;
  if (p.alive) return true;

  // Após morrer, mostra só por alguns frames com fade/pop, depois some.
  const t = game.time - (p.deadAt || game.time);
  return t >= 0 && t < 28;
}

function drawPlayer(p){
  if (!shouldDrawPlayer(p)) return;

  if (!p.alive) {
    const t = game.time - (p.deadAt || game.time);
    const alpha = Math.max(0, 1 - t / 28);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, -t * 1.2);
    ctx.scale(1 + t * 0.012, 1 + t * 0.012);
    drawPixelHero(p);
    ctx.restore();
    return;
  }

  drawPixelHero(p);
}
function drawEnemy(e){
  drawPixelEnemy(e);
}


let lastStateSyncAt = 0;
let cachedFrameState = null;
let cachedFrameTime = -1;

function currentFrameState(){
  if(cachedFrameTime !== game.time || !cachedFrameState){
    cachedFrameState = serializeGameState();
    cachedFrameTime = game.time;
  }
  return cachedFrameState;
}

function serializeGameState(){
  return {
    type:"state",
    code:roomCode,
    t:Date.now(),
    started:game.started,
    lobby:game.lobby,
    pausedByConnection:game.pausedByConnection,
    levelIndex:game.levelIndex,
    levelName:game.level?.name || "",
    levelWidth:game.level?.width || W,
    levelMusic:game.level?.music || "fire",
    bg:game.level?.bg || ["#151520","#1c2235"],
    cameraX:game.cameraX || 0,
    score:game.score || 0,
    time:game.time || 0,
    levelClear:game.levelClear,
    exitPortal:game.exitPortal ? {
      x:game.exitPortal.x,y:game.exitPortal.y,w:game.exitPortal.w,h:game.exitPortal.h,active:game.exitPortal.active
    } : null,
    platforms:(game.level?.platforms || []).map(p => [p[0],p[1],p[2],p[3]]),
    hazards:(game.level?.hazards || []).map(h => ({...h})),
    decor:(game.level?.decor || []).map(d => ({...d})),
    players:[...game.players.values()].map(p => ({
      id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,hp:p.hp,maxHp:p.maxHp,alive:p.alive,
      vx:p.vx||0,vy:p.vy||0,onGround:!!p.onGround,fireCd:p.fireCd||0,
      facing:p.facing,aimX:p.aimX,aimY:p.aimY,kills:p.kills || 0,score:p.score || 0,
      lives:p.lives || 0, respawnTimer:p.respawnTimer || 0,
      weaponId:p.weaponId || "default", weaponAmmo:p.weaponAmmo || 0, weaponName:weaponById(p.weaponId).name, bombs:p.bombs ?? START_BOMBS,
      deadAt:p.deadAt || 0
    })),
    enemies:game.enemies.filter(e=>e.alive).map(e => ({
      type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,hp:e.hp,maxHp:e.maxHp,color:e.color,boss:!!e.boss,facing:e.facing
    })),
    bullets:game.bullets.map(b => ({x:b.x,y:b.y,w:b.w,h:b.h,color:b.color,weaponId:b.weaponId})),
    enemyBullets:game.enemyBullets.map(b => ({x:b.x,y:b.y,w:b.w,h:b.h,kind:b.kind})),
    grenades:game.grenades.map(g => ({x:g.x,y:g.y,w:g.w,h:g.h})),
    particles:game.particles.slice(-80).map(p => ({x:p.x,y:p.y,s:p.s,color:p.color,life:p.life,max:p.max})),
    pickups:(game.pickups || []).filter(p=>p && !p.dead).map(p => ({
      x:Number.isFinite(p.x)?p.x:0,
      y:Number.isFinite(p.y)?p.y:0,
      w:Number.isFinite(p.w)?p.w:24,
      h:Number.isFinite(p.h)?p.h:24,
      type:p.type || "unknown",
      weaponId:p.weaponId,
      weaponName:p.weaponName,
      ammo:p.ammo,
      amount:p.amount
    }))
  };
}

function streamStateToViewers(){
  if(!ws || ws.readyState !== WebSocket.OPEN || !roomCode) return;

  // Baixa latência: estado em ~60fps quando o socket não está atrasado.
  const now = performance.now();
  if(now - lastStateSyncAt < 16) return;
  if(ws.bufferedAmount > 64 * 1024) return;

  lastStateSyncAt = now;

  try {
    ws.send(JSON.stringify(currentFrameState()));
  } catch {}
}


function renderUnifiedFrame(){
  if (window.SharedBlasterRenderer && typeof serializeGameState === "function") {
    window.SharedBlasterRenderer.draw(ctx, currentFrameState(), {width:W, height:H});
    return;
  }
  draw();
}

function drawHostFrame(){
  if (window.BlasterSharedRenderer && typeof serializeGameState === "function") {
    window.BlasterSharedRenderer.draw(ctx, currentFrameState(), {width:W, height:H});
  } else {
    draw();
  }
}

function loop(){update();drawHostFrame();streamStateToViewers();requestAnimationFrame(loop);}
addEventListener("keydown",e=>{
  keys[e.key]=true;
  const k=e.key.toLowerCase();
  if(k==="r" && !game.lobby)loadLevel(game.levelIndex);
  if(k==="p" && !game.lobby)openPortal("Portal liberado manualmente.");
  if(k==="n" && !game.lobby)goNextLevel();
});
addEventListener("keyup",e=>{keys[e.key]=false;});
canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H;});
canvas.addEventListener("mousedown",()=>mouse.down=true);
addEventListener("mouseup",()=>mouse.down=false);

setDifficulty("normal");
loadCustomLevelFromStorage();
loadLevel(0);
game.lobby = true;
game.started = false;
statusEl.textContent = "Lobby: conecte o controle, escolha dificuldade e aperte COMEÇAR.";
initNetwork();
loop();
