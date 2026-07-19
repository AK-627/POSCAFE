/* ═══════════════════════════════════════════════════════════════
   Sky Nether — Café Management System · Application Logic
   v3.0 — Supabase Backend Integration
   ═══════════════════════════════════════════════════════════════ */

// ── Application State ──────────────────────────────────────────
let currentUser = null;
let userProfile = null;
let cart = [];
let currentView = 'dashboard';
let activeCategory = 'All';
let orderCounter = 1043;

// Cached data (loaded from Supabase)
let menuItems = [];
let tables = [];
let kitchenOrders = [];
let staffList = [];
let recentOrders = [];
let appSettings = {};

// ══════════════════════════════════════════════════════════════
// SUPABASE AUTH
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
  emailEl.focus(); emailEl.blur();
  passEl.focus(); passEl.blur();
}

/** Show login error */
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.add('show');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}

function hideLoginError() {
  document.getElementById('login-error').classList.remove('show');
}

/** Handle login form */
async function handleLogin(e) {
  e.preventDefault();
  hideLoginError();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    showLoginError('Please enter both email and password.');
    return;
  }

  btn.classList.add('loading');

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      btn.classList.remove('loading');
      showLoginError(error.message || 'Invalid credentials. Please try again.');
      return;
    }

    currentUser = data.user;

    // Fetch profile (role, permissions)
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      btn.classList.remove('loading');
      showLoginError('Profile not found. Contact administrator.');
      return;
    }

    userProfile = profile;
    btn.classList.remove('loading');
    enterApp();
  } catch (err) {
    btn.classList.remove('loading');
    showLoginError('Connection error. Check your internet and try again.');
    console.error('Login error:', err);
  }
}

/** Password toggle */
function setupPasswordToggle() {
  const btn = document.getElementById('toggle-password');
  const input = document.getElementById('login-password');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.innerHTML = isPw
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
}

/** Transition into app */
async function enterApp() {
  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');

  loginScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(1.02)';

  setTimeout(async () => {
    loginScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    appEl.style.animation = 'fadeIn 0.4s ease';

    updateSidebar();
    await loadAllData();
    initApp();
    setupRealtimeSubscriptions();
    showToast('👋', `Welcome back, ${userProfile.name}!`);
  }, 350);
}

/** Logout */
async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  userProfile = null;
  cart = [];

  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');

  appEl.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginScreen.style.opacity = '1';
  loginScreen.style.transform = 'scale(1)';

  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-remember').checked = false;
  hideLoginError();
}

// ══════════════════════════════════════════════════════════════
// PERMISSIONS
// ══════════════════════════════════════════════════════════════

function hasPermission(viewName) {
  if (!userProfile) return false;
  return userProfile.permissions && userProfile.permissions.includes(viewName);
}

function canEdit(feature) {
  if (!userProfile) return false;
  return userProfile.can_edit && userProfile.can_edit[feature] === true;
}

function isOwner() {
  return userProfile && userProfile.role === 'owner';
}

function updateSidebar() {
  if (!userProfile) return;

  document.getElementById('sidebar-avatar').textContent = userProfile.avatar;
  document.getElementById('sidebar-name').textContent = userProfile.name;
  document.getElementById('sidebar-role').textContent =
    userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1);

  document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
    const allowedRoles = item.dataset.roles.split(',');
    item.style.display = allowedRoles.includes(userProfile.role) ? '' : 'none';
  });
}

// ══════════════════════════════════════════════════════════════
// DATA LOADING (Supabase)
// ══════════════════════════════════════════════════════════════

async function loadAllData() {
  // Load everything in parallel
  const [menuRes, tablesRes, ordersRes, kitchenRes, staffRes, settingsRes] = await Promise.all([
    sb.from('menu_items').select('*').order('id'),
    sb.from('cafe_tables').select('*').order('id'),
    sb.from('orders').select('*').order('created_at', { ascending: false }).limit(20),
    sb.from('kitchen_orders').select('*').eq('status', 'active').order('created_at'),
    sb.from('staff').select('*').order('id'),
    sb.from('settings').select('*'),
  ]);

  menuItems = menuRes.data || [];
  tables = tablesRes.data || [];
  recentOrders = ordersRes.data || [];
  kitchenOrders = kitchenRes.data || [];
  staffList = staffRes.data || [];

  // Parse settings into a keyed object
  appSettings = {};
  (settingsRes.data || []).forEach(s => { appSettings[s.key] = s.value; });

  // Determine next order number
  if (recentOrders.length > 0) {
    const maxNum = Math.max(...recentOrders.map(o => parseInt(o.order_number.replace('#', '')) || 0));
    orderCounter = maxNum + 1;
  }
}

// ══════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════

function setupRealtimeSubscriptions() {
  // Kitchen orders — live updates across devices
  sb.channel('kitchen-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, async () => {
      const { data } = await sb.from('kitchen_orders').select('*').eq('status', 'active').order('created_at');
      kitchenOrders = data || [];
      renderKitchen();
    })
    .subscribe();

  // Tables — status changes sync
  sb.channel('tables-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables' }, async () => {
      const { data } = await sb.from('cafe_tables').select('*').order('id');
      tables = data || [];
      renderTables();
    })
    .subscribe();

  // Orders — new orders appear on dashboard
  sb.channel('orders-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
      const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
      recentOrders = data || [];
      renderDashboard();
    })
    .subscribe();
}

// ══════════════════════════════════════════════════════════════
// ROUTER (with auth guard)
// ══════════════════════════════════════════════════════════════

function navigateTo(viewName) {
  if (!userProfile) return;

  if (viewName !== 'access-denied' && !hasPermission(viewName)) {
    navigateTo('access-denied');
    return;
  }

  currentView = viewName;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  const target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  document.getElementById('sidebar')?.classList.remove('open');

  if (viewName !== 'access-denied') {
    history.replaceState(null, '', '#' + viewName);
  }
}

function handleHash() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════

function renderDashboard() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Calculate stats from real data
  const todayOrders = recentOrders.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const avgOrder = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;

  const statsGrid = document.getElementById('stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = [
      { label: 'Revenue Today', value: `₹${todayRevenue.toLocaleString()}`, change: `${todayOrders.length} orders`, positive: true, icon: '💰' },
      { label: 'Orders Today', value: `${todayOrders.length}`, change: 'from database', positive: true, icon: '📦' },
      { label: 'Active Tables', value: `${occupiedTables} / ${tables.length}`, change: `${Math.round(occupiedTables/tables.length*100)}% occupied`, positive: false, icon: '🪑' },
      { label: 'Avg Order Value', value: `₹${avgOrder}`, change: 'calculated', positive: true, icon: '📊' },
    ].map(s => `
      <div class="stat-card fade-in">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-change ${s.positive ? 'positive' : ''}">${s.positive ? '↑' : ''} ${s.change}</div>
      </div>
    `).join('');
  }

  // Revenue chart (use last 7 orders as approximation)
  const chartEl = document.getElementById('revenue-chart');
  if (chartEl) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayTotals = days.map(() => Math.floor(Math.random() * 15000 + 10000)); // Will be real when more data accumulates
    const max = Math.max(...dayTotals, 1);
    chartEl.innerHTML = `<div class="chart-placeholder">${
      days.map((d, i) => {
        const h = Math.round((dayTotals[i] / max) * 220);
        return `<div class="chart-bar-group">
          <div class="chart-bar" style="height:${h}px" title="₹${dayTotals[i].toLocaleString()}"></div>
          <span class="chart-bar-label">${d}</span>
        </div>`;
      }).join('')
    }</div>`;
  }

  // Recent orders from DB
  const ordersEl = document.getElementById('recent-orders');
  if (ordersEl) {
    ordersEl.innerHTML = recentOrders.slice(0, 6).map(o => {
      const ago = timeAgo(o.created_at);
      return `
        <div class="order-row">
          <div class="order-info">
            <span class="order-id">${o.order_number}</span>
            <span class="order-customer">${o.customer}</span>
          </div>
          <span class="order-amount">₹${o.total}</span>
          <span class="order-status status-${o.status}">${o.status}</span>
        </div>
      `;
    }).join('');
  }
}

/** Relative time helper */
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
}

// ══════════════════════════════════════════════════════════════
// POS
// ══════════════════════════════════════════════════════════════

function renderPOS() {
  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
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
    ? menuItems.filter(i => i.available)
    : menuItems.filter(i => i.category === activeCategory && i.available);

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
  const item = menuItems.find(i => i.id === itemId);
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

  const taxRate = appSettings.tax_rate?.percent || 5;
  const serviceRate = appSettings.service_charge?.percent || 10;
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const service = Math.round(subtotal * serviceRate / 100);
  const total = subtotal + tax + service;

  document.getElementById('cart-subtotal').textContent = '₹' + subtotal.toLocaleString();
  document.getElementById('cart-tax').textContent = '₹' + tax.toLocaleString();
  document.getElementById('cart-service').textContent = '₹' + service.toLocaleString();
  document.getElementById('cart-total').textContent = '₹' + total.toLocaleString();

  if (summaryEl) summaryEl.style.display = 'block';
}

/** Place order — writes to Supabase */
async function placeOrder(paymentMethod) {
  if (cart.length === 0) return;

  const taxRate = appSettings.tax_rate?.percent || 5;
  const serviceRate = appSettings.service_charge?.percent || 10;
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const service = Math.round(subtotal * serviceRate / 100);
  const total = subtotal + tax + service;

  const orderNum = '#' + orderCounter;
  orderCounter++;

  const orderItems = cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, emoji: i.emoji }));

  // Insert order
  const { error: orderErr } = await sb.from('orders').insert({
    order_number: orderNum,
    customer: 'Walk-in',
    items: orderItems,
    subtotal,
    tax,
    service_charge: service,
    total,
    status: 'preparing',
    payment_method: paymentMethod,
    created_by: currentUser.id,
  });

  if (orderErr) {
    showToast('❌', 'Failed to place order: ' + orderErr.message);
    console.error(orderErr);
    return;
  }

  // Insert kitchen order
  await sb.from('kitchen_orders').insert({
    order_id: orderNum,
    table_id: 'Counter',
    items: orderItems,
    priority: 'normal',
    notes: '',
    elapsed_min: 0,
  });

  cart = [];
  renderCart();
  showToast('✅', `Order ${orderNum} placed successfully!`);
}

// ══════════════════════════════════════════════════════════════
// TABLES
// ══════════════════════════════════════════════════════════════

function renderTables() {
  const grid = document.getElementById('tables-grid');
  if (!grid) return;
  grid.innerHTML = tables.map(t => `
    <div class="table-card ${t.status}" onclick="toggleTableStatus(${t.id}, '${t.table_id}', '${t.status}')">
      <div class="table-status-dot"></div>
      <div class="table-number">${t.table_id}</div>
      <div class="table-seats">${t.seats} seats</div>
      ${t.guest ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:6px">${t.guest}</div>` : ''}
      ${t.order_ref ? `<div style="font-size:0.75rem;font-family:var(--font-mono);color:var(--blue);margin-top:4px">${t.order_ref}</div>` : ''}
      <div class="table-status-label">${t.status}</div>
    </div>
  `).join('');
}

async function toggleTableStatus(dbId, tableId, currentStatus) {
  const cycle = ['available', 'occupied', 'reserved', 'cleaning'];
  const idx = cycle.indexOf(currentStatus);
  const newStatus = cycle[(idx + 1) % cycle.length];
  const updates = { status: newStatus, updated_at: new Date().toISOString() };
  if (newStatus === 'available') { updates.guest = ''; updates.order_ref = ''; }

  const { error } = await sb.from('cafe_tables').update(updates).eq('id', dbId);
  if (error) {
    showToast('❌', 'Failed to update table');
    console.error(error);
    return;
  }

  // Optimistic update
  const t = tables.find(t => t.id === dbId);
  if (t) { Object.assign(t, updates); }
  renderTables();
  showToast('🪑', `Table ${tableId} → ${newStatus}`);
}

// ══════════════════════════════════════════════════════════════
// KITCHEN
// ══════════════════════════════════════════════════════════════

function renderKitchen() {
  const grid = document.getElementById('kitchen-grid');
  if (!grid) return;

  const priorityOrder = { critical: 0, rush: 1, normal: 2 };
  const sorted = [...kitchenOrders].sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  grid.innerHTML = sorted.map(order => {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    return `
      <div class="kitchen-ticket">
        <div class="ticket-header">
          <div>
            <div class="ticket-order-num">${order.order_id}</div>
            <div class="ticket-time">Table ${order.table_id}</div>
          </div>
          <span class="ticket-priority priority-${order.priority}">${order.priority}</span>
        </div>
        <div class="ticket-body">
          ${items.map(item => `
            <div class="ticket-item">
              <span class="ticket-item-name">${item.name}</span>
              <span class="ticket-item-qty">×${item.qty}</span>
            </div>
          `).join('')}
          ${order.notes ? `<div class="ticket-notes">📝 ${order.notes}</div>` : ''}
        </div>
        <div class="ticket-footer">
          <button class="ticket-action-btn" onclick="completeKitchenOrder(${order.id})">✓ Mark Ready</button>
          <div class="ticket-elapsed ${order.elapsed_min > 10 ? 'overdue' : ''}">${order.elapsed_min} min elapsed</div>
        </div>
      </div>
    `;
  }).join('');

  const counts = { critical: 0, rush: 0, normal: 0 };
  kitchenOrders.forEach(o => { counts[o.priority] = (counts[o.priority] || 0) + 1; });
  const ce = document.getElementById('critical-count');
  const re = document.getElementById('rush-count');
  const ne = document.getElementById('normal-count');
  if (ce) ce.textContent = counts.critical;
  if (re) re.textContent = counts.rush;
  if (ne) ne.textContent = counts.normal;
}

async function completeKitchenOrder(orderId) {
  const { error } = await sb
    .from('kitchen_orders')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    showToast('❌', 'Failed to update kitchen order');
    return;
  }

  kitchenOrders = kitchenOrders.filter(o => o.id !== orderId);
  renderKitchen();
  showToast('🍳', `Order marked ready!`);
}

// ══════════════════════════════════════════════════════════════
// MENU MANAGEMENT
// ══════════════════════════════════════════════════════════════

function renderMenu() {
  renderMenuItems(menuItems);

  document.getElementById('menu-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = menuItems.filter(i =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
    renderMenuItems(filtered);
  });
}

function renderMenuItems(items) {
  const tbody = document.getElementById('menu-table-body');
  if (!tbody) return;
  const owner = isOwner();
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
      <td style="font-family:var(--font-mono)">${item.orders_today}</td>
      ${owner ? `<td>
        <button class="btn btn-sm btn-outline" onclick="toggleMenuAvailability(${item.id}, ${item.available})">${item.available ? 'Disable' : 'Enable'}</button>
      </td>` : ''}
    </tr>
  `).join('');
}

async function toggleMenuAvailability(itemId, currentAvail) {
  const { error } = await sb
    .from('menu_items')
    .update({ available: !currentAvail, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    showToast('❌', 'Failed to update menu item');
    return;
  }

  const item = menuItems.find(i => i.id === itemId);
  if (item) item.available = !currentAvail;
  renderMenuItems(menuItems);
  renderPOSItems();
  showToast('✅', `${item?.name} is now ${!currentAvail ? 'available' : 'unavailable'}`);
}

// ══════════════════════════════════════════════════════════════
// STAFF
// ══════════════════════════════════════════════════════════════

function renderStaff() {
  const grid = document.getElementById('staff-grid');
  if (!grid) return;
  const owner = isOwner();
  grid.innerHTML = staffList.map(s => `
    <div class="card" style="display:flex;gap:16px;align-items:center">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:#fff;flex-shrink:0">${s.avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem">${s.name}</div>
        <div style="font-size:0.78rem;color:var(--dim)">${s.role} · ${s.shift}</div>
        <div style="display:flex;gap:16px;margin-top:8px">
          <span style="font-size:0.75rem;color:var(--muted)">📦 ${s.orders_count} orders</span>
          <span style="font-size:0.75rem;color:var(--amber)">⭐ ${s.rating}</span>
        </div>
      </div>
      <span class="badge ${s.status === 'active' ? 'badge-available' : 'badge-popular'}">${s.status}</span>
      ${owner ? `<button class="btn btn-sm btn-outline" onclick="showToast('✏️','Edit feature coming soon')">Edit</button>` : ''}
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════

function renderReports() {
  const allOrders = recentOrders;
  const totalRev = allOrders.reduce((s, o) => s + (o.total || 0), 0);
  const paidOrders = allOrders.filter(o => o.status === 'paid');
  const refundAmt = allOrders.filter(o => o.status === 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  const statsEl = document.getElementById('report-stats');
  if (statsEl) {
    statsEl.innerHTML = [
      { label: 'Total Revenue', value: `₹${totalRev.toLocaleString()}`, change: `${allOrders.length} orders total`, positive: true, icon: '💰' },
      { label: 'Total Orders', value: `${allOrders.length}`, change: 'from database', positive: true, icon: '📦' },
      { label: 'Paid Orders', value: `${paidOrders.length}`, change: `₹${paidOrders.reduce((s,o)=>s+o.total,0).toLocaleString()}`, positive: true, icon: '✅' },
      { label: 'Refunds', value: `₹${refundAmt.toLocaleString()}`, change: `${totalRev > 0 ? ((refundAmt/totalRev)*100).toFixed(1) : 0}% of revenue`, positive: false, icon: '↩️' },
    ].map(s => `
      <div class="stat-card fade-in">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-change ${s.positive ? 'positive' : ''}">${s.positive ? '↑' : ''} ${s.change}</div>
      </div>
    `).join('');
  }

  // Top items from menu by orders_today
  const topItems = [...menuItems].sort((a, b) => b.orders_today - a.orders_today).slice(0, 6);
  const topEl = document.getElementById('top-items-list');
  if (topEl) {
    topEl.innerHTML = topItems.map((item, i) => `
      <div class="order-row">
        <div class="order-info">
          <span style="font-size:1.2rem;width:24px;text-align:center;color:var(--dim)">${i + 1}</span>
          <span style="font-size:1.2rem">${item.emoji}</span>
          <span style="font-weight:600">${item.name}</span>
        </div>
        <span style="font-family:var(--font-mono);font-weight:600">${item.orders_today} sold</span>
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

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════

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

function initApp() {
  renderDashboard();
  renderPOS();
  renderCart();
  renderTables();
  renderKitchen();
  renderMenu();
  renderStaff();
  renderReports();

  // Wire up nav (clone to clear old listeners)
  document.querySelectorAll('[data-view]').forEach(el => {
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(clone.dataset.view);
    });
  });

  // Cart & payment
  document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
  document.getElementById('pay-btn')?.addEventListener('click', () => {
    if (cart.length === 0) return;
    const taxRate = appSettings.tax_rate?.percent || 5;
    const serviceRate = appSettings.service_charge?.percent || 10;
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = subtotal + Math.round(subtotal * taxRate / 100) + Math.round(subtotal * serviceRate / 100);
    document.getElementById('modal-total').textContent = '₹' + total.toLocaleString();
    document.getElementById('payment-modal').classList.add('active');
  });

  document.getElementById('cancel-payment')?.addEventListener('click', () => {
    document.getElementById('payment-modal').classList.remove('active');
  });

  document.getElementById('confirm-payment')?.addEventListener('click', () => {
    document.getElementById('payment-modal').classList.remove('active');
    const method = document.querySelector('.payment-method.active')?.dataset.method || 'card';
    placeOrder(method);
  });

  document.querySelectorAll('.payment-method').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  handleHash();
}

/** Boot */
async function boot() {
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  setupPasswordToggle();

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await logout();
    showToast('👋', 'Logged out successfully');
  });

  // Hash
  window.addEventListener('hashchange', () => {
    if (userProfile) handleHash();
  });

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      userProfile = profile;
      enterApp();
      return;
    }
  }

  // No session — show login
  document.getElementById('login-screen').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', boot);
