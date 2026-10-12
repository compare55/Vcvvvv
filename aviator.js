// ========================
// AVIATOR GAME
// ========================
const aviator = {
  state: 'idle',
  multiplier: 1.00,
  crashPoint: 0,
  betPlaced: false,
  betAmount: 0,
  cashedOut: false,
  cashedAt: 0,
  balance: parseInt(localStorage.getItem('demoBalance')) || 1000,
  history: JSON.parse(localStorage.getItem('aviatorHistory')) || [],
  countdown: 5,
  planeX: 0,
  planeY: 0,
  flightPath: [],
  animationId: null
};

const canvas = document.getElementById('aviatorCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ========================
// CRASH POINT (RNG)
// ========================
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.03) return 1.00;
  const crash = 0.99 / (1 - Math.random());
  return Math.min(Math.max(1.01, crash), 200);
}

// ========================
// GAME LOOP
// ========================
function startRound() {
  aviator.state = 'countdown';
  aviator.multiplier = 1.00;
  aviator.crashPoint = generateCrashPoint();
  aviator.betPlaced = false;
  aviator.cashedOut = false;
  aviator.countdown = 5;
  aviator.flightPath = [];
  aviator.planeX = 0;
  aviator.planeY = canvas.height;
  updateMultiplierDisplay(1.00);
  updateStatus('Waiting for bets...');
  updateActionButton();

  const countdownInterval = setInterval(() => {
    aviator.countdown--;
    updateStatus(`Starting in ${aviator.countdown}s`);
    if (aviator.countdown <= 0) {
      clearInterval(countdownInterval);
      startFlight();
    }
  }, 1000);
}

function startFlight() {
  aviator.state = 'flying';
  updateStatus('Flying...');
  updateActionButton();
  const startTime = performance.now();

  function flightLoop(now) {
    if (aviator.state !== 'flying') return;
    const elapsed = (now - startTime) / 1000;
    aviator.multiplier = 1.00 + Math.pow(elapsed, 1.6) * 0.5;
    aviator.multiplier = Math.round(aviator.multiplier * 100) / 100;
    updateMultiplierDisplay(aviator.multiplier);
    updatePlanePosition(elapsed);
    drawCanvas();

    const autoVal = parseFloat(document.getElementById('autoCashout').value);
    if (aviator.betPlaced && !aviator.cashedOut && aviator.multiplier >= autoVal) {
      cashOut();
    }

    if (aviator.multiplier >= aviator.crashPoint) {
      crash();
      return;
    }

    aviator.animationId = requestAnimationFrame(flightLoop);
  }
  aviator.animationId = requestAnimationFrame(flightLoop);
}

function crash() {
  aviator.state = 'crashed';
  aviator.multiplier = aviator.crashPoint;
  updateMultiplierDisplay(aviator.crashPoint);
  updateStatus(`Flew away at ${aviator.crashPoint.toFixed(2)}x!`);

  aviator.history.unshift(aviator.crashPoint.toFixed(2));
  aviator.history = aviator.history.slice(0, 20);
  localStorage.setItem('aviatorHistory', JSON.stringify(aviator.history));
  renderHistory();

  if (aviator.betPlaced && !aviator.cashedOut) {
    addTx('bet', aviator.betAmount, 'Aviator Lost');
    showToast(`💥 Crashed! Lost ${aviator.betAmount} coins`);
  }

  updateAllBalances();
  updateActionButton();
  setTimeout(() => startRound(), 3000);
}

function cashOut() {
  if (!aviator.betPlaced || aviator.cashedOut) return;
  aviator.cashedOut = true;
  aviator.cashedAt = aviator.multiplier;
  const winAmount = Math.floor(aviator.betAmount * aviator.multiplier);
  aviator.balance += winAmount;
  updateAllBalances();
  addTx('win', winAmount, `Aviator @ ${aviator.multiplier.toFixed(2)}x`);
  showToast(`✈️ Cashed out at ${aviator.multiplier.toFixed(2)}x! +${winAmount}`);
  updateActionButton();
}

// ========================
// CANVAS
// ========================
function updatePlanePosition(elapsed) {
  const progress = Math.min(elapsed / 10, 1);
  aviator.planeX = progress * (canvas.width - 80);
  aviator.planeY = canvas.height - (progress * (canvas.height - 80));
  aviator.flightPath.push({ x: aviator.planeX, y: aviator.planeY });
  if (aviator.flightPath.length > 300) aviator.flightPath.shift();
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0a1a3a');
  skyGrad.addColorStop(1, '#050510');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 73) % (canvas.height * 0.6);
    const size = (i % 3) === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grid
  ctx.strokeStyle = 'rgba(52, 152, 219, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Flight path
  if (aviator.flightPath.length > 1) {
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(aviator.flightPath[0].x, aviator.flightPath[0].y);
    for (let i = 1; i < aviator.flightPath.length; i++) {
      ctx.lineTo(aviator.flightPath[i].x, aviator.flightPath[i].y);
    }
    ctx.stroke();

    const pathGrad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
    pathGrad.addColorStop(0, '#e94560');
    pathGrad.addColorStop(1, '#f39c12');
    ctx.strokeStyle = pathGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(aviator.flightPath[0].x, aviator.flightPath[0].y);
    for (let i = 1; i < aviator.flightPath.length; i++) {
      ctx.lineTo(aviator.flightPath[i].x, aviator.flightPath[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
    ctx.beginPath();
    ctx.moveTo(aviator.flightPath[0].x, canvas.height);
    for (let i = 0; i < aviator.flightPath.length; i++) {
      ctx.lineTo(aviator.flightPath[i].x, aviator.flightPath[i].y);
    }
    ctx.lineTo(aviator.flightPath[aviator.flightPath.length - 1].x, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  // Plane
  if (aviator.state === 'flying' || aviator.state === 'crashed') {
    ctx.shadowColor = aviator.state === 'crashed' ? '#e94560' : '#f1c40f';
    ctx.shadowBlur = 20;
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈️', aviator.planeX, aviator.planeY);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = aviator.state === 'crashed' ? '#e94560' : '#f1c40f';
    ctx.fillText(
      aviator.multiplier.toFixed(2) + 'x',
      aviator.planeX,
      aviator.planeY - 30
    );
  }
}

// ========================
// UI UPDATES
// ========================
function updateMultiplierDisplay(val) {
  const el = document.getElementById('multiplierDisplay');
  el.textContent = val.toFixed(2) + 'x';
  if (aviator.state === 'crashed') el.style.color = '#e94560';
  else if (aviator.cashedOut) el.style.color = '#2ecc71';
  else el.style.color = '#f1c40f';
}

function updateStatus(msg) {
  document.getElementById('statusText').textContent = msg;
}

function updateActionButton() {
  const btn = document.getElementById('aviatorActionBtn');

  if (aviator.state === 'idle' || aviator.state === 'countdown') {
    if (aviator.betPlaced) {
      btn.textContent = 'BET PLACED ✓';
      btn.className = 'aviator-action-btn placed';
      btn.disabled = true;
    } else {
      btn.textContent = 'PLACE BET';
      btn.className = 'aviator-action-btn';
      btn.disabled = false;
    }
  } else if (aviator.state === 'flying') {
    if (aviator.cashedOut) {
      btn.textContent = `CASHED OUT @ ${aviator.cashedAt.toFixed(2)}x`;
      btn.className = 'aviator-action-btn cashed';
      btn.disabled = true;
    } else if (aviator.betPlaced) {
      btn.textContent = `CASH OUT (${aviator.multiplier.toFixed(2)}x)`;
      btn.className = 'aviator-action-btn cashout';
      btn.disabled = false;
    } else {
      btn.textContent = 'WAITING...';
      btn.className = 'aviator-action-btn';
      btn.disabled = true;
    }
  } else {
    btn.textContent = 'CRASHED 💥';
    btn.className = 'aviator-action-btn crashed';
    btn.disabled = true;
  }
}

document.getElementById('aviatorActionBtn').addEventListener('click', () => {
  if (aviator.state === 'idle' || aviator.state === 'countdown') {
    placeBet();
  } else if (aviator.state === 'flying' && aviator.betPlaced && !aviator.cashedOut) {
    cashOut();
  }
});

function placeBet() {
  const bet = parseInt(document.getElementById('aviatorBet').value);
  if (bet < 10) { showToast('Minimum bet is 10 coins'); return; }
  if (aviator.balance < bet) { showToast('Insufficient coins!'); return; }
  aviator.betAmount = bet;
  aviator.betPlaced = true;
  aviator.balance -= bet;
  updateAllBalances();
  addTx('bet', bet, 'Aviator Bet');
  updateActionButton();
  showToast(`Bet placed: ${bet} coins`);
}

function adjustBet(amount) {
  const input = document.getElementById('aviatorBet');
  let val = parseInt(input.value) + amount;
  if (val < 10) val = 10;
  input.value = val;
}
function setBet(amount) {
  document.getElementById('aviatorBet').value = amount;
}

// ========================
// HISTORY
// ========================
function renderHistory() {
  const bar = document.getElementById('historyBar');
  if (!bar) return;
  bar.innerHTML = aviator.history.map(h => {
    const val = parseFloat(h);
    const color = val < 2 ? '#e94560' : val < 5 ? '#f39c12' : '#2ecc71';
    return `<span style="color:${color}">${h}x</span>`;
  }).join('');
}

// ========================
// WALLET
// ========================
function updateAllBalances() {
  const navBal = document.getElementById('navBalance');
  if (navBal) navBal.textContent = aviator.balance;
  const walletBal = document.getElementById('walletBalance');
  if (walletBal) walletBal.textContent = aviator.balance;
  localStorage.setItem('demoBalance', aviator.balance);
}

function addTx(type, amount, note = '') {
  const tx = JSON.parse(localStorage.getItem('demoTx')) || [];
  tx.unshift({ type, amount, note, time: new Date().toLocaleTimeString() });
  localStorage.setItem('demoTx', JSON.stringify(tx.slice(0, 30)));
}

function openWallet() {
  document.getElementById('walletModal').classList.remove('hidden');
  updateAllBalances();
  renderTx();
}
function closeWallet() {
  document.getElementById('walletModal').classList.add('hidden');
}
function addCoins() {
  aviator.balance += 1000;
  updateAllBalances();
  addTx('add', 1000, 'Coins Added');
  showToast('+1000 Coins added! 🪙');
}
function withdrawCoins() {
  if (aviator.balance <= 0) { showToast('No coins to withdraw!'); return; }
  const amount = Math.min(aviator.balance, 500);
  aviator.balance -= amount;
  updateAllBalances();
  addTx('withdraw', amount, 'Withdrawn to Vault');
  showToast(`${amount} coins moved to Vault 🔒`);
}

function renderTx() {
  const box = document.getElementById('txHistory');
  if (!box) return;
  const tx = JSON.parse(localStorage.getItem('demoTx')) || [];
  if (tx.length === 0) {
    box.innerHTML = '<div style="padding:0.5rem;color:#666;text-align:center;">No transactions yet</div>';
    return;
  }
  box.innerHTML = tx.map(t => {
    const sign = (t.type === 'add' || t.type === 'win') ? '+' : '-';
    return `<div class="tx-item"><span>${t.note}</span><span class="tx-${t.type}">${sign}${t.amount}</span></div>`;
  }).join('');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ========================
// INIT
// ========================
renderHistory();
updateAllBalances();
startRound();
