/* ==========================================================================
   Restaurant Casestudy — application engine
   Renders declarative tool schemas, manages outlets, plans and Pro gating.
   Front-end only: every answer stays in the visitor's own browser.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'rcs:';
  var CFG = global.APP_CONFIG || {};

  /* ---------------------------------------------------------------- store */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(NS + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
    keys: function () {
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(NS) === 0) out.push(k.slice(NS.length)); } } catch (e) {}
      return out;
    }
  };

  /* ---------------------------------------------------------------- utils */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function inr(v, dp) {
    if (!isFinite(v)) v = 0;
    var neg = v < 0; v = Math.abs(v);
    var s = dp ? v.toFixed(dp) : Math.round(v).toString();
    var parts = s.split('.'), i = parts[0];
    var last3 = i.slice(-3), rest = i.slice(0, -3);
    if (rest) last3 = ',' + last3;
    i = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last3;
    return (neg ? '-₹' : '₹') + i + (parts[1] ? '.' + parts[1] : '');
  }
  function pct(v) { return (isFinite(v) ? Math.round(v * 10) / 10 : 0) + '%'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = el('div', { class: 'toast' }); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  function modal(opts) {
    var bg = el('div', { class: 'modal-bg on' });
    var m = el('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
    m.appendChild(el('button', { class: 'close', html: '&times;', onclick: close }));
    if (opts.title) m.appendChild(el('h3', { text: opts.title }));
    if (opts.body) m.appendChild(el('div', { html: opts.body }));
    if (opts.node) m.appendChild(opts.node);
    bg.appendChild(m);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    function close() { if (bg.parentNode) document.body.removeChild(bg); }
    return { root: bg, body: m, close: close };
  }

  /* ---------------------------------------------------------------- plan */
  var Plan = {
    get: function () { return store.get('plan', 'free'); },
    isPro: function () { return Plan.get() === 'pro'; },
    set: function (p) { store.set('plan', p); render.chrome(); },

    /* Run cb if Pro; otherwise show the upgrade dialog. */
    require: function (feature, cb) {
      if (Plan.isPro()) { cb(); return; }
      Plan.upsell(feature);
    },

    upsell: function (feature) {
      var f = FEATURES[feature] || { t: 'This is a Pro feature', d: '' };
      var node = el('div');
      node.innerHTML =
        '<span class="pro-pill">Pro</span>' +
        '<h3 style="margin:12px 0 8px">' + esc(f.t) + '</h3>' +
        '<p>' + f.d + '</p>' +
        '<ul>' +
          '<li><i>✓</i><span><b>Unlimited outlets</b> — plan several locations and compare them side by side</span></li>' +
          '<li><i>✓</i><span><b>Export PDF reports</b> — clean, shareable documents for partners, landlords and lenders</span></li>' +
          '<li><i>✓</i><span><b>Industry benchmarks</b> — see your numbers against real ranges for your format</span></li>' +
          '<li><i>✓</i><span><b>Saved snapshots</b> — keep versions of a plan and watch the numbers move</span></li>' +
        '</ul>';
      var row = el('div', { class: 'form-row' });
      row.appendChild(el('a', { class: 'btn btn-primary btn-block', href: rootPath() + 'pricing.html', text: 'See Pro plans' }));
      if (CFG.allowProPreview !== false) {
        row.appendChild(el('button', {
          class: 'btn btn-ghost btn-block', type: 'button',
          text: 'Preview Pro on this device',
          onclick: function () { Plan.set('pro'); mo.close(); toast('Pro preview on — this only affects this browser.'); setTimeout(function () { location.reload(); }, 700); }
        }));
        row.appendChild(el('p', { class: 'form-note', text: 'The preview unlocks Pro features locally so you can see what they do. It is not a purchase and nothing is charged.' }));
      }
      node.appendChild(row);
      var mo = modal({ node: node });
    }
  };

  var FEATURES = {
    outlets: { t: 'Add a second outlet', d: 'The free plan covers one outlet. Pro lets you plan as many as you like — and put their scorecards next to each other, which is how most people decide between two locations.' },
    pdf: { t: 'Export this as a PDF report', d: 'Turn your worksheet into a clean, shareable document — the version you send to a partner, a landlord, or a bank.' },
    benchmarks: { t: 'See how you compare', d: 'Put your numbers against the working ranges for your format, so you know whether 34% food cost is fine or a problem.' },
    snapshots: { t: 'Save a snapshot', d: 'Keep dated versions of a plan. Change an assumption, save again, and see exactly what moved.' },
    compare: { t: 'Compare outlets side by side', d: 'Two locations, one table. Rent ratio, footfall, competition and total score, lined up.' }
  };

  /* ---------------------------------------------------------------- outlets */
  var Outlets = {
    all: function () {
      var list = store.get('outlets', null);
      if (!list || !list.length) {
        list = [{ id: uid(), name: 'My restaurant', city: '', format: '', at: Date.now() }];
        store.set('outlets', list);
        store.set('activeOutlet', list[0].id);
      }
      return list;
    },
    activeId: function () {
      var list = Outlets.all();
      var id = store.get('activeOutlet', null);
      if (!id || !list.filter(function (o) { return o.id === id; }).length) {
        id = list[0].id; store.set('activeOutlet', id);
      }
      return id;
    },
    active: function () {
      var id = Outlets.activeId();
      return Outlets.all().filter(function (o) { return o.id === id; })[0];
    },
    setActive: function (id) { store.set('activeOutlet', id); location.reload(); },
    limit: function () { return Plan.isPro() ? Infinity : 1; },
    canAdd: function () { return Outlets.all().length < Outlets.limit(); },

    add: function () {
      if (!Outlets.canAdd()) { Plan.upsell('outlets'); return; }
      var form = el('form');
      var name = el('input', { type: 'text', placeholder: 'e.g. Model Town branch', required: 'required' });
      var city = el('input', { type: 'text', placeholder: 'City or area' });
      var fmt = el('select');
      ['QSR / Quick service', 'Café', 'Casual dining', 'Fine dining', 'Cloud kitchen', 'Food truck', 'Bakery / Dessert', 'Bar / Pub'].forEach(function (o) {
        fmt.appendChild(el('option', { value: o, text: o }));
      });
      var row = el('div', { class: 'form-row' }, [
        el('label', { class: 'field-label', text: 'Outlet name' }), name,
        el('label', { class: 'field-label', style: 'margin-top:8px', text: 'City / area' }), city,
        el('label', { class: 'field-label', style: 'margin-top:8px', text: 'Format' }), fmt,
        el('button', { class: 'btn btn-primary btn-block', type: 'submit', text: 'Create outlet' })
      ]);
      form.appendChild(row);
      var mo = modal({ title: 'New outlet', body: '<p>Each outlet keeps its own set of worksheets, so nothing gets mixed up between locations.</p>', node: form });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var list = Outlets.all();
        var o = { id: uid(), name: name.value.trim() || 'Untitled outlet', city: city.value.trim(), format: fmt.value, at: Date.now() };
        list.push(o); store.set('outlets', list); store.set('activeOutlet', o.id);
        mo.close(); location.reload();
      });
      name.focus();
    },

    rename: function (id) {
      var list = Outlets.all();
      var o = list.filter(function (x) { return x.id === id; })[0];
      if (!o) return;
      var v = prompt('Rename this outlet', o.name);
      if (v === null) return;
      o.name = v.trim() || o.name; store.set('outlets', list); location.reload();
    },

    remove: function (id) {
      var list = Outlets.all();
      if (list.length < 2) { toast('You need at least one outlet.'); return; }
      var o = list.filter(function (x) { return x.id === id; })[0];
      if (!confirm('Delete "' + o.name + '" and all of its worksheets? This cannot be undone.')) return;
      store.set('outlets', list.filter(function (x) { return x.id !== id; }));
      store.keys().forEach(function (k) { if (k.indexOf('tool:' + id + ':') === 0 || k.indexOf('snap:' + id + ':') === 0) store.del(k); });
      store.del('activeOutlet');
      location.reload();
    }
  };

  /* ---------------------------------------------------------------- account */
  var Account = {
    get: function () { return store.get('account', null); },
    save: function (email, source) {
      var rec = { email: email, source: source || 'site', at: new Date().toISOString() };
      store.set('account', rec);
      if (CFG.leadEndpoint) {
        try {
          fetch(CFG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) }).catch(function () {});
        } catch (e) {}
      }
      return rec;
    }
  };

  function wireInlineForms() {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-lead]'), function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var i = f.querySelector('input[type=email]');
        var v = (i.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { i.focus(); return; }
        Account.save(v, f.getAttribute('data-lead'));
        f.innerHTML = '<div class="callout ok" style="width:100%">' + esc(f.getAttribute('data-done') || 'Done — we\'ll be in touch.') + '</div>';
      });
    });
  }

  /* ---------------------------------------------------------------- paths */
  function rootPath() {
    return /\/t\//.test(location.pathname) ? '../' : './';
  }

  /* ---------------------------------------------------------------- chrome */
  var render = {
    chrome: function () {
      render.outletBar();
      render.planPills();
    },

    planPills: function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-plan-state]'), function (n) {
        n.textContent = Plan.isPro() ? 'Pro' : 'Free';
        n.className = 'pro-pill' + (Plan.isPro() ? ' on' : '');
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-if-pro]'), function (n) {
        n.classList.toggle('hidden', !Plan.isPro());
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-if-free]'), function (n) {
        n.classList.toggle('hidden', Plan.isPro());
      });
    },

    outletBar: function () {
      var host = document.querySelector('[data-outlet-bar]');
      if (!host) return;
      host.innerHTML = '';
      var wrap = el('div', { class: 'wrap' });
      wrap.appendChild(el('span', { class: 'lbl', text: 'Outlet' }));
      var chips = el('div', { class: 'outlet-chips' });
      var activeId = Outlets.activeId();
      Outlets.all().forEach(function (o) {
        var c = el('button', {
          class: 'chip' + (o.id === activeId ? ' on' : ''), type: 'button',
          onclick: function () { o.id === activeId ? Outlets.rename(o.id) : Outlets.setActive(o.id); },
          title: o.id === activeId ? 'Click to rename' : 'Switch to this outlet'
        }, [el('span', { text: o.name + (o.city ? ' · ' + o.city : '') })]);
        chips.appendChild(c);
      });
      var pro = Plan.isPro();
      chips.appendChild(el('button', {
        class: 'chip add', type: 'button',
        html: (pro ? '+ Add outlet' : '+ Add outlet <span class="lock">🔒 Pro</span>'),
        onclick: function () { Outlets.add(); }
      }));
      if (Outlets.all().length > 1) {
        chips.appendChild(el('button', {
          class: 'chip', type: 'button', text: '⇄ Compare',
          onclick: function () { location.href = rootPath() + 'compare.html'; }
        }));
      }
      wrap.appendChild(chips);
      var right = el('div', { style: 'margin-left:auto;display:flex;gap:8px;align-items:center' });
      right.appendChild(el('span', { class: 'pro-pill' + (pro ? ' on' : ''), text: pro ? 'Pro' : 'Free' }));
      if (!pro) right.appendChild(el('a', { class: 'btn btn-outline btn-sm', href: rootPath() + 'pricing.html', text: 'Upgrade' }));
      wrap.appendChild(right);
      host.appendChild(wrap);
    }
  };

  /* ---------------------------------------------------------------- Tool */
  function Tool(schema, mount) {
    this.s = schema;
    this.outlet = Outlets.active();
    this.key = 'tool:' + this.outlet.id + ':' + schema.id;
    this.data = store.get(this.key, {});
    this.mount = mount;
    this.save = debounce(this._save.bind(this), 240);
    this.render();
  }

  Tool.prototype._save = function () {
    store.set(this.key, this.data);
    var idx = store.get('index', {});
    idx[this.outlet.id] = idx[this.outlet.id] || {};
    var r = this.s.result(this.data, this) || {};
    idx[this.outlet.id][this.s.id] = {
      p: this.progress(), at: Date.now(),
      score: this.progress() ? Math.round(r.score || 0) : null,
      band: this.progress() ? (r.band && r.band.label) : null,
      color: this.progress() ? (r.band && r.band.color) : null
    };
    store.set('index', idx);
  };

  Tool.prototype.set = function (id, v) { this.data[id] = v; this.save(); this.refresh(); };
  Tool.prototype.val = function (id, d) {
    var v = this.data[id];
    return (v === undefined || v === null || v === '') ? (d === undefined ? '' : d) : v;
  };

  Tool.prototype.fields = function () {
    var out = [];
    this.s.sections.forEach(function (sec) { (sec.fields || []).forEach(function (f) { out.push(f); }); });
    return out;
  };

  Tool.prototype.isFilled = function (f) {
    var v = this.data[f.id];
    if (f.type === 'info') return true;
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v)) {
      if (f.type === 'table') {
        var seeded = {};
        if (Array.isArray(f.seed)) f.seed.forEach(function (r) { Object.keys(r || {}).forEach(function (k) { seeded[k] = true; }); });
        return v.some(function (row) {
          return Object.keys(row || {}).some(function (k) { return !seeded[k] && String(row[k] || '').trim() !== ''; });
        });
      }
      return v.length > 0;
    }
    if (f.type === 'ratings') return Object.keys(v).length >= (f.items || []).length;
    return true;
  };

  Tool.prototype.progress = function () {
    var fs = this.fields().filter(function (f) { return f.type !== 'info' && !f.optional; });
    if (!fs.length) return 0;
    var n = 0, self = this;
    fs.forEach(function (f) { if (self.isFilled(f)) n++; });
    return Math.round(n / fs.length * 100);
  };

  Tool.prototype.sectionDone = function (sec) {
    var fs = (sec.fields || []).filter(function (f) { return f.type !== 'info' && !f.optional; });
    if (!fs.length) return true;
    var self = this;
    return fs.every(function (f) { return self.isFilled(f); });
  };

  /* --------------------------------------------------------------- render */
  Tool.prototype.render = function () {
    var self = this;
    this.mount.innerHTML = '';
    var main = el('div', { class: 'tool-main' });

    if (this.s.why) {
      main.appendChild(el('div', { class: 'callout', style: 'margin-bottom:16px', html: this.s.why }));
    }

    this.s.sections.forEach(function (sec, i) { main.appendChild(self.renderSection(sec, i)); });

    this.benchEl = el('div', { class: 'panel', style: 'margin-bottom:16px' });
    main.appendChild(this.benchEl);

    this.resultEl = el('div', { class: 'result', id: 'result' });
    main.appendChild(this.resultEl);

    main.appendChild(this.nextBlock());

    this.mount.appendChild(main);
    this.buildSide();
    this.refresh();
  };

  Tool.prototype.renderSection = function (sec, i) {
    var self = this;
    var node = el('section', { class: 'tsec', id: 'sec-' + i }, [
      el('h2', {}, [el('span', { class: 'num', text: 'Section ' + (i + 1) }), el('span', { text: sec.title })])
    ]);
    if (sec.note) node.appendChild(el('p', { class: 'note', html: sec.note }));
    (sec.fields || []).forEach(function (f) { node.appendChild(self.renderField(f)); });
    if (sec.metrics) node.appendChild(el('div', { class: 'metrics', 'data-metrics': i }));
    return node;
  };

  Tool.prototype.renderField = function (f) {
    var self = this, w = el('div', { class: 'field', 'data-f': f.id });
    function labelled(inner) {
      if (f.label) w.appendChild(el('label', { class: 'field-label', for: f.id, html: f.label + (f.optional ? ' <span style="color:var(--muted);font-weight:400">(optional)</span>' : '') }));
      if (f.hint) w.appendChild(el('p', { class: 'hint', html: f.hint }));
      w.appendChild(inner);
      if (f.after) w.appendChild(el('p', { class: 'suffix-note', html: f.after }));
      return w;
    }

    switch (f.type) {
      case 'info':
        w.appendChild(el('div', { class: 'callout ' + (f.tone || ''), html: f.html }));
        return w;

      case 'text': case 'number': case 'date': {
        var i1 = el('input', {
          type: f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text'),
          id: f.id, placeholder: f.placeholder || '', value: this.val(f.id),
          oninput: function (e) { self.set(f.id, e.target.value); }
        });
        return labelled(i1);
      }

      case 'money': {
        var wrap = el('div', { class: 'money-wrap' });
        wrap.appendChild(el('input', {
          type: 'number', id: f.id, min: '0', placeholder: f.placeholder || '0', value: this.val(f.id),
          oninput: function (e) { self.set(f.id, e.target.value); }
        }));
        return labelled(wrap);
      }

      case 'textarea': {
        var t = el('textarea', { id: f.id, placeholder: f.placeholder || '', rows: f.rows || 4, oninput: function (e) { self.set(f.id, e.target.value); } });
        t.value = this.val(f.id);
        if (f.rows) t.style.minHeight = (f.rows * 24 + 22) + 'px';
        return labelled(t);
      }

      case 'select': {
        var s = el('select', { id: f.id, onchange: function (e) { self.set(f.id, e.target.value); } });
        s.appendChild(el('option', { value: '', text: f.placeholder || 'Choose…' }));
        f.options.forEach(function (o) {
          var v = typeof o === 'string' ? o : o.value, lab = typeof o === 'string' ? o : o.label;
          s.appendChild(el('option', { value: v, text: lab }));
        });
        s.value = this.val(f.id);
        return labelled(s);
      }

      case 'checks': {
        var list = el('div', { class: 'check-list' });
        var cur = this.val(f.id, []); if (!Array.isArray(cur)) cur = [];
        f.options.forEach(function (o) {
          var v = o.value || o.label;
          var row = el('label', { class: 'check ' + (o.tone || f.tone || '') + (cur.indexOf(v) > -1 ? ' on' : '') });
          var cb = el('input', { type: 'checkbox' });
          cb.checked = cur.indexOf(v) > -1;
          cb.addEventListener('change', function () {
            var arr = (self.val(f.id, []) || []).slice(), ix = arr.indexOf(v);
            if (cb.checked) { if (ix < 0) arr.push(v); } else if (ix > -1) arr.splice(ix, 1);
            row.classList.toggle('on', cb.checked);
            self.set(f.id, arr);
          });
          row.appendChild(cb);
          row.appendChild(el('span', { html: esc(o.label) + (o.sub ? '<em>' + esc(o.sub) + '</em>' : '') }));
          list.appendChild(row);
        });
        return labelled(list);
      }

      case 'radio': {
        var rl = el('div', { class: 'check-list' });
        var cv = this.val(f.id);
        f.options.forEach(function (o) {
          var v = o.value || o.label;
          var row = el('label', { class: 'check ' + (o.tone || '') + (cv === v ? ' on' : '') });
          var rb = el('input', { type: 'radio', name: f.id });
          rb.checked = cv === v;
          rb.addEventListener('change', function () {
            Array.prototype.forEach.call(rl.children, function (c) { c.classList.remove('on'); });
            row.classList.add('on');
            self.set(f.id, v);
          });
          row.appendChild(rb);
          row.appendChild(el('span', { html: esc(o.label) + (o.sub ? '<em>' + esc(o.sub) + '</em>' : '') }));
          rl.appendChild(row);
        });
        return labelled(rl);
      }

      case 'ratings': {
        var box = el('div', {});
        var vals = this.val(f.id, {}) || {};
        var maxN = f.max || 5;
        f.items.forEach(function (it) {
          var key = it.id || it.label;
          var row = el('div', { class: 'rate-row' });
          row.appendChild(el('div', { class: 'rl', html: esc(it.label) + (it.sub ? '<em>' + esc(it.sub) + '</em>' : '') }));
          var dots = el('div', { class: 'dots' });
          for (var n = 1; n <= maxN; n++) (function (n) {
            var b = el('button', { type: 'button', text: n });
            var cls = n <= 2 ? 'lo' : (n === 3 ? 'mid' : 'hi');
            if (vals[key] === n) b.classList.add('on', cls);
            b.addEventListener('click', function () {
              var cv = self.val(f.id, {}) || {};
              cv[key] = (cv[key] === n) ? undefined : n;
              if (cv[key] === undefined) delete cv[key];
              Array.prototype.forEach.call(dots.children, function (c) { c.className = ''; });
              if (cv[key]) b.classList.add('on', cls);
              self.set(f.id, cv);
            });
            dots.appendChild(b);
          })(n);
          row.appendChild(dots);
          box.appendChild(row);
        });
        box.appendChild(el('p', { class: 'suffix-note', 'data-rating-total': f.id }));
        return labelled(box);
      }

      case 'table': {
        var rep = el('div', { class: 'rep' });
        var scroll = el('div', { class: 'rep-scroll' });
        var tbl = el('table');
        var htr = el('tr');
        f.columns.forEach(function (c) { htr.appendChild(el('th', { text: c.label, style: c.width ? 'width:' + c.width : null })); });
        htr.appendChild(el('th', { text: '', style: 'width:40px' }));
        tbl.appendChild(el('thead', {}, [htr]));
        var tb = el('tbody'); tbl.appendChild(tb);
        scroll.appendChild(tbl); rep.appendChild(scroll);

        var foot = el('div', { class: 'rep-foot' });
        var addBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '+ Add row' });
        var totals = el('div', { class: 'totals' });
        foot.appendChild(addBtn); foot.appendChild(totals);
        rep.appendChild(foot);

        var rows = this.val(f.id, null);
        if (!Array.isArray(rows) || !rows.length) {
          rows = [];
          if (Array.isArray(f.seed)) rows = f.seed.map(function (r) { return Object.assign({}, r); });
          else { var seed = f.seed || 3; for (var k = 0; k < seed; k++) rows.push({}); }
        }
        this.data[f.id] = rows;

        function commit() { self.data[f.id] = rows; self.save(); self.refresh(); }

        function drawRow(row) {
          var tr = el('tr');
          f.columns.forEach(function (c) {
            var td = el('td');
            if (c.calc) { td.className = 'calc'; td.textContent = '—'; }
            else if (c.type === 'select') {
              var s2 = el('select', { onchange: function (e) { row[c.key] = e.target.value; commit(); } });
              s2.appendChild(el('option', { value: '', text: c.placeholder || '—' }));
              c.options.forEach(function (o) { s2.appendChild(el('option', { value: o, text: o })); });
              s2.value = row[c.key] || '';
              td.appendChild(s2);
            } else {
              td.appendChild(el('input', {
                type: (c.type === 'number' || c.type === 'money') ? 'number' : 'text',
                placeholder: c.placeholder || '', value: row[c.key] || '',
                oninput: function (e) { row[c.key] = e.target.value; self.data[f.id] = rows; self.save(); self.refresh(); }
              }));
            }
            tr.appendChild(td);
          });
          tr.appendChild(el('td', {}, [el('button', {
            class: 'del', type: 'button', html: '&times;', title: 'Remove row',
            onclick: function () { rows.splice(rows.indexOf(row), 1); if (!rows.length) rows.push({}); redraw(); commit(); }
          })]));
          return tr;
        }
        function redraw() { tb.innerHTML = ''; rows.forEach(function (r) { tb.appendChild(drawRow(r)); }); }
        addBtn.addEventListener('click', function () { rows.push({}); tb.appendChild(drawRow(rows[rows.length - 1])); commit(); });
        redraw();

        this._tables = this._tables || [];
        this._tables.push({ field: f, tbody: tb, totals: totals });
        return labelled(rep);
      }
    }
    return w;
  };

  /* --------------------------------------------------------------- sidebar */
  Tool.prototype.buildSide = function () {
    var self = this;
    var side = document.querySelector('.side');
    if (!side) return;
    side.innerHTML = '';

    var card = el('div', { class: 'progress-card' });
    card.appendChild(el('h4', { text: self.outlet.name }));
    var bar = el('div', { class: 'bar' }, [el('span')]);
    card.appendChild(bar);
    var pctEl = el('div', { class: 'pct', text: '0% complete' });
    card.appendChild(pctEl);
    var ul = el('ul', { class: 'sec-nav' });
    this.s.sections.forEach(function (sec, i) {
      ul.appendChild(el('li', {}, [el('a', { href: '#sec-' + i }, [
        el('span', { class: 'n', text: (i + 1) }), el('span', { text: sec.title })
      ])]));
    });
    card.appendChild(ul);
    side.appendChild(card);

    var acts = el('div', { class: 'progress-card' });
    acts.appendChild(el('h4', { text: 'Actions' }));
    var stack = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });

    stack.appendChild(el('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      html: Plan.isPro() ? '⬇&nbsp; Export PDF report' : '⬇&nbsp; Export PDF report <span class="lock">🔒</span>',
      onclick: function () { Plan.require('pdf', function () { setTimeout(function () { global.print(); }, 150); }); }
    }));
    stack.appendChild(el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      html: Plan.isPro() ? '💾&nbsp; Save snapshot' : '💾&nbsp; Save snapshot <span class="lock">🔒</span>',
      onclick: function () { Plan.require('snapshots', function () { self.saveSnapshot(); }); }
    }));
    stack.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#result', text: '📊  Jump to my score' }));
    stack.appendChild(el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '↺  Reset this worksheet',
      onclick: function () {
        if (confirm('Clear everything entered in this worksheet for "' + self.outlet.name + '"? This cannot be undone.')) {
          store.del(self.key); location.reload();
        }
      }
    }));
    acts.appendChild(stack);
    this.snapList = el('div', { style: 'margin-top:14px' });
    acts.appendChild(this.snapList);
    acts.appendChild(el('p', { class: 'pct', style: 'margin-top:12px', text: 'Saved automatically, in this browser.' }));
    side.appendChild(acts);

    this.bar = bar.firstChild; this.pctEl = pctEl; this.secNav = ul;
    this.renderSnapshots();
  };

  /* ------------------------------------------------------------- snapshots */
  Tool.prototype.snapKey = function () { return 'snap:' + this.outlet.id + ':' + this.s.id; };
  Tool.prototype.saveSnapshot = function () {
    var list = store.get(this.snapKey(), []);
    var label = prompt('Name this snapshot', 'Version ' + (list.length + 1));
    if (label === null) return;
    var r = this.s.result(this.data, this) || {};
    list.unshift({ at: Date.now(), label: label || ('Version ' + (list.length + 1)), score: Math.round(r.score || 0), data: JSON.parse(JSON.stringify(this.data)) });
    store.set(this.snapKey(), list.slice(0, 20));
    this.renderSnapshots();
    toast('Snapshot saved.');
  };
  Tool.prototype.renderSnapshots = function () {
    if (!this.snapList) return;
    var self = this;
    var list = store.get(this.snapKey(), []);
    if (!Plan.isPro() || !list.length) { this.snapList.innerHTML = ''; return; }
    this.snapList.innerHTML = '<h4 style="font-family:var(--sans);font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:0 0 10px;font-weight:700">Snapshots</h4>';
    list.forEach(function (s, i) {
      var row = el('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--line-2)' });
      row.appendChild(el('span', { text: s.label + ' · ' + s.score }));
      row.appendChild(el('button', {
        class: 'btn btn-ghost btn-sm', type: 'button', text: 'Restore',
        onclick: function () {
          if (!confirm('Replace the current worksheet with "' + s.label + '"?')) return;
          store.set(self.key, s.data); location.reload();
        }
      }));
      self.snapList.appendChild(row);
    });
  };

  /* --------------------------------------------------------------- next up */
  Tool.prototype.nextBlock = function () {
    var d = el('div', { class: 'panel', style: 'margin-top:16px;background:var(--bg-2)' });
    var n = this.s.next;
    d.innerHTML =
      '<div class="kicker">Next</div>' +
      (n
        ? '<h3 style="margin-bottom:8px">' + esc(n.title) + '</h3><p style="color:var(--muted);font-size:14.5px">' + esc(n.why) + '</p>' +
          '<a class="btn btn-primary btn-sm" href="' + n.slug + '.html">Open ' + esc(n.title) + ' →</a>'
        : '<h3 style="margin-bottom:8px">You have worked through every tool</h3><p style="color:var(--muted);font-size:14.5px">Open the dashboard to see all eight scores for this outlet in one place, and where the weakest link is.</p>' +
          '<a class="btn btn-primary btn-sm" href="../app.html">Open the dashboard →</a>');
    return d;
  };

  /* --------------------------------------------------------------- refresh */
  Tool.prototype.refresh = function () {
    var self = this;

    (this._tables || []).forEach(function (t) {
      var f = t.field, rows = self.data[f.id] || [];
      Array.prototype.forEach.call(t.tbody.children, function (tr, ri) {
        var row = rows[ri] || {};
        f.columns.forEach(function (c, ci) {
          if (!c.calc) return;
          var td = tr.children[ci];
          var r = c.calc(row, self.data, self);
          if (r && typeof r === 'object') { td.textContent = r.text; td.className = 'calc ' + (r.tone || ''); }
          else { td.textContent = r == null ? '—' : r; td.className = 'calc'; }
        });
      });
      if (f.totals) t.totals.innerHTML = f.totals(rows, self.data, self);
      else t.totals.innerHTML = '<b>' + rows.filter(function (r) { return Object.keys(r || {}).some(function (k) { return String(r[k] || '').trim() !== ''; }); }).length + '</b> rows filled';
    });

    Array.prototype.forEach.call(this.mount.querySelectorAll('[data-rating-total]'), function (n) {
      var id = n.getAttribute('data-rating-total');
      var f = self.fields().filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      var vals = self.val(id, {}) || {}, sum = 0, count = 0;
      f.items.forEach(function (it) { var k = it.id || it.label; if (vals[k]) { sum += vals[k]; count++; } });
      var max = f.items.length * (f.max || 5);
      n.innerHTML = '<b>Total: ' + sum + ' / ' + max + '</b>' + (count < f.items.length ? '  ·  ' + (f.items.length - count) + ' still to rate' : '  ·  all rated');
    });

    this.s.sections.forEach(function (sec, i) {
      if (!sec.metrics) return;
      var host = self.mount.querySelector('[data-metrics="' + i + '"]');
      if (!host) return;
      host.innerHTML = (sec.metrics(self.data, self) || []).map(function (m) {
        return '<div class="metric ' + (m.tone || '') + '"><div class="k">' + esc(m.k) + '</div><div class="v">' + esc(m.v) + '</div>' + (m.n ? '<div class="n">' + esc(m.n) + '</div>' : '') + '</div>';
      }).join('');
    });

    var p = this.progress();
    if (this.bar) this.bar.style.width = p + '%';
    if (this.pctEl) this.pctEl.textContent = p + '% complete';
    if (this.secNav) Array.prototype.forEach.call(this.secNav.querySelectorAll('a'), function (a, i) {
      a.classList.toggle('done', self.sectionDone(self.s.sections[i]));
    });

    this.renderBenchmarks();
    this.renderResult();
  };

  /* ------------------------------------------------------------ benchmarks */
  Tool.prototype.renderBenchmarks = function () {
    if (!this.benchEl) return;
    if (!this.s.benchmarks) { this.benchEl.className = 'hidden'; return; }
    this.benchEl.className = 'panel';
    this.benchEl.style.marginBottom = '16px';

    if (!Plan.isPro()) {
      this.benchEl.innerHTML =
        '<div class="locked"><span class="pro-pill">Pro</span>' +
        '<h4 style="margin-top:10px">Industry benchmarks</h4>' +
        '<p>See your numbers set against the working ranges for your format, so you know whether a figure is normal or a problem.</p>' +
        '<button class="btn btn-primary btn-sm" type="button" data-up="benchmarks">Unlock benchmarks</button></div>';
      var b = this.benchEl.querySelector('[data-up]');
      if (b) b.addEventListener('click', function () { Plan.upsell('benchmarks'); });
      return;
    }

    var rows = this.s.benchmarks(this.data, this) || [];
    if (!rows.length) {
      this.benchEl.innerHTML = '<div class="kicker">Benchmarks <span class="pro-pill on">Pro</span></div><p style="color:var(--muted);font-size:14.5px;margin:0">Fill in the numbers above and your figures will be compared against typical ranges here.</p>';
      return;
    }
    this.benchEl.innerHTML =
      '<div class="kicker">Benchmarks <span class="pro-pill on">Pro</span></div>' +
      '<table class="bench"><thead><tr><th>Metric</th><th>You</th><th>Typical range</th><th>Verdict</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td class="you">' + esc(r.you) + '</td><td style="color:var(--muted)">' + esc(r.range) + '</td>' +
          '<td class="' + (r.ok ? 'ok' : 'off') + '">' + (r.ok ? 'In range' : esc(r.note || 'Outside range')) + '</td></tr>';
      }).join('') + '</tbody></table>';
  };

  /* --------------------------------------------------------------- result */
  Tool.prototype.renderResult = function () {
    var self = this;
    var r = this.s.result(this.data, this) || {};

    if (this.progress() === 0) {
      r = {
        title: this.s.title,
        subtitle: 'Your scored verdict appears here as you fill in the worksheet.',
        score: 0, scoreLabel: '—', scoreUnit: r.scoreUnit || 'READINESS',
        band: { label: 'Not started', color: '#6d6d7a', text: 'Work down the sections above. Everything saves as you type, and specific problems get flagged here the moment the numbers say something.' },
        flags: []
      };
    }

    var score = Math.max(0, Math.min(100, Math.round(r.score || 0)));
    var band = r.band || {};
    var color = band.color || '#c41230';

    var h = '';
    h += '<h2>' + esc(r.title || 'Your result') + '</h2>';
    h += '<p style="color:#a9a9b8;margin:0;font-size:14.5px">' + esc(r.subtitle || '') + '</p>';
    h += '<div class="score-ring"><div class="ring" style="background:conic-gradient(' + color + ' calc(' + score + '*1%), rgba(255,255,255,.11) 0)"><b>' + (r.scoreLabel === undefined ? score : r.scoreLabel) + '<small>' + esc(r.scoreUnit || 'READINESS') + '</small></b></div>';
    h += '<div class="verdict"><span class="badge" style="background:' + color + '">' + esc(band.label || '—') + '</span><p>' + (band.text || '') + '</p></div></div>';
    if (r.flags && r.flags.length) {
      h += '<div class="flags">' + r.flags.map(function (f) {
        return '<div class="flag ' + (f.tone || '') + '"><span>' + (f.icon || '•') + '</span><span>' + f.text + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<div class="result-actions no-print">' +
      '<button class="btn btn-primary" type="button" data-act="pdf">' + (Plan.isPro() ? 'Export PDF report' : 'Export PDF report 🔒') + '</button>' +
      '<a class="btn btn-ghost" href="../app.html">Back to dashboard</a>' +
      '</div>';

    this.resultEl.innerHTML = h;
    var b = this.resultEl.querySelector('[data-act=pdf]');
    if (b) b.addEventListener('click', function () { Plan.require('pdf', function () { setTimeout(function () { global.print(); }, 150); }); });
  };

  /* ------------------------------------------------------------ page glue */
  function markCards() {
    var idx = (store.get('index', {}) || {})[Outlets.activeId()] || {};
    Array.prototype.forEach.call(document.querySelectorAll('.tool-card[data-tool]'), function (c) {
      var rec = idx[c.getAttribute('data-tool')];
      if (rec && rec.p > 0) c.appendChild(el('span', { class: 'done-flag', text: rec.p >= 100 ? 'Complete' : rec.p + '%' }));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render.chrome();
    wireInlineForms();
    markCards();

    Array.prototype.forEach.call(document.querySelectorAll('[data-upsell]'), function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); Plan.upsell(b.getAttribute('data-upsell')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-plan]'), function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var p = b.getAttribute('data-set-plan');
        if (p === 'pro') { Plan.set('pro'); toast('Pro preview on — this browser only.'); }
        else { Plan.set('free'); toast('Back to the free plan.'); }
        setTimeout(function () { location.reload(); }, 600);
      });
    });

    var mount = document.getElementById('tool-mount');
    if (mount && global.TOOL_SCHEMA) {
      document.title = global.TOOL_SCHEMA.title + ' · Restaurant Casestudy';
      new Tool(global.TOOL_SCHEMA, mount);
    }
    if (global.PAGE_INIT) global.PAGE_INIT();
  });

  global.App = {
    store: store, el: el, num: num, inr: inr, pct: pct, esc: esc,
    Plan: Plan, Outlets: Outlets, Account: Account, Tool: Tool,
    toast: toast, modal: modal, render: render, rootPath: rootPath
  };
})(window);
