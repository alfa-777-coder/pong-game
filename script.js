const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");

const paddleWidth = 14;
const paddleHeight = 100;
const paddleSpeed = 6.5;
const winScore = 7;

const state = {
  running: false,
  gameOver: false,
  lastTime: 0,
  audioReady: false,
  playerY: canvas.height / 2 - paddleHeight / 2,
  aiY: canvas.height / 2 - paddleHeight / 2,
  ball: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    vx: 5,
    vy: 3,
  },
  score: {
    player: 0,
    ai: 0,
  },
  keys: {
    ArrowUp: false,
    ArrowDown: false,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function initAudio() {
  if (state.audioReady) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  state.audioCtx = new AudioCtx();
  state.audioReady = true;
}

function playSound(type) {
  const audioCtx = state.audioCtx;
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === "paddle") {
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(220, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  } else if (type === "wall") {
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(180, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  } else if (type === "score") {
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  } else if (type === "start") {
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(330, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  }

  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonText;
  overlay.classList.add("visible");
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function updateScore() {
  playerScoreEl.textContent = state.score.player;
  aiScoreEl.textContent = state.score.ai;
}

function resetBall(direction = Math.random() > 0.5 ? 1 : -1) {
  state.ball.x = canvas.width / 2;
  state.ball.y = canvas.height / 2;

  const angle = (Math.random() * 1.4) - 0.7;
  const speed = 6.3;

  state.ball.vx = direction * speed;
  state.ball.vy = angle * speed;
}

function endGame(winner) {
  state.running = false;
  state.gameOver = true;

  const text = winner === "player" ? "You won the match!" : "Computer wins this round.";
  showOverlay("Game Over", text, "Play Again");
}

function checkForWin() {
  if (state.score.player >= winScore || state.score.ai >= winScore) {
    const winner = state.score.player >= winScore ? "player" : "ai";
    endGame(winner);
    return true;
  }
  return false;
}

function startGame() {
  initAudio();
  playSound("start");

  if (!state.gameOver) {
    state.score.player = 0;
    state.score.ai = 0;
    updateScore();
  }

  state.running = true;
  state.gameOver = false;
  resetBall(Math.random() > 0.5 ? 1 : -1);
  hideOverlay();
}

function handleInput() {
  const playerMove = (state.keys.ArrowUp ? -1 : 0) + (state.keys.ArrowDown ? 1 : 0);
  state.playerY += playerMove * paddleSpeed;
  state.playerY = clamp(state.playerY, 0, canvas.height - paddleHeight);
}

function update(dt) {
  if (!state.running) return;

  handleInput();

  const targetAiY = state.ball.y - paddleHeight / 2;
  const aiDiff = targetAiY - state.aiY;
  state.aiY += aiDiff * 0.12;
  state.aiY = clamp(state.aiY, 0, canvas.height - paddleHeight);

  state.ball.x += state.ball.vx * dt * 60;
  state.ball.y += state.ball.vy * dt * 60;

  if (state.ball.y - state.ball.radius <= 0) {
    state.ball.y = state.ball.radius;
    state.ball.vy *= -1;
    playSound("wall");
  }

  if (state.ball.y + state.ball.radius >= canvas.height) {
    state.ball.y = canvas.height - state.ball.radius;
    state.ball.vy *= -1;
    playSound("wall");
  }

  const hitsLeftPaddle =
    state.ball.x - state.ball.radius <= paddleWidth &&
    state.ball.x - state.ball.radius >= 0 &&
    state.ball.y >= state.playerY &&
    state.ball.y <= state.playerY + paddleHeight &&
    state.ball.vx < 0;

  if (hitsLeftPaddle) {
    const relativeIntersectY = (state.ball.y - (state.playerY + paddleHeight / 2)) / (paddleHeight / 2);
    state.ball.x = paddleWidth + state.ball.radius;
    state.ball.vx = Math.abs(state.ball.vx) + 0.35;
    state.ball.vy = relativeIntersectY * 7;
    playSound("paddle");
  }

  const hitsRightPaddle =
    state.ball.x + state.ball.radius >= canvas.width - paddleWidth &&
    state.ball.x + state.ball.radius <= canvas.width &&
    state.ball.y >= state.aiY &&
    state.ball.y <= state.aiY + paddleHeight &&
    state.ball.vx > 0;

  if (hitsRightPaddle) {
    const relativeIntersectY = (state.ball.y - (state.aiY + paddleHeight / 2)) / (paddleHeight / 2);
    state.ball.x = canvas.width - paddleWidth - state.ball.radius;
    state.ball.vx = -(Math.abs(state.ball.vx) + 0.35);
    state.ball.vy = relativeIntersectY * 7;
    playSound("paddle");
  }

  if (state.ball.x < -state.ball.radius) {
    state.score.ai += 1;
    updateScore();
    playSound("score");
    if (!checkForWin()) {
      resetBall(1);
    }
  }

  if (state.ball.x > canvas.width + state.ball.radius) {
    state.score.player += 1;
    updateScore();
    playSound("score");
    if (!checkForWin()) {
      resetBall(-1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setLineDash([12, 14]);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, state.playerY, paddleWidth, paddleHeight);
  ctx.fillRect(canvas.width - paddleWidth, state.aiY, paddleWidth, paddleHeight);

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.04);
  state.lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    state.keys.ArrowUp = true;
    event.preventDefault();
  }

  if (event.key === "ArrowDown") {
    state.keys.ArrowDown = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowUp") state.keys.ArrowUp = false;
  if (event.key === "ArrowDown") state.keys.ArrowDown = false;
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  state.playerY = clamp(mouseY - paddleHeight / 2, 0, canvas.height - paddleHeight);
});

overlayButton.addEventListener("click", () => {
  startGame();
});

updateScore();
resetBall(Math.random() > 0.5 ? 1 : -1);
showOverlay("Pong", "Use your mouse or the arrow keys.", "Start Game");
requestAnimationFrame(gameLoop);
