const GBA_W = 240;
const GBA_H = 160;
const SCALE = 3;

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
canvas.width = GBA_W * SCALE;
canvas.height = GBA_H * SCALE;

// Pixel-perfect rendering
ctx.imageSmoothingEnabled = false;

// Offscreen buffer at GBA resolution
const buffer = document.createElement('canvas');
buffer.width = GBA_W;
buffer.height = GBA_H;
const bctx = buffer.getContext('2d');
bctx.imageSmoothingEnabled = false;

// State
let currentState = 'idle';
let currentDetail = 'Starting up...';
let frame = 0;
let successTimer = 0;

// Sprite cache
const sprites = {};
const SPRITE_NAMES = ['background', 'idle', 'typing', 'thinking', 'error', 'success', 'reading'];

function loadSprite(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      sprites[name] = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Sprite not found: ${name}, using fallback`);
      resolve(null);
    };
    img.src = `/sprites/${name}.png`;
  });
}

// Load all sprites
async function loadAllSprites() {
  await Promise.all(SPRITE_NAMES.map(loadSprite));
}

// Pixel font renderer (built-in bitmap-style text)
function drawPixelText(ctx, text, x, y, color = '#fff', size = 1) {
  ctx.fillStyle = color;
  ctx.font = `${8 * size}px monospace`;
  ctx.fillText(text, x, y);
}

// Draw the GBA-style office background
function drawBackground() {
  if (sprites.background) {
    bctx.drawImage(sprites.background, 0, 0, GBA_W, GBA_H);
  } else {
    drawFallbackBackground();
  }
}

function drawFallbackBackground() {
  // Floor
  bctx.fillStyle = '#8B6914';
  bctx.fillRect(0, 100, GBA_W, 60);

  // Floor boards
  bctx.strokeStyle = '#7A5C10';
  bctx.lineWidth = 1;
  for (let y = 100; y < 160; y += 10) {
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(GBA_W, y);
    bctx.stroke();
  }
  for (let x = 0; x < GBA_W; x += 30) {
    bctx.beginPath();
    bctx.moveTo(x, 100);
    bctx.lineTo(x, 160);
    bctx.stroke();
  }

  // Wall
  bctx.fillStyle = '#E8D8A0';
  bctx.fillRect(0, 0, GBA_W, 100);

  // Wall pattern
  bctx.fillStyle = '#DEC888';
  for (let y = 0; y < 100; y += 16) {
    for (let x = (y % 32 === 0 ? 0 : 8); x < GBA_W; x += 16) {
      bctx.fillRect(x, y, 15, 15);
    }
  }

  // Window
  bctx.fillStyle = '#87CEEB';
  bctx.fillRect(160, 10, 50, 40);
  bctx.fillStyle = '#ADD8E6';
  bctx.fillRect(162, 12, 22, 17);
  bctx.fillRect(186, 12, 22, 17);
  bctx.fillRect(162, 31, 22, 17);
  bctx.fillRect(186, 31, 22, 17);
  // Window frame
  bctx.strokeStyle = '#654321';
  bctx.lineWidth = 2;
  bctx.strokeRect(160, 10, 50, 40);
  bctx.beginPath();
  bctx.moveTo(185, 10);
  bctx.lineTo(185, 50);
  bctx.stroke();
  bctx.beginPath();
  bctx.moveTo(160, 30);
  bctx.lineTo(210, 30);
  bctx.stroke();

  // Curtains
  bctx.fillStyle = '#8B4513';
  bctx.fillRect(155, 8, 6, 44);
  bctx.fillRect(209, 8, 6, 44);

  // Bookshelf (left)
  bctx.fillStyle = '#654321';
  bctx.fillRect(10, 15, 50, 65);
  bctx.fillStyle = '#8B6914';
  bctx.fillRect(12, 17, 46, 1);
  bctx.fillRect(12, 37, 46, 1);
  bctx.fillRect(12, 57, 46, 1);
  // Books
  const bookColors = ['#C0392B', '#2980B9', '#27AE60', '#F39C12', '#8E44AD', '#E74C3C', '#3498DB', '#2ECC71'];
  for (let row = 0; row < 3; row++) {
    let bx = 13;
    for (let b = 0; b < 6; b++) {
      const bw = 4 + Math.floor(Math.random() * 4);
      bctx.fillStyle = bookColors[(row * 6 + b) % bookColors.length];
      bctx.fillRect(bx, 18 + row * 20, bw, 18);
      bx += bw + 1;
    }
  }

  // Desk
  bctx.fillStyle = '#8B6914';
  bctx.fillRect(70, 80, 80, 8);
  // Desk legs
  bctx.fillStyle = '#654321';
  bctx.fillRect(72, 88, 4, 25);
  bctx.fillRect(144, 88, 4, 25);
  // Desk top surface
  bctx.fillStyle = '#A07828';
  bctx.fillRect(70, 78, 80, 4);

  // Monitor
  bctx.fillStyle = '#2C3E50';
  bctx.fillRect(95, 55, 30, 22);
  bctx.fillStyle = '#4488CC';
  bctx.fillRect(97, 57, 26, 18);
  // Monitor stand
  bctx.fillStyle = '#2C3E50';
  bctx.fillRect(107, 77, 6, 3);
  bctx.fillRect(103, 78, 14, 2);
  // Screen glow
  bctx.fillStyle = '#66AADD';
  bctx.fillRect(99, 59, 22, 14);

  // Keyboard
  bctx.fillStyle = '#34495E';
  bctx.fillRect(93, 82, 24, 5);
  bctx.fillStyle = '#4A6580';
  for (let kx = 94; kx < 116; kx += 3) {
    bctx.fillRect(kx, 83, 2, 3);
  }

  // Coffee mug
  bctx.fillStyle = '#E74C3C';
  bctx.fillRect(125, 74, 8, 8);
  bctx.fillStyle = '#C0392B';
  bctx.fillRect(132, 76, 3, 4);
  // Steam
  bctx.fillStyle = 'rgba(255,255,255,0.5)';
  if (frame % 40 < 20) {
    bctx.fillRect(127, 71, 2, 3);
    bctx.fillRect(130, 70, 2, 3);
  } else {
    bctx.fillRect(128, 70, 2, 3);
    bctx.fillRect(131, 71, 2, 3);
  }

  // Plant (right side)
  bctx.fillStyle = '#8B4513';
  bctx.fillRect(220, 85, 12, 15);
  bctx.fillStyle = '#27AE60';
  bctx.fillRect(218, 70, 6, 16);
  bctx.fillRect(224, 65, 6, 21);
  bctx.fillRect(230, 72, 5, 14);
  bctx.fillStyle = '#2ECC71';
  bctx.fillRect(220, 68, 4, 8);
  bctx.fillRect(226, 62, 4, 10);

  // Small plant on desk
  bctx.fillStyle = '#8B4513';
  bctx.fillRect(75, 74, 6, 6);
  bctx.fillStyle = '#27AE60';
  bctx.fillRect(74, 68, 3, 7);
  bctx.fillRect(77, 66, 3, 9);
  bctx.fillRect(80, 69, 3, 6);

  // Rug
  bctx.fillStyle = '#943126';
  bctx.fillRect(60, 120, 120, 30);
  bctx.fillStyle = '#B03A2E';
  bctx.fillRect(63, 123, 114, 24);
  bctx.fillStyle = '#D4AC0D';
  bctx.fillRect(65, 125, 110, 1);
  bctx.fillRect(65, 144, 110, 1);
  bctx.fillRect(65, 125, 1, 20);
  bctx.fillRect(174, 125, 1, 20);

  // Wall clock
  bctx.fillStyle = '#FFF';
  bctx.beginPath();
  bctx.arc(135, 25, 8, 0, Math.PI * 2);
  bctx.fill();
  bctx.strokeStyle = '#333';
  bctx.lineWidth = 1;
  bctx.stroke();
  bctx.beginPath();
  bctx.moveTo(135, 25);
  bctx.lineTo(135, 19);
  bctx.stroke();
  bctx.beginPath();
  bctx.moveTo(135, 25);
  const angle = (frame / 60) * Math.PI * 2;
  bctx.lineTo(135 + Math.cos(angle - Math.PI / 2) * 5, 25 + Math.sin(angle - Math.PI / 2) * 5);
  bctx.stroke();
}

// Draw character sprite for current state
function drawCharacter(state) {
  const charX = 90;
  let charY = 85;

  // Breathing animation (subtle bob)
  if (state === 'idle') {
    charY += Math.sin(frame / 30) * 1;
  }

  const sprite = sprites[state];
  if (sprite) {
    // Center the 48x48 sprite over the desk area
    bctx.drawImage(sprite, charX - 8, charY - 40, 48, 48);
  } else {
    drawFallbackCharacter(state, charX, charY);
  }
}

function drawFallbackCharacter(state, x, y) {
  // Body
  bctx.fillStyle = '#5B8DEF';
  bctx.fillRect(x + 2, y - 20, 16, 14);

  // Head
  bctx.fillStyle = '#7BA4F7';
  bctx.fillRect(x + 3, y - 32, 14, 13);

  // Eyes
  bctx.fillStyle = '#FFF';
  bctx.fillRect(x + 5, y - 28, 4, 4);
  bctx.fillRect(x + 11, y - 28, 4, 4);
  bctx.fillStyle = '#333';
  bctx.fillRect(x + 6, y - 27, 2, 2);
  bctx.fillRect(x + 12, y - 27, 2, 2);

  // Antenna
  bctx.fillStyle = '#FFD700';
  bctx.fillRect(x + 9, y - 36, 2, 5);
  bctx.fillRect(x + 8, y - 37, 4, 2);

  switch (state) {
    case 'typing': {
      // Arms moving
      const armOff = frame % 20 < 10 ? 0 : 2;
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x - 2, y - 14 + armOff, 4, 8);
      bctx.fillRect(x + 18, y - 14 - armOff, 4, 8);
      break;
    }
    case 'thinking': {
      // Hand on chin
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x + 14, y - 24, 6, 4);
      // Thought bubble
      bctx.fillStyle = '#FFF';
      bctx.fillRect(x + 22, y - 42, 12, 10);
      bctx.fillRect(x + 20, y - 40, 16, 6);
      bctx.fillStyle = '#999';
      bctx.fillRect(x + 24, y - 40, 2, 2);
      bctx.fillRect(x + 28, y - 39, 3, 3);
      bctx.fillRect(x + 25, y - 37, 4, 2);
      // Dots leading to bubble
      bctx.fillStyle = '#FFF';
      bctx.fillRect(x + 19, y - 34, 2, 2);
      bctx.fillRect(x + 21, y - 37, 2, 2);
      break;
    }
    case 'error': {
      // Frustrated pose - head down
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x + 1, y - 30, 6, 6);
      bctx.fillRect(x + 13, y - 30, 6, 6);
      // X eyes
      bctx.fillStyle = '#E74C3C';
      bctx.fillRect(x + 6, y - 28, 2, 1);
      bctx.fillRect(x + 7, y - 27, 1, 1);
      bctx.fillRect(x + 5, y - 27, 1, 1);
      bctx.fillRect(x + 12, y - 28, 2, 1);
      bctx.fillRect(x + 13, y - 27, 1, 1);
      bctx.fillRect(x + 11, y - 27, 1, 1);
      // Exclamation
      bctx.fillStyle = '#E74C3C';
      bctx.fillRect(x + 22, y - 38, 3, 8);
      bctx.fillRect(x + 22, y - 28, 3, 3);
      break;
    }
    case 'success': {
      // Arms raised
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x - 2, y - 28, 4, 12);
      bctx.fillRect(x + 18, y - 28, 4, 12);
      // Star sparkles
      bctx.fillStyle = '#FFD700';
      if (frame % 20 < 10) {
        bctx.fillRect(x - 4, y - 34, 2, 2);
        bctx.fillRect(x + 22, y - 32, 2, 2);
        bctx.fillRect(x + 8, y - 40, 2, 2);
      } else {
        bctx.fillRect(x - 2, y - 36, 2, 2);
        bctx.fillRect(x + 20, y - 34, 2, 2);
        bctx.fillRect(x + 10, y - 42, 2, 2);
      }
      // Happy mouth
      bctx.fillStyle = '#333';
      bctx.fillRect(x + 7, y - 23, 6, 2);
      bctx.fillRect(x + 6, y - 24, 1, 1);
      bctx.fillRect(x + 13, y - 24, 1, 1);
      break;
    }
    case 'reading': {
      // Holding paper
      bctx.fillStyle = '#FFF';
      bctx.fillRect(x - 4, y - 18, 12, 14);
      bctx.fillStyle = '#999';
      for (let ly = y - 16; ly < y - 6; ly += 3) {
        bctx.fillRect(x - 2, ly, 8, 1);
      }
      // Arms holding
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x - 2, y - 16, 3, 8);
      bctx.fillRect(x + 8, y - 16, 3, 8);
      break;
    }
    default: {
      // Idle - arms at sides
      bctx.fillStyle = '#5B8DEF';
      bctx.fillRect(x - 1, y - 16, 4, 8);
      bctx.fillRect(x + 17, y - 16, 4, 8);
    }
  }
}

// Draw status bar at bottom
function drawStatusBar(state, detail) {
  // Dark bar
  bctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  bctx.fillRect(0, GBA_H - 16, GBA_W, 16);

  // State indicator dot
  const stateColors = {
    idle: '#888',
    typing: '#4CAF50',
    thinking: '#FF9800',
    reading: '#2196F3',
    error: '#F44336',
    success: '#FFD700'
  };
  bctx.fillStyle = stateColors[state] || '#888';
  bctx.fillRect(4, GBA_H - 12, 6, 6);

  // Text
  bctx.fillStyle = '#FFF';
  bctx.font = '8px monospace';
  bctx.fillText(detail || state, 14, GBA_H - 5);

  // GBA-style border at top of status bar
  bctx.fillStyle = '#FFD700';
  bctx.fillRect(0, GBA_H - 17, GBA_W, 1);
}

// Main render loop
function render() {
  frame++;

  // Clear buffer
  bctx.clearRect(0, 0, GBA_W, GBA_H);

  // Draw scene
  drawBackground();
  drawCharacter(currentState);
  drawStatusBar(currentState, currentDetail);

  // Scale to display
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(buffer, 0, 0, GBA_W, GBA_H, 0, 0, GBA_W * SCALE, GBA_H * SCALE);

  requestAnimationFrame(render);
}

// Poll state from server
async function pollState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    currentState = data.state || 'idle';
    currentDetail = data.detail || 'Idle';

    // Handle success -> idle transition
    if (currentState === 'success') {
      successTimer++;
      if (successTimer > 4) {
        currentState = 'idle';
        currentDetail = 'Idle';
        successTimer = 0;
      }
    } else {
      successTimer = 0;
    }
  } catch {
    // Server not reachable - show as idle
    currentState = 'idle';
    currentDetail = 'Waiting for Claude Code...';
  }
}

// Demo mode - cycle through states for testing
let demoMode = false;
const demoStates = ['idle', 'thinking', 'reading', 'typing', 'success', 'error'];
let demoIndex = 0;

document.getElementById('demo-btn')?.addEventListener('click', () => {
  demoMode = !demoMode;
  const btn = document.getElementById('demo-btn');
  btn.textContent = demoMode ? 'Stop Demo' : 'Demo Mode';
});

function demoTick() {
  if (demoMode) {
    currentState = demoStates[demoIndex];
    currentDetail = `Demo: ${currentState.charAt(0).toUpperCase() + currentState.slice(1)}`;
    demoIndex = (demoIndex + 1) % demoStates.length;
  }
}

// Start
async function init() {
  await loadAllSprites();
  render();
  setInterval(pollState, 500);
  setInterval(demoTick, 2000);
}

init();
