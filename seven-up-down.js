// ========================
// 7UP 7DOWN GAME
// ========================
const sudGame = {
  state: 'betting',
  timer: 10,
  balance: parseInt(localStorage.getItem('demoBalance')) || 1000,
  transactions: JSON.parse(localStorage.getItem('demoTx')) || [],
  history: JSON.parse(localStorage.getItem('sudHistory')) || [],
  bets: {},
  chipValue: 50,
  timerInterval: null
};

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', () => {
  updateAllBalances();
  renderHistory();
  renderBets();
  startBettingRound();
  selectChip(50);
});

function startBettingRound() {
  sudGame.state = 'betting';
  sudGame.timer = 10;
  sudGame.bets = {};
  renderBets();
  updateTotalBet();
  updateStatus('Place your bets!');
  updateTimerDisplay();
  resetDice();

  if (sudGame.timerInterval) clearInterval(sudGame.timerInterval);
  sudGame.timerInterval = setInterval(() => {
    sudGame.timer--;
    updateTimerDisplay();
    if (sudGame.timer <= 3) updateStatus('Betting closing soon!');
    if (sudGame.timer <= 0) {
      clearInterval(sudGame.timerInterval);
      rollDice();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('sudTimer');
  el.textContent = sudGame.timer;
  if (sudGame.timer <= 3) {
    el.style.color = '#e94560';
  } else {
    el.style.color = '#f7d774';
  }
}

function updateStatus(msg) {
  document.getElementById('sudStatus').textContent = msg;
}

// ========================
// CHIP SELECTION
// ========================
function selectChip(val) {
  sudGame.chipValue = val;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.val) === val);
  });
}

// ========================
// PLACE BET
// ========================
function placeBet(type) {
  if (sudGame.state !== 'betting') {
    showToast('Betting is closed!');
    return;
  }
  const chip = sudGame.chipValue;
  if (sudGame.balance < chip) {
    showToast('Insufficient coins!');
    return;
  }
  sudGame.balance -= chip;
  sudGame.bets[type] = (sudGame.bets[type] || 0) + chip;
  updateAllBalances();
  renderBets();
  updateTotalBet();
  addTx('bet', chip, `7U7D: ${type}`);
}

function renderBets() {
  const map = {
    down: 'betDown', up: 'betUp', lucky: 'betLucky',
    odd: 'betOdd', even: 'betEven'
  };
  Object.keys(map).forEach(k => {
    const el = document.getElementById(map[k]);
    if (el) el.textContent = sudGame.bets[k] || 0;
  });
}

function updateTotalBet() {
  const total = Object.values(sudGame.bets).reduce((a, b) => a + b, 0);
  document.getElementById('sudTotalBet').textContent = total;
}

function clearBets() {
  if (sudGame.state !== 'betting') return;
  const total = Object.values(sudGame.bets).reduce((a, b) => a + b, 0);
  if (total > 0) {
    sudGame.balance += total;
    updateAllBalances();
    showToast(`${total} coins returned`);
  }
  sudGame.bets = {};
  renderBets();
  updateTotalBet();
}

// ========================
// ROLL DICE
// ========================
function rollDice() {
  sudGame.state = 'rolling';
  updateStatus('Rolling...');

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const sum = d1 + d2;

  let flicker = 0;
  const flickerInt = setInterval(() => {
    document.getElementById('dice1').textContent = DICE_FACES[Math.floor(Math.random()*6)];
    document.getElementById('dice2').textContent = DICE_FACES[Math.floor(Math.random()*6)];
    document.getElementById('sudSum').textContent = Math.floor(Math.random()*11)+2;
    flicker++;
    if (flicker > 12) {
      clearInterval(flickerInt);
      showResult(d1, d2, sum);
    }
  }, 80);
}

function showResult(d1, d2, sum) {
  sudGame.state = 'result';

  document.getElementById('dice1').textContent = DICE_FACES[d1 - 1];
  document.getElementById('dice2').textContent = DICE_FACES[d2 - 1];
  document.getElementById('sudSum').textContent = sum;

  const isOdd = sum % 2 !== 0;

  let totalWin = 0;
  let details = [];

  Object.keys(sudGame.bets).forEach(type => {
    const amt = sudGame.bets[type];
    let won = false;
    let mult = 0;

    if (type === 'down' && sum < 7) { won = true; mult = 2; }
    else if (type === 'up' && sum > 7) { won = true; mult = 2; }
    else if (type === 'lucky' && sum === 7) { won = true; mult = 5; }
    else if (type === 'odd' && isOdd) { won = true; mult = 2; }
    else if (type === 'even' && !isOdd) { won = true; mult = 2; }
    else if (type.startsWith('num') && parseInt(type.replace('num','')) === sum) {
      won = true; mult = 9;
    }

    if (won) {
      const winAmt = Math.floor(amt * mult);
      totalWin += winAmt;
      details.push(`${type} +${winAmt}`);
      addTx('win', winAmt, `7U7D: ${type}`);
    }
  });

  if (totalWin > 0) {
    sudGame.balance += totalWin;
    updateAllBalances();
    updateStatus(`You won ${totalWin} coins! 🎉`);
    showToast(`+${totalWin} coins! ${details.join(', ')}`);
  } else {
    updateStatus(`Result: ${sum} — Better luck next time!`);
  }

  sudGame.history.unshift({ d1, d2, sum, isOdd });
  sudGame.history = sudGame.history.slice(0, 10);
  localStorage.setItem('sudHistory', JSON.stringify(sudGame.history));
  renderHistory();

  setTimeout(() => {
    startBettingRound();
  }, 3000);
}

function resetDice() {
  document.getElementById('dice1').textContent = '⚀';
  document.getElementById('dice2').textContent = '⚀';
  document.getElementById('sudSum').textContent = '?';
}

// ========================
// HISTORY
// ========================
function renderHistory() {
  const list = document.getElementById('sudHistory');
  if (!list) return;
  if (sudGame.history.length === 0) {
    list.innerHTML = '<div style="color:#666;text-align:center;padding:1rem;">No results yet</div>';
    return;
  }
  list.innerHTML = sudGame.history.map(h => {
    const cls = h.sum < 7 ? 'green' : h.sum > 7 ? 'red' : 'violet';
    const label = h.sum < 7 ? 'DOWN' : h.sum > 7 ? 'UP' : 'LUCKY 7';
    return `<div class="sud-history-item">
      <span>🎲 ${h.d1} + ${h.d2}</span>
      <span class="sud-h-sum ${cls}">${h.sum} (${label})</span>
    </div>`;
  }).join('');
}

// ========================
// WALLET
// ========================
function updateAllBalances() {
  const navBal = document.getElementById('navBalance');
  if (navBal) navBal.textContent = sudGame.balance;
  const walletBal = document.getElementById('walletBalance');
  if (walletBal) walletBal.textContent = sudGame.balance;
  localStorage.setItem('demoBalance', sudGame.balance);
}

function addTx(type, amount, note = '') {
  sudGame.transactions.unshift({ type, amount, note, time: new Date().toLocaleTimeString() });
  sudGame.transactions = sudGame.transactions.slice(0, 30);
  localStorage.setItem('demoTx', JSON.stringify(sudGame.transactions));
  renderTx();
}

function renderTx() {
  const box = document.getElementById('txHistory');
  if (!box) return;
  if (sudGame.transactions.length === 0) {
    box.innerHTML = '<div style="padding:0.5rem;color:#666;text-align:center;">No transactions yet</div>';
    return;
  }
  box.innerHTML = sudGame.transactions.map(tx => {
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
  sudGame.balance += 1000;
  updateAllBalances();
  addTx('add', 1000, 'Coins Added');
  showToast('+1000 Coins added! 🪙');
}
function withdrawCoins() {
  if (sudGame.balance <= 0) { showToast('No coins to withdraw!'); return; }
  const amount = Math.min(sudGame.balance, 500);
  sudGame.balance -= amount;
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
