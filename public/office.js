// Claude Code Office — GBA-style pixel art office with live session state
"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ── GBA palette ───────────────────────────────────────────────────────────────
const PALETTE = {
  bg:      "#0d1a0d",
  dark:    "#0f0f23",
  shadow:  "#1a1a0a",
  floor:   "#1a2a1a",
  wall:    "#0f1a2f",
  desk:    "#3a2a1a",
  monitor: "#0a0f1a",
  glow:    "#5bc8af",
  amber:   "#f8c84c",
  text:    "#c8d8c8",
  red:     "#e84c6c",
  green:   "#48e870",
  white:   "#e8f0e8",
  purple:  "#a050d8",
};

// ── State machine ─────────────────────────────────────────────────────────────
const STATE = { IDLE: "idle", THINKING: "thinking", CODING: "coding" };
let currentState = STATE.IDLE;
let frame = 0;
let lastStateChange = 0;

// ── Sprite images ─────────────────────────────────────────────────────────────
const sprites = {};
const SPRITE_NAMES = ["office-bg", "char-idle", "char-thinking", "char-coding", "terminal"];

let spritesLoaded = 0;
SPRITE_NAMES.forEach((name) => {
  const img = new Image();
  img.src = `sprites/${name}.png`;
  img.onload = () => {
    sprites[name] = img;
    spritesLoaded++;
  };
  img.onerror = () => {
    spritesLoaded++;
    console.warn(`Sprite not found: ${name}.png — using fallback`);
  };
});

// ── Main draw loop ─────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, 240, 160);
  drawBackground();
  drawOffice();
  drawCharacter();
  drawCodeOnScreen();
  drawParticles();
  frame++;
  requestAnimationFrame(draw);
}

function drawBackground() {
  if (sprites["office-bg"]) {
    ctx.drawImage(sprites["office-bg"], 0, 0, 240, 160);
  } else {
    drawFallbackBg();
  }
}

function drawFallbackBg() {
  // Floor
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 80, 240, 80);
  // Wall
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, 240, 80);
  // Wall pattern (subtle grid)
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 240; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 80); ctx.stroke(); }
  for (let y = 0; y < 80; y += 16)  { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(240, y); ctx.stroke(); }
  // Floor tiles
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  for (let x = 0; x < 240; x += 24) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 160); ctx.stroke(); }
  for (let y = 80; y < 160; y += 24)  { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(240, y); ctx.stroke(); }

  // Desk
  ctx.fillStyle = PALETTE.desk;
  ctx.fillRect(60, 70, 120, 20);
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(60, 88, 120, 4);
  // Monitor
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(100, 40, 40, 32);
  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(103, 43, 34, 24);
  // Monitor stand
  ctx.fillStyle = "#0f0f1f";
  ctx.fillRect(116, 72, 8, 4);
  ctx.fillRect(110, 74, 20, 2);

  // Window (left wall)
  ctx.fillStyle = "#0a1520";
  ctx.fillRect(10, 10, 40, 32);
  ctx.strokeStyle = "#1a2a3a";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 40, 32);
  // Stars
  ctx.fillStyle = PALETTE.white;
  [[15,15],[22,20],[35,13],[44,18],[28,25]].forEach(([sx,sy]) => {
    ctx.fillRect(sx, sy, 1, 1);
  });

  // Bookshelf (right wall)
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(195, 15, 36, 60);
  const bookColors = ["#e84c6c","#5bc8af","#f8c84c","#a050d8","#48e870","#f87a4c","#4c8af8"];
  for (let b = 0; b < 4; b++) {
    const bx = 197 + b * 8;
    ctx.fillStyle = bookColors[b % bookColors.length];
    ctx.fillRect(bx, 20, 6, 24);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(bx + 5, 20, 1, 24);
  }
  for (let b = 0; b < 4; b++) {
    const bx = 197 + b * 8;
    ctx.fillStyle = bookColors[(b + 3) % bookColors.length];
    ctx.fillRect(bx, 48, 6, 20);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(bx + 5, 48, 1, 20);
  }
  // Shelf lines
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(195, 45, 36, 2);
  ctx.fillRect(195, 70, 36, 2);

  // Desk lamp
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(170, 72); ctx.lineTo(170, 55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(170, 55); ctx.lineTo(180, 50); ctx.stroke();
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(176, 49, 8, 3);
  // Lamp glow
  const grd = ctx.createRadialGradient(184, 55, 0, 184, 55, 20);
  grd.addColorStop(0, "rgba(248,200,76,0.15)");
  grd.addColorStop(1, "rgba(248,200,76,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(164, 35, 40, 30);
}

function drawOffice() {
  // Monitor glow based on state
  let glowColor, glowAlpha;
  if (currentState === STATE.CODING)   { glowColor = "0,200,100";  glowAlpha = 0.2 + 0.1 * Math.sin(frame * 0.2); }
  else if (currentState === STATE.THINKING) { glowColor = "248,200,76"; glowAlpha = 0.15 + 0.05 * Math.sin(frame * 0.1); }
  else { glowColor = "91,200,175"; glowAlpha = 0.1; }

  // Monitor glow
  const grd = ctx.createRadialGradient(120, 55, 0, 120, 55, 40);
  grd.addColorStop(0, `rgba(${glowColor},${glowAlpha})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(80, 15, 80, 80);
}

function drawCodeOnScreen() {
  if (sprites["terminal"]) {
    ctx.drawImage(sprites["terminal"], 103, 43, 34, 24);
    return;
  }

  // Fallback: draw scrolling code lines on the monitor
  ctx.fillStyle = PALETTE.monitor;
  ctx.fillRect(103, 43, 34, 24);

  const codeLines = [
    "fn solve()",
    "  let x =",
    "  match x {",
    "    Ok(v) =>",
    "  }",
    "process()",
    "await res",
  ];

  ctx.font = "3px monospace";

  const scrollOffset = currentState === STATE.CODING
    ? Math.floor(frame / 4) % codeLines.length
    : 0;

  for (let i = 0; i < 6; i++) {
    const lineIdx = (scrollOffset + i) % codeLines.length;
    const opacity = currentState === STATE.CODING
      ? (i === 0 ? 0.4 : 1.0)
      : 0.7;

    // Color by content
    const line = codeLines[lineIdx];
    if (line.startsWith("  //")) ctx.fillStyle = `rgba(100,150,100,${opacity})`;
    else if (line.includes("fn") || line.includes("let") || line.includes("match")) ctx.fillStyle = `rgba(91,200,175,${opacity})`;
    else if (line.includes("Ok") || line.includes("await")) ctx.fillStyle = `rgba(168,100,230,${opacity})`;
    else ctx.fillStyle = `rgba(200,220,200,${opacity})`;

    ctx.fillText(line.substring(0, 11), 105, 47 + i * 4);
  }

  // Blinking cursor when coding
  if (currentState === STATE.CODING && Math.floor(frame / 10) % 2 === 0) {
    ctx.fillStyle = PALETTE.glow;
    ctx.fillRect(105, 66, 3, 3);
  }
}

function drawCharacter() {
  const charX = 88;
  const charY = 68;

  // Bobbing animation for idle
  const bobY = currentState === STATE.IDLE ? Math.sin(frame * 0.05) : 0;

  if (sprites[`char-${currentState}`]) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprites[`char-${currentState}`], charX, charY + bobY, 18, 18);
    ctx.restore();
  } else {
    drawFallbackCharacter(charX, charY + bobY);
  }

  // Thought bubble for thinking state
  if (currentState === STATE.THINKING) {
    const pulseAlpha = 0.5 + 0.5 * Math.sin(frame * 0.08);
    ctx.fillStyle = `rgba(248,200,76,${pulseAlpha})`;
    ctx.font = "6px monospace";
    ctx.fillText("...", charX + 16, charY - 4);
    // Tiny bubble dots
    for (let d = 0; d < 3; d++) {
      ctx.beginPath();
      ctx.arc(charX + 18 + d * 3, charY + 2 - d * 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFallbackCharacter(x, y) {
  const s = currentState;

  // Body
  ctx.fillStyle = s === STATE.CODING ? "#204820" : s === STATE.THINKING ? "#282040" : "#202030";
  ctx.fillRect(x + 4, y + 6, 10, 10); // torso

  // Head
  ctx.fillStyle = "#d4a882";
  ctx.fillRect(x + 5, y, 8, 7);

  // Eyes
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 6, y + 2, 2, 2);
  ctx.fillRect(x + 10, y + 2, 2, 2);

  // State-specific pose
  if (s === STATE.CODING) {
    // Arms forward (typing)
    ctx.fillStyle = "#d4a882";
    ctx.fillRect(x + 1, y + 7, 4, 3); // left arm
    ctx.fillRect(x + 13, y + 7, 4, 3); // right arm
  } else if (s === STATE.THINKING) {
    // Hand on chin
    ctx.fillStyle = "#d4a882";
    ctx.fillRect(x + 2, y + 8, 4, 3);
    ctx.fillRect(x + 5, y + 10, 4, 2);
  } else {
    // Relaxed
    ctx.fillStyle = "#d4a882";
    ctx.fillRect(x + 2, y + 9, 3, 3);
    ctx.fillRect(x + 13, y + 9, 3, 3);
  }

  // Legs
  ctx.fillStyle = "#1a1a3a";
  ctx.fillRect(x + 4, y + 14, 4, 4);
  ctx.fillRect(x + 10, y + 14, 4, 4);
}

// ── Particles (code snippets flying up when coding) ────────────────────────────
const particles = [];

function updateParticles() {
  if (currentState === STATE.CODING && Math.random() < 0.15) {
    const snippets = ["fn", "=>", "{}", "let", "::","await","impl","use","pub","mod"];
    particles.push({
      x: 103 + Math.random() * 34,
      y: 43,
      text: snippets[Math.floor(Math.random() * snippets.length)],
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 0.5,
      alpha: 1,
      color: Math.random() > 0.5 ? PALETTE.glow : PALETTE.amber,
    });
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  updateParticles();
  ctx.font = "4px monospace";
  for (const p of particles) {
    ctx.fillStyle = p.color.replace(")", `,${p.alpha})`).replace("rgb", "rgba").replace("rgba(", "rgba(");
    ctx.globalAlpha = p.alpha;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

// ── OpenClaw integration ───────────────────────────────────────────────────────
let gatewayUrl = "http://127.0.0.1:18789";
let gatewayToken = "";
let pollTimer = null;
let isConnected = false;

async function connectGateway() {
  gatewayUrl = document.getElementById("gateway-url").value.trim() || gatewayUrl;
  gatewayToken = document.getElementById("gateway-token").value.trim();
  setStatus("Connecting...", false);
  await fetchSessions();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchSessions, 5000);
}

async function fetchSessions() {
  try {
    const headers = { "Content-Type": "application/json" };
    if (gatewayToken) headers["Authorization"] = `Bearer ${gatewayToken}`;

    const res = await fetch(`${gatewayUrl}/api/sessions/list`, {
      headers, signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    isConnected = true;
    processSessions(data.sessions || data || []);
    setStatus(`Connected · ${new Date().toLocaleTimeString()}`, true);
  } catch (e) {
    isConnected = false;
    setStatus(`Offline: ${e.message}`, false);
    setGameState(STATE.IDLE, "Not connected", "–");
  }
}

function processSessions(sessions) {
  const grid = document.getElementById("sessions-grid");

  if (!sessions.length) {
    grid.innerHTML = '<div class="no-sessions">No active sessions</div>';
    document.getElementById("session-count").textContent = "0";
    setGameState(STATE.IDLE, "No sessions", "Waiting...");
    return;
  }

  document.getElementById("session-count").textContent = sessions.length;

  // Determine dominant state from active sessions
  let dominantState = STATE.IDLE;
  let dominantAgent = "CLAUDE";
  let dominantActivity = "Idle";

  for (const s of sessions) {
    const lastMsg = s.lastMessage || s.last_message || {};
    const role = lastMsg.role || lastMsg.sender || "";
    const content = (lastMsg.content || lastMsg.body || "").toLowerCase();

    if (role === "assistant" || content.includes("thinking") || content.includes("analyzing")) {
      dominantState = STATE.THINKING;
    }
    if (role === "tool" || content.includes("writing") || content.includes("building") ||
        content.includes("pushing") || content.includes("running") || content.includes("creating")) {
      dominantState = STATE.CODING;
    }

    dominantAgent = (s.agentId || s.agent_id || "claude").toUpperCase();
    dominantActivity = content.substring(0, 40) || "Active";
  }

  setGameState(dominantState, dominantAgent, dominantActivity);

  // Render session cards
  grid.innerHTML = sessions.map(s => {
    const lastMsg = s.lastMessage || s.last_message || {};
    const content = (lastMsg.content || lastMsg.body || "").substring(0, 60);
    const agent = (s.agentId || s.agent_id || "–").toUpperCase();
    const model = s.model || "–";
    const cardClass = dominantState === STATE.CODING ? "active-coding"
                    : dominantState === STATE.THINKING ? "active-thinking" : "";

    return `<div class="session-card ${cardClass}">
      <div class="session-agent">${agent}</div>
      <div class="session-model">${model}</div>
      <div class="session-task">${content || "No recent activity"}</div>
    </div>`;
  }).join("");
}

function setGameState(state, agent, activity) {
  currentState = state;

  // Update HUD
  document.getElementById("hud-agent").textContent = agent;
  document.getElementById("state-text").textContent = state.toUpperCase();
  document.getElementById("hud-activity").textContent = activity;
  document.getElementById("hud-time").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

  const dot = document.getElementById("state-dot");
  dot.className = `state-dot dot-${state}`;
}

function setStatus(text, connected) {
  const bar = document.getElementById("status-bar");
  bar.className = "status-bar" + (connected ? " connected" : "");
  document.getElementById("status-text").textContent = text;
}

// ── Start ──────────────────────────────────────────────────────────────────────
draw();
setStatus("Enter gateway URL to connect", false);

// Demo mode: cycle states every 4s if not connected
setInterval(() => {
  if (!isConnected) {
    const states = [STATE.IDLE, STATE.THINKING, STATE.CODING];
    const idx = states.indexOf(currentState);
    setGameState(states[(idx + 1) % states.length], "DEMO MODE", "Auto-cycling states");
  }
}, 4000);
