// ========================
// SHARED WALLET + MENU
// ========================
let balance = parseInt(localStorage.getItem('demoBalance')) || 1000;
let transactions = JSON.parse(localStorage.getItem('demoTx')) || [];
let lastDailyBonus = localStorage.getItem('lastDailyBonus') || '';
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let sessionBankAccount = null;

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', () => {
  updateAllBalances();
  renderTx();
  setupSoundToggle();
  checkDailyBonus();
});

function setupSoundToggle() {
  const btn = document.getElementById('soundToggle');
  if (!btn) return;
  btn.textContent = soundEnabled ? '🔊' : '🔇';
  btn.onclick = () => {
    soundEnabled = !soundEnabled;
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    localStorage.setItem('soundEnabled', soundEnabled);
  };
}

// ========================
// BALANCE
// ========================
function updateAllBalances() {
  const navBal = document.getElementById('navBalance');
  if (navBal) navBal.textContent = balance;
  const walletBal = document.getElementById('walletBalance');
  if (walletBal) walletBal.textContent = balance;
  localStorage.setItem('demoBalance', balance);
}

// ========================
// TRANSACTIONS
// ========================
function addTx(type, amount, note = '') {
  transactions.unshift({
    type, amount, note,
    time: new Date().toLocaleTimeString()
  });
  transactions = transactions.slice(0, 30);
  localStorage.setItem('demoTx', JSON.stringify(transactions));
  renderTx();
}

function renderTx() {
  const box = document.getElementById('txHistory');
  if (!box) return;
  if (transactions.length === 0) {
    box.innerHTML = '<div style="padding:0.5rem;color:#666;text-align:center;">No transactions yet</div>';
    return;
  }
  box.innerHTML = transactions.map(tx => {
    const sign = (tx.type === 'add' || tx.type === 'win') ? '+' : '-';
    return `<div class="tx-item">
      <span>${tx.note || tx.type}</span>
      <span class="tx-${tx.type}">${sign}${tx.amount}</span>
    </div>`;
  }).join('');
}

// ========================
// WALLET
// ========================
function openWallet() {
  document.getElementById('walletModal').classList.remove('hidden');
  updateAllBalances();
  renderTx();
}

function closeWallet() {
  document.getElementById('walletModal').classList.add('hidden');
}

function openDeposit() {
  document.getElementById('depositModal').classList.remove('hidden');
}

function closeDeposit() {
  document.getElementById('depositModal').classList.add('hidden');
}

function openPaymentPage(method) {
  window.location.href = 'payment.html?method=' + encodeURIComponent(method);
}

function openWithdrawPanel() {
  const panel = document.getElementById('withdrawPanel');
  if (panel) panel.classList.toggle('hidden');
}

function saveBankAccount(event) {
  event.preventDefault();
  const holder = document.getElementById('bankHolder').value.trim();
  const bank = document.getElementById('bankName').value.trim();
  const account = document.getElementById('bankAccount').value.trim();
  const ifsc = document.getElementById('bankIfsc').value.trim().toUpperCase();
  if (!holder || !bank || !/^[0-9]{6,20}$/.test(account) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    showToast('Please check the bank details.');
    return;
  }
  // Keep sensitive bank details in memory only; do not store them in browser storage.
  sessionBankAccount = { holder, bank, account, ifsc };
  document.getElementById('savedBankSummary').textContent = `Bank account saved for this session: ${bank} ••••${account.slice(-4)} (${holder})`;
  document.getElementById('savedBankSummary').classList.remove('hidden');
  document.getElementById('withdrawForm').classList.remove('hidden');
  showToast('Bank details saved for this session.');
}

function submitWithdrawRequest(event) {
  event.preventDefault();
  if (!sessionBankAccount) { showToast('Please add a bank account first.'); return; }
  const amount = Number(document.getElementById('withdrawAmount').value);
  if (!Number.isInteger(amount) || amount <= 0 || amount > balance) {
    showToast('Enter an amount within your available demo coins.');
    return;
  }
  // Demo UI only: do not move balances or claim a real transfer has occurred.
  addTx('withdraw', amount, `Demo withdrawal request ••••${sessionBankAccount.account.slice(-4)}`);
  showToast('Demo request recorded. No real money was transferred.');
  document.getElementById('withdrawAmount').value = '';
}

function checkDailyBonus() {
  const today = new Date().toDateString();
  if (lastDailyBonus !== today) {
    balance += 500;
    lastDailyBonus = today;
    localStorage.setItem('lastDailyBonus', today);
    updateAllBalances();
    addTx('add', 500, 'Daily Bonus');
    setTimeout(() => showToast('Daily bonus: +500 🎁'), 800);
  }
}

// ========================
// TOAST
// ========================
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}
