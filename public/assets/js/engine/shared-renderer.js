(function(){
  const colors = ["#66d9ff", "#ff5a7a", "#ffe66d", "#57e389"];
  const names = ["Azul", "Rosa", "Amarelo", "Verde"];
  const weaponShortNames = {
    Pistola: "PST",
    Metralha: "MET",
    Escopeta: "ESC",
    Laser: "LSR",
    Plasma: "PLS",
    Rajada: "RAJ",
    Sniper: "SNP",
    Chamas: "FGO",
    Gelo: "GEL",
    "Ácido": "ACD",
    Foguete: "FOG",
    Railgun: "RAIL",
    Bumerangue: "BUM",
    Tripla: "TRI",
    Agulha: "AGU",
    "Canhão": "CAN",
    "Faísca": "FAI",
    Onda: "OND",
    "Lâmina": "LAM",
    Pulso: "PUL",
    Espinho: "ESP",
    Magnum: "MAG",
    Minigun: "MIN",
    Estrela: "EST",
    Orbe: "ORB",
    Tempestade: "TMP",
    "Tóxica": "TOX",
    Serra: "SER",
    Nova: "NOV",
    Fantasma: "FAN",
    "Dragão": "DRA"
  };

  function color(id){ return colors[(id-1)%colors.length]; }
  function pname(id){ return names[(id-1)%names.length] || `J${id}`; }

  function weaponLabel(p){
    if(!p || !p.weaponId || p.weaponId === "default") return "PST";
    const name = p.weaponName || p.weaponId || "ARM";
    const short = weaponShortNames[name] || String(name).slice(0,4).toUpperCase();
    return `${short} ${Math.max(0,p.weaponAmmo||0)}`;
  }

  function livesHudText(p){
    const lives = p.lives ?? 0;
    if(!p.alive && lives <= 0) return "❤️ x0 ☠";
    if(!p.alive && (p.respawnTimer || 0) > 0) return `❤️ x${lives} ⏳`;
    return `❤️ x${lives}   ${Math.max(0, Math.round(p.hp || 0))}%`;
  }

  function draw(ctx, s, opts = {}) {
    const W = opts.width || ctx.canvas.width || 1280;
    const H = opts.height || ctx.canvas.height || 720;
    const cameraX = s.cameraX || 0;
    const worldX = x => x - cameraX;

    function pxRect(x,y,w,h,c){
      ctx.fillStyle=c;
      ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    }

    function drawDropIcon(item){
      const iw = Number.isFinite(item.w) ? item.w : 24;
      const ih = Number.isFinite(item.h) ? item.h : 24;
      const x = worldX(Number.isFinite(item.x) ? item.x : 0);
      const y = Number.isFinite(item.y) ? item.y : 0;
      const cx = x + iw / 2;
      const cy = y + ih / 2 + Math.sin((s.time || 0) * .08 + (item.x || 0) * .01) * 2;
      const type = item.type || "unknown";
      const accent = type === "weapon" ? "#66d9ff" : type === "life" ? "#ff5a7a" : type === "heal" ? "#57e389" : type === "revive" ? "#d386ff" : type === "bombs" ? "#ff9f43" : "#ffe66d";

      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;

      if(type === "heal"){
        ctx.fillStyle = "#f8f8f2";
        ctx.fillRect(cx - 15, cy - 11, 30, 22);
        ctx.strokeStyle = "#57e389";
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - 15, cy - 11, 30, 22);
        ctx.fillStyle = "#57e389";
        ctx.fillRect(cx - 4, cy - 9, 8, 18);
        ctx.fillRect(cx - 11, cy - 3, 22, 7);
      } else if(type === "life"){
        ctx.fillStyle = "#ff5a7a";
        ctx.beginPath();
        ctx.moveTo(cx, cy + 11);
        ctx.bezierCurveTo(cx - 22, cy - 2, cx - 10, cy - 18, cx, cy - 8);
        ctx.bezierCurveTo(cx + 10, cy - 18, cx + 22, cy - 2, cx, cy + 11);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if(type === "revive"){
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#d386ff";
        ctx.fillRect(-14, -14, 28, 28);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.strokeRect(-14, -14, 28, 28);
        ctx.rotate(-Math.PI / 4);
        ctx.beginPath();
        ctx.arc(0, 0, 10, -0.75, Math.PI * 1.45);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(10, -8);
        ctx.lineTo(16, -8);
        ctx.lineTo(12, -2);
        ctx.fill();
        ctx.fillRect(-3, -8, 6, 16);
        ctx.fillRect(-8, -3, 16, 6);
      } else if(type === "bombs"){
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(cx, cy + 3, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff9f43";
        ctx.fillRect(cx - 4, cy - 13, 8, 9);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 11, 6, Math.PI * .9, Math.PI * 1.9);
        ctx.stroke();
      } else if(type === "weapon"){
        ctx.fillStyle = accent;
        ctx.fillRect(cx - 19, cy - 5, 31, 10);
        ctx.fillRect(cx + 8, cy - 9, 14, 5);
        ctx.fillRect(cx - 8, cy + 5, 9, 11);
        ctx.fillStyle = "#e9edf7";
        ctx.fillRect(cx - 15, cy - 2, 17, 4);
      } else {
        ctx.fillStyle = "#ffe66d";
        ctx.beginPath();
        ctx.moveTo(cx + 3, cy - 15);
        ctx.lineTo(cx - 8, cy + 2);
        ctx.lineTo(cx, cy + 2);
        ctx.lineTo(cx - 3, cy + 15);
        ctx.lineTo(cx + 10, cy - 4);
        ctx.lineTo(cx + 2, cy - 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    function drawHeroBall(x,y,r,fill,extra={}){
      ctx.save();
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.35)";
      ctx.beginPath();
      ctx.arc(x-r*.35,y-r*.35,r*.35,0,Math.PI*2);
      ctx.fill();
      if(extra.stroke){
        ctx.strokeStyle=extra.stroke;
        ctx.lineWidth=3;
        ctx.stroke();
      }
      ctx.restore();
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

    function drawHpBar(x, y, w, h, ratio, barColor="#66d9ff") {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.72)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.32)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      const fillW = Math.max(0, Math.min(w - 6, (w - 6) * ratio));
      ctx.fillStyle = barColor;
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

    function drawPlayersStrip(players, panelX = 18, panelY = 14) {
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
      ctx.restore();
    }

    function drawBackground(){
      const bg = s.bg || ["#151520","#1c2235"];
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,bg[0]);
      grad.addColorStop(1,bg[1]);
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,W,H);

      ctx.save();
      ctx.globalAlpha=.22;
      ctx.fillStyle=s.levelMusic==="neon"?"#66d9ff":s.levelMusic==="toxic"?"#57e389":"#ffe66d";
      ctx.beginPath();
      ctx.arc(W-180,120,70,0,Math.PI*2);
      ctx.fill();
      ctx.restore();

      for(let layer=0; layer<3; layer++){
        const speed = .12 + layer*.09;
        const baseY = 170 + layer*95;
        const height = 240 - layer*35;
        ctx.fillStyle = `rgba(255,255,255,${0.035 + layer*.025})`;
        for(let i=0;i<28;i++){
          const bw = 60 + (i%5)*22;
          const bh = height - (i%7)*18;
          const x = (i*150 - cameraX*speed) % (W+220) - 120;
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

    function drawPlatform(p){
      const x = worldX(p[0]), y = p[1], w = p[2], h = p[3];
      ctx.fillStyle="#242435"; ctx.fillRect(x,y,w,h);
      ctx.fillStyle="#3a3a52"; ctx.fillRect(x,y,w,Math.min(10,h*.25));
      ctx.fillStyle="rgba(255,255,255,.10)"; ctx.fillRect(x,y,w,3);
      ctx.strokeStyle="rgba(0,0,0,.22)"; ctx.lineWidth=1;
      for(let tx=0; tx<w; tx+=64){
        ctx.beginPath(); ctx.moveTo(x+tx,y); ctx.lineTo(x+tx,y+h); ctx.stroke();
      }
      if(s.levelMusic==="toxic") ctx.fillStyle="#57e389";
      else if(s.levelMusic==="neon") ctx.fillStyle="#66d9ff";
      else if(s.levelMusic==="final") ctx.fillStyle="#ff5a7a";
      else ctx.fillStyle="#ffb86b";
      ctx.fillRect(x,y,w,4);
    }

    function drawDecor(d) {
      const x = worldX(d.x), y = d.y, w=d.w||60, h=d.h||60;
      ctx.save(); ctx.globalAlpha = 0.82;
      if (d.type === "torch") {
        ctx.fillStyle = "#5d4037"; ctx.fillRect(x + w*.42, y + h*.35, w*.16, h*.65);
        ctx.fillStyle = "#ffb86b"; ctx.beginPath(); ctx.arc(x + w/2, y + h*.25, w*.28, 0, Math.PI*2); ctx.fill();
      } else if (d.type === "light") {
        ctx.fillStyle = "rgba(255,230,109,.22)"; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ffe66d"; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.2,0,Math.PI*2); ctx.fill();
      } else if (d.type === "rock") {
        ctx.fillStyle = "#777"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h*.7,w*.5,h*.35,0,0,Math.PI*2); ctx.fill();
      } else if (d.type === "tree") {
        ctx.fillStyle = "#5d4037"; ctx.fillRect(x+w*.35,y,w*.3,h);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x,y+h*.15,w,h*.25);
      } else {
        ctx.fillStyle = d.type === "crate" ? "#8b5a2b" : d.type === "barrel" ? "#795548" : "#8b6b3e";
        ctx.fillRect(x,y,w,h); ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.strokeRect(x,y,w,h);
      }
      ctx.restore();
    }

    function pseudoRand(seed){
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    function drawHazard(h, idx){
      if(h.dead) return;
      if(h.type==="fire"||h.type==="acid"){
        ctx.fillStyle=h.type==="fire"?"rgba(255,90,40,.78)":"rgba(87,227,137,.72)";
        ctx.fillRect(worldX(h.x),h.y,h.w,h.h);
        for(let i=0;i<6;i++){
          const rx = pseudoRand((s.time||0)*.05 + idx*31 + i*7) * h.w;
          const ry = pseudoRand((s.time||0)*.06 + idx*17 + i*11) * h.h;
          const rr = 5 + pseudoRand((s.time||0)*.04 + idx*13 + i*3) * 9;
          ctx.globalAlpha=.5; ctx.beginPath(); ctx.arc(worldX(h.x+rx),h.y+ry,rr,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
      } else if(h.type==="saw"){
        const sx=worldX(h.x+Math.sin((s.time||0)*h.speed)*(h.range||200)), sy=h.y;
        ctx.strokeStyle="rgba(255,255,255,.2)";
        ctx.beginPath();ctx.moveTo(worldX(h.x-(h.range||200)),sy);ctx.lineTo(worldX(h.x+(h.range||200)),sy);ctx.stroke();
        ctx.fillStyle="#ddd";ctx.beginPath();ctx.arc(sx,sy,h.r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#333";ctx.beginPath();ctx.arc(sx,sy,h.r*.4,0,Math.PI*2);ctx.fill();
      } else if(h.type==="laser"){
        const on=Math.sin((s.time||0)*0.055+(h.phase||0))>-.25;
        ctx.fillStyle=on?"rgba(255,90,122,.78)":"rgba(255,90,122,.15)";
        ctx.fillRect(worldX(h.x),h.y,h.w,h.h);
      } else if(h.type==="barrel"){
        ctx.fillStyle="#ff9f43";ctx.fillRect(worldX(h.x),h.y,h.w,h.h);
        ctx.fillStyle="#111";ctx.font="900 15px system-ui";ctx.fillText("!",worldX(h.x)+h.w/2,h.y+32);
      } else if(h.type==="turret"){
        ctx.fillStyle="#999";ctx.fillRect(worldX(h.x),h.y,h.w,h.h);
        ctx.fillStyle="#333";ctx.fillRect(worldX(h.x)-18,h.y+20,24,8);
      } else if(h.type==="crusher"){
        const y=h.y+(Math.sin((s.time||0)*.035+(h.phase||0))>0.15?250:0);
        ctx.fillStyle="#69697f";ctx.fillRect(worldX(h.x),y,h.w,h.h);
      } else if(h.type==="blade_wall"){
        const y=h.y+Math.sin((s.time||0)*(h.speed||.04)+(h.phase||0))*(h.range||160);
        ctx.fillStyle="#d7dde8";ctx.fillRect(worldX(h.x),y,h.w,h.h);
        ctx.fillStyle="#ff5a7a";for(let i=0;i<h.h;i+=18){ctx.beginPath();ctx.moveTo(worldX(h.x),y+i);ctx.lineTo(worldX(h.x+h.w),y+i+9);ctx.lineTo(worldX(h.x),y+i+18);ctx.fill();}
      } else if(h.type==="spikes"){
        const active=Math.sin((s.time||0)*(h.speed||.05)+(h.phase||0))>-.35;
        ctx.fillStyle=active?"#cfd7e6":"rgba(207,215,230,.35)";
        for(let x=0;x<h.w;x+=18){ctx.beginPath();ctx.moveTo(worldX(h.x+x),h.y+h.h);ctx.lineTo(worldX(h.x+x+9),h.y);ctx.lineTo(worldX(h.x+x+18),h.y+h.h);ctx.fill();}
      } else if(h.type==="laser_sweep"){
        ctx.fillStyle="rgba(255,60,120,.82)";
        if(h.vertical){const lx=h.x+Math.sin((s.time||0)*(h.speed||.035)+(h.phase||0))*(h.range||260);ctx.fillRect(worldX(lx),h.y,h.w||18,h.h||620);}
        else ctx.fillRect(worldX(h.x),h.y+Math.sin((s.time||0)*(h.speed||.035)+(h.phase||0))*(h.range||180),h.w||420,h.h||16);
      } else if(h.type==="pendulum"){
        const px=h.x+Math.sin((s.time||0)*(h.speed||.045)+(h.phase||0))*(h.range||180);
        const py=h.y+Math.abs(Math.cos((s.time||0)*(h.speed||.045)+(h.phase||0)))*60;
        ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(worldX(h.x),h.y-120);ctx.lineTo(worldX(px),py);ctx.stroke();
        ctx.fillStyle="#d7dde8";ctx.beginPath();ctx.arc(worldX(px),py,h.r||30,0,Math.PI*2);ctx.fill();ctx.fillStyle="#333";ctx.beginPath();ctx.arc(worldX(px),py,(h.r||30)*.45,0,Math.PI*2);ctx.fill();
      } else if(h.type==="mine"){
        ctx.fillStyle="#ff9f43";ctx.beginPath();ctx.arc(worldX(h.x+14),h.y+14,14+Math.sin((h.pulse||0))*2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";ctx.font="900 14px system-ui";ctx.textAlign="center";ctx.fillText("!",worldX(h.x+14),h.y+19);
      } else if(h.type==="beast"||h.type==="raptor"||h.type==="snake"||h.type==="bat_swarm"){
        const sx=worldX(h.x), y=h.y, w=h.w||50, hh=h.h||34;
        ctx.fillStyle=h.type==="snake"?"#57e389":h.type==="bat_swarm"?"#8be9fd":h.type==="raptor"?"#ffb86b":"#ff5a7a";
        if(h.type==="snake"){ctx.beginPath();ctx.ellipse(sx+w/2,y+hh/2,w/2,hh/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";ctx.fillRect(sx+w-12,y+8,5,5);}
        else if(h.type==="bat_swarm"){for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(sx+i*14,y+Math.sin((s.time||0)*.12+i)*10,8,0,Math.PI*2);ctx.fill();}}
        else {ctx.fillRect(sx,y,w,hh);ctx.fillStyle="#111";ctx.fillRect(sx+w-12,y+8,6,6);ctx.fillRect(sx+8,y+hh-4,10,8);ctx.fillRect(sx+w-18,y+hh-4,10,8);}
      }
    }

    function drawBasicEnemy(w,h,c,facing){
      const dark="#111827";
      pxRect(-w*.32,-h*.32,w*.64,h*.52,c);
      pxRect(-w*.24,-h*.52,w*.48,h*.26,c);
      pxRect(-w*.18,-h*.45,w*.36,h*.1,"#fff");
      pxRect(facing*w*.06,-h*.43,w*.12,h*.06,"#111");
      pxRect(-w*.45,h*.18,w*.28,h*.28,dark);
      pxRect(w*.17,h*.18,w*.28,h*.28,dark);
      pxRect(facing>0?w*.18:-w*.75,-h*.1,w*.58,h*.11,"#e9edf7");
    }

    function drawEnemy(e){
      const sx=worldX(e.x), sy=e.y, w=e.w||36, h=e.h||44;
      const x=sx+w/2, y=sy+h/2, c=e.color || (e.boss?"#ff1744":"#ffb86b");
      ctx.save(); ctx.translate(x,y);
      ctx.globalAlpha=.25; ctx.fillStyle="#000"; ctx.beginPath(); ctx.ellipse(0,h*.42,w*.45,5,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      if(e.boss){
        const dark="#111827";
        pxRect(-w*.45,-h*.36,w*.9,h*.65,c);
        pxRect(-w*.34,-h*.58,w*.68,h*.28,c);
        pxRect(-w*.22,-h*.48,w*.44,h*.12,"#fff");
        pxRect((e.facing||1)*w*.05,-h*.45,w*.14,h*.07,"#111");
        pxRect(-w*.62,h*.16,w*.35,h*.30,dark); pxRect(w*.27,h*.16,w*.35,h*.30,dark);
        pxRect((e.facing||1)>0?w*.25:-w*.95,-h*.06,w*.7,h*.12,"#e9edf7");
        pxRect((e.facing||1)>0?w*.88:-w*1.08,-h*.03,w*.22,h*.06,"#ffb86b");
      } else if(e.type==="drone"||e.type==="jetpack"){
        pxRect(-w*.42,-h*.25,w*.84,h*.5,c);
        pxRect(-w*.62,-h*.05,w*.32,h*.14,"#d7f9ff"); pxRect(w*.30,-h*.05,w*.32,h*.14,"#d7f9ff");
        pxRect(-w*.16,-h*.12,w*.32,h*.24,"#111827"); pxRect(-w*.08,-h*.04,w*.16,h*.08,"#66d9ff");
      } else if(e.type==="ninja"){
        const dark="#05070b";
        pxRect(-w*.35,-h*.45,w*.7,h*.72,dark); pxRect(-w*.32,-h*.28,w*.64,h*.16,c);
        pxRect(-w*.20,-h*.22,w*.12,h*.07,"#fff"); pxRect(w*.08,-h*.22,w*.12,h*.07,"#fff");
        pxRect((e.facing||1)>0?w*.15:-w*.95,-h*.02,w*.8,h*.06,"#cfd7e6");
        pxRect(-w*.32,h*.28,w*.22,h*.25,dark); pxRect(w*.10,h*.28,w*.22,h*.25,dark);
      } else if(e.type==="crawler"){
        pxRect(-w*.50,-h*.20,w,h*.4,c); pxRect(-w*.35,-h*.36,w*.7,h*.18,c);
        for(let i=0;i<4;i++) pxRect(-w*.42+i*w*.28,h*.18,w*.13,h*.18,"#111827");
        pxRect(w*.25,-h*.1,w*.14,h*.08,"#fff");
      } else if(e.type==="shielder"){
        drawBasicEnemy(w,h,c,e.facing||1); ctx.strokeStyle="#66d9ff"; ctx.lineWidth=5; ctx.strokeRect(-w*.55,-h*.55,w*1.1,h*1.1);
      } else {
        drawBasicEnemy(w,h,c,e.facing||1);
      }
      ctx.restore();
      const barW=e.boss?w+34:Math.max(34,Math.min(58,w+14));
      const barH=e.boss?8:5;
      const barX=sx+w/2-barW/2;
      const barY=sy-(e.boss?20:12);
      const hpRatio=Math.max(0,Math.min(1,(e.hp||0)/(e.maxHp||e.hp||1)));
      ctx.fillStyle="rgba(0,0,0,.82)"; ctx.fillRect(barX,barY,barW,barH);
      ctx.fillStyle=hpRatio>.55?"#57e389":hpRatio>.25?"#ffe66d":"#ff5a7a";
      ctx.fillRect(barX+1,barY+1,(barW-2)*hpRatio,barH-2);
      ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.lineWidth=1; ctx.strokeRect(barX,barY,barW,barH);
    }

    function drawHero(p){
      if(!p.alive && p.hp<=0) return;
      const sx=worldX(p.x), sy=p.y, flip=p.facing<0;
      const runSpeed=Math.min(1,Math.abs(p.vx||0)/4.25);
      const run=Math.sin((s.time||0)*.45+p.id);
      const bob=p.onGround?Math.abs(run)*2.2*runSpeed:-3+Math.sin((s.time||0)*.12);
      const recoil=Math.max(0,(p.fireCd||0)/12);
      const x=sx+p.w/2, y=sy+p.h/2+bob;
      ctx.save(); ctx.translate(x,y); ctx.scale(flip?-1:1,1);
      const suit=color(p.id), dark="#121827", visor="#d7f9ff", gun="#e9edf7";
      const legA=p.onGround?run*6*runSpeed:-7, legB=p.onGround?-run*6*runSpeed:7, armSwing=p.onGround?-run*3*runSpeed:2;
      ctx.globalAlpha=.28; ctx.fillStyle="#000"; ctx.beginPath(); ctx.ellipse(0,27,20+runSpeed*3,6,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      pxRect(-12+legA*.15,11,9,17+Math.abs(legA)*.08,dark); pxRect(4+legB*.15,11,9,17+Math.abs(legB)*.08,dark);
      pxRect(-15+legA,25,13,6,"#0b0f18"); pxRect(3+legB,25,14,6,"#0b0f18");
      pxRect(-16,-12,32,28,suit); pxRect(-13,-8,26,8,"rgba(255,255,255,.20)");
      pxRect(-18,-6+armSwing,7,21,dark); pxRect(11,-6-armSwing*.4,7,21,dark);
      pxRect(-15,-32-runSpeed*Math.abs(run),30,22,suit); pxRect(-11,-36-runSpeed*Math.abs(run),22,8,suit);
      pxRect(-10,-27-runSpeed*Math.abs(run),21,8,visor); pxRect(3,-25-runSpeed*Math.abs(run),8,4,"#ffffff");
      ctx.save(); const aimX=Number.isFinite(p.aimX)?p.aimX:(p.facing||1), aimY=Number.isFinite(p.aimY)?p.aimY:0; const ang=Math.atan2(aimY, flip?-aimX:aimX); ctx.translate(14-recoil*2,-4); ctx.rotate(ang);
      pxRect(0,-4,26,8,gun); pxRect(22,-2,10,4,"#9aa4b2"); pxRect(5,4,8,8,dark);
      if(recoil>.4){ctx.fillStyle="#ffe66d";ctx.beginPath();ctx.moveTo(34,0);ctx.lineTo(44,-6);ctx.lineTo(40,0);ctx.lineTo(44,6);ctx.fill();}
      ctx.restore();
      ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.lineWidth=2; ctx.strokeRect(-16,-32,32,48);
      ctx.restore();
      ctx.fillStyle="#fff"; ctx.font="900 12px system-ui"; ctx.textAlign="center"; ctx.fillText(`${pname(p.id)} ${Math.max(0,Math.round(p.hp))}%`,sx+p.w/2,sy-16);
    }

    function drawArcadeHud(){
      const players=(s.players||[]).slice().sort((a,b)=>a.id-b.id);
      const isMultiplayer=players.length>1;
      const mainPlayer=players.find(p=>p.alive) || players[0];
      const totalKills=players.reduce((sum,p)=>sum+(p.kills||0),0);
      const objective=s.levelClear?"PORTAL":(s.enemies||[]).some(e=>e.boss)?"BOSS":`${(s.enemies||[]).length}`;
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,.58)"; ctx.fillRect(0,0,W,92);
      ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,92); ctx.lineTo(W,92); ctx.stroke();
      if(isMultiplayer){
        drawPlayersStrip(players,18,14);
      } else if(mainPlayer){
        drawHeroPortrait(18,12,mainPlayer);
        ctx.fillStyle="#fff"; ctx.font="900 22px system-ui"; ctx.textAlign="left"; ctx.fillText("1UP",96,31);
        ctx.fillStyle="#ffe66d"; ctx.font="900 22px system-ui"; ctx.fillText(livesHudText(mainPlayer),96,68);
        drawHpBar(165,42,230,26,Math.max(0,mainPlayer.hp/mainPlayer.maxHp),color(mainPlayer.id));
      }
      const panelStart=isMultiplayer?880:430;
      const hudWeaponPlayer = mainPlayer || players[0];
      drawHudPanel(panelStart,14,120,64,"ARMS",weaponLabel(hudWeaponPlayer),"#66d9ff");
      const bombValue = hudWeaponPlayer ? `💣 x${hudWeaponPlayer.bombs ?? 5}` : "💣 x0";
      drawHudPanel(panelStart+132,14,120,64,"BOMB",bombValue,"#ff5a7a");
      const timeLeft=Math.max(0,600-Math.floor((s.time||0)/60));
      drawHudPanel(panelStart+264,14,110,64,"TIME",String(timeLeft),"#ffe66d");
      drawHudPanel(panelStart+386,14,140,64,"ENEMIES",objective,s.levelClear?"#66d9ff":"#ffe66d");
      drawHudPanel(panelStart+538,14,184,64,"SCORE",String(s.score||0).padStart(6,"0"),"#ffe66d");
      ctx.fillStyle="rgba(0,0,0,.55)"; ctx.fillRect(18,100,760,34);
      ctx.strokeStyle="rgba(255,255,255,.14)"; ctx.strokeRect(18,100,760,34);
      ctx.fillStyle="#fff"; ctx.font="900 15px system-ui"; ctx.textAlign="left";
      ctx.fillText(`FASE ${(s.levelIndex||0)+1}/10  ·  ${s.levelName||""}  ·  KILLS ${totalKills}`,32,123);
      ctx.restore();
    }

    drawBackground();
    for(const p of s.platforms||[]) drawPlatform(p);
    for(const d of s.decor||[]) drawDecor(d);
    (s.hazards||[]).forEach((h,i)=>drawHazard(h,i));

    if(s.exitPortal){
      const portal=s.exitPortal,sx=worldX(portal.x),active=portal.active;
      ctx.globalAlpha=active?1:.35;
      ctx.fillStyle=active?"rgba(102,217,255,.25)":"rgba(255,255,255,.08)";
      ctx.fillRect(sx,portal.y,portal.w,portal.h);
      ctx.strokeStyle=active?"#66d9ff":"rgba(255,255,255,.25)";
      ctx.lineWidth=4;ctx.strokeRect(sx,portal.y,portal.w,portal.h);
      ctx.fillStyle=active?"#66d9ff":"rgba(255,255,255,.55)";
      ctx.font="900 16px system-ui";ctx.textAlign="center";
      ctx.fillText(active?"PORTAL":"BLOQUEADO",sx+portal.w/2,portal.y-12);
      ctx.globalAlpha=1;
    }

    for(const g of s.grenades||[]){
      ctx.fillStyle="#ffb86b";ctx.beginPath();ctx.arc(worldX(g.x+6),g.y+6,8,0,Math.PI*2);ctx.fill();
    }
    for(const b of s.bullets||[]){
      const bx=worldX(b.x), vx=b.vx || 13.5;
      ctx.fillStyle="rgba(255,255,255,.35)";
      ctx.fillRect(bx-vx*.8,b.y+1,Math.abs(vx*.8)+(b.w||13),(b.h||6)-2);
      ctx.fillStyle=b.color||"#fff";ctx.fillRect(bx,b.y,b.w||13,b.h||6);
    }
    for(const b of s.enemyBullets||[]){
      ctx.fillStyle=b.kind==="acid"?"#57e389":b.kind==="laser"?"#ff5a7a":b.kind==="rocket"?"#ff9f43":"#d386ff";
      ctx.beginPath();ctx.arc(worldX(b.x+(b.w||10)/2),b.y+(b.h||10)/2,(b.w||10)/2,0,Math.PI*2);ctx.fill();
    }
    for(const e of s.enemies||[]) drawEnemy(e);
    for(const p of s.players||[]) drawHero(p);
    for(const part of s.particles||[]){
      ctx.globalAlpha=Math.max(0,(part.life||0)/40);
      ctx.fillStyle=part.color||"#fff";
      ctx.fillRect(worldX(part.x),part.y,4,4);
      ctx.globalAlpha=1;
    }
    for(const item of s.pickups || []) {
      if(!item) continue;
      drawDropIcon(item);
    }
    drawArcadeHud();

    if(!s.started && (s.players||[]).length===0){
      ctx.fillStyle="rgba(0,0,0,.58)";ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 52px system-ui";ctx.fillText("Aguardando controles",W/2,H/2-18);
      ctx.font="600 24px system-ui";ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText("Escaneie o QR ou teste no teclado",W/2,H/2+30);
    }

    if(s.pausedByConnection && s.started && !s.lobby){
      const subtitle = s.pausedReason === "disconnect" ? "Controle desconectado. Reconecte para continuar." : "Menu Conexão aberto no controle.";
      ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);
      ctx.fillStyle="rgba(8,8,12,.92)";ctx.fillRect(W/2-300,H/2-98,600,176);
      ctx.strokeStyle="#ffe66d";ctx.lineWidth=4;ctx.strokeRect(W/2-300,H/2-98,600,176);
      ctx.fillStyle="rgba(255,230,109,.12)";ctx.fillRect(W/2-286,H/2-84,572,28);
      ctx.fillStyle="#ffe66d";ctx.textAlign="center";ctx.font="900 52px system-ui";
      ctx.fillText("PAUSADO",W/2,H/2-18);
      ctx.font="800 23px system-ui";ctx.fillStyle="rgba(255,255,255,.86)";
      ctx.fillText(subtitle,W/2,H/2+34);
    }

    if(s.lobby){
      ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 42px system-ui";ctx.fillText("LOBBY",W/2,210);
      ctx.font="700 20px system-ui";ctx.fillStyle="rgba(255,255,255,.86)";
      ctx.fillText(`Controles conectados: ${(s.players||[]).length}/4`,W/2,260);
      ctx.fillText("Escolha a dificuldade no celular e toque em COMEÇAR.",W/2,305);
    }
  }

  window.BlasterSharedRenderer = { draw };
})();
