// ========================
// MONEY COMING GAME
// ========================
const mcGame = {
  state: 'idle',
  balance: parseInt(localStorage.getItem('demoBalance')) || 1000,
  transactions: JSON.parse(localStorage.getItem('demoTx')) || [],
  multiplier: 1,
  respinCount: 0,
  reels: []
};

const MC_SYMBOLS = [
  { id: 'coin', icon: '🪙', weight: 20, pay: [0, 0, 5, 20, 100] },
  { id: 'ingot', icon: '🧧', weight: 18, pay: [0, 0, 4, 15, 80] },
  { id: 'firecracker', icon: '🧨', weight: 16, pay: [0, 0, 3, 12, 60] },
  { id: 'lantern', icon: '🏮', weight: 14, pay: [0, 0, 3, 10, 50] },
  { id: 'fish', icon: '🐟', weight: 12, pay: [0, 0, 2, 8, 40] },
  { id: 'money', icon: '💵', weight: 10, pay: [0, 0, 2, 6, 30] },
  { id: 'seven', icon: '7️⃣', weight: 6, pay: [0, 0, 10, 50, 200] },
  { id: 'moneyComing', icon: '💰', weight: 2, pay: [0, 0, 20, 100, 500] },
  { id: 'luckyWheel', icon: '🎡', weight: 2, pay: [0, 0, 0, 0, 0] }
];

const MC_PAYLINES = [
  [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2],
  [0,1,2,1,0], [2,1,0,1,2], [0,0,1,2,2],
  [2,2,1,0,0], [1,0,0,0,1], [1,2,2,2,1],
  [0,1,1,1,0], [2,1,1,1,2], [0,2,2,2,0],
  [2,0,0,0,2], [1,0,1,2,1], [1,2,1,0,1],
  [0,0,2,0,0], [2,2,0,2,2], [0,2,0,2,0],
  [2,0,2,0,2], [1,1,0,1,1], [1,1,2,1,1],
  [0,0,0,1,2], [2,2,2,1,0], [0,1,0,1,0],
  [2,1,2,1,2]
];

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', () => {
  buildReels();
  updateAllBalances();
  renderTx();
  document.getElementById('mcSpinBtn').addEventListener('click', spin);
});

function buildReels() {
  const container = document.getElementById('mcReels');
  container.innerHTML = '';
  mcGame.reels = [];
  for (let i = 0; i < 5; i++) {
    const reel = document.createElement('div');
    reel.className = 'mc-reel';
    for (let j = 0; j < 3; j++) {
      const cell = document.createElement('div');
      cell.className = 'mc-cell';
      cell.textContent = '❓';
      reel.appendChild(cell);
    }
    container.appendChild(reel);
    mcGame.reels.push(reel);
  }
}

function getRandomSymbol() {
  const totalWeight = MC_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const sym of MC_SYMBOLS) {
    rand -= sym.weight;
    if (rand <= 0) return sym;
  }
  return MC_SYMBOLS[0];
}

function setReelSymbols(reel, symbols) {
  const cells = reel.querySelectorAll('.mc-cell');
  symbols.forEach((sym, i) => {
    cells[i].textContent = sym.icon;
    cells[i].dataset.symbol = sym.id;
  });
}

function getReelSymbols(reel) {
  return Array.from(reel.querySelectorAll('.mc-cell')).map(cell => {
    const id = cell.dataset.symbol;
    return MC_SYMBOLS.find(s => s.id === id) || MC_SYMBOLS[0];
  });
}

// ========================
// SPIN
// ========================
function spin() {
  if (mcGame.state === 'spinning') return;
  const bet = parseInt(document.getElementById('mcBet').value);
  if (mcGame.balance < bet) {
    document.getElementById('mcMessage').textContent = 'Insufficient coins!';
    return;
  }

  mcGame.balance -= bet;
  addTx('bet', bet, 'Money Coming Spin');
  updateAllBalances();
  mcGame.state = 'spinning';
  document.getElementById('mcSpinBtn').disabled = true;
  mcGame.multiplier = 1;
  mcGame.respinCount = 0;
  document.getElementById('mcMultiplierDisplay').textContent = '1x';
  document.getElementById('mcMessage').textContent = 'Spinning...';

  document.querySelectorAll('.mc-cell').forEach(c => c.classList.remove('win'));

  mcGame.reels.forEach((reel, index) => {
    reel.classList.add('mc-spinning');
    const interval = setInterval(() => {
      setReelSymbols(reel, [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 60);

    const stopTime = 800 + index * 200 + Math.random() * 300;
    setTimeout(() => {
      clearInterval(interval);
      reel.classList.remove('mc-spinning');
      const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      setReelSymbols(reel, finalSymbols);

      if (index === mcGame.reels.length - 1) {
        evaluateWin(bet);
      }
    }, stopTime);
  });
}

// ========================
// EVALUATE
// ========================
function evaluateWin(bet) {
  const grid = [];
  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      grid[row].push(getReelSymbols(mcGame.reels[col])[row]);
    }
  }

  let totalWin = 0;
  let hasMoneyComing = false;
  let hasLuckyWheel = false;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col].id === 'moneyComing') hasMoneyComing = true;
      if (grid[row][col].id === 'luckyWheel') hasLuckyWheel = true;
    }
  }

  for (const line of MC_PAYLINES) {
    const firstSym = grid[line[0]][0];
    if (!firstSym || firstSym.pay[0] === 0) continue;

    let count = 1;
    for (let i = 1; i < 5; i++) {
      const sym = grid[line[i]][i];
      if (sym && sym.id === firstSym.id) count++;
      else break;
    }

    if (count >= 3) {
      const payIndex = count - 1;
      const pay = firstSym.pay[payIndex] || 0;
      if (pay > 0) {
        totalWin += bet * pay;
        for (let i = 0; i < count; i++) {
          const reel = mcGame.reels[i];
          const cell = reel.querySelectorAll('.mc-cell')[line[i]];
          cell.classList.add('win');
        }
      }
    }
  }

  if (hasMoneyComing) {
    mcGame.multiplier = Math.min(mcGame.multiplier * 2, 50);
    document.getElementById('mcMultiplierDisplay').textContent = mcGame.multiplier + 'x';
    document.getElementById('mcMessage').textContent = `💰 MONEY COMING! Respin with ${mcGame.multiplier}x multiplier!`;
    setTimeout(() => respin(bet), 1200);
    return;
  }

  if (hasLuckyWheel) {
    triggerLuckyWheel(bet);
    return;
  }

  finalizeWin(totalWin, bet);
}

// ========================
// RESPIN
// ========================
function respin(bet) {
  mcGame.respinCount++;
  if (mcGame.respinCount > 5) {
    mcGame.respinCount = 0;
    finalizeWin(0, bet);
    return;
  }

  document.getElementById('mcMessage').textContent = `Respin ${mcGame.respinCount} with ${mcGame.multiplier}x...`;

  mcGame.reels.forEach((reel, index) => {
    reel.classList.add('mc-spinning');
    const interval = setInterval(() => {
      setReelSymbols(reel, [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 60);

    const stopTime = 500 + index * 150;
    setTimeout(() => {
      clearInterval(interval);
      reel.classList.remove('mc-spinning');
      setReelSymbols(reel, [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);

      if (index === mcGame.reels.length - 1) {
        evaluateRespin(bet);
      }
    }, stopTime);
  });
}

function evaluateRespin(bet) {
  const grid = [];
  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      grid[row].push(getReelSymbols(mcGame.reels[col])[row]);
    }
  }

  let win = 0;
  let hasMoneyComing = false;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col].id === 'moneyComing') hasMoneyComing = true;
    }
  }

  for (const line of MC_PAYLINES) {
    const firstSym = grid[line[0]][0];
    if (!firstSym || firstSym.pay[0] === 0) continue;
    let count = 1;
    for (let i = 1; i < 5; i++) {
      if (grid[line[i]][i] && grid[line[i]][i].id === firstSym.id) count++;
      else break;
    }
    if (count >= 3) {
      const pay = firstSym.pay[count - 1] || 0;
      if (pay > 0) {
        win += bet * pay;
        for (let i = 0; i < count; i++) {
          const cell = mcGame.reels[i].querySelectorAll('.mc-cell')[line[i]];
          cell.classList.add('win');
        }
      }
    }
  }

  if (hasMoneyComing && mcGame.respinCount < 5) {
    mcGame.multiplier = Math.min(mcGame.multiplier * 2, 50);
    document.getElementById('mcMultiplierDisplay').textContent = mcGame.multiplier + 'x';
    document.getElementById('mcMessage').textContent = `💰 Another Money Coming! ${mcGame.multiplier}x!`;
    setTimeout(() => respin(bet), 1000);
    return;
  }

  mcGame.respinCount = 0;
  finalizeWin(win * mcGame.multiplier, bet);
}

// ========================
// LUCKY WHEEL
// ========================
function triggerLuckyWheel(bet) {
  document.getElementById('mcMessage').textContent = '🎡 LUCKY WHEEL!';
  const modal = document.getElementById('luckyWheelModal');
  modal.classList.remove('hidden');

  const prizes = [2, 3, 5, 10, 20, 50, 100];
  const wheel = document.getElementById('mcWheel');
  const resultEl = document.getElementById('mcWheelResult');

  let rotation = 0;
  const spins = 5 + Math.floor(Math.random() * 3);
  const targetIndex = Math.floor(Math.random() * prizes.length);
  rotation = spins * 360 + (targetIndex * (360 / prizes.length));

  wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)';
  wheel.style.transform = `rotate(${rotation}deg)`;

  setTimeout(() => {
    const prize = prizes[targetIndex];
    resultEl.textContent = `${prize}x`;
    const winAmt = bet * prize;
    mcGame.balance += winAmt;
    addTx('win', winAmt, `Lucky Wheel ${prize}x`);
    updateAllBalances();
    document.getElementById('mcMessage').textContent = `🎡 Lucky Wheel: +${winAmt} coins!`;
    showToast(`🎡 +${winAmt} coins!`);
  }, 3200);
}

function closeWheel() {
  document.getElementById('luckyWheelModal').classList.add('hidden');
  finalizeWin(0, parseInt(document.getElementById('mcBet').value));
}

// ========================
// FINALIZE
// ========================
function finalizeWin(totalWin, bet) {
  if (totalWin > 0) {
    mcGame.balance += totalWin;
    addTx('win', totalWin, 'Money Coming Win');
    updateAllBalances();
    document.getElementById('mcMessage').textContent = `You won ${totalWin} coins! 🎉`;
    showToast(`+${totalWin} coins! 🎉`);
  } else if (mcGame.state !== 'idle') {
    document.getElementById('mcMessage').textContent = 'Try again!';
  }
  mcGame.state = 'idle';
  document.getElementById('mcSpinBtn').disabled = false;
  mcGame.respinCount = 0;
}

// ========================
// WALLET
// ========================
function updateAllBalances() {
  const navBal = document.getElementById('navBalance');
  if (navBal) navBal.textContent = mcGame.balance;
  const mcBal = document.getElementById('mcBalance');
  if (mcBal) mcBal.textContent = mcGame.balance;
  const walletBal = document.getElementById('walletBalance');
  if (walletBal) walletBal.textContent = mcGame.balance;
  localStorage.setItem('demoBalance', mcGame.balance);
}

function addTx(type, amount, note = '') {
  mcGame.transactions.unshift({ type, amount, note, time: new Date().toLocaleTimeString() });
  mcGame.transactions = mcGame.transactions.slice(0, 30);
  localStorage.setItem('demoTx', JSON.stringify(mcGame.transactions));
  renderTx();
}

function renderTx() {
  const box = document.getElementById('txHistory');
  if (!box) return;
  if (mcGame.transactions.length === 0) {
    box.innerHTML = '<div style="padding:0.5rem;color:#666;text-align:center;">No transactions yet</div>';
    return;
  }
  box.innerHTML = mcGame.transactions.map(tx => {
    const sign = (tx.type === 'add' || tx.type === 'win') ? '+' : '-';
    return `<div class="tx-item"><span>${tx.note || tx.type}</span><span class="tx-${tx.type}">${sign}${tx.amount}</span></div>`;
  }).join('');
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
  mcGame.balance += 1000;
  updateAllBalances();
  addTx('add', 1000, 'Coins Added');
  showToast('+1000 Coins added! 🪙');
}
function withdrawCoins() {
  if (mcGame.balance <= 0) { showToast('No coins to withdraw!'); return; }
  const amount = Math.min(mcGame.balance, 500);
  mcGame.balance -= amount;
  updateAllBalances();
  addTx('withdraw', amount, 'Withdrawn to Vault');
  showToast(`${amount} coins moved to Vault 🔒`);
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
