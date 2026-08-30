/* Restaurant Casestudy — Budget & Break-Even Calculator */
window.TOOL_SCHEMA = {
  id: 'break-even',
  icon: '🧮',
  title: 'Budget & Break-Even Calculator',
  subtitle: 'Plan every rupee before you spend it. This tool tells you two things most owners only discover in month six: whether your budget is survivable, and how many customers a day you actually need.',
  why: "<strong>Why this matters.</strong> Most owners have a revenue target and no idea what it means in people walking through the door. This turns fixed costs, food cost and average spend into a single number \u2014 customers per day \u2014 and tells you how long your cash lasts if you miss it.",
  next: { slug: 'menu', title: "Menu Engineering", why: "You know your break-even. The menu is what decides whether each customer gets you closer to it." },

  sections: [
    {
      title: 'Set the ceiling first',
      note: 'Before you allocate anything, establish the total you actually have. This is the maximum — including setup, reserve, and everything else.',
      fields: [
        { id: 'total', type: 'money', label: 'Total money available for this restaurant', placeholder: '2000000' },
        { id: 'personal', type: 'money', label: 'Of that, how much must cover your personal living costs until the restaurant pays you?', placeholder: '300000', hint: 'Most restaurants pay the owner nothing for 9–12 months. Budget for that reality here, not in hope.' },
        { id: 'source', type: 'select', label: 'Primary source of funds', options: ['Personal savings', 'Family', 'Bank loan', 'Partner / investor', 'Mix of sources'] },
        { id: 'emi', type: 'money', label: 'Monthly loan EMI, if any', optional: true, placeholder: '0' }
      ],
      metrics: function (d) {
        var T = window.App;
        var tot = T.num(d.total), per = T.num(d.personal);
        var biz = Math.max(0, tot - per);
        var reserve = biz * 0.2;
        if (!tot) return [{ k: 'Setup budget', v: '—', n: 'Enter your total budget' }];
        return [
          { k: 'Restaurant budget', v: T.inr(biz), n: 'After personal living costs' },
          { k: 'Mandatory cash reserve (20%)', v: T.inr(reserve), n: 'This never gets spent on setup', tone: 'warn' },
          { k: 'Actual Version 1 setup budget', v: T.inr(biz - reserve), n: 'Everything below must fit inside this', tone: 'good' }
        ];
      }
    },

    {
      title: 'Version 1 setup budget — allocate every rupee',
      note: 'Target allocation: <strong>Interiors ≤ 25%</strong> · <strong>Equipment ≤ 20%</strong> · <strong>Reserve ≥ 20%</strong> · never zero on marketing or on training.',
      fields: [
        {
          id: 'setup', type: 'table', label: 'Where the setup money goes',
          columns: [
            { key: 'item', label: 'Category', placeholder: 'Category' },
            { key: 'amt', label: 'Planned spend ₹', type: 'number', placeholder: '0', width: '140px' },
            { key: 'cond', label: 'New or used', type: 'select', options: ['New', 'Second-hand', 'Mixed', 'N/A'] },
            {
              key: 'share', label: '% of setup', calc: function (r, d) {
                var T = window.App;
                var biz = Math.max(0, T.num(d.total) - T.num(d.personal));
                var setupBudget = biz * 0.8;
                if (!setupBudget || !T.num(r.amt)) return { text: '—' };
                var p = T.num(r.amt) / setupBudget * 100;
                var cap = { 'Interiors & fit-out': 25, 'Kitchen equipment': 20, 'Furniture': 10, 'Security deposit': 20, 'Licences & registrations': 5, 'Initial inventory': 8, 'Pre-opening marketing': 8, 'Staff hiring & training': 6, 'POS / billing / tech': 4, 'Signage & branding': 5, 'Contingency': 10 }[r.item];
                return { text: T.pct(p), tone: cap && p > cap ? 'bad' : (p > 30 ? 'warn' : '') };
              }
            }
          ],
          seed: [
            { item: 'Interiors & fit-out' }, { item: 'Kitchen equipment' }, { item: 'Furniture' },
            { item: 'Security deposit' }, { item: 'Licences & registrations' }, { item: 'Initial inventory' },
            { item: 'Pre-opening marketing' }, { item: 'Staff hiring & training' }, { item: 'POS / billing / tech' },
            { item: 'Signage & branding' }, { item: 'Contingency' }
          ],
          totals: function (rows, d) {
            var T = window.App;
            var tot = rows.reduce(function (a, r) { return a + T.num(r.amt); }, 0);
            var biz = Math.max(0, T.num(d.total) - T.num(d.personal));
            var budget = biz * 0.8;
            if (!tot) return 'Allocate your setup budget line by line.';
            var over = tot - budget;
            return 'Allocated <b>' + T.inr(tot) + '</b>' + (budget ? ' of <b>' + T.inr(budget) + '</b> · ' +
              (over > 0 ? '<span style="color:var(--red)">over by ' + T.inr(over) + '</span>' : '<span style="color:var(--green)">' + T.inr(-over) + ' unallocated</span>') : '');
          }
        }
      ],
      metrics: function (d) {
        var T = window.App;
        var rows = d.setup || [];
        function get(name) { var r = rows.filter(function (x) { return x.item === name; })[0]; return r ? T.num(r.amt) : 0; }
        var tot = rows.reduce(function (a, r) { return a + T.num(r.amt); }, 0);
        if (!tot) return [];
        var int = get('Interiors & fit-out'), eq = get('Kitchen equipment');
        var mk = get('Pre-opening marketing'), tr = get('Staff hiring & training');
        return [
          { k: 'Interiors', v: T.pct(int / tot * 100), n: 'Target ≤ 25%', tone: int / tot > 0.25 ? 'bad' : 'good' },
          { k: 'Equipment', v: T.pct(eq / tot * 100), n: 'Target ≤ 20%', tone: eq / tot > 0.2 ? 'bad' : 'good' },
          { k: 'Pre-opening marketing', v: T.inr(mk), n: 'Never zero', tone: mk <= 0 ? 'bad' : 'good' },
          { k: 'Staff training', v: T.inr(tr), n: 'Never zero', tone: tr <= 0 ? 'bad' : 'good' }
        ];
      }
    },

    {
      title: 'Second-hand equipment planner',
      note: 'For every piece of equipment, find both the new price and the second-hand price. The difference goes straight into your cash reserve. Sources: local restaurant equipment dealers, OLX, IndiaMART, auctions from closed restaurants, wholesale markets in your city.',
      fields: [
        {
          id: 'equip', type: 'table', label: 'Equipment — new vs second-hand',
          columns: [
            { key: 'item', label: 'Equipment', placeholder: 'e.g. Deep fryer' },
            { key: 'newp', label: 'New ₹', type: 'number', placeholder: '0', width: '110px' },
            { key: 'used', label: 'Second-hand ₹', type: 'number', placeholder: '0', width: '130px' },
            { key: 'buy', label: 'Buying', type: 'select', options: ['New', 'Second-hand'] },
            {
              key: 'save', label: 'Saved', calc: function (r) {
                var T = window.App;
                if (!T.num(r.newp)) return { text: '—' };
                if (r.buy === 'Second-hand' && T.num(r.used)) {
                  var s = T.num(r.newp) - T.num(r.used);
                  return { text: T.inr(s), tone: 'good' };
                }
                if (r.buy === 'New' && T.num(r.used)) return { text: '-' + T.inr(T.num(r.newp) - T.num(r.used)), tone: 'bad' };
                return { text: '—' };
              }
            }
          ],
          seed: [{ item: 'Commercial gas range' }, { item: 'Refrigeration / deep freezer' }, { item: 'Chimney & exhaust' }, { item: 'Prep tables & sinks' }, { item: 'Utensils & smallwares' }, {}],
          totals: function (rows) {
            var T = window.App;
            var saved = rows.reduce(function (a, r) {
              return a + (r.buy === 'Second-hand' && T.num(r.newp) && T.num(r.used) ? T.num(r.newp) - T.num(r.used) : 0);
            }, 0);
            var missed = rows.reduce(function (a, r) {
              return a + (r.buy === 'New' && T.num(r.newp) && T.num(r.used) ? T.num(r.newp) - T.num(r.used) : 0);
            }, 0);
            return 'Saved by going second-hand: <b style="color:var(--green)">' + T.inr(saved) + '</b>' +
              (missed ? ' · left on the table by buying new: <b style="color:var(--red)">' + T.inr(missed) + '</b>' : '');
          }
        },
        { id: 'equip_note', type: 'info', tone: 'info', html: '<strong>Never buy new equipment for a menu that has not been tested.</strong> Version 1 exists to find out what your customer actually orders. Half the equipment on most opening lists is never used at full capacity in year one.' }
      ]
    },

    {
      title: 'Monthly running costs — the number that decides everything',
      note: 'Every cost that arrives whether you serve 10 customers or 200. This is your fixed cost base — and it is what your break-even is built on.',
      fields: [
        {
          id: 'fixed', type: 'table', label: 'Fixed monthly costs',
          columns: [
            { key: 'item', label: 'Cost', placeholder: 'Cost' },
            { key: 'amt', label: 'Per month ₹', type: 'number', placeholder: '0', width: '150px' },
            {
              key: 'daily', label: 'Per day', calc: function (r) {
                var T = window.App;
                return T.num(r.amt) ? { text: T.inr(T.num(r.amt) / 26) } : { text: '—' };
              }
            }
          ],
          seed: [
            { item: 'Rent' }, { item: 'Staff salaries' }, { item: 'Electricity, water, gas' },
            { item: 'Loan EMI' }, { item: 'Internet, POS, subscriptions' }, { item: 'Accounting & compliance' },
            { item: 'Ongoing marketing' }, { item: 'Maintenance & repairs' }, { item: 'Insurance' }
          ],
          totals: function (rows) {
            var T = window.App;
            var tot = rows.reduce(function (a, r) { return a + T.num(r.amt); }, 0);
            if (!tot) return 'List every cost that arrives regardless of sales.';
            return 'Fixed cost: <b>' + T.inr(tot) + '</b>/month · <b>' + T.inr(tot / 26) + '</b>/day · <b>' + T.inr(tot / 26 / 12) + '</b>/hour of trading';
          }
        },
        { id: 'foodcost', type: 'number', label: 'Expected food cost as % of sales', placeholder: '32', hint: 'Target 28–35%. Above 40% and the menu is broken — take it through the Menu Engineering tool.' },
        { id: 'varother', type: 'number', label: 'Other variable costs as % of sales', placeholder: '8', hint: 'Packaging, aggregator commission share, card fees, consumables. Delivery-heavy restaurants should count aggregator commission here — it is often 18–25%.' },
        { id: 'spend', type: 'money', label: 'Expected average spend per customer', placeholder: '300' },
        { id: 'opdays', type: 'number', label: 'Operating days per month', placeholder: '26' }
      ],
      metrics: function (d) {
        var T = window.App;
        var fixed = (d.fixed || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
        var fc = T.num(d.foodcost), vo = T.num(d.varother);
        var spend = T.num(d.spend), days = T.num(d.opdays) || 26;
        var cm = 1 - (fc + vo) / 100;
        if (!fixed || !spend || cm <= 0) return [{ k: 'Break-even', v: '—', n: 'Enter fixed costs, food cost % and average spend' }];
        var beRev = fixed / cm;
        var beCust = beRev / spend;
        return [
          { k: 'Contribution margin', v: T.pct(cm * 100), n: 'Every ₹100 of sales leaves ' + T.inr(cm * 100) + ' toward fixed costs', tone: cm >= 0.6 ? 'good' : (cm >= 0.5 ? 'warn' : 'bad') },
          { k: 'Break-even revenue', v: T.inr(beRev), n: 'Per month, just to reach zero' },
          { k: 'Customers needed / month', v: Math.ceil(beCust).toLocaleString('en-IN') },
          { k: 'Customers needed / day', v: Math.ceil(beCust / days), n: 'Over ' + days + ' operating days', tone: beCust / days > 120 ? 'bad' : (beCust / days > 70 ? 'warn' : 'good') },
          { k: 'Fixed cost per trading hour', v: T.inr(fixed / days / 12), n: 'What an empty hour costs you' }
        ];
      }
    },

    {
      title: 'Reality check',
      note: 'Now compare the break-even number above against what this location can realistically deliver.',
      fields: [
        { id: 'real_cust', type: 'number', label: 'Realistically, how many customers per day will you serve in month 3?', placeholder: '45', hint: 'Not your best Saturday. The number you would still hit on an ordinary Wednesday.' },
        { id: 'real_cust6', type: 'number', label: 'And in month 6?', placeholder: '70' },
        {
          id: 'realistic', type: 'radio', label: 'Is the daily break-even number realistic for your location and concept?',
          options: [
            { label: 'Yes — confidently', tone: 'good' },
            { label: 'Possibly — with real effort' },
            { label: 'No — I need to rethink the numbers', tone: 'risk' }
          ]
        }
      ],
      metrics: function (d) {
        var T = window.App;
        var fixed = (d.fixed || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
        var cm = 1 - (T.num(d.foodcost) + T.num(d.varother)) / 100;
        var spend = T.num(d.spend), days = T.num(d.opdays) || 26;
        if (!fixed || !spend || cm <= 0) return [];
        var beDay = fixed / cm / spend / days;
        var m3 = T.num(d.real_cust), m6 = T.num(d.real_cust6);
        var out = [];
        if (m3) {
          var p3 = (m3 * spend * days * cm) - fixed;
          out.push({ k: 'Month 3 monthly P&L', v: T.inr(p3), n: p3 >= 0 ? 'Profitable' : 'Loss — funded from your reserve', tone: p3 >= 0 ? 'good' : 'bad' });
          out.push({ k: 'Month 3 gap to break-even', v: Math.max(0, Math.ceil(beDay - m3)) + ' customers/day', tone: m3 >= beDay ? 'good' : 'warn' });
        }
        if (m6) {
          var p6 = (m6 * spend * days * cm) - fixed;
          out.push({ k: 'Month 6 monthly P&L', v: T.inr(p6), n: p6 >= 0 ? 'Profitable' : 'Still loss-making', tone: p6 >= 0 ? 'good' : 'bad' });
        }
        return out;
      }
    },

    {
      title: 'Cash reserve & runway',
      note: 'Your reserve is your survival fund, not your emergency top-up for a nicer counter. This calculates how long it keeps you alive if revenue is well below plan.',
      fields: [
        { id: 'reserve', type: 'money', label: 'Cash reserve you will actually keep in the bank on opening day', placeholder: '400000' },
        { id: 'owner_draw', type: 'money', label: 'Monthly amount you must draw from the business to live', optional: true, placeholder: '0', hint: 'If you can live on savings for the first year, keep this at zero. It changes the runway dramatically.' }
      ],
      metrics: function (d) {
        var T = window.App;
        var fixed = (d.fixed || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
        var cm = 1 - (T.num(d.foodcost) + T.num(d.varother)) / 100;
        var spend = T.num(d.spend), days = T.num(d.opdays) || 26;
        var res = T.num(d.reserve), draw = T.num(d.owner_draw);
        var m3 = T.num(d.real_cust);
        var biz = Math.max(0, T.num(d.total) - T.num(d.personal));
        var out = [];
        if (biz) out.push({ k: 'Reserve as % of budget', v: T.pct(res / biz * 100), n: 'Minimum 20%', tone: res / biz >= 0.2 ? 'good' : 'bad' });
        if (res && fixed) {
          var burnEmpty = fixed + draw;
          out.push({ k: 'Runway at zero revenue', v: (res / burnEmpty).toFixed(1) + ' months', tone: res / burnEmpty >= 3 ? 'good' : 'bad' });
          if (m3 && spend && cm > 0) {
            var monthly = (m3 * spend * days * cm) - fixed - draw;
            if (monthly < 0) {
              out.push({ k: 'Runway at month-3 sales', v: (res / -monthly).toFixed(1) + ' months', n: 'Burning ' + T.inr(-monthly) + '/month', tone: res / -monthly >= 6 ? 'good' : (res / -monthly >= 3 ? 'warn' : 'bad') });
            } else {
              out.push({ k: 'Runway at month-3 sales', v: 'Cash positive', n: 'Generating ' + T.inr(monthly) + '/month', tone: 'good' });
            }
          }
        }
        return out;
      }
    },

    {
      title: 'The patience plan — surviving months 3 to 9',
      note: 'The middle period is when most restaurants give up. Plan for it now, before it arrives and you are too tired to think.',
      fields: [
        { id: 'patience', type: 'textarea', label: 'What will you do to maintain energy and judgement during the slow months?', rows: 3 },
        {
          id: 'track', type: 'checks', tone: 'good', label: 'What I will track from week one',
          options: [
            { label: 'Which dishes sell most — and which never get ordered' },
            { label: 'Peak hours and dead periods, hour by hour' },
            { label: 'Average spend per customer against my assumption' },
            { label: 'Repeat customer rate — who comes back, and how often' },
            { label: 'What customers ask for that I don\'t offer' },
            { label: 'Food cost percentage — weekly, not monthly' },
            { label: 'Staff performance — who is an asset, who is a problem' }
          ]
        },
        { id: 'plan_50', type: 'textarea', label: 'What is your plan if month 3 revenue is 50% below expectations?', rows: 3, placeholder: 'Specific actions, in order, with the trigger for each.' },
        { id: 'plan_stop', type: 'textarea', label: 'What would make you consider closing — and what would make you stay?', rows: 3, placeholder: 'Deciding this in advance, calmly, is the kindest thing you can do for yourself later.' }
      ]
    },

    {
      title: 'Version 2 wishlist',
      note: 'Everything you deliberately chose NOT to spend on in Version 1 — and why it is waiting. This keeps the vision alive without draining the budget that keeps you open.',
      fields: [
        {
          id: 'v2', type: 'table', label: 'Saved for Version 2',
          columns: [
            { key: 'item', label: 'What', placeholder: 'e.g. Full bar counter' },
            { key: 'cost', label: 'Est. cost ₹', type: 'number', placeholder: '0', width: '130px' },
            { key: 'trigger', label: 'What has to be true first', placeholder: 'e.g. 3 straight profitable months' }
          ],
          seed: 3,
          totals: function (rows) {
            var T = window.App;
            var tot = rows.reduce(function (a, r) { return a + T.num(r.cost); }, 0);
            return tot ? 'Total Version 2 investment: <b>' + T.inr(tot) + '</b> — funded from profit, not from your opening budget' : 'What are you deliberately postponing?';
          }
        },
        { id: 'v2_when', type: 'text', label: 'Target month for Version 2', optional: true, placeholder: 'e.g. Month 14, if we hit 3 profitable months first' },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before you spend a single rupee',
          options: [
            { label: 'I know my total budget and have separated personal expenses from it' },
            { label: 'My cash reserve is at least 20% of budget and I will not touch it for setup' },
            { label: 'My Version 1 menu has 25 items or fewer, each one justified' },
            { label: 'I have priced every major equipment item second-hand as well as new' },
            { label: 'I know my monthly break-even revenue and my daily customer number' },
            { label: 'I have budgeted something for pre-opening marketing' },
            { label: 'I have budgeted something for staff training' },
            { label: 'I have a written plan for a 50%-below-expectations month 3' }
          ]
        }
      ]
    }
  ],

  benchmarks: function (d) {
    var T = window.App, out = [];
    var setup = (d.setup || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
    function cat(n) { var r = (d.setup || []).filter(function (x) { return x.item === n; })[0]; return r ? T.num(r.amt) : 0; }
    if (setup) {
      out.push({ label: 'Interiors share of setup', you: T.pct(cat('Interiors & fit-out') / setup * 100), range: 'Up to 25%', ok: cat('Interiors & fit-out') / setup <= 0.25, note: 'Over-invested' });
      out.push({ label: 'Equipment share of setup', you: T.pct(cat('Kitchen equipment') / setup * 100), range: 'Up to 20%, mostly second-hand', ok: cat('Kitchen equipment') / setup <= 0.20, note: 'Over-invested' });
    }
    if (T.num(d.foodcost)) out.push({ label: 'Food cost', you: T.num(d.foodcost) + '%', range: '28–35% healthy · 40% maximum', ok: T.num(d.foodcost) <= 35, note: T.num(d.foodcost) <= 40 ? 'High' : 'Unsustainable' });
    var cm = 1 - (T.num(d.foodcost) + T.num(d.varother)) / 100;
    if (T.num(d.foodcost)) out.push({ label: 'Contribution margin', you: T.pct(cm * 100), range: '55–65% typical for dine-in', ok: cm >= 0.55, note: 'Thin' });
    var biz = Math.max(0, T.num(d.total) - T.num(d.personal));
    if (biz && T.num(d.reserve)) out.push({ label: 'Cash reserve', you: T.pct(T.num(d.reserve) / biz * 100) + ' of budget', range: '20% minimum · 25–30% comfortable', ok: T.num(d.reserve) / biz >= 0.2, note: 'Under-reserved' });
    var fixed = (d.fixed || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
    if (fixed && T.num(d.reserve)) {
      var run = T.num(d.reserve) / (fixed + T.num(d.owner_draw));
      out.push({ label: 'Runway at zero revenue', you: run.toFixed(1) + ' months', range: '6 months target · 3 months minimum', ok: run >= 3, note: 'Dangerously short' });
    }
    return out;
  },

  result: function (d) {
    var T = window.App;
    var tot = T.num(d.total), per = T.num(d.personal);
    var biz = Math.max(0, tot - per);
    var setupRows = d.setup || [];
    var setupTot = setupRows.reduce(function (a, r) { return a + T.num(r.amt); }, 0);
    function cat(name) { var r = setupRows.filter(function (x) { return x.item === name; })[0]; return r ? T.num(r.amt) : 0; }
    var fixed = (d.fixed || []).reduce(function (a, r) { return a + T.num(r.amt); }, 0);
    var fc = T.num(d.foodcost), vo = T.num(d.varother);
    var cm = 1 - (fc + vo) / 100;
    var spend = T.num(d.spend), days = T.num(d.opdays) || 26;
    var res = T.num(d.reserve), draw = T.num(d.owner_draw);
    var beRev = (fixed && cm > 0) ? fixed / cm : 0;
    var beDay = (beRev && spend) ? beRev / spend / days : 0;
    var m3 = T.num(d.real_cust), m6 = T.num(d.real_cust6);
    var gate = (d.gate || []).length;

    var score = 0, checks = 0;
    function add(cond, weight) { checks += weight; if (cond) score += weight; }
    function grade(v, good, ok, weight) { checks += weight; score += v <= good ? weight : (v <= ok ? weight * 0.5 : 0); }

    add(tot > 0 && per > 0, 6);
    if (setupTot) {
      grade(cat('Interiors & fit-out') / setupTot, 0.25, 0.32, 10);
      grade(cat('Kitchen equipment') / setupTot, 0.20, 0.27, 8);
      add(cat('Pre-opening marketing') > 0, 6);
      add(cat('Staff hiring & training') > 0, 6);
      add(setupTot <= biz * 0.8 * 1.02, 8);
    } else checks += 38;
    add(biz > 0 && res / biz >= 0.2, 12);
    add(cm >= 0.55, 8);
    add(fc > 0 && fc <= 35, 6);
    add(beDay > 0 && m3 > 0, 5);
    add(m3 > 0 && beDay > 0 && m3 >= beDay * 0.6, 6);
    add(m6 > 0 && beDay > 0 && m6 >= beDay, 8);
    add(res > 0 && fixed > 0 && res / (fixed + draw) >= 3, 8);
    add(String(d.plan_50 || '').length > 40, 5);
    checks += 8; score += (gate / 8) * 8;

    var pct100 = checks ? score / checks * 100 : 0;

    var band;
    if (pct100 >= 78) band = { label: 'Survivable budget', color: '#0f7a4a', text: 'Your allocation is disciplined, your reserve is real, and your break-even is reachable. This is what a Version 1 budget is supposed to look like. Move to Menu Engineering next.' };
    else if (pct100 >= 58) band = { label: 'Tight but fixable', color: '#b06a06', text: 'The plan holds together, but there is not much margin for error. Work through the flagged items — most involve moving money from something visible to something that keeps you open.' };
    else if (pct100 >= 36) band = { label: 'Under-reserved', color: '#c4400f', text: 'You are planning to open with too little cushion or too high a break-even. This is the exact profile of the restaurant that closes at month seven with a full dining room on Saturdays and nothing in the bank.' };
    else band = { label: 'Do not open on these numbers', color: '#c41230', text: 'As entered, this budget does not survive a normal bad quarter. Nothing here means the idea is wrong — it means the money plan is. Rework it before you spend.' };

    var flags = [];
    if (setupTot && cat('Interiors & fit-out') / setupTot > 0.25)
      flags.push({ tone: 'bad', icon: '🪑', text: '<strong>Interiors are ' + T.pct(cat('Interiors & fit-out') / setupTot * 100) + ' of setup.</strong> Target is 25%. Moving ' + T.inr(cat('Interiors & fit-out') - setupTot * 0.25) + ' out of décor and into your cash reserve buys you months of survival. No customer has ever returned because of the ceiling.' });
    if (setupTot && cat('Kitchen equipment') / setupTot > 0.20)
      flags.push({ tone: 'bad', icon: '🍳', text: '<strong>Equipment is ' + T.pct(cat('Kitchen equipment') / setupTot * 100) + ' of setup.</strong> Target is 20%, and most of it should be second-hand. You are buying for a menu you have not tested yet.' });
    if (setupTot && cat('Pre-opening marketing') <= 0)
      flags.push({ tone: 'bad', icon: '📣', text: '<strong>Zero budgeted for pre-opening marketing.</strong> A restaurant that opens to silence spends its first three months paying rent to teach the neighbourhood it exists. Budget ₹50,000–1,00,000 here.' });
    if (setupTot && cat('Staff hiring & training') <= 0)
      flags.push({ tone: 'bad', icon: '👥', text: '<strong>Zero budgeted for staff training.</strong> Your SOPs are worthless if nobody is paid to learn them. This is the cheapest line on the sheet and the one that shows up fastest in reviews.' });
    if (biz && setupTot > biz * 0.8 * 1.02)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Your allocation exceeds your setup budget by ' + T.inr(setupTot - biz * 0.8) + '.</strong> That overage comes out of your reserve — which is exactly how restaurants end up with no runway. Cut, do not borrow.' });
    if (biz && res / biz < 0.2)
      flags.push({ tone: 'bad', icon: '🏦', text: '<strong>Your reserve is ' + T.pct(res / biz * 100) + ' of budget — below the 20% minimum.</strong> You need ' + T.inr(biz * 0.2) + ' sitting untouched. The reserve is not spare money; it is the thing that lets you survive to month nine and learn what your customer actually wants.' });
    else if (biz && res) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Reserve at ' + T.pct(res / biz * 100) + ' of budget.</strong> That is the discipline that separates the restaurants still open at month six from the ones that are not.' });

    if (fc > 40) flags.push({ tone: 'bad', icon: '📉', text: '<strong>Food cost at ' + fc + '% is unsustainable.</strong> Above 40% the menu itself is the problem, not the sales. Take your dishes through the <a href="menu.html" style="color:#ff8a96">Menu Engineering tool</a> before you open.' });
    if (cm > 0 && cm < 0.5) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Contribution margin is only ' + T.pct(cm * 100) + '.</strong> Every ₹100 you sell leaves just ' + T.inr(cm * 100) + ' toward rent and salaries. At this margin you need ' + Math.ceil(beDay) + ' customers a day before you earn a rupee.' });

    if (beDay > 0) {
      flags.push({ tone: beDay > 100 ? 'bad' : 'ok', icon: '🎯', text: '<strong>Break-even: ' + Math.ceil(beDay) + ' customers a day, ' + days + ' days a month.</strong> That is ' + T.inr(beRev) + ' of monthly revenue. Write this number somewhere you see it every morning.' });
      if (m3 && m3 < beDay * 0.5)
        flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Your own month-3 estimate (' + m3 + '/day) is less than half your break-even.</strong> That means burning roughly ' + T.inr(Math.abs((m3 * spend * days * cm) - fixed)) + ' a month. Check that against your runway below before you sign anything.' });
      if (m6 && m6 < beDay)
        flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Even your month-6 estimate is below break-even.</strong> On your own optimistic numbers this restaurant does not reach zero within six months. Either the cost base has to come down or the concept has to change.' });
      if (m6 && m6 >= beDay)
        flags.push({ tone: 'ok', icon: '✓', text: '<strong>You cross break-even by month 6 on your own estimates.</strong> Protect the reserve until then and do not spend the first profitable month.' });
    }

    if (res && fixed) {
      var runway = res / (fixed + draw);
      if (runway < 3) flags.push({ tone: 'bad', icon: '⏳', text: '<strong>Only ' + runway.toFixed(1) + ' months of runway at zero revenue.</strong> A single bad quarter — a road dug up outside, a monsoon, a lockdown, a bad review cycle — ends the business. Six months is the number to aim for.' });
    }
    if (String(d.plan_50 || '').length < 40)
      flags.push({ icon: '✎', text: '<strong>No written plan for a 50%-below-expectations month 3.</strong> Decide your moves now, while you are calm. In the moment you will be exhausted and you will make the expensive choice.' });

    var v2 = (d.v2 || []).reduce(function (a, r) { return a + T.num(r.cost); }, 0);
    if (v2) flags.push({ tone: 'ok', icon: '📌', text: '<strong>' + T.inr(v2) + ' deliberately postponed to Version 2.</strong> That is ' + T.inr(v2) + ' still in your bank account while you learn what your customer actually wants. This is the single highest-return decision in this worksheet.' });

    return {
      title: beDay ? 'You need ' + Math.ceil(beDay) + ' customers a day to break even' : 'Your budget & break-even',
      subtitle: beRev ? T.inr(beRev) + ' monthly revenue at ' + T.pct(cm * 100) + ' contribution margin' : 'Fill in fixed costs, food cost % and average spend.',
      score: pct100, scoreLabel: Math.round(pct100), scoreUnit: 'BUDGET HEALTH',
      band: band, flags: flags
    };
  }
};
