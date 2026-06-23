const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const levelName = document.getElementById("levelName");
const levelWidth = document.getElementById("levelWidth");
const levelMusic = document.getElementById("levelMusic");
const bg1 = document.getElementById("bg1");
const bg2 = document.getElementById("bg2");
const selectedPanel = document.getElementById("selectedPanel");
const jsonOutput = document.getElementById("jsonOutput");
const toolLabel = document.getElementById("toolLabel");
const viewportInfo = document.getElementById("viewportInfo");
const paletteEl = document.getElementById("palette");
const searchInput = document.getElementById("searchInput");

let tool = "select";
let cameraX = 0;
let cameraY = 0;
let zoom = 1;
let selected = null;
let clipboard = null;
let drag = null;
let resizing = false;
let panning = false;
let lastPointer = null;

const state = {
  name: "Minha fase",
  width: 4200,
  music: "fire",
  bg: ["#151520", "#1c2235"],
  portalY: 558,
  platforms: [{kind:"platform", type:"ground", x:0, y:650, w:4200, h:80}],
  enemies: [],
  hazards: [],
  pickups: [],
  decor: [],
  portal: {kind:"portal", x:4050, y:558, w:86, h:92}
};

const components = [
  // Plataforma
  {id:"platform_ground", group:"plataforma", name:"Chão grande", kind:"platform", type:"ground", w:360, h:80, color:"#303044"},
  {id:"platform_small", group:"plataforma", name:"Plataforma pequena", kind:"platform", type:"small", w:180, h:24, color:"#55556f"},
  {id:"platform_medium", group:"plataforma", name:"Plataforma média", kind:"platform", type:"medium", w:300, h:26, color:"#55556f"},
  {id:"platform_thin", group:"plataforma", name:"Ponte fina", kind:"platform", type:"thin", w:260, h:14, color:"#8b6b3e"},
  {id:"platform_block", group:"plataforma", name:"Bloco", kind:"platform", type:"block", w:80, h:80, color:"#4b4b60"},
  {id:"platform_tall", group:"plataforma", name:"Parede/coluna", kind:"platform", type:"tall", w:70, h:180, color:"#3b3b50"},
  {id:"platform_step", group:"plataforma", name:"Degrau", kind:"platform", type:"step", w:120, h:40, color:"#4b4b60"},
  {id:"platform_wall", group:"plataforma", name:"Muro", kind:"platform", type:"wall", w:60, h:260, color:"#37374f"},
  {id:"platform_bridge", group:"plataforma", name:"Ponte madeira", kind:"platform", type:"bridge", w:360, h:18, color:"#8b6b3e"},
  {id:"platform_arena", group:"plataforma", name:"Arena boss", kind:"platform", type:"arena", w:640, h:44, color:"#3f3f5a"},

  // Inimigo
  {id:"enemy_runner", group:"inimigo", name:"Runner", kind:"enemy", type:"runner", w:34, h:42, color:"#ffb86b"},
  {id:"enemy_gunner", group:"inimigo", name:"Gunner", kind:"enemy", type:"gunner", w:34, h:44, color:"#d386ff"},
  {id:"enemy_sniper", group:"inimigo", name:"Sniper", kind:"enemy", type:"sniper", w:34, h:44, color:"#a6e3ff"},
  {id:"enemy_bomber", group:"inimigo", name:"Bomber", kind:"enemy", type:"bomber", w:38, h:42, color:"#ff9f43"},
  {id:"enemy_jetpack", group:"inimigo", name:"Jetpack", kind:"enemy", type:"jetpack", w:36, h:38, color:"#66d9ff"},
  {id:"enemy_spitter", group:"inimigo", name:"Spitter", kind:"enemy", type:"spitter", w:36, h:44, color:"#57e389"},
  {id:"enemy_crawler", group:"inimigo", name:"Crawler", kind:"enemy", type:"crawler", w:44, h:28, color:"#b8f27b"},
  {id:"enemy_shielder", group:"inimigo", name:"Shielder", kind:"enemy", type:"shielder", w:42, h:50, color:"#f6f1d1"},
  {id:"enemy_mortar", group:"inimigo", name:"Mortar", kind:"enemy", type:"mortar", w:40, h:46, color:"#c792ea"},
  {id:"enemy_ninja", group:"inimigo", name:"Ninja", kind:"enemy", type:"ninja", w:32, h:46, color:"#ff5a7a"},
  {id:"enemy_drone", group:"inimigo", name:"Drone", kind:"enemy", type:"drone", w:38, h:30, color:"#89ddff"},
  {id:"enemy_laserbot", group:"inimigo", name:"Laserbot", kind:"enemy", type:"laserbot", w:38, h:46, color:"#f78c6c"},
  {id:"enemy_bruiser", group:"inimigo", name:"Bruiser", kind:"enemy", type:"bruiser", w:48, h:54, color:"#ff7b72"},
  {id:"enemy_leaper", group:"inimigo", name:"Leaper", kind:"enemy", type:"leaper", w:34, h:46, color:"#7ee787"},
  {id:"enemy_charger", group:"inimigo", name:"Charger", kind:"enemy", type:"charger", w:46, h:42, color:"#ffa657"},
  {id:"enemy_medic", group:"inimigo", name:"Medic", kind:"enemy", type:"medic", w:34, h:44, color:"#56d364"},
  {id:"enemy_summoner", group:"inimigo", name:"Summoner", kind:"enemy", type:"summoner", w:40, h:52, color:"#bc8cff"},
  {id:"enemy_splitter", group:"inimigo", name:"Splitter", kind:"enemy", type:"splitter", w:42, h:42, color:"#f2cc60"},
  {id:"enemy_bat", group:"inimigo", name:"Bat", kind:"enemy", type:"bat", w:34, h:28, color:"#a5d6ff"},
  {id:"enemy_skull", group:"inimigo", name:"Skull", kind:"enemy", type:"skull", w:36, h:36, color:"#f0f6fc"},
  {id:"enemy_minebot", group:"inimigo", name:"Minebot", kind:"enemy", type:"minebot", w:34, h:30, color:"#ffab70"},
  {id:"enemy_flametrooper", group:"inimigo", name:"Flametrooper", kind:"enemy", type:"flametrooper", w:40, h:48, color:"#ff6b35"},
  {id:"enemy_cryotrooper", group:"inimigo", name:"Cryotrooper", kind:"enemy", type:"cryotrooper", w:40, h:48, color:"#9be7ff"},
  {id:"enemy_shocker", group:"inimigo", name:"Shocker", kind:"enemy", type:"shocker", w:36, h:46, color:"#ffe66d"},
  {id:"enemy_teleport", group:"inimigo", name:"Teleport", kind:"enemy", type:"teleport", w:34, h:46, color:"#d386ff"},
  {id:"enemy_spider", group:"inimigo", name:"Spider", kind:"enemy", type:"spider", w:46, h:26, color:"#7ddc9a"},
  {id:"enemy_turretbot", group:"inimigo", name:"Turretbot", kind:"enemy", type:"turretbot", w:42, h:44, color:"#c9d1d9"},
  {id:"enemy_grenadier", group:"inimigo", name:"Grenadier", kind:"enemy", type:"grenadier", w:38, h:44, color:"#ff9f43"},
  {id:"enemy_poisoner", group:"inimigo", name:"Poisoner", kind:"enemy", type:"poisoner", w:36, h:44, color:"#39d353"},
  {id:"enemy_phantom", group:"inimigo", name:"Phantom", kind:"enemy", type:"phantom", w:34, h:46, color:"#c297ff"},
  {id:"enemy_samurai", group:"inimigo", name:"Samurai", kind:"enemy", type:"samurai", w:36, h:50, color:"#ff5a7a"},
  {id:"enemy_mimic", group:"inimigo", name:"Mimic", kind:"enemy", type:"mimic", w:38, h:40, color:"#ffe66d"},

  // Chefe
  {id:"enemy_boss_dragon", group:"chefe", name:"Chefe Dragon", kind:"enemy", type:"boss_dragon", w:160, h:120, color:"#ff6b35"},
  {id:"enemy_boss_spider", group:"chefe", name:"Chefe Spider", kind:"enemy", type:"boss_spider", w:170, h:110, color:"#57e389"},
  {id:"enemy_boss_warlock", group:"chefe", name:"Chefe Warlock", kind:"enemy", type:"boss_warlock", w:140, h:130, color:"#d386ff"},
  {id:"enemy_boss_train", group:"chefe", name:"Chefe Train", kind:"enemy", type:"boss_train", w:190, h:105, color:"#8be9fd"},
  {id:"enemy_boss_queen", group:"chefe", name:"Chefe Queen", kind:"enemy", type:"boss_queen", w:165, h:130, color:"#ff79c6"},
  {id:"enemy_boss_tank", group:"chefe", name:"Chefe Tank", kind:"enemy", type:"boss_tank", w:110, h:100, color:"#ff2d55"},
  {id:"enemy_boss_blob", group:"chefe", name:"Chefe Blob", kind:"enemy", type:"boss_blob", w:120, h:100, color:"#57e389"},
  {id:"enemy_boss_mecha", group:"chefe", name:"Chefe Mecha", kind:"enemy", type:"boss_mecha", w:130, h:110, color:"#c792ea"},
  {id:"enemy_boss_final", group:"chefe", name:"Chefe Final", kind:"enemy", type:"boss_final", w:150, h:125, color:"#ff1744"},

  // Perigo
  {id:"hazard_fire", group:"perigo", name:"Fogo", kind:"hazard", type:"fire", w:180, h:28, color:"#ff5a2a", dmg:1.2},
  {id:"hazard_acid", group:"perigo", name:"Ácido", kind:"hazard", type:"acid", w:220, h:26, color:"#57e389", dmg:1.2},
  {id:"hazard_laser", group:"perigo", name:"Laser vertical", kind:"hazard", type:"laser", w:20, h:650, color:"#ff5a7a", dmg:22, phase:0},
  {id:"hazard_saw", group:"perigo", name:"Serra móvel", kind:"hazard", type:"saw", r:26, range:260, speed:0.032, color:"#ddd", dmg:22},
  {id:"hazard_barrel", group:"perigo", name:"Barril explosivo", kind:"hazard", type:"barrel", w:36, h:56, color:"#ff9f43", hp:40},
  {id:"hazard_turret", group:"perigo", name:"Torreta", kind:"hazard", type:"turret", w:44, h:56, color:"#9999aa", cd:0},
  {id:"hazard_crusher", group:"perigo", name:"Crusher", kind:"hazard", type:"crusher", w:90, h:170, color:"#69697f", dmg:28, phase:0},
  {id:"hazard_blade_wall", group:"perigo", name:"Parede de lâminas", kind:"hazard", type:"blade_wall", w:30, h:180, color:"#d7dde8", dmg:28, range:130, speed:0.045, phase:0},
  {id:"hazard_spikes", group:"perigo", name:"Espinhos", kind:"hazard", type:"spikes", w:220, h:22, color:"#cfd7e6", dmg:18, phase:0, speed:0.05},
  {id:"hazard_laser_sweep_v", group:"perigo", name:"Laser móvel vertical", kind:"hazard", type:"laser_sweep", w:18, h:580, color:"#ff3c78", dmg:24, vertical:true, range:260, speed:0.038, phase:0},
  {id:"hazard_laser_sweep_h", group:"perigo", name:"Laser móvel horizontal", kind:"hazard", type:"laser_sweep", w:420, h:16, color:"#ff3c78", dmg:22, vertical:false, range:150, speed:0.04, phase:0},
  {id:"hazard_pendulum", group:"perigo", name:"Pêndulo", kind:"hazard", type:"pendulum", r:32, w:64, h:64, color:"#d7dde8", dmg:30, range:200, speed:0.045, phase:0},
  {id:"hazard_mine", group:"perigo", name:"Mina", kind:"hazard", type:"mine", w:28, h:28, color:"#ff9f43", dmg:70},

  // Animal
  {id:"hazard_beast", group:"animal", name:"Beast", kind:"hazard", type:"beast", w:64, h:38, color:"#ff5a7a", dmg:22, minX:0, maxX:400, dir:1},
  {id:"hazard_raptor", group:"animal", name:"Raptor", kind:"hazard", type:"raptor", w:58, h:36, color:"#ffb86b", dmg:18, minX:0, maxX:400, dir:1},
  {id:"hazard_snake", group:"animal", name:"Cobra", kind:"hazard", type:"snake", w:70, h:24, color:"#57e389", dmg:15, minX:0, maxX:400, dir:1},
  {id:"hazard_bat_swarm", group:"animal", name:"Morcegos", kind:"hazard", type:"bat_swarm", w:68, h:28, color:"#8be9fd", dmg:14, minX:0, maxX:500, dir:1},

  // Pickup
  {id:"pickup_heal", group:"pickup", name:"HP / sangue", kind:"pickup", type:"heal", w:24, h:24, color:"#57e389"},
  {id:"pickup_life", group:"pickup", name:"+1 vida", kind:"pickup", type:"life", w:24, h:24, color:"#ff5a7a"},
  {id:"pickup_revive", group:"pickup", name:"Revive amigo", kind:"pickup", type:"revive", w:26, h:26, color:"#d386ff"},
  {id:"pickup_bombs_2", group:"pickup", name:"Bombas +2", kind:"pickup", type:"bombs", amount:2, w:26, h:26, color:"#ff9f43"},
  {id:"pickup_bombs_5", group:"pickup", name:"Bombas +5", kind:"pickup", type:"bombs", amount:5, w:26, h:26, color:"#ff9f43"},
  {id:"pickup_bombs_10", group:"pickup", name:"Bombas +10", kind:"pickup", type:"bombs", amount:10, w:26, h:26, color:"#ff9f43"},
  {id:"pickup_rapid", group:"pickup", name:"Tiro rápido", kind:"pickup", type:"rapid", w:24, h:24, color:"#ffe66d"},

  // Arma
  {id:"pickup_weapon_machine", group:"arma", name:"Metralha", kind:"pickup", type:"weapon", weaponId:"machine", weaponName:"Metralha", ammo:153, w:30, h:30, color:"#66d9ff"},
  {id:"pickup_weapon_shotgun", group:"arma", name:"Escopeta", kind:"pickup", type:"weapon", weaponId:"shotgun", weaponName:"Escopeta", ammo:40, w:30, h:30, color:"#ffb86b"},
  {id:"pickup_weapon_laser", group:"arma", name:"Laser", kind:"pickup", type:"weapon", weaponId:"laser", weaponName:"Laser", ammo:102, w:30, h:30, color:"#ff5a7a"},
  {id:"pickup_weapon_plasma", group:"arma", name:"Plasma", kind:"pickup", type:"weapon", weaponId:"plasma", weaponName:"Plasma", ammo:71, w:30, h:30, color:"#d386ff"},
  {id:"pickup_weapon_burst", group:"arma", name:"Rajada", kind:"pickup", type:"weapon", weaponId:"burst", weaponName:"Rajada", ammo:127, w:30, h:30, color:"#ffe66d"},
  {id:"pickup_weapon_sniper", group:"arma", name:"Sniper", kind:"pickup", type:"weapon", weaponId:"sniper", weaponName:"Sniper", ammo:30, w:30, h:30, color:"#ffffff"},
  {id:"pickup_weapon_flame", group:"arma", name:"Chamas", kind:"pickup", type:"weapon", weaponId:"flame", weaponName:"Chamas", ammo:136, w:30, h:30, color:"#ff6b35"},
  {id:"pickup_weapon_ice", group:"arma", name:"Gelo", kind:"pickup", type:"weapon", weaponId:"ice", weaponName:"Gelo", ammo:76, w:30, h:30, color:"#9be7ff"},
  {id:"pickup_weapon_acid", group:"arma", name:"Ácido", kind:"pickup", type:"weapon", weaponId:"acid", weaponName:"Ácido", ammo:93, w:30, h:30, color:"#57e389"},
  {id:"pickup_weapon_rocket", group:"arma", name:"Foguete", kind:"pickup", type:"weapon", weaponId:"rocket", weaponName:"Foguete", ammo:20, w:30, h:30, color:"#ff9f43"},
  {id:"pickup_weapon_rail", group:"arma", name:"Railgun", kind:"pickup", type:"weapon", weaponId:"rail", weaponName:"Railgun", ammo:27, w:30, h:30, color:"#8be9fd"},
  {id:"pickup_weapon_boomerang", group:"arma", name:"Bumerangue", kind:"pickup", type:"weapon", weaponId:"boomerang", weaponName:"Bumerangue", ammo:59, w:30, h:30, color:"#f1fa8c"},
  {id:"pickup_weapon_triple", group:"arma", name:"Tripla", kind:"pickup", type:"weapon", weaponId:"triple", weaponName:"Tripla", ammo:91, w:30, h:30, color:"#ff79c6"},
  {id:"pickup_weapon_needle", group:"arma", name:"Agulha", kind:"pickup", type:"weapon", weaponId:"needle", weaponName:"Agulha", ammo:170, w:30, h:30, color:"#cfd7e6"},
  {id:"pickup_weapon_cannon", group:"arma", name:"Canhão", kind:"pickup", type:"weapon", weaponId:"cannon", weaponName:"Canhão", ammo:23, w:30, h:30, color:"#bd93f9"},
  {id:"pickup_weapon_spark", group:"arma", name:"Faísca", kind:"pickup", type:"weapon", weaponId:"spark", weaponName:"Faísca", ammo:119, w:30, h:30, color:"#ffe66d"},
  {id:"pickup_weapon_wave", group:"arma", name:"Onda", kind:"pickup", type:"weapon", weaponId:"wave", weaponName:"Onda", ammo:61, w:30, h:30, color:"#50fa7b"},
  {id:"pickup_weapon_blade", group:"arma", name:"Lâmina", kind:"pickup", type:"weapon", weaponId:"blade", weaponName:"Lâmina", ammo:68, w:30, h:30, color:"#f8f8f2"},
  {id:"pickup_weapon_pulse", group:"arma", name:"Pulso", kind:"pickup", type:"weapon", weaponId:"pulse", weaponName:"Pulso", ammo:81, w:30, h:30, color:"#66d9ff"},
  {id:"pickup_weapon_thorn", group:"arma", name:"Espinho", kind:"pickup", type:"weapon", weaponId:"thorn", weaponName:"Espinho", ammo:142, w:30, h:30, color:"#57e389"},
  {id:"pickup_weapon_magnum", group:"arma", name:"Magnum", kind:"pickup", type:"weapon", weaponId:"magnum", weaponName:"Magnum", ammo:51, w:30, h:30, color:"#ffb86b"},
  {id:"pickup_weapon_minigun", group:"arma", name:"Minigun", kind:"pickup", type:"weapon", weaponId:"minigun", weaponName:"Minigun", ammo:272, w:30, h:30, color:"#bfc2d8"},
  {id:"pickup_weapon_star", group:"arma", name:"Estrela", kind:"pickup", type:"weapon", weaponId:"star", weaponName:"Estrela", ammo:85, w:30, h:30, color:"#ffe66d"},
  {id:"pickup_weapon_orb", group:"arma", name:"Orbe", kind:"pickup", type:"weapon", weaponId:"orb", weaponName:"Orbe", ammo:44, w:30, h:30, color:"#d386ff"},
  {id:"pickup_weapon_storm", group:"arma", name:"Tempestade", kind:"pickup", type:"weapon", weaponId:"storm", weaponName:"Tempestade", ammo:108, w:30, h:30, color:"#8be9fd"},
  {id:"pickup_weapon_toxic", group:"arma", name:"Tóxica", kind:"pickup", type:"weapon", weaponId:"toxic", weaponName:"Tóxica", ammo:98, w:30, h:30, color:"#57e389"},
  {id:"pickup_weapon_saw", group:"arma", name:"Serra", kind:"pickup", type:"weapon", weaponId:"saw", weaponName:"Serra", ammo:54, w:30, h:30, color:"#cfd7e6"},
  {id:"pickup_weapon_nova", group:"arma", name:"Nova", kind:"pickup", type:"weapon", weaponId:"nova", weaponName:"Nova", ammo:34, w:30, h:30, color:"#ff5a7a"},
  {id:"pickup_weapon_ghost", group:"arma", name:"Fantasma", kind:"pickup", type:"weapon", weaponId:"ghost", weaponName:"Fantasma", ammo:74, w:30, h:30, color:"#bd93f9"},
  {id:"pickup_weapon_dragon", group:"arma", name:"Dragão", kind:"pickup", type:"weapon", weaponId:"dragon", weaponName:"Dragão", ammo:57, w:30, h:30, color:"#ff6b35"},

  // Decor
  {id:"decor_crate", group:"decor", name:"Caixa", kind:"decor", type:"crate", w:70, h:70, color:"#8b5a2b"},
  {id:"decor_barrel", group:"decor", name:"Tambor decor", kind:"decor", type:"barrel", w:44, h:60, color:"#795548"},
  {id:"decor_torch", group:"decor", name:"Tocha", kind:"decor", type:"torch", w:34, h:90, color:"#ffb86b"},
  {id:"decor_sign", group:"decor", name:"Placa", kind:"decor", type:"sign", w:120, h:80, color:"#8b6b3e"},
  {id:"decor_rock", group:"decor", name:"Pedra", kind:"decor", type:"rock", w:90, h:55, color:"#777"},
  {id:"decor_tree", group:"decor", name:"Árvore/coluna", kind:"decor", type:"tree", w:90, h:230, color:"#5d4037"},
  {id:"decor_light", group:"decor", name:"Luz", kind:"decor", type:"light", w:80, h:80, color:"#ffe66d"},
  {id:"decor_neon", group:"decor", name:"Neon", kind:"decor", type:"neon", w:120, h:26, color:"#66d9ff"},
  {id:"decor_skull", group:"decor", name:"Crânio", kind:"decor", type:"skull", w:50, h:42, color:"#f0f6fc"},
  {id:"decor_pipe", group:"decor", name:"Cano", kind:"decor", type:"pipe", w:160, h:36, color:"#607d8b"},

  // Sistema
  {id:"portal", group:"sistema", name:"Portal", kind:"portal", type:"portal", w:86, h:92, color:"#66d9ff"}
];

function componentById(id){ return components.find(c => c.id === id); }

function syncInputs(){
  state.name = levelName.value || "Minha fase";
  state.width = Number(levelWidth.value) || 4200;
  state.music = levelMusic.value;
  state.bg = [bg1.value || "#151520", bg2.value || "#1c2235"];
}

function worldToScreen(x,y){ return {x:(x-cameraX)*zoom, y:(y-cameraY)*zoom}; }
function screenToWorld(e){
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) / r.width * canvas.width;
  const sy = (e.clientY - r.top) / r.height * canvas.height;
  return {x:sx/zoom + cameraX, y:sy/zoom + cameraY, sx, sy};
}
function snap(v, grid=20){ return Math.round(v / grid) * grid; }

function makeObject(comp, x, y){
  const obj = {kind:comp.kind, type:comp.type, x:snap(x), y:snap(y)};
  if(comp.kind === "platform"){
    obj.x = snap(x - comp.w/2); obj.y = snap(y - comp.h/2); obj.w = comp.w; obj.h = comp.h;
  } else if(comp.kind === "enemy"){
    obj.x = snap(x - comp.w/2); obj.y = snap(y - comp.h); obj.w = comp.w; obj.h = comp.h;
  } else if(comp.kind === "hazard"){
    const baseW = comp.w || (comp.r ? comp.r*2 : 40);
    const baseH = comp.h || (comp.r ? comp.r*2 : 40);
    obj.x = snap(x - baseW/2); obj.y = snap(y - baseH/2);
    for(const k of ["w","h","r","range","speed","dmg","phase","hp","cd","vertical","minX","maxX","dir"]) if(comp[k] !== undefined) obj[k] = comp[k];
    if((obj.type === "beast" || obj.type === "raptor" || obj.type === "snake" || obj.type === "bat_swarm") && obj.minX !== undefined) {
      obj.minX = obj.x - 180;
      obj.maxX = obj.x + 180;
    }
  } else if(comp.kind === "pickup" || comp.kind === "decor"){
    obj.x = snap(x - comp.w/2); obj.y = snap(y - comp.h/2); obj.w = comp.w; obj.h = comp.h;
    for(const k of ["weaponId","weaponName","ammo","amount"]) if(comp[k] !== undefined) obj[k] = comp[k];
  } else if(comp.kind === "portal"){
    obj.x = snap(x - comp.w/2); obj.y = snap(y - comp.h); obj.w = comp.w; obj.h = comp.h;
  }
  return obj;
}

function addObject(id, x, y){
  const comp = componentById(id);
  if(!comp) return;
  const obj = makeObject(comp, x, y);
  if(obj.kind === "platform") state.platforms.push(obj);
  else if(obj.kind === "enemy") state.enemies.push(obj);
  else if(obj.kind === "hazard") state.hazards.push(obj);
  else if(obj.kind === "pickup") state.pickups.push(obj);
  else if(obj.kind === "decor") state.decor.push(obj);
  else if(obj.kind === "portal") state.portal = obj;
  selected = obj;
  updateJson();
}

function objectArrays(){
  return [state.platforms,state.enemies,state.hazards,state.pickups,state.decor,[state.portal]];
}
function allObjects(){
  return [
    ...state.platforms,
    ...state.enemies,
    ...state.hazards,
    ...state.pickups,
    ...state.decor,
    state.portal
  ].filter(Boolean);
}

function hitTest(x,y){
  const objs = allObjects().slice().reverse();
  for(const o of objs){
    if(o.type === "saw"){
      const d = Math.hypot(x-o.x, y-o.y);
      if(d < (o.r || 26) + 10) return o;
    }
    const w = o.w || 40, h = o.h || 40;
    if(x >= o.x && x <= o.x+w && y >= o.y && y <= o.y+h) return o;
  }
  return null;
}

function removeObject(obj){
  if(!obj) return;
  for(const arr of objectArrays()){
    const i = arr.indexOf(obj);
    if(i >= 0 && obj !== state.portal) arr.splice(i,1);
  }
  if(obj === state.portal) state.portal = {kind:"portal", type:"portal", x:state.width-130,y:558,w:86,h:92};
  selected = null;
  updateJson();
}

function duplicateObject(obj){
  if(!obj) return;
  const copy = JSON.parse(JSON.stringify(obj));
  copy.x += 60; copy.y += 20;
  if(copy.kind === "platform") state.platforms.push(copy);
  else if(copy.kind === "enemy") state.enemies.push(copy);
  else if(copy.kind === "hazard") state.hazards.push(copy);
  else if(copy.kind === "pickup") state.pickups.push(copy);
  else if(copy.kind === "decor") state.decor.push(copy);
  else if(copy.kind === "portal") state.portal = copy;
  selected = copy;
  updateJson();
}

function renderPalette(){
  const q = searchInput.value.toLowerCase().trim();
  paletteEl.innerHTML = "";
  for(const comp of components){
    const hay = `${comp.name} ${comp.group} ${comp.type}`.toLowerCase();
    if(q && !hay.includes(q)) continue;

    const btn = document.createElement("button");
    btn.className = "component";
    btn.dataset.id = comp.id;
    if(tool === comp.id) btn.classList.add("active");
    btn.innerHTML = `<div class="component-preview"><canvas width="96" height="44"></canvas></div><div class="component-name">${comp.name}</div>`;
    btn.onclick = () => {
      tool = comp.id;
      updateToolUi();
    };
    paletteEl.appendChild(btn);
    drawPreview(btn.querySelector("canvas"), comp);
  }
}

function drawPreview(c, comp){
  const g = c.getContext("2d");
  g.clearRect(0,0,c.width,c.height);
  g.fillStyle = "#0b0b12";
  g.fillRect(0,0,c.width,c.height);
  g.fillStyle = comp.color || "#fff";
  g.strokeStyle = "rgba(255,255,255,.45)";
  g.lineWidth = 2;

  if(comp.kind === "platform"){
    g.fillRect(12,22,72,12);
    g.fillStyle = "rgba(255,255,255,.25)";
    g.fillRect(12,22,72,3);
  } else if(comp.kind === "enemy"){
    if(comp.type.includes("boss")) g.fillRect(22,6,52,32);
    else if(comp.type === "ninja") drawStar(g,48,22,16,8);
    else if(comp.type === "drone") { g.fillRect(30,14,36,18); g.fillRect(20,19,56,8); }
    else g.fillRect(34,10,28,28);
  } else if(comp.kind === "hazard"){
    if(comp.type === "saw"){ g.beginPath(); g.arc(48,22,15,0,Math.PI*2); g.fill(); }
    else if(comp.type === "laser") g.fillRect(44,2,8,40);
    else if(comp.type === "crusher") g.fillRect(32,5,32,34);
    else g.fillRect(16,26,64,12);
  } else if(comp.kind === "pickup"){
    g.beginPath(); g.arc(48,22,14,0,Math.PI*2); g.fill();
    g.fillStyle = "#111"; g.font = "900 18px system-ui"; g.textAlign = "center"; g.fillText(comp.type==="heal"?"+":"R",48,28);
  } else if(comp.kind === "decor"){
    if(comp.type === "tree") g.fillRect(42,4,12,36);
    else if(comp.type === "torch"){ g.fillRect(45,16,6,24); g.fillStyle="#ff5a2a"; g.beginPath(); g.arc(48,12,8,0,Math.PI*2); g.fill(); }
    else g.fillRect(26,12,44,24);
  } else if(comp.kind === "portal"){
    g.fillStyle = "rgba(102,217,255,.4)";
    g.fillRect(34,5,28,34);
    g.strokeStyle = "#66d9ff"; g.strokeRect(34,5,28,34);
  }
}

function drawStar(g,cx,cy,r,inner){
  let rot=-Math.PI/2, step=Math.PI/5;
  g.beginPath(); g.moveTo(cx+Math.cos(rot)*r, cy+Math.sin(rot)*r);
  for(let i=0;i<5;i++){rot+=step;g.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner);rot+=step;g.lineTo(cx+Math.cos(rot)*r,cy+Math.sin(rot)*r);}
  g.closePath(); g.fill();
}

function updateToolUi(){
  document.querySelectorAll(".component").forEach(b => b.classList.toggle("active", b.dataset.id === tool));
  document.getElementById("selectTool").classList.toggle("active", tool === "select");
  document.getElementById("panTool").classList.toggle("active", tool === "pan");
  toolLabel.textContent = `Ferramenta: ${tool}`;
  renderPalette();
}

function drawGrid(){
  const grid = 40;
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.lineWidth = 1;
  const x0 = Math.floor(cameraX/grid)*grid;
  const y0 = Math.floor(cameraY/grid)*grid;
  const x1 = cameraX + canvas.width/zoom;
  const y1 = cameraY + canvas.height/zoom;
  for(let x=x0; x<x1; x+=grid){
    const s = worldToScreen(x,0).x;
    ctx.beginPath(); ctx.moveTo(s,0); ctx.lineTo(s,canvas.height); ctx.stroke();
  }
  for(let y=y0; y<y1; y+=grid){
    const s = worldToScreen(0,y).y;
    ctx.beginPath(); ctx.moveTo(0,s); ctx.lineTo(canvas.width,s); ctx.stroke();
  }
}

function drawObject(o){
  const s = worldToScreen(o.x, o.y);
  const w = (o.w || 40) * zoom, h = (o.h || 40) * zoom;
  const comp = components.find(c => c.kind === o.kind && c.type === o.type);
  const color = comp?.color || "#fff";

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.lineWidth = Math.max(1, 2*zoom);

  if(o.kind === "platform"){
    ctx.fillRect(s.x,s.y,w,h);
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.fillRect(s.x,s.y,w,Math.max(2,5*zoom));
  } else if(o.kind === "enemy"){
    if(o.type === "ninja") drawStar(ctx, s.x+w/2, s.y+h/2, Math.max(w,h)*.5, Math.max(w,h)*.25);
    else if(o.type === "drone"){ ctx.fillRect(s.x,s.y+h*.25,w,h*.5); ctx.fillRect(s.x-w*.3,s.y+h*.38,w*1.6,h*.22); }
    else ctx.fillRect(s.x,s.y,w,h);
    ctx.fillStyle = "#fff"; ctx.font = `${Math.max(9,11*zoom)}px system-ui`; ctx.fillText(o.type, s.x, s.y-4);
  } else if(o.kind === "hazard"){
    if(o.type === "saw"){
      const cs = worldToScreen(o.x,o.y);
      ctx.beginPath(); ctx.arc(cs.x,cs.y,(o.r||26)*zoom,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#aaa"; ctx.beginPath(); ctx.moveTo(cs.x-(o.range||260)*zoom,cs.y); ctx.lineTo(cs.x+(o.range||260)*zoom,cs.y); ctx.stroke();
    } else if(o.type === "spikes"){
      for(let x=0;x<w;x+=18*zoom){ctx.beginPath();ctx.moveTo(s.x+x,s.y+h);ctx.lineTo(s.x+x+9*zoom,s.y);ctx.lineTo(s.x+x+18*zoom,s.y+h);ctx.fill();}
    } else if(o.type === "pendulum"){
      ctx.beginPath();ctx.arc(s.x+w/2,s.y+h/2,(o.r||30)*zoom,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#aaa";ctx.beginPath();ctx.moveTo(s.x+w/2,s.y-80*zoom);ctx.lineTo(s.x+w/2,s.y+h/2);ctx.stroke();
    } else if(o.type === "mine"){
      ctx.beginPath();ctx.arc(s.x+w/2,s.y+h/2,Math.max(w,h)/2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#111";ctx.textAlign="center";ctx.fillText("!",s.x+w/2,s.y+h*.68);
    } else if(o.type === "beast" || o.type === "raptor" || o.type === "snake" || o.type === "bat_swarm"){
      ctx.fillRect(s.x,s.y,w,h);
      ctx.fillStyle="#111";ctx.fillRect(s.x+w-12*zoom,s.y+8*zoom,6*zoom,6*zoom);
    } else {
      ctx.fillRect(s.x,s.y,w,h);
    }
  } else if(o.kind === "pickup"){
    ctx.beginPath(); ctx.arc(s.x+w/2,s.y+h/2,Math.max(w,h)/2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#111"; ctx.font=`900 ${Math.max(10,14*zoom)}px system-ui`; ctx.textAlign="center";
    const icon = o.type==="heal" ? "+" : o.type==="life" ? "♥" : o.type==="revive" ? "↻" : o.type==="bombs" ? "💣" : o.type==="weapon" ? "W" : "R";
    ctx.fillText(icon,s.x+w/2,s.y+h*.72);
    if(o.type==="weapon"){
      ctx.fillStyle="#fff"; ctx.font=`900 ${Math.max(7,9*zoom)}px system-ui`;
      ctx.fillText(String(o.weaponName || o.weaponId || "ARM").slice(0,5).toUpperCase(),s.x+w/2,s.y+h+12*zoom);
    }
  } else if(o.kind === "decor"){
    ctx.globalAlpha = .78;
    ctx.fillRect(s.x,s.y,w,h);
    ctx.globalAlpha = 1;
  } else if(o.kind === "portal"){
    ctx.fillStyle = "rgba(102,217,255,.32)";
    ctx.fillRect(s.x,s.y,w,h);
    ctx.strokeStyle = "#66d9ff"; ctx.strokeRect(s.x,s.y,w,h);
  }

  if(selected === o) outline(o);
}

function outline(o){
  const s = worldToScreen(o.x,o.y);
  const w = (o.w || ((o.r||20)*2)) * zoom, h = (o.h || ((o.r||20)*2)) * zoom;
  ctx.save();
  ctx.strokeStyle = "#ffe66d";
  ctx.lineWidth = 3;
  if(o.type === "saw"){
    const cs = worldToScreen(o.x,o.y);
    ctx.strokeRect(cs.x-(o.r||26)*zoom-5, cs.y-(o.r||26)*zoom-5, (o.r||26)*2*zoom+10, (o.r||26)*2*zoom+10);
  } else {
    ctx.strokeRect(s.x-4,s.y-4,w+8,h+8);
    ctx.fillStyle = "#ffe66d";
    ctx.fillRect(s.x+w-8,s.y+h-8,14,14);
  }
  ctx.restore();
}

function draw(){
  syncInputs();
  ctx.setTransform(1,0,0,1,0,0);
  const grad = ctx.createLinearGradient(0,0,0,canvas.height);
  grad.addColorStop(0,state.bg[0]); grad.addColorStop(1,state.bg[1]);
  ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);

  drawGrid();

  const left = worldToScreen(0,0).x;
  const right = worldToScreen(state.width,0).x;
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fillRect(left,0,4,canvas.height);
  ctx.fillRect(right,0,4,canvas.height);

  for(const o of state.decor) drawObject(o);
  for(const o of state.platforms) drawObject(o);
  for(const o of state.hazards) drawObject(o);
  for(const o of state.pickups) drawObject(o);
  for(const o of state.enemies) drawObject(o);
  drawObject(state.portal);

  ctx.fillStyle = "#fff";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`x=${Math.round(cameraX)} y=${Math.round(cameraY)} zoom=${Math.round(zoom*100)}%`, 16, 28);
  viewportInfo.textContent = `Zoom ${Math.round(zoom*100)}% · x ${Math.round(cameraX)} · y ${Math.round(cameraY)}`;

  renderSelected();
  requestAnimationFrame(draw);
}

function renderSelected(){
  if(!selected){ selectedPanel.textContent = "Nada selecionado"; return; }
  selectedPanel.innerHTML = "";
  for(const [k,v] of Object.entries(selected)){
    const label = document.createElement("label");
    label.textContent = k;
    const input = document.createElement(typeof v === "number" ? "input" : "input");
    input.value = v;
    input.oninput = () => {
      selected[k] = isNaN(Number(input.value)) || input.value.trim()==="" ? input.value : Number(input.value);
      updateJson();
    };
    label.appendChild(input);
    selectedPanel.appendChild(label);
  }
}

function exportLevel(){
  syncInputs();
  const data = {
    name: state.name,
    width: state.width,
    music: state.music,
    bg: state.bg,
    portalY: state.portal.y,
    platforms: state.platforms.map(p => [p.x,p.y,p.w,p.h]),
    enemies: state.enemies.map(e => [e.type,e.x,e.y]),
    hazards: state.hazards.map(h => clean(h)),
    pickups: state.pickups.map(p => clean(p)),
    decor: state.decor.map(d => clean(d)),
    portal: clean(state.portal)
  };
  return data;
}
function clean(o){ const c={...o}; delete c.kind; return c; }
function updateJson(){ jsonOutput.value = JSON.stringify(exportLevel(), null, 2); }

function loadLevel(data){
  state.name = data.name || "Minha fase";
  state.width = data.width || 4200;
  state.music = data.music || "fire";
  state.bg = data.bg || ["#151520","#1c2235"];
  state.portalY = data.portalY || 558;
  state.platforms = (data.platforms || []).map(p => ({kind:"platform", type:"custom", x:p[0], y:p[1], w:p[2], h:p[3]}));
  state.enemies = (data.enemies || []).map(e => {
    const comp = components.find(c=>c.kind==="enemy" && c.type===e[0]);
    return {kind:"enemy", type:e[0], x:e[1], y:e[2], w:comp?.w||36, h:comp?.h||44};
  });
  state.hazards = (data.hazards || []).map(h => ({kind:"hazard", ...h}));
  state.pickups = (data.pickups || []).map(p => ({kind:"pickup", ...p}));
  state.decor = (data.decor || []).map(d => ({kind:"decor", ...d}));
  state.portal = {kind:"portal", ...(data.portal || {x:state.width-130,y:558,w:86,h:92})};
  levelName.value = state.name; levelWidth.value = state.width; levelMusic.value = state.music; bg1.value = state.bg[0]; bg2.value = state.bg[1];
  selected = null; updateJson();
}

function setZoom(next, sx=canvas.width/2, sy=canvas.height/2){
  const before = {x:sx/zoom + cameraX, y:sy/zoom + cameraY};
  zoom = Math.max(.35, Math.min(3, next));
  cameraX = before.x - sx/zoom;
  cameraY = before.y - sy/zoom;
}

canvas.addEventListener("contextmenu", e => e.preventDefault());

canvas.addEventListener("pointerdown", e => {
  const p = screenToWorld(e);
  lastPointer = {sx:p.sx, sy:p.sy, cameraX, cameraY};

  if(e.button === 2 || e.shiftKey || tool === "pan"){
    panning = true;
    return;
  }

  const obj = hitTest(p.x,p.y);
  if(tool === "select" || obj){
    selected = obj;
    if(obj){
      const w = obj.w || 40, h = obj.h || 40;
      const nearResize = p.x > obj.x+w-20 && p.y > obj.y+h-20;
      resizing = nearResize && obj.w && obj.h;
      drag = {obj, dx:p.x-obj.x, dy:p.y-obj.y};
    }
  } else {
    addObject(tool, p.x, p.y);
    drag = selected ? {obj:selected, dx:(selected.w||40)/2, dy:(selected.h||40)/2} : null;
  }
  updateJson();
});

canvas.addEventListener("pointermove", e => {
  const p = screenToWorld(e);

  if(panning && lastPointer){
    cameraX = lastPointer.cameraX - (p.sx - lastPointer.sx)/zoom;
    cameraY = lastPointer.cameraY - (p.sy - lastPointer.sy)/zoom;
    return;
  }

  if(!drag) return;
  if(resizing && drag.obj.w && drag.obj.h){
    drag.obj.w = Math.max(20, snap(p.x - drag.obj.x));
    drag.obj.h = Math.max(20, snap(p.y - drag.obj.y));
  } else {
    drag.obj.x = snap(p.x - drag.dx);
    drag.obj.y = snap(p.y - drag.dy);
  }
  updateJson();
});

canvas.addEventListener("pointerup", () => { drag = null; resizing = false; panning = false; lastPointer = null; });
canvas.addEventListener("pointercancel", () => { drag = null; resizing = false; panning = false; lastPointer = null; });

canvas.addEventListener("wheel", e => {
  if(e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)){
    setZoom(zoom * (e.deltaY > 0 ? .9 : 1.1), e.offsetX / canvas.clientWidth * canvas.width, e.offsetY / canvas.clientHeight * canvas.height);
  } else {
    cameraX = Math.max(0, Math.min(state.width - canvas.width/zoom, cameraX + (e.deltaX + e.deltaY)/zoom));
  }
  e.preventDefault();
},{passive:false});

document.getElementById("selectTool").onclick = () => { tool="select"; updateToolUi(); };
document.getElementById("panTool").onclick = () => { tool="pan"; updateToolUi(); };
document.getElementById("zoomInBtn").onclick = () => setZoom(zoom*1.2);
document.getElementById("zoomOutBtn").onclick = () => setZoom(zoom*.8);
document.getElementById("zoomResetBtn").onclick = () => { zoom=1; cameraY=0; };
searchInput.oninput = renderPalette;

document.getElementById("deleteBtn").onclick = () => removeObject(selected);
document.getElementById("duplicateBtn").onclick = () => duplicateObject(selected);
document.getElementById("exportBtn").onclick = updateJson;
document.getElementById("copyBtn").onclick = async () => { updateJson(); await navigator.clipboard.writeText(jsonOutput.value); alert("JSON copiado"); };
document.getElementById("clearBtn").onclick = () => { if(confirm("Limpar fase?")) loadLevel({name:"Minha fase", width:4200, music:"fire", bg:["#151520","#1c2235"], platforms:[[0,650,4200,80]], enemies:[], hazards:[], pickups:[], decor:[]}); };
document.getElementById("playBtn").onclick = () => { updateJson(); localStorage.setItem("customLevel", jsonOutput.value); location.href="/?customLevel=1"; };
document.getElementById("importFile").onchange = async e => { const file=e.target.files[0]; if(!file)return; loadLevel(JSON.parse(await file.text())); };
[levelName,levelWidth,levelMusic,bg1,bg2].forEach(el => el.addEventListener("input", updateJson));

addEventListener("keydown", e => {
  if(e.key === "Delete" || e.key === "Backspace") removeObject(selected);
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d"){ e.preventDefault(); duplicateObject(selected); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selected){ e.preventDefault(); clipboard = JSON.parse(JSON.stringify(selected)); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && clipboard){ e.preventDefault(); const copy=JSON.parse(JSON.stringify(clipboard)); copy.x+=60; copy.y+=20; selected=copy; if(copy.kind==="platform")state.platforms.push(copy); else if(copy.kind==="enemy")state.enemies.push(copy); else if(copy.kind==="hazard")state.hazards.push(copy); else if(copy.kind==="pickup")state.pickups.push(copy); else if(copy.kind==="decor")state.decor.push(copy); else if(copy.kind==="portal")state.portal=copy; updateJson(); }
});

renderPalette();
updateToolUi();
updateJson();
draw();
