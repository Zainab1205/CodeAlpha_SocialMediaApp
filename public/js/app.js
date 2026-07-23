async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong.');
  return data;
}

async function getCurrentUser() {
  return api('/auth/me');
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarHTML(user, size) {
  const cls = size === 'sm' ? 'avatar avatar-sm' : 'avatar';
  return `<div class="${cls}" style="background:${user.avatar_color || '#2563eb'}">${initials(user.name)}</div>`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

async function renderNav() {
  const user = await getCurrentUser();
  const nav = document.getElementById('site-nav');
  nav.innerHTML = `
    <a href="/" class="nav-brand">📱 CodeAlpha Social</a>
    <div class="nav-links">
      ${user ? `<input class="nav-search" id="nav-search" placeholder="Search people...">` : ''}
      ${user ? `<a href="/">Feed</a><a href="/profile.html?username=${user.username}">Profile</a><button id="logout-btn">Logout</button>` : `<a href="/login.html">Login</a><a href="/register.html">Register</a>`}
    </div>
  `;
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
  const search = document.getElementById('nav-search');
  if (search) {
    search.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && search.value.trim()) {
        window.location.href = '/search.html?q=' + encodeURIComponent(search.value.trim());
      }
    });
  }
  return user;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
