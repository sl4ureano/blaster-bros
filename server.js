const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const QRCode = require("qrcode");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/tv", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/play", (req, res) => res.sendFile(path.join(__dirname, "public", "viewer.html")));
app.get("/spectator", (req, res) => res.sendFile(path.join(__dirname, "public", "viewer.html")));

app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(session, payload) {
  send(session.tv, payload);
  for (const item of session.controllers.values()) send(item.ws, payload);
  for (const viewer of session.viewers || []) send(viewer, payload);
}

app.get("/new-session", async (req, res) => {
  let code = makeCode();
  while (sessions.has(code)) code = makeCode();

  sessions.set(code, {
    code,
    tv: null,
    controllers: new Map(),
    viewers: new Set(),
    lastFrame: null,
    clientSlots: new Map(),
    nextPlayerId: 1
  });

  const publicUrl = process.env.PUBLIC_URL;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const origin = publicUrl || `${protocol}://${host}`;
  const controllerUrl = `${origin}/controller.html?code=${code}`;
  const playUrl = `${origin}/play?code=${code}`;
  const spectatorUrl = `${origin}/spectator?code=${code}`;
  const qr = await QRCode.toDataURL(controllerUrl, { width: 280, margin: 1 });

  console.log("");
  console.log("=======================================");
  console.log(`🎯 NOVA SALA: ${code}`);
  console.log(`📺 TV         ${origin}/tv`);
  console.log(`🎮 CONTROLE   ${controllerUrl}`);
  console.log(`👥 PLAY       ${playUrl}`);
  console.log(`👀 SPECTATOR  ${spectatorUrl}`);
  console.log("=======================================");
  console.log("");

  res.json({ code, controllerUrl, playUrl, spectatorUrl, qr });
});

wss.on("connection", (ws) => {
  ws.role = null;
  ws.code = null;
  ws.playerId = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "join-tv") {
      const session = sessions.get(String(msg.code || "").toUpperCase());
      if (!session) return send(ws, { type: "error", message: "Sala não encontrada" });

      ws.role = "tv";
      ws.code = session.code;
      session.tv = ws;
      send(ws, { type: "tv-ready", code: session.code });
      return;
    }

    if (msg.type === "join-controller") {
      const session = sessions.get(String(msg.code || "").toUpperCase());
      if (!session) return send(ws, { type: "error", message: "Sala não encontrada" });

      const rawClientId = String(msg.clientId || "").trim();
      const clientId = rawClientId || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let playerId = session.clientSlots.get(clientId);
      const preferredPlayerId = Number(msg.preferredPlayerId || msg.playerId || 0);
      const usedByOtherClient = (slot) => {
        for (const [otherClientId, otherSlot] of session.clientSlots.entries()) {
          if (otherClientId !== clientId && otherSlot === slot) return true;
        }
        return false;
      };

      if (!playerId) {
        if (preferredPlayerId >= 1 && preferredPlayerId <= 4 && !usedByOtherClient(preferredPlayerId)) {
          playerId = preferredPlayerId;
        } else {
          const used = new Set(session.clientSlots.values());
          for (let i = 1; i <= 4; i++) {
            if (!used.has(i)) {
              playerId = i;
              break;
            }
          }
        }

        if (!playerId) {
          return send(ws, { type: "error", message: "Sala cheia. Máximo de 4 jogadores." });
        }

        session.clientSlots.set(clientId, playerId);
      }

      // Se o mesmo aparelho reconectar/atualizar, substitui o websocket antigo
      // em vez de criar boneco novo.
      const previous = session.controllers.get(playerId);
      if (previous?.ws && previous.ws !== ws) {
        try { previous.ws.close(4000, "Reconectado em outra aba"); } catch {}
      }

      ws.role = "controller";
      ws.code = session.code;
      ws.playerId = playerId;
      ws.clientId = clientId;

      session.controllers.set(playerId, { ws, playerId, clientId });

      send(ws, {
        type: "controller-ready",
        code: session.code,
        playerId,
        clientId,
        players: [...session.clientSlots.entries()]
          .map(([clientId, playerId]) => ({ clientId, playerId }))
          .sort((a,b)=>a.playerId-b.playerId)
      });
      broadcast(session, {
        type: "players",
        players: [...session.clientSlots.entries()]
          .map(([clientId, playerId]) => ({ clientId, playerId }))
          .sort((a,b)=>a.playerId-b.playerId)
      });
      return;
    }

    if (msg.type === "color-select" && ws.role === "controller") {
      const session = sessions.get(ws.code);
      if (!session) return;

      const requested = Number(msg.playerId || 0);
      if (requested < 1 || requested > 4) return;

      for (const [otherClientId, slot] of session.clientSlots.entries()) {
        if (otherClientId !== ws.clientId && slot === requested) {
          return send(ws, { type: "color-denied", playerId: requested, message: "Cor já está em uso." });
        }
      }

      const oldPlayerId = ws.playerId;
      const previous = session.controllers.get(requested);
      if (previous?.ws && previous.ws !== ws) {
        return send(ws, { type: "color-denied", playerId: requested, message: "Cor já está em uso." });
      }

      if (oldPlayerId && oldPlayerId !== requested) session.controllers.delete(oldPlayerId);
      session.clientSlots.set(ws.clientId, requested);
      ws.playerId = requested;
      session.controllers.set(requested, { ws, playerId: requested, clientId: ws.clientId });

      send(ws, {
        type: "controller-ready",
        code: session.code,
        playerId: requested,
        clientId: ws.clientId,
        players: [...session.clientSlots.entries()]
          .map(([clientId, playerId]) => ({ clientId, playerId }))
          .sort((a,b)=>a.playerId-b.playerId)
      });

      broadcast(session, {
        type: "players",
        players: [...session.clientSlots.entries()]
          .map(([clientId, playerId]) => ({ clientId, playerId }))
          .sort((a,b)=>a.playerId-b.playerId)
      });
      return;
    }

    if (msg.type === "join-viewer" || msg.type === "join-play" || msg.type === "join-spectator") {
      const session = sessions.get(String(msg.code || "").toUpperCase());
      if (!session) return send(ws, { type: "error", message: "Sala não encontrada" });

      ws.role = "viewer";
      ws.code = session.code;
      session.viewers.add(ws);

      send(ws, {
        type: "viewer-ready",
        code: session.code,
        players: [...session.clientSlots.entries()].map(([clientId, playerId]) => ({ clientId, playerId })),
        lastFrame: session.lastFrame
      });
      return;
    }

    if (ws.role === "tv" && (msg.type === "state" || msg.type === "frame")) {
      const session = sessions.get(ws.code);
      if (!session) return;

      // Agora o remoto recebe estado JSON, não imagem.
      session.lastFrame = msg;

      for (const viewer of session.viewers || []) {
        if (viewer.readyState !== WebSocket.OPEN) continue;

        // Se atrasar, pula estado velho. O próximo estado recente chega logo.
        if (viewer.bufferedAmount > 64 * 1024) continue;

        send(viewer, msg);
      }
      return;
    }

    if (ws.role === "tv" && msg.type === "tv-event") {
      const session = sessions.get(ws.code);
      if (!session) return;
      broadcast(session, msg);
      return;
    }

    if (ws.role === "controller") {
      const session = sessions.get(ws.code);
      if (!session) return;
      if (session.tv?.readyState === WebSocket.OPEN && session.tv.bufferedAmount < 32 * 1024) {
        send(session.tv, { type: "input", playerId: ws.playerId, input: msg });
      }
    }
  });

  ws.on("close", () => {
    if (!ws.code) return;
    const session = sessions.get(ws.code);
    if (!session) return;

    if (ws.role === "tv" && session.tv === ws) session.tv = null;

    if (ws.role === "controller" && ws.playerId) {
      const current = session.controllers.get(ws.playerId);
      if (current?.ws === ws) session.controllers.delete(ws.playerId);

      // Mantém o slot reservado para o mesmo aparelho reconectar sem virar outro boneco.
      broadcast(session, {
        type: "players",
        players: [...session.clientSlots.entries()]
          .map(([clientId, playerId]) => ({ clientId, playerId }))
          .sort((a,b)=>a.playerId-b.playerId)
      });
    }

    if (ws.role === "viewer") {
      session.viewers.delete(ws);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIp();
  const publicUrl = process.env.PUBLIC_URL || `http://${ip}:${PORT}`;

  console.log("");
  console.log("=======================================");
  console.log("🚀 BLASTER BROS INICIADO");
  console.log("=======================================");
  console.log(`📺 TV         ${publicUrl}/tv`);
  console.log(`🎮 CONTROLE   ${publicUrl}/controller.html?code=XXXX`);
  console.log(`👥 PLAY       ${publicUrl}/play?code=XXXX`);
  console.log(`👀 SPECTATOR  ${publicUrl}/spectator?code=XXXX`);
  console.log("=======================================");
  console.log("");
});
