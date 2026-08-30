/* ==========================================================================
   Restaurant Casestudy — API client

   Talks to the Node backend in server/. Dependency-free and no CDN, so the
   Content-Security-Policy stays tight.

   The API.Auth / API.Data / API.Admin surface is deliberately unchanged from
   the previous backend, so engine.js and admin.js did not need touching.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'rcs:';
  var BASE = (global.APP_CONFIG && global.APP_CONFIG.apiBase) || '/api';

  function ls(k, d) {
    try { var v = localStorage.getItem(NS + k); return v === null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function lset(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} }
  function ldel(k) { try { localStorage.removeItem(NS + k); } catch (e) {} }

  /* ------------------------------------------------------------- transport */
  function request(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var token = Auth.token();
    if (token && opts.auth !== false) headers.Authorization = token;
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });

    return fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    }).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var parse = ct.indexOf('application/json') > -1 ? res.json() : res.text();
      return parse.then(function (data) {
        if (res.ok) return data;
        var msg = (data && data.message) || ('Request failed (' + res.status + ')');
        var err = new Error(msg);
        err.status = res.status;
        err.data = data;
        // A dead session should not leave the interface pretending otherwise.
        if (res.status === 401 && opts.auth !== false) Auth.clear();
        throw err;
      });
    });
  }

  /* ------------------------------------------------------------------ auth */
  var Auth = {
    token: function () { return ls('token', null); },
    user: function () { return ls('user', null); },
    isIn: function () { return !!Auth.token() && !!Auth.user(); },
    isStaff: function () { var u = Auth.user(); return !!u && u.plan === 'staff'; },
    isPro: function () { var u = Auth.user(); return !!u && (u.plan === 'pro' || u.plan === 'staff'); },

    save: function (token, user) {
      lset('token', token);
      lset('user', user);
      // Mirrored to a cookie so nginx could gate static files with auth_request
      // later. SameSite=Lax keeps it off cross-site requests.
      try {
        document.cookie = 'rcs_auth=' + encodeURIComponent(token) +
          ';path=/;max-age=1209600;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : '');
      } catch (e) {}
    },

    clear: function () {
      ldel('token'); ldel('user'); ldel('boot_cache');
      try { document.cookie = 'rcs_auth=;path=/;max-age=0;SameSite=Lax'; } catch (e) {}
    },

    signup: function (email, password, extra) {
      return request('/auth/signup', {
        method: 'POST', auth: false,
        body: {
          email: email, password: password,
          name: (extra && extra.name) || '',
          restaurant: (extra && extra.restaurant) || '',
          city: (extra && extra.city) || ''
        }
      }).then(function (res) {
        Auth.save(res.token, res.user);
        return res.user;
      });
    },

    login: function (email, password) {
      return request('/auth/login', {
        method: 'POST', auth: false, body: { email: email, password: password }
      }).then(function (res) {
        Auth.save(res.token, res.user);
        return res.user;
      });
    },

    logout: function () {
      return request('/auth/logout', { method: 'POST' })
        .catch(function () {})          // signing out locally matters more
        .then(function () { Auth.clear(); });
    },

    /** Verify the stored token is still valid and refresh the cached user. */
    refresh: function () {
      if (!Auth.token()) return Promise.resolve(null);
      return request('/auth/me')
        .then(function (res) { lset('user', res.user); return res.user; })
        .catch(function (err) {
          // Only a rejected session should sign you out. A network blip or a
          // restarting server must not wipe a valid login.
          if (err && err.status === 401) { Auth.clear(); return null; }
          return Auth.user();
        });
    },

    requestReset: function () {
      return Promise.reject(new Error(
        'Password resets by email are not set up yet. Email ' +
        'honestdigitalmarketer@gmail.com and your password will be reset for you.'
      ));
    },

    confirmReset: function () {
      return Promise.reject(new Error('Password resets by email are not set up yet.'));
    },

    updateProfile: function (fields) {
      return request('/auth/profile', { method: 'PATCH', body: fields })
        .then(function (res) { lset('user', res.user); return res.user; });
    },

    changePassword: function (oldPassword, newPassword) {
      return request('/auth/password', {
        method: 'POST', body: { current: oldPassword, next: newPassword }
      }).then(function (res) {
        // The server invalidates every other session, so take the fresh token.
        if (res && res.token) lset('token', res.token);
        return res;
      });
    }
  };

  /* ------------------------------------------------------------- bootstrap */
  var _boot = null;
  function bootstrap(force) {
    if (_boot && !force) return _boot;
    _boot = request('/bootstrap')
      .then(function (data) {
        if (data.user) lset('user', data.user);
        lset('boot_cache', { at: Date.now(), data: data });
        return data;
      })
      .catch(function (err) {
        // Offline or backend down: fall back to the last known good answer so
        // the site degrades rather than breaking.
        var cached = ls('boot_cache', null);
        if (cached && cached.data) return cached.data;
        return { user: null, tools: [], content: {}, announcement: null, _offline: true, _error: err.message };
      });
    return _boot;
  }

  function access(slug) {
    return request('/access/' + encodeURIComponent(slug))
      .catch(function () {
        // If the API is unreachable, fall back to the cached bootstrap answer.
        var cached = ls('boot_cache', null);
        if (cached && cached.data && cached.data.tools) {
          var t = cached.data.tools.filter(function (x) { return x.slug === slug; })[0];
          if (t) return { slug: slug, access: t.access, reason: t.reason, _cached: true };
        }
        return { slug: slug, access: 'full', reason: 'offline', _offline: true };
      });
  }

  /* ----------------------------------------------------------------- data */
  var Data = {
    outlets: function () {
      return request('/outlets').then(function (r) { return r.items || []; });
    },
    createOutlet: function (o) {
      return request('/outlets', {
        method: 'POST',
        body: { name: o.name, city: o.city || '', format: o.format || '' }
      });
    },
    updateOutlet: function (id, fields) {
      return request('/outlets/' + id, { method: 'PATCH', body: fields });
    },
    deleteOutlet: function (id) {
      return request('/outlets/' + id, { method: 'DELETE' });
    },

    worksheets: function (outletId) {
      return request('/worksheets?outlet=' + encodeURIComponent(outletId))
        .then(function (r) { return r.items || []; });
    },
    getWorksheet: function (outletId, tool) {
      return Data.worksheets(outletId).then(function (items) {
        return items.filter(function (w) { return w.tool === tool; })[0] || null;
      });
    },
    // One call: the server decides whether to insert or update.
    saveWorksheet: function (outletId, tool, payload) {
      return request('/worksheets', {
        method: 'PUT',
        body: {
          outlet: outletId, tool: tool,
          data: payload.data, progress: payload.progress || 0,
          score: payload.score || 0, band: payload.band || ''
        }
      });
    },

    snapshots: function (outletId, tool) {
      return request('/snapshots?outlet=' + encodeURIComponent(outletId) +
                     '&tool=' + encodeURIComponent(tool))
        .then(function (r) { return r.items || []; });
    },
    createSnapshot: function (outletId, tool, label, score, data) {
      return request('/snapshots', {
        method: 'POST',
        body: { outlet: outletId, tool: tool, label: label, score: score, data: data }
      });
    },
    deleteSnapshot: function (id) {
      return request('/snapshots/' + id, { method: 'DELETE' });
    },

    lead: function (email, source, note) {
      return request('/leads', {
        method: 'POST', auth: false,
        body: { email: email, source: source || 'site', note: note || '' }
      });
    },

    event: function (type, tool) {
      if (!Auth.isIn()) return Promise.resolve();
      return request('/events', { method: 'POST', body: { type: type, tool: tool || '' } })
        .catch(function () {});   // analytics must never break a page
    }
  };

  /* ---------------------------------------------------------------- admin */
  var Admin = {
    overview: function () { return request('/admin/overview'); },
    users: function (q) { return request('/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    saveUser: function (id, fields) {
      return request('/admin/user/' + id, { method: 'POST', body: fields });
    },
    /** Set a user's password for them — the recovery path while there is no email. */
    setUserPassword: function (id, password) {
      return request('/admin/user/' + id + '/password', {
        method: 'POST', body: { password: password }
      });
    },
    leads: function () { return request('/admin/leads'); },
    leadsCsvUrl: function () { return BASE + '/admin/leads?format=csv'; },
    saveTools: function (items) {
      return request('/admin/tools', { method: 'POST', body: { items: items } });
    },
    toolsAll: function () {
      return request('/admin/tools').then(function (r) { return r.items || []; });
    },

    // Homepage copy and announcements are edited in the HTML for now. These
    // stay so admin.js keeps working; they simply have nothing to manage.
    contentAll: function () { return Promise.resolve([]); },
    saveContent: function () { return Promise.resolve({ ok: true }); },
    announcement: function () { return Promise.resolve(null); },
    saveAnnouncement: function () { return Promise.resolve({ ok: true }); }
  };

  global.API = {
    base: BASE, request: request,
    Auth: Auth, Data: Data, Admin: Admin,
    bootstrap: bootstrap, access: access,
    ls: ls, lset: lset, ldel: ldel
  };
})(window);
