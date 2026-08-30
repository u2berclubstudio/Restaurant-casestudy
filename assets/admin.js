/* ==========================================================================
   Restaurant Casestudy — admin panel
   Every write here goes through a staff-only server route. If a non-staff
   account loads this page, the API refuses and nothing is shown.
   ========================================================================== */
(function () {
  'use strict';

  var TOOL_ORDER = [];
  var state = { users: [], tools: [], content: [], overview: null, editing: null };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function toast(msg, bad) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.background = bad ? 'var(--bad)' : 'var(--ink)';
    t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }
  function fmtDate(s) {
    if (!s) return '—';
    var d = new Date(s.replace(' ', 'T'));
    return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ------------------------------------------------------------- tab wiring */
  function showTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (n) {
      n.classList.toggle('on', n.getAttribute('data-tab') === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (n) {
      n.classList.toggle('hidden', n.getAttribute('data-panel') !== name);
    });
    if (name === 'users' && !state.users.length) loadUsers();
    if (name === 'tools' && !state.tools.length) loadTools();
    if (name === 'content' && !state.content.length) loadContent();
    if (name === 'leads') loadLeads();
  }

  /* --------------------------------------------------------------- overview */
  function loadOverview() {
    API.Admin.overview().then(function (o) {
      state.overview = o;
      el('ovStats').innerHTML =
        tile('Users', o.users_total, (o.users_pro || 0) + ' on Pro') +
        tile('Outlets', o.outlets, 'across all accounts') +
        tile('Worksheets', o.worksheets, 'saved to the server') +
        tile('Leads', o.leads, 'emails captured') +
        tile('Suspended', o.users_suspended, o.users_suspended ? 'need attention' : 'none', o.users_suspended ? 'bad' : '');

      var opens = o.opens_30d || {};
      var keys = Object.keys(opens).sort(function (a, b) { return opens[b] - opens[a]; });
      var max = keys.length ? opens[keys[0]] : 1;
      el('ovUsage').innerHTML = keys.length
        ? keys.map(function (k) {
            return '<div style="margin-bottom:11px">' +
              '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px">' +
              '<span>' + esc(k) + '</span><b>' + opens[k] + '</b></div>' +
              '<div class="bar"><span style="width:' + Math.round(opens[k] / max * 100) + '%"></span></div></div>';
          }).join('')
        : '<p style="color:var(--muted);font-size:14px;margin:0">No tool opens recorded in the last 30 days yet.</p>';
    }).catch(function (e) { toast(e.message, true); });
  }
  function tile(k, v, n, tone) {
    return '<div class="metric ' + (tone || '') + '"><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + (v == null ? '—' : v) + '</div>' +
      (n ? '<div class="n">' + esc(n) + '</div>' : '') + '</div>';
  }

  /* ------------------------------------------------------------------ users */
  function loadUsers(q) {
    el('userRows').innerHTML = '<tr><td colspan="6" style="color:var(--muted)">Loading…</td></tr>';
    API.Admin.users(q).then(function (r) {
      state.users = r.items || [];
      renderUsers();
    }).catch(function (e) {
      el('userRows').innerHTML = '<tr><td colspan="6" style="color:var(--bad)">' + esc(e.message) + '</td></tr>';
    });
  }

  function renderUsers() {
    if (!state.users.length) {
      el('userRows').innerHTML = '<tr><td colspan="6" style="color:var(--muted)">No users yet.</td></tr>';
      return;
    }
    el('userRows').innerHTML = state.users.map(function (u) {
      var granted = 0, denied = 0;
      Object.keys(u.tool_overrides || {}).forEach(function (k) {
        if (u.tool_overrides[k] === 'allow') granted++;
        if (u.tool_overrides[k] === 'deny') denied++;
      });
      var badges = '';
      if (granted) badges += '<span class="pill full">+' + granted + '</span> ';
      if (denied) badges += '<span class="pill none">−' + denied + '</span>';
      return '<tr>' +
        '<td><b>' + esc(u.email) + '</b>' + (u.name ? '<br><span style="color:var(--muted);font-size:12.5px">' + esc(u.name) + (u.restaurant ? ' · ' + esc(u.restaurant) : '') + '</span>' : '') + '</td>' +
        '<td><span class="pill ' + (u.plan === 'pro' ? 'full' : u.plan === 'staff' ? 'preview' : '') + '">' + esc(u.plan) + '</span></td>' +
        '<td>' + (u.suspended ? '<span class="pill none">Suspended</span>' : '<span style="color:var(--good)">Active</span>') + '</td>' +
        '<td>' + (badges || '<span style="color:var(--muted-2)">plan default</span>') + '</td>' +
        '<td style="color:var(--muted);font-size:13px">' + fmtDate(u.created) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" data-edit="' + u.id + '">Manage</button></td>' +
        '</tr>';
    }).join('');

    Array.prototype.forEach.call(el('userRows').querySelectorAll('[data-edit]'), function (b) {
      b.addEventListener('click', function () { openUser(b.getAttribute('data-edit')); });
    });
  }

  function openUser(id) {
    var u = state.users.filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    state.editing = JSON.parse(JSON.stringify(u));

    el('umTitle').textContent = u.email;
    el('umPlan').value = u.plan;
    el('umSuspended').checked = !!u.suspended;
    el('umLimit').value = u.outlet_limit || 1;
    el('umNote').value = u.admin_note || '';

    el('umTools').innerHTML = TOOL_ORDER.map(function (t) {
      var cur = (state.editing.tool_overrides || {})[t.slug] || 'default';
      return '<div class="tal-row">' +
        '<span class="n"><span>' + (t.icon || '•') + '</span>' + esc(t.title) +
        '<span style="color:var(--muted-2);font-size:12px;margin-left:6px">' + esc(t.visibility) + '</span></span>' +
        '<select data-tool="' + t.slug + '" style="width:auto;min-width:130px;padding:6px 28px 6px 10px;font-size:13.5px">' +
          '<option value="default"' + (cur === 'default' ? ' selected' : '') + '>Plan default</option>' +
          '<option value="allow"' + (cur === 'allow' ? ' selected' : '') + '>Always allow</option>' +
          '<option value="deny"' + (cur === 'deny' ? ' selected' : '') + '>Always block</option>' +
        '</select></div>';
    }).join('');

    el('userModal').classList.add('on');
  }

  function saveUser() {
    var e = state.editing;
    if (!e) return;
    var overrides = {};
    Array.prototype.forEach.call(el('umTools').querySelectorAll('[data-tool]'), function (s) {
      if (s.value !== 'default') overrides[s.getAttribute('data-tool')] = s.value;
    });
    var payload = {
      plan: el('umPlan').value,
      suspended: el('umSuspended').checked,
      tool_overrides: overrides,
      outlet_limit: parseInt(el('umLimit').value, 10) || 1,
      admin_note: el('umNote').value
    };
    el('umSave').disabled = true;
    API.Admin.saveUser(e.id, payload).then(function () {
      toast('Saved ' + e.email);
      el('userModal').classList.remove('on');
      el('umSave').disabled = false;
      loadUsers(el('userSearch').value.trim());
    }).catch(function (err) {
      toast(err.message, true);
      el('umSave').disabled = false;
    });
  }

  /* ------------------------------------------------------------------ tools */
  function loadTools() {
    API.Admin.toolsAll().then(function (items) {
      state.tools = items;
      TOOL_ORDER = items.map(function (t) {
        return { slug: t.slug, title: t.title, icon: t.icon, visibility: t.visibility };
      });
      el('toolRows').innerHTML = items.map(function (t) {
        return '<tr data-slug="' + t.slug + '">' +
          '<td><b>' + (t.icon || '') + ' ' + esc(t.title) + '</b><br>' +
            '<span style="color:var(--muted);font-size:12px">/t/' + esc(t.slug) + '</span></td>' +
          '<td><select data-f="visibility" style="min-width:150px">' +
            ['public', 'preview', 'login', 'pro', 'invite', 'hidden'].map(function (v) {
              return '<option value="' + v + '"' + (t.visibility === v ? ' selected' : '') + '>' + visLabel(v) + '</option>';
            }).join('') + '</select></td>' +
          '<td style="text-align:center"><label class="check" style="justify-content:center;padding:0">' +
            '<input type="checkbox" data-f="enabled"' + (t.enabled ? ' checked' : '') + '></label></td>' +
          '<td><input type="text" data-f="locked_message" placeholder="Shown when locked" value="' + esc(t.locked_message || '') + '"></td>' +
          '</tr>';
      }).join('');
    }).catch(function (e) { toast(e.message, true); });
  }

  function visLabel(v) {
    return {
      public: 'Public — anyone',
      preview: 'Preview — try, sign in to save',
      login: 'Requires sign-in',
      pro: 'Pro plan only',
      invite: 'Invite only',
      hidden: 'Hidden'
    }[v] || v;
  }

  function saveTools() {
    var items = [];
    Array.prototype.forEach.call(el('toolRows').querySelectorAll('tr[data-slug]'), function (tr) {
      items.push({
        slug: tr.getAttribute('data-slug'),
        visibility: tr.querySelector('[data-f=visibility]').value,
        enabled: tr.querySelector('[data-f=enabled]').checked,
        locked_message: tr.querySelector('[data-f=locked_message]').value
      });
    });
    API.Admin.saveTools(items)
      .then(function () { toast('Tool settings saved — live immediately'); loadTools(); })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ---------------------------------------------------------------- content */
  function loadContent() {
    API.Admin.contentAll().then(function (items) {
      state.content = items;
      var groups = {};
      items.forEach(function (i) { (groups[i.group || 'other'] = groups[i.group || 'other'] || []).push(i); });
      var names = { hero: 'Homepage hero', stats: 'Statistics strip', tools: 'Tools section',
                    toggles: 'Show / hide sections', pricing: 'Pricing', contact: 'Contact', other: 'Other' };
      el('contentPanels').innerHTML = Object.keys(groups).map(function (g) {
        return '<div class="panel" style="margin-bottom:16px"><h3 style="margin-bottom:16px">' +
          esc(names[g] || g) + '</h3>' +
          groups[g].map(function (i) {
            if (i.kind === 'bool') {
              return '<label class="check" style="margin-bottom:4px"><input type="checkbox" data-key="' + i.key + '" data-kind="bool"' +
                (i.value === 'true' ? ' checked' : '') + '><span>' + esc(i.label || i.key) + '</span></label>';
            }
            if (i.kind === 'textarea') {
              return '<div class="field"><label class="field-label">' + esc(i.label || i.key) + '</label>' +
                '<textarea data-key="' + i.key + '" rows="3">' + esc(i.value) + '</textarea></div>';
            }
            return '<div class="field"><label class="field-label">' + esc(i.label || i.key) + '</label>' +
              '<input type="text" data-key="' + i.key + '" value="' + esc(i.value) + '"></div>';
          }).join('') + '</div>';
      }).join('');
    }).catch(function (e) { toast(e.message, true); });
  }

  function saveContent() {
    var items = [];
    Array.prototype.forEach.call(el('contentPanels').querySelectorAll('[data-key]'), function (n) {
      items.push({
        key: n.getAttribute('data-key'),
        value: n.getAttribute('data-kind') === 'bool' ? (n.checked ? 'true' : 'false') : n.value
      });
    });
    API.Admin.saveContent(items)
      .then(function () { toast('Homepage content saved'); })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ------------------------------------------------------------------ leads */
  function loadLeads() {
    API.Admin.leads().then(function (r) {
      var items = r.items || [];
      el('leadCount').textContent = items.length + ' captured';
      el('leadRows').innerHTML = items.length
        ? items.map(function (l) {
            return '<tr><td><b>' + esc(l.email) + '</b></td><td>' + esc(l.source || '—') +
              '</td><td style="color:var(--muted);font-size:13px">' + fmtDate(l.created) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="3" style="color:var(--muted)">No emails captured yet.</td></tr>';
    }).catch(function (e) {
      el('leadRows').innerHTML = '<tr><td colspan="3" style="color:var(--bad)">' + esc(e.message) + '</td></tr>';
    });
  }

  /* ---------------------------------------------------------- announcement */
  function loadAnnouncement() {
    API.Admin.announcement().then(function (a) {
      if (!a) return;
      el('anMsg').value = a.message || '';
      el('anLinkText').value = a.link_text || '';
      el('anLinkUrl').value = a.link_url || '';
      el('anTone').value = a.tone || 'info';
      el('anAudience').value = a.audience || 'everyone';
      el('anActive').checked = !!a.active;
    });
  }
  function saveAnnouncement() {
    API.Admin.saveAnnouncement({
      message: el('anMsg').value, link_text: el('anLinkText').value,
      link_url: el('anLinkUrl').value, tone: el('anTone').value,
      audience: el('anAudience').value, active: el('anActive').checked
    }).then(function () { toast('Announcement saved'); })
      .catch(function (e) { toast(e.message, true); });
  }

  /* ------------------------------------------------------------------ boot */
  window.PAGE_INIT = function () {
    if (!API.Auth.isIn()) { location.href = 'login.html?next=admin.html'; return; }

    API.Auth.refresh().then(function (u) {
      if (!u) { location.href = 'login.html?next=admin.html'; return; }
      if (u.plan !== 'staff') {
        document.querySelector('main').innerHTML =
          '<div class="wrap" style="padding:80px 22px"><div class="panel" style="max-width:520px;margin:0 auto;text-align:center">' +
          '<div style="font-size:34px;margin-bottom:10px">🔒</div>' +
          '<h2 style="margin-bottom:8px">Staff only</h2>' +
          '<p style="color:var(--muted)">This account does not have admin access. If that is wrong, sign in with your staff account.</p>' +
          '<a class="btn btn-primary btn-sm" href="app.html">Back to dashboard</a></div></div>';
        return;
      }
      el('who').textContent = u.email;
      document.querySelector('main').classList.remove('hidden');

      loadOverview();
      loadTools();
      loadAnnouncement();

      Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
        b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
      });
      el('userSearch').addEventListener('input', function () {
        clearTimeout(window._us);
        window._us = setTimeout(function () { loadUsers(el('userSearch').value.trim()); }, 320);
      });
      el('saveTools').addEventListener('click', saveTools);
      el('saveContent').addEventListener('click', saveContent);
      el('saveAnnounce').addEventListener('click', saveAnnouncement);
      el('umSave').addEventListener('click', saveUser);
      el('umClose').addEventListener('click', function () { el('userModal').classList.remove('on'); });
      el('userModal').addEventListener('click', function (e) {
        if (e.target === el('userModal')) el('userModal').classList.remove('on');
      });
      el('csv').setAttribute('href', API.Admin.leadsCsvUrl());
      el('signout').addEventListener('click', function () {
        API.Auth.logout().then(function () { location.href = 'index.html'; });
      });
    });
  };
})();
