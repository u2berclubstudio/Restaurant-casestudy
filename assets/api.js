/* ==========================================================================
   Restaurant Casestudy — API client
   A small dependency-free PocketBase client. No CDN, no build step, so the
   Content-Security-Policy stays tight.
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
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var parse = ct.indexOf('application/json') > -1 ? res.json() : res.text();
      return parse.then(function (data) {
        if (res.ok) return data;
        var msg = (data && (data.message || data.error)) || ('Request failed (' + res.status + ')');
        // Field-level validation messages are far more useful than the summary.
        if (data && data.data) {
          var first = Object.keys(data.data)[0];
          if (first && data.data[first] && data.data[first].message) {
            msg = data.data[first].message;
          }
        }
        var err = new Error(msg);
        err.status = res.status;
        err.data = data;
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
      // A cookie lets the server-side proxy see auth too, if you later add
      // nginx auth_request. SameSite=Lax keeps it off cross-site requests.
      try {
        document.cookie = 'rcs_auth=' + encodeURIComponent(token) +
          ';path=/;max-age=1209600;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : '');
      } catch (e) {}
    },

    clear: function () {
      ldel('token'); ldel('user');
      try { document.cookie = 'rcs_auth=;path=/;max-age=0;SameSite=Lax'; } catch (e) {}
    },

    signup: function (email, password, extra) {
      var body = {
        email: email, password: password, passwordConfirm: password,
        name: (extra && extra.name) || '',
        restaurant: (extra && extra.restaurant) || '',
        city: (extra && extra.city) || '',
        emailVisibility: false
      };
      return request('/collections/users/records', { method: 'POST', body: body, auth: false })
        .then(function () { return Auth.login(email, password); });
    },

    login: function (email, password) {
      return request('/collections/users/auth-with-password', {
        method: 'POST', auth: false, body: { identity: email, password: password }
      }).then(function (res) {
        Auth.save(res.token, res.record);
        return res.record;
      });
    },

    logout: function () {
      Auth.clear();
      return Promise.resolve();
    },

    /** Verify the stored token is still valid and refresh the cached user. */
    refresh: function () {
      if (!Auth.token()) return Promise.resolve(null);
      return request('/collections/users/auth-refresh', { method: 'POST' })
        .then(function (res) { Auth.save(res.token, res.record); return res.record; })
        .catch(function () { Auth.clear(); return null; });
    },

    requestReset: function (email) {
      return request('/collections/users/request-password-reset', {
        method: 'POST', auth: false, body: { email: email }
      });
    },

    confirmReset: function (token, password) {
      return request('/collections/users/confirm-password-reset', {
        method: 'POST', auth: false,
        body: { token: token, password: password, passwordConfirm: password }
      });
    },

    updateProfile: function (fields) {
      var u = Auth.user();
      if (!u) return Promise.reject(new Error('Not signed in'));
      return request('/collections/users/records/' + u.id, { method: 'PATCH', body: fields })
        .then(function (rec) { lset('user', rec); return rec; });
    },

    changePassword: function (oldPassword, newPassword) {
      var u = Auth.user();
      if (!u) return Promise.reject(new Error('Not signed in'));
      return request('/collections/users/records/' + u.id, {
        method: 'PATCH',
        body: { oldPassword: oldPassword, password: newPassword, passwordConfirm: newPassword }
      });
    }
  };

  /* ------------------------------------------------------------- bootstrap */
  var _boot = null;
  function bootstrap(force) {
    if (_boot && !force) return _boot;
    _boot = request('/rcs/bootstrap')
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
    return request('/rcs/access/' + encodeURIComponent(slug))
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
      return request('/collections/outlets/records?perPage=200&sort=created&filter=' +
        encodeURIComponent('archived != true'))
        .then(function (r) { return r.items || []; });
    },
    createOutlet: function (o) {
      var u = Auth.user();
      return request('/collections/outlets/records', {
        method: 'POST',
        body: { user: u.id, name: o.name, city: o.city || '', format: o.format || '' }
      });
    },
    updateOutlet: function (id, fields) {
      return request('/collections/outlets/records/' + id, { method: 'PATCH', body: fields });
    },
    deleteOutlet: function (id) {
      return request('/collections/outlets/records/' + id, { method: 'DELETE' });
    },

    worksheets: function (outletId) {
      return request('/collections/worksheets/records?perPage=200&filter=' +
        encodeURIComponent('outlet = "' + outletId + '"'))
        .then(function (r) { return r.items || []; });
    },
    getWorksheet: function (outletId, tool) {
      return request('/collections/worksheets/records?perPage=1&filter=' +
        encodeURIComponent('outlet = "' + outletId + '" && tool = "' + tool + '"'))
        .then(function (r) { return (r.items && r.items[0]) || null; });
    },
    saveWorksheet: function (outletId, tool, payload) {
      var u = Auth.user();
      return Data.getWorksheet(outletId, tool).then(function (existing) {
        var body = {
          user: u.id, outlet: outletId, tool: tool,
          data: payload.data, progress: payload.progress || 0,
          score: payload.score || 0, band: payload.band || ''
        };
        return existing
          ? request('/collections/worksheets/records/' + existing.id, { method: 'PATCH', body: body })
          : request('/collections/worksheets/records', { method: 'POST', body: body });
      });
    },

    snapshots: function (outletId, tool) {
      return request('/collections/snapshots/records?perPage=50&sort=-created&filter=' +
        encodeURIComponent('outlet = "' + outletId + '" && tool = "' + tool + '"'))
        .then(function (r) { return r.items || []; });
    },
    createSnapshot: function (outletId, tool, label, score, data) {
      var u = Auth.user();
      return request('/collections/snapshots/records', {
        method: 'POST',
        body: { user: u.id, outlet: outletId, tool: tool, label: label, score: score, data: data }
      });
    },
    deleteSnapshot: function (id) {
      return request('/collections/snapshots/records/' + id, { method: 'DELETE' });
    },

    lead: function (email, source, note) {
      return request('/collections/leads/records', {
        method: 'POST', auth: false,
        body: { email: email, source: source || 'site', note: note || '' }
      });
    },

    event: function (type, tool) {
      if (!Auth.isIn()) return Promise.resolve();
      var u = Auth.user();
      return request('/collections/events/records', {
        method: 'POST', body: { user: u.id, type: type, tool: tool || '' }
      }).catch(function () {});   // analytics must never break a page
    }
  };

  /* ---------------------------------------------------------------- admin */
  var Admin = {
    overview: function () { return request('/rcs/admin/overview'); },
    users: function (q) { return request('/rcs/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    saveUser: function (id, fields) {
      return request('/rcs/admin/user/' + id, { method: 'POST', body: fields });
    },
    leads: function () { return request('/rcs/admin/leads'); },
    leadsCsvUrl: function () { return BASE + '/rcs/admin/leads?format=csv'; },
    saveTools: function (items) {
      return request('/rcs/admin/tools', { method: 'POST', body: { items: items } });
    },
    saveContent: function (items) {
      return request('/rcs/admin/content', { method: 'POST', body: { items: items } });
    },
    contentAll: function () {
      return request('/collections/site_content/records?perPage=300&sort=position')
        .then(function (r) { return r.items || []; });
    },
    toolsAll: function () {
      return request('/collections/tools/records?perPage=100&sort=position')
        .then(function (r) { return r.items || []; });
    },
    saveAnnouncement: function (a) {
      return request('/rcs/admin/announcement', { method: 'POST', body: a });
    },
    announcement: function () {
      return request('/collections/announcements/records?perPage=1&sort=-created')
        .then(function (r) { return (r.items && r.items[0]) || null; })
        .catch(function () { return null; });
    }
  };

  global.API = {
    base: BASE, request: request,
    Auth: Auth, Data: Data, Admin: Admin,
    bootstrap: bootstrap, access: access,
    ls: ls, lset: lset, ldel: ldel
  };
})(window);
