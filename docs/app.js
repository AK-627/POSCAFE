/* ═══════════════════════════════════════════════════════════════
   Sky Nether — Café Management System · Application Logic
   v2.0 — Role-Based Authentication
   ═══════════════════════════════════════════════════════════════ */

// ── User Database (simulated) ──────────────────────────────────
// In production, passwords would be hashed (bcrypt) and stored
// in a real database. This is a demo simulation.
const USERS_DB = [
  {
    id: 1,
    email: 'admin@skynether.cafe',
    password: 'admin123', // Would be bcrypt hash in production
    name: 'Arjun Kumar',
    avatar: 'AK',
    role: 'owner',
    permissions: ['dashboard', 'pos', 'tables', 'kitchen', 'menu', 'staff', 'reports'],
    canEdit: {
      menuPrices: true,
      taxSettings: true,
      employees: true,
      settings: true,
    },
  },
  {
    id: 2,
    email: 'staff@skynether.cafe',
    password: 'staff123',
    name: 'Rahul Verma',
    avatar: 'RV',
    role: 'employee',
    permissions: ['dashboard', 'pos', 'tables', 'kitchen'],
    canEdit: {
      menuPrices: false,
      taxSettings: false,
      employees: false,
      settings: false,
    },
  },
];

// ── Authentication State ───────────────────────────────────────
let currentUser = null;

/** Simple hash for demo session tokens */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'sn_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

/** Attempt login */
function authenticate(email, password) {
  const user = USERS_DB.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return null;
  // Return a sanitized session object (no raw password)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    permissions: [...user.permissions],
    canEdit: { ...user.canEdit },
    token: simpleHash(user.email + user.password),
  };
}

/** Save session */
function saveSession(user, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('sn_session', JSON.stringify(user));
}

/** Load session */
function loadSession() {
  const data = localStorage.getItem('sn_session') || sessionStorage.getItem('sn_session');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** Clear session */
function clearSession() {
  localStorage.removeItem('sn_session');
  sessionStorage.removeItem('sn_session');
}

/** Check if user has access to a view */
function hasPermission(viewName) {
  if (!currentUser) return false;
  return currentUser.permissions.includes(viewName);
}

/** Check if user can edit a feature */
function canEdit(feature) {
  if (!currentUser) return false;
  return currentUser.canEdit[feature] === true;
}

// ══════════════════════════════════════════════════════════════
// LOGIN UI
// ══════════════════════════════════════════════════════════════

/** Fill demo credentials */
function fillDemo(type) {
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  if (type === 'owner') {
    emailEl.value = 'admin@skynether.cafe';
    passEl.value = 'admin123';
  } else {
    emailEl.value = 'staff@skynether.cafe';
    passEl.value = 'staff123';
  }
  // Trigger input animation
  emailEl.focus(); emailEl.blur();
  passEl.focus(); passEl.blur();
}

/** Show login error */
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.add('show');
  // Re-trigger shake animation
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
}

/** Hide login error */
function hideLoginError() {
  document.getElementById('login-error').classList.remove('show');
}

/** Handle login form submit */
function handleLogin(e) {
  e.preventDefault();
  hideLoginError();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    showLoginError('Please enter both email and password.');
    return;
  }

  // Loading state
  btn.classList.add('loading');

  // Simulate network delay for realistic feel
  setTimeout(() => {
    const user = authenticate(email, password);

    if (!user) {
      btn.classList.remove('loading');
      showLoginError('Invalid credentials. Please check your email and password.');
      return;
    }

    // Success
    currentUser = user;
    saveSession(user, remember);
    btn.classList.remove('loading');
    enterApp();
  }, 600);
}

/** Toggle password visibility */
function setupPasswordToggle() {
  const btn = document.getElementById('toggle-password');
  const input = document.getElementById('login-password');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
}

/** Transition from login to app */
function enterApp() {
  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');

  loginScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(1.02)';

  setTimeout(() => {
    loginScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    appEl.style.animation = 'fadeIn 0.4s ease';

    // Configure the app for this user
    updateSidebar();
    initApp();
    showToast('👋', `Welcome back, ${currentUser.name}!`);
  }, 350);
}

/** Logout */
function logout() {
  clearSession();
  currentUser = null;
  cart = [];

  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');

  appEl.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginScreen.style.opacity = '1';
  loginScreen.style.transform = 'scale(1)';

  // Reset form
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-remember').checked = false;
  hideLoginError();
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR & PERMISSIONS
// ══════════════════════════════════════════════════════════════

/** Update sidebar based on current user's role */
function updateSidebar() {
  if (!currentUser) return;

  // Update user info
  document.getElementById('sidebar-avatar').textContent = currentUser.avatar;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent =
    currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

  // Show/hide nav items based on role
  document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
    const allowedRoles = item.dataset.roles.split(',');
    if (allowedRoles.includes(currentUser.role)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// ── Mock Data ──────────────────────────────────────────────────
const MENU_ITEMS = [
  { id: 1, name: 'Espresso', emoji: '☕', price: 149, category: 'Coffee', available: true, orders: 42 },
  { id: 2, name: 'Cappuccino', emoji: '☕', price: 199, category: 'Coffee', available: true, orders: 38 },
  { id: 3, name: 'Latte', emoji: '🥛', price: 219, category: 'Coffee', available: true, orders: 35 },
  { id: 4, name: 'Mocha', emoji: '🍫', price: 249, category: 'Coffee', available: true, orders: 28 },
  { id: 5, name: 'Cold Brew', emoji: '🧊', price: 229, category: 'Coffee', available: true, orders: 22 },
  { id: 6, name: 'Americano', emoji: '☕', price: 169, category: 'Coffee', available: true, orders: 19 },
  { id: 7, name: 'Green Tea', emoji: '🍵', price: 129, category: 'Tea', available: true, orders: 15 },
  { id: 8, name: 'Chai Latte', emoji: '🍵', price: 179, category: 'Tea', available: true, orders: 20 },
  { id: 9, name: 'Matcha Latte', emoji: '🍵', price: 249, category: 'Tea', available: true, orders: 12 },
  { id: 10, name: 'Iced Tea', emoji: '🧋', price: 149, category: 'Tea', available: true, orders: 18 },
  { id: 11, name: 'Croissant', emoji: '🥐', price: 129, category: 'Pastry', available: true, orders: 30 },
  { id: 12, name: 'Blueberry Muffin', emoji: '🧁', price: 149, category: 'Pastry', available: true, orders: 25 },
  { id: 13, name: 'Chocolate Cake', emoji: '🍰', price: 199, category: 'Pastry', available: false, orders: 15 },
  { id: 14, name: 'Danish Pastry', emoji: '🥐', price: 159, category: 'Pastry', available: true, orders: 10 },
  { id: 15, name: 'Club Sandwich', emoji: '🥪', price: 279, category: 'Food', available: true, orders: 22 },
  { id: 16, name: 'Caesar Salad', emoji: '🥗', price: 249, category: 'Food', available: true, orders: 14 },
  { id: 17, name: 'Pasta Alfredo', emoji: '🍝', price: 329, category: 'Food', available: true, orders: 18 },
  { id: 18, name: 'Margherita Pizza', emoji: '🍕', price: 349, category: 'Food', available: true, orders: 16 },
  { id: 19, name: 'Mango Smoothie', emoji: '🥭', price: 199, category: 'Beverages', available: true, orders: 20 },
  { id: 20, name: 'Fresh Orange Juice', emoji: '🍊', price: 179, category: 'Beverages', available: true, orders: 24 },
  { id: 21, name: 'Lemonade', emoji: '🍋', price: 149, category: 'Beverages', available: true, orders: 16 },
  { id: 22, name: 'Berry Smoothie', emoji: '🫐', price: 229, category: 'Beverages', available: true, orders: 11 },
];

const TABLES = [
  { id: 'T1', seats: 2, status: 'available' },
  { id: 'T2', seats: 2, status: 'occupied', order: '#1042', guest: 'Rahul' },
  { id: 'T3', seats: 4, status: 'occupied', order: '#1041', guest: 'Priya' },
  { id: 'T4', seats: 4, status: 'available' },
  { id: 'T5', seats: 6, status: 'reserved', guest: 'Amit' },
  { id: 'T6', seats: 2, status: 'cleaning' },
  { id: 'T7', seats: 4, status: 'available' },
  { id: 'T8', seats: 8, status: 'occupied', order: '#1040', guest: 'Sarah' },
  { id: 'T9', seats: 2, status: 'available' },
  { id: 'T10', seats: 4, status: 'reserved', guest: 'Dev' },
  { id: 'T11', seats: 6, status: 'available' },
  { id: 'T12', seats: 2, status: 'occupied', order: '#1039', guest: 'Meera' },
];

const KITCHEN_ORDERS = [
  { id: '#1042', table: 'T2', items: [{ name: 'Cappuccino', qty: 2 }, { name: 'Croissant', qty: 1 }], priority: 'normal', time: 4, notes: '' },
  { id: '#1041', table: 'T3', items: [{ name: 'Pasta Alfredo', qty: 2 }, { name: 'Caesar Salad', qty: 1 }, { name: 'Lemonade', qty: 2 }], priority: 'rush', time: 12, notes: 'No onions in salad' },
  { id: '#1040', table: 'T8', items: [{ name: 'Margherita Pizza', qty: 2 }, { name: 'Club Sandwich', qty: 3 }, { name: 'Cold Brew', qty: 4 }], priority: 'critical', time: 18, notes: 'Birthday celebration — priority!' },
  { id: '#1039', table: 'T12', items: [{ name: 'Matcha Latte', qty: 1 }, { name: 'Blueberry Muffin', qty: 2 }], priority: 'normal', time: 2, notes: '' },
  { id: '#1038', table: 'T2', items: [{ name: 'Espresso', qty: 1 }, { name: 'Danish Pastry', qty: 1 }], priority: 'normal', time: 6, notes: '' },
  { id: '#1037', table: 'T3', items: [{ name: 'Mocha', qty: 1 }, { name: 'Chocolate Cake', qty: 1 }], priority: 'rush', time: 9, notes: 'Extra whipped cream' },
];

const STAFF = [
  { id: 1, name: 'Arjun Kumar', role: 'Manager', shift: '9AM - 5PM', status: 'active', avatar: 'AK', orders: 0, rating: 4.8 },
  { id: 2, name: 'Priya Sharma', role: 'Cashier', shift: '10AM - 6PM', status: 'active', avatar: 'PS', orders: 34, rating: 4.6 },
  { id: 3, name: 'Rahul Verma', role: 'Waiter', shift: '8AM - 4PM', status: 'active', avatar: 'RV', orders: 28, rating: 4.9 },
  { id: 4, name: 'Meera Patel', role: 'Waiter', shift: '12PM - 8PM', status: 'active', avatar: 'MP', orders: 19, rating: 4.7 },
  { id: 5, name: 'Dev Nair', role: 'Chef', shift: '7AM - 3PM', status: 'active', avatar: 'DN', orders: 45, rating: 4.9 },
  { id: 6, name: 'Anita Roy', role: 'Chef', shift: '2PM - 10PM', status: 'break', avatar: 'AR', orders: 32, rating: 4.5 },
];

const RECENT_ORDERS = [
  { id: '#1042', customer: 'Rahul V.', amount: 527, status: 'preparing', time: '2 min ago' },
  { id: '#1041', customer: 'Priya S.', amount: 1156, status: 'preparing', time: '5 min ago' },
  { id: '#1040', customer: 'Sarah K.', amount: 2245, status: 'preparing', time: '12 min ago' },
  { id: '#1039', customer: 'Meera P.', amount: 547, status: 'pending', time: '15 min ago' },
  { id: '#1038', customer: 'Walk-in', amount: 308, status: 'paid', time: '22 min ago' },
  { id: '#1037', customer: 'Amit D.', amount: 448, status: 'paid', time: '34 min ago' },
];

const WEEK_REVENUE = [
  { day: 'Mon', value: 12400 },
  { day: 'Tue', value: 15800 },
  { day: 'Wed', value: 11200 },
  { day: 'Thu', value: 18900 },
  { day: 'Fri', value: 22100 },
  { day: 'Sat', value: 28500 },
  { day: 'Sun', value: 19300 },
];

// ── Application State ──────────────────────────────────────────
let cart = [];
let currentView = 'dashboard';
let activeCategory = 'All';
let orderCounter = 1043;

// ══════════════════════════════════════════════════════════════
// ROUTER (with auth guard)
// ══════════════════════════════════════════════════════════════

function navigateTo(viewName) {
  if (!currentUser) return;

  // Route guard — check permission
  if (viewName !== 'access-denied' && !hasPermission(viewName)) {
    navigateTo('access-denied');
    return;
  }

  currentView = viewName;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Show/hide views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  const target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');

  // Update hash (without triggering hashchange loop)
  if (viewName !== 'access-denied') {
    history.replaceState(null, '', '#' + viewName);
  }
}

// Handle hash navigation
function handleHash() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

// ── Dashboard ──────────────────────────────────────────────────
function renderDashboard() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  const statsGrid = document.getElementById('stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = [
      { label: 'Revenue Today', value: '₹18,450', change: '+12.5%', positive: true, icon: '💰' },
      { label: 'Orders Today', value: '47', change: '+8 from yesterday', positive: true, icon: '📦' },
      { label: 'Active Tables', value: '4 / 12', change: '33% occupied', positive: false, icon: '🪑' },
      { label: 'Avg Order Value', value: '₹392', change: '+₹23', positive: true, icon: '📊' },
    ].map(s => `
      <div class="stat-card fade-in">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-change ${s.positive ? 'positive' : ''}">${s.positive ? '↑' : ''} ${s.change}</div>
      </div>
    `).join('');
  }

  const chartEl = document.getElementById('revenue-chart');
  if (chartEl) {
    const max = Math.max(...WEEK_REVENUE.map(d => d.value));
    chartEl.innerHTML = `<div class="chart-placeholder">${
      WEEK_REVENUE.map(d => {
        const h = Math.round((d.value / max) * 220);
        return `<div class="chart-bar-group">
          <div class="chart-bar" style="height:${h}px" title="₹${d.value.toLocaleString()}"></div>
          <span class="chart-bar-label">${d.day}</span>
        </div>`;
      }).join('')
    }</div>`;
  }

  const ordersEl = document.getElementById('recent-orders');
  if (ordersEl) {
    ordersEl.innerHTML = RECENT_ORDERS.map(o => `
      <div class="order-row">
        <div class="order-info">
          <span class="order-id">${o.id}</span>
          <span class="order-customer">${o.customer}</span>
        </div>
        <span class="order-amount">₹${o.amount}</span>
        <span class="order-status status-${o.status}">${o.status}</span>
      </div>
    `).join('');
  }
}

// ── POS ────────────────────────────────────────────────────────
function renderPOS() {
  const categories = ['All', ...new Set(MENU_ITEMS.map(i => i.category))];
  const catsEl = document.getElementById('pos-categories');
  if (catsEl) {
    catsEl.innerHTML = categories.map(c =>
      `<button class="pos-category ${c === activeCategory ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`
    ).join('');
  }
  renderPOSItems();
}

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.pos-category').forEach(el => {
    el.classList.toggle('active', el.textContent === cat);
  });
  renderPOSItems();
}

function renderPOSItems() {
  const items = activeCategory === 'All'
    ? MENU_ITEMS.filter(i => i.available)
    : MENU_ITEMS.filter(i => i.category === activeCategory && i.available);

  const grid = document.getElementById('pos-items');
  if (grid) {
    grid.innerHTML = items.map(item => `
      <div class="pos-item" onclick="addToCart(${item.id})">
        <span class="pos-item-emoji">${item.emoji}</span>
        <div class="pos-item-name">${item.name}</div>
        <div class="pos-item-price">₹${item.price}</div>
      </div>
    `).join('');
  }
}

function addToCart(itemId) {
  const item = MENU_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const existing = cart.find(c => c.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  renderCart();
}

function removeFromCart(itemId) {
  const idx = cart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  if (cart[idx].qty > 1) {
    cart[idx].qty -= 1;
  } else {
    cart.splice(idx, 1);
  }
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><p style="font-size:2rem;opacity:0.3">🛒</p><p>Cart is empty</p><p style="font-size:0.78rem;color:var(--dim);margin-top:4px">Tap items to add</p></div>`;
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.emoji} ${item.name}</div>
        <div class="cart-item-price">₹${item.price} each</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="removeFromCart(${item.id})">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" onclick="addToCart(${item.id})">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const service = Math.round(subtotal * 0.10);
  const total = subtotal + tax + service;

  document.getElementById('cart-subtotal').textContent = '₹' + subtotal.toLocaleString();
  document.getElementById('cart-tax').textContent = '₹' + tax.toLocaleString();
  document.getElementById('cart-service').textContent = '₹' + service.toLocaleString();
  document.getElementById('cart-total').textContent = '₹' + total.toLocaleString();

  if (summaryEl) summaryEl.style.display = 'block';
}

// ── Tables ─────────────────────────────────────────────────────
function renderTables() {
  const grid = document.getElementById('tables-grid');
  if (!grid) return;
  grid.innerHTML = TABLES.map(t => `
    <div class="table-card ${t.status}" onclick="toggleTableStatus('${t.id}')">
      <div class="table-status-dot"></div>
      <div class="table-number">${t.id}</div>
      <div class="table-seats">${t.seats} seats</div>
      ${t.guest ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:6px">${t.guest}</div>` : ''}
      ${t.order ? `<div style="font-size:0.75rem;font-family:var(--font-mono);color:var(--blue);margin-top:4px">${t.order}</div>` : ''}
      <div class="table-status-label">${t.status}</div>
    </div>
  `).join('');
}

function toggleTableStatus(tableId) {
  const table = TABLES.find(t => t.id === tableId);
  if (!table) return;
  const cycle = ['available', 'occupied', 'reserved', 'cleaning'];
  const idx = cycle.indexOf(table.status);
  table.status = cycle[(idx + 1) % cycle.length];
  if (table.status === 'available') { table.guest = ''; table.order = ''; }
  renderTables();
  showToast('🪑', `Table ${tableId} → ${table.status}`);
}

// ── Kitchen ────────────────────────────────────────────────────
function renderKitchen() {
  const grid = document.getElementById('kitchen-grid');
  if (!grid) return;

  const priorityOrder = { critical: 0, rush: 1, normal: 2 };
  const sorted = [...KITCHEN_ORDERS].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  grid.innerHTML = sorted.map(order => `
    <div class="kitchen-ticket">
      <div class="ticket-header">
        <div>
          <div class="ticket-order-num">${order.id}</div>
          <div class="ticket-time">Table ${order.table}</div>
        </div>
        <span class="ticket-priority priority-${order.priority}">${order.priority}</span>
      </div>
      <div class="ticket-body">
        ${order.items.map(item => `
          <div class="ticket-item">
            <span class="ticket-item-name">${item.name}</span>
            <span class="ticket-item-qty">×${item.qty}</span>
          </div>
        `).join('')}
        ${order.notes ? `<div class="ticket-notes">📝 ${order.notes}</div>` : ''}
      </div>
      <div class="ticket-footer">
        <button class="ticket-action-btn" onclick="completeKitchenOrder('${order.id}')">✓ Mark Ready</button>
        <div class="ticket-elapsed ${order.time > 10 ? 'overdue' : ''}">${order.time} min elapsed</div>
      </div>
    </div>
  `).join('');

  const counts = { critical: 0, rush: 0, normal: 0 };
  KITCHEN_ORDERS.forEach(o => counts[o.priority]++);
  const ce = document.getElementById('critical-count');
  const re = document.getElementById('rush-count');
  const ne = document.getElementById('normal-count');
  if (ce) ce.textContent = counts.critical;
  if (re) re.textContent = counts.rush;
  if (ne) ne.textContent = counts.normal;
}

function completeKitchenOrder(orderId) {
  const idx = KITCHEN_ORDERS.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    KITCHEN_ORDERS.splice(idx, 1);
    renderKitchen();
    showToast('🍳', `Order ${orderId} marked ready!`);
  }
}

// ── Menu Management ────────────────────────────────────────────
function renderMenu() {
  const tbody = document.getElementById('menu-table-body');
  if (!tbody) return;
  renderMenuItems(MENU_ITEMS);

  document.getElementById('menu-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = MENU_ITEMS.filter(i =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
    renderMenuItems(filtered);
  });
}

function renderMenuItems(items) {
  const tbody = document.getElementById('menu-table-body');
  if (!tbody) return;
  const isOwner = currentUser && currentUser.role === 'owner';
  tbody.innerHTML = items.map(item => `
    <tr>
      <td>
        <div class="menu-item-cell">
          <span class="menu-item-emoji">${item.emoji}</span>
          <div class="menu-item-details">
            <span class="menu-item-name">${item.name}</span>
            <span class="menu-item-cat">${item.category}</span>
          </div>
        </div>
      </td>
      <td>${item.category}</td>
      <td style="font-weight:700;color:var(--green)">₹${item.price}</td>
      <td><span class="badge ${item.available ? 'badge-available' : 'badge-unavailable'}">${item.available ? 'Available' : 'Unavailable'}</span></td>
      <td style="font-family:var(--font-mono)">${item.orders}</td>
      ${isOwner ? `<td><button class="btn btn-sm btn-outline" onclick="showToast('✏️','Edit feature coming soon')">Edit</button></td>` : ''}
    </tr>
  `).join('');
}

// ── Staff ──────────────────────────────────────────────────────
function renderStaff() {
  const grid = document.getElementById('staff-grid');
  if (!grid) return;
  const isOwner = currentUser && currentUser.role === 'owner';
  grid.innerHTML = STAFF.map(s => `
    <div class="card" style="display:flex;gap:16px;align-items:center">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:#fff;flex-shrink:0">${s.avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem">${s.name}</div>
        <div style="font-size:0.78rem;color:var(--dim)">${s.role} · ${s.shift}</div>
        <div style="display:flex;gap:16px;margin-top:8px">
          <span style="font-size:0.75rem;color:var(--muted)">📦 ${s.orders} orders</span>
          <span style="font-size:0.75rem;color:var(--amber)">⭐ ${s.rating}</span>
        </div>
      </div>
      <span class="badge ${s.status === 'active' ? 'badge-available' : 'badge-popular'}">${s.status}</span>
      ${isOwner ? `<button class="btn btn-sm btn-outline" onclick="showToast('✏️','Edit feature coming soon')">Edit</button>` : ''}
    </div>
  `).join('');
}

// ── Reports ────────────────────────────────────────────────────
function renderReports() {
  const statsEl = document.getElementById('report-stats');
  if (statsEl) {
    statsEl.innerHTML = [
      { label: 'Total Revenue', value: '₹1,28,300', change: '+18.2% vs last week', positive: true, icon: '💰' },
      { label: 'Total Orders', value: '312', change: '+24 orders', positive: true, icon: '📦' },
      { label: 'Avg Rating', value: '4.7 ★', change: '+0.2', positive: true, icon: '⭐' },
      { label: 'Refunds', value: '₹2,100', change: '1.6% of revenue', positive: false, icon: '↩️' },
    ].map(s => `
      <div class="stat-card fade-in">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-change ${s.positive ? 'positive' : ''}">${s.positive ? '↑' : ''} ${s.change}</div>
      </div>
    `).join('');
  }

  const topItems = [...MENU_ITEMS].sort((a, b) => b.orders - a.orders).slice(0, 6);
  const topEl = document.getElementById('top-items-list');
  if (topEl) {
    topEl.innerHTML = topItems.map((item, i) => `
      <div class="order-row">
        <div class="order-info">
          <span style="font-size:1.2rem;width:24px;text-align:center;color:var(--dim)">${i + 1}</span>
          <span style="font-size:1.2rem">${item.emoji}</span>
          <span style="font-weight:600">${item.name}</span>
        </div>
        <span style="font-family:var(--font-mono);font-weight:600">${item.orders} sold</span>
      </div>
    `).join('');
  }

  const peakEl = document.getElementById('peak-hours-chart');
  if (peakEl) {
    const hours = [
      { h: '8AM', v: 12 }, { h: '9AM', v: 28 }, { h: '10AM', v: 35 },
      { h: '11AM', v: 22 }, { h: '12PM', v: 45 }, { h: '1PM', v: 52 },
      { h: '2PM', v: 38 }, { h: '3PM', v: 25 }, { h: '4PM', v: 30 },
      { h: '5PM', v: 42 }, { h: '6PM', v: 48 }, { h: '7PM', v: 35 },
    ];
    const max = Math.max(...hours.map(h => h.v));
    peakEl.innerHTML = `<div class="chart-placeholder" style="height:200px">${
      hours.map(h => {
        const height = Math.round((h.v / max) * 160);
        return `<div class="chart-bar-group"><div class="chart-bar" style="height:${height}px"></div><span class="chart-bar-label">${h.h}</span></div>`;
      }).join('')
    }</div>`;
  }
}

// ── Toast Notification ─────────────────────────────────────────
function showToast(icon, text) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const iconEl = toast.querySelector('.toast-icon');
  const textEl = document.getElementById('toast-text');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ══════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════

/** Init the app after login */
function initApp() {
  renderDashboard();
  renderPOS();
  renderCart();
  renderTables();
  renderKitchen();
  renderMenu();
  renderStaff();
  renderReports();

  // Wire up nav
  document.querySelectorAll('[data-view]').forEach(el => {
    // Remove old listeners by cloning
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(clone.dataset.view);
    });
  });

  // Wire up cart & payment buttons
  document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
  document.getElementById('pay-btn')?.addEventListener('click', () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = subtotal + Math.round(subtotal * 0.05) + Math.round(subtotal * 0.10);
    document.getElementById('modal-total').textContent = '₹' + total.toLocaleString();
    document.getElementById('payment-modal').classList.add('active');
  });

  document.getElementById('cancel-payment')?.addEventListener('click', () => {
    document.getElementById('payment-modal').classList.remove('active');
  });

  document.getElementById('confirm-payment')?.addEventListener('click', () => {
    document.getElementById('payment-modal').classList.remove('active');
    orderCounter++;
    cart = [];
    renderCart();
    showToast('✅', `Order #${orderCounter} placed successfully!`);
  });

  document.querySelectorAll('.payment-method').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Navigate to default view
  handleHash();
}

/** Boot — called once on DOMContentLoaded */
function boot() {
  // Setup login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  setupPasswordToggle();

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    showToast('👋', 'Logged out successfully');
  });

  // Hash change
  window.addEventListener('hashchange', () => {
    if (currentUser) handleHash();
  });

  // Check for existing session
  const savedSession = loadSession();
  if (savedSession) {
    currentUser = savedSession;
    enterApp();
  }
}

document.addEventListener('DOMContentLoaded', boot);
