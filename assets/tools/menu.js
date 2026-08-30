/* Restaurant Casestudy — Menu Engineering & Food Cost */
window.TOOL_SCHEMA = {
  id: 'menu',
  icon: '🍽️',
  title: 'Menu Engineering Sheet',
  subtitle: 'Build a menu that sells, scales, and actually makes money. Cost every dish, find the wastage risks, spot the kitchen bottlenecks, and classify every item as a Star, Ploughhorse, Puzzle or Dog.',
  why: "<strong>Why this matters.</strong> A menu is a profit-and-loss statement with pictures. Restaurants that are busy but not profitable almost always have the same problem: dishes above 40% food cost, single-use perishables, and items nobody orders taking up prep time and inventory.",
  next: { slug: 'sop', title: "SOP Builder", why: "A costed menu only makes money if the kitchen reproduces it identically every service." },

  sections: [
    {
      title: 'Market research — the Google Maps pricing hack',
      note: 'Before you price a single item, find out what your market already charges. Open Google Maps, search your area, and read 8–12 competitor menus. It takes an hour and it prevents the most expensive mistake on this page.',
      fields: [
        {
          id: 'researched', type: 'radio', label: 'How many competitor menus have you actually read?',
          options: [
            { label: 'Fewer than 5 — I need to do more research', tone: 'risk' },
            { label: '5–8' },
            { label: '8–12 — good', tone: 'good' },
            { label: '12+ — excellent', tone: 'good' }
          ]
        },
        { id: 'gap', type: 'textarea', label: 'The pricing gap you found — something nobody is offering at a price that works', rows: 3 },
        {
          id: 'position', type: 'radio', label: 'Your pricing position',
          options: [
            { label: 'Below market (value play)', sub: 'Wins volume, needs tight food cost and high throughput' },
            { label: 'Within market (competitive)', sub: 'Safest. You compete on food and experience, not price' },
            { label: 'Above market (premium)', sub: 'Only works if the experience visibly justifies it' }
          ]
        },
        { id: 'position_why', type: 'textarea', label: 'Why that position, for this customer, in this area?', rows: 3 }
      ]
    },

    {
      title: 'Your customer\'s spending power',
      note: 'Price for the customer who will actually walk in — not the customer you wish would walk in.',
      fields: [
        { id: 'cust_spend', type: 'money', label: 'What your customer can comfortably spend per visit', placeholder: '250' },
        { id: 'cust_now', type: 'textarea', label: 'What are they eating and drinking most in your area right now?', rows: 3 },
        { id: 'cust_missing', type: 'textarea', label: 'What are they NOT getting from existing options that you will provide?', rows: 3 }
      ]
    },

    {
      title: 'Menu item master list — engineer every dish',
      note: 'Every item on your Version 1 menu, maximum 25. <strong>Food cost % = (ingredient cost ÷ selling price) × 100.</strong> Target 28–35%. Maximum 40%. Add monthly units sold once you are trading to get the Star/Dog classification.',
      fields: [
        {
          id: 'menu', type: 'table', label: 'Menu items',
          columns: [
            { key: 'name', label: 'Dish', placeholder: 'Dish name' },
            { key: 'cat', label: 'Category', type: 'select', options: ['Starter', 'Main', 'Bread / Rice', 'Side', 'Dessert', 'Beverage', 'Combo'] },
            { key: 'cost', label: 'Ingredient ₹', type: 'number', placeholder: '0', width: '110px' },
            { key: 'price', label: 'Selling ₹', type: 'number', placeholder: '0', width: '105px' },
            {
              key: 'fc', label: 'Food cost', calc: function (r) {
                var T = window.App, c = T.num(r.cost), p = T.num(r.price);
                if (!c || !p) return { text: '—' };
                var f = c / p * 100;
                return { text: T.pct(f), tone: f <= 35 ? 'good' : (f <= 40 ? 'warn' : 'bad') };
              }
            },
            {
              key: 'gp', label: 'Margin ₹', calc: function (r) {
                var T = window.App, c = T.num(r.cost), p = T.num(r.price);
                if (!c || !p) return { text: '—' };
                return { text: T.inr(p - c) };
              }
            },
            { key: 'units', label: 'Sold / month', type: 'number', placeholder: '0', width: '120px' },
            {
              key: 'class', label: 'Class', calc: function (r, d) {
                var T = window.App, c = T.num(r.cost), p = T.num(r.price), u = T.num(r.units);
                if (!c || !p || !u) return { text: '—' };
                var rows = (d.menu || []).filter(function (x) { return T.num(x.units) > 0 && T.num(x.price) > 0 && T.num(x.cost) > 0; });
                if (rows.length < 3) return { text: 'need 3+' };
                var avgU = rows.reduce(function (a, x) { return a + T.num(x.units); }, 0) / rows.length;
                var avgM = rows.reduce(function (a, x) { return a + (T.num(x.price) - T.num(x.cost)); }, 0) / rows.length;
                var pop = u >= avgU * 0.7, prof = (p - c) >= avgM * 0.9;
                if (pop && prof) return { text: '⭐ Star', tone: 'good' };
                if (pop && !prof) return { text: '🐎 Ploughhorse', tone: 'warn' };
                if (!pop && prof) return { text: '🧩 Puzzle', tone: 'warn' };
                return { text: '🐕 Dog', tone: 'bad' };
              }
            }
          ],
          seed: 8,
          totals: function (rows, d) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.name || '').trim() && T.num(r.price) > 0; });
            if (!filled.length) return 'Add your dishes. Maximum 25 for Version 1.';
            var costed = filled.filter(function (r) { return T.num(r.cost) > 0; });
            var totC = costed.reduce(function (a, r) { return a + T.num(r.cost) * (T.num(r.units) || 1); }, 0);
            var totR = costed.reduce(function (a, r) { return a + T.num(r.price) * (T.num(r.units) || 1); }, 0);
            var blend = totR ? totC / totR * 100 : 0;
            var over = costed.filter(function (r) { return T.num(r.cost) / T.num(r.price) > 0.4; }).length;
            return '<b>' + filled.length + '</b>/25 items' +
              (blend ? ' · blended food cost <b style="color:' + (blend <= 35 ? 'var(--green)' : blend <= 40 ? 'var(--amber)' : 'var(--red)') + '">' + T.pct(blend) + '</b>' : '') +
              (over ? ' · <b style="color:var(--red)">' + over + ' item' + (over === 1 ? '' : 's') + ' over 40%</b>' : '') +
              (filled.length > 25 ? ' · <b style="color:var(--red)">over the 25-item limit</b>' : '');
          }
        }
      ],
      metrics: function (d) {
        var T = window.App;
        var rows = (d.menu || []).filter(function (r) { return T.num(r.cost) > 0 && T.num(r.price) > 0; });
        if (!rows.length) return [];
        var withU = rows.filter(function (r) { return T.num(r.units) > 0; });
        var out = [];
        var totC = rows.reduce(function (a, r) { return a + T.num(r.cost) * (T.num(r.units) || 1); }, 0);
        var totR = rows.reduce(function (a, r) { return a + T.num(r.price) * (T.num(r.units) || 1); }, 0);
        out.push({ k: 'Blended food cost', v: T.pct(totC / totR * 100), n: 'Target 28–35%', tone: totC / totR <= 0.35 ? 'good' : (totC / totR <= 0.4 ? 'warn' : 'bad') });
        out.push({ k: 'Items costed', v: rows.length + ' of ' + (d.menu || []).filter(function (r) { return (r.name || '').trim(); }).length });
        if (withU.length >= 3) {
          var avgU = withU.reduce(function (a, x) { return a + T.num(x.units); }, 0) / withU.length;
          var avgM = withU.reduce(function (a, x) { return a + (T.num(x.price) - T.num(x.cost)); }, 0) / withU.length;
          var counts = { s: 0, p: 0, z: 0, dg: 0 };
          withU.forEach(function (r) {
            var pop = T.num(r.units) >= avgU * 0.7, prof = (T.num(r.price) - T.num(r.cost)) >= avgM * 0.9;
            if (pop && prof) counts.s++; else if (pop) counts.p++; else if (prof) counts.z++; else counts.dg++;
          });
          out.push({ k: '⭐ Stars', v: counts.s, n: 'High profit, high popularity', tone: 'good' });
          out.push({ k: '🐎 Ploughhorses', v: counts.p, n: 'Popular, thin margin — reprice or re-cost' });
          out.push({ k: '🧩 Puzzles', v: counts.z, n: 'Profitable, unloved — reposition on the menu' });
          out.push({ k: '🐕 Dogs', v: counts.dg, n: 'Remove these', tone: counts.dg ? 'bad' : 'good' });
          if (withU.length) out.push({ k: 'Monthly revenue from menu', v: T.inr(totR), n: 'At the volumes entered' });
        } else {
          out.push({ k: 'Classification', v: 'Locked', n: 'Enter monthly units for 3+ dishes' });
        }
        return out;
      }
    },

    {
      title: 'Ingredient overlap — your wastage control',
      note: 'Ingredients shared across many dishes make a lean, efficient menu. An ingredient used in exactly one dish is a wastage risk: you buy it fresh, one order comes in, and the rest goes in the bin.',
      fields: [
        {
          id: 'ing', type: 'table', label: 'Core ingredients and where they appear',
          columns: [
            { key: 'name', label: 'Ingredient', placeholder: 'e.g. Paneer' },
            { key: 'dishes', label: 'Used in how many dishes', type: 'number', placeholder: '0', width: '190px' },
            { key: 'shelf', label: 'Shelf life', type: 'select', options: ['Same day', '2–3 days', 'A week', 'Long / dry store'] },
            {
              key: 'risk', label: 'Wastage risk', calc: function (r) {
                var T = window.App, n = T.num(r.dishes);
                if (!n) return { text: '—' };
                var perishable = r.shelf === 'Same day' || r.shelf === '2–3 days';
                if (n === 1 && perishable) return { text: 'High', tone: 'bad' };
                if (n === 1) return { text: 'Medium', tone: 'warn' };
                if (n >= 3) return { text: 'Low', tone: 'good' };
                return { text: 'Medium', tone: 'warn' };
              }
            }
          ],
          seed: 6,
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.name || '').trim() && T.num(r.dishes) > 0; });
            if (!filled.length) return 'List your core ingredients.';
            var solo = filled.filter(function (r) { return T.num(r.dishes) === 1; });
            var avg = filled.reduce(function (a, r) { return a + T.num(r.dishes); }, 0) / filled.length;
            return '<b>' + filled.length + '</b> ingredients · avg <b>' + avg.toFixed(1) + '</b> dishes each' +
              (solo.length ? ' · <b style="color:var(--red)">' + solo.length + '</b> used in only one dish' : ' · <span style="color:var(--green)">no single-use ingredients</span>');
          }
        },
        { id: 'ing_action', type: 'textarea', label: 'For every single-use ingredient — will you remove the dish, or find a second dish that uses it?', rows: 3, optional: true }
      ]
    },

    {
      title: 'Kitchen workflow — spot the bottlenecks',
      note: 'Note the primary equipment each of your busiest dishes needs. If three of your top sellers all need the same fryer at 8pm on Saturday, your menu has a bottleneck that no amount of staff can fix.',
      fields: [
        {
          id: 'flow', type: 'table', label: 'Peak-hour dishes and their equipment',
          columns: [
            { key: 'dish', label: 'Dish', placeholder: 'Dish' },
            { key: 'equip', label: 'Primary equipment', type: 'select', options: ['Tandoor', 'Fryer', 'Griddle / tawa', 'Range burner', 'Oven', 'Grill', 'Cold station', 'Coffee machine', 'Blender', 'Steamer'] },
            { key: 'mins', label: 'Cook time (min)', type: 'number', placeholder: '0', width: '135px' },
            { key: 'peak', label: 'Ordered at peak?', type: 'select', options: ['Heavily', 'Sometimes', 'Rarely'] }
          ],
          seed: 5,
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.dish || '').trim() && r.equip; });
            if (!filled.length) return 'Map your peak-hour dishes.';
            var byEq = {};
            filled.forEach(function (r) { if (r.peak === 'Heavily') byEq[r.equip] = (byEq[r.equip] || 0) + 1; });
            var worst = null;
            Object.keys(byEq).forEach(function (k) { if (!worst || byEq[k] > byEq[worst]) worst = k; });
            if (worst && byEq[worst] >= 3) return '<b style="color:var(--red)">Bottleneck: ' + byEq[worst] + ' heavy-peak dishes all need the ' + worst + '.</b> Rebalance the menu or add capacity.';
            return '<b>' + filled.length + '</b> dishes mapped' + (worst ? ' · busiest station: <b>' + worst + '</b>' : '');
          }
        },
        { id: 'flow_fix', type: 'textarea', label: 'Your biggest kitchen bottleneck — and how you will solve it', rows: 3 }
      ]
    },

    {
      title: 'Your hero item',
      note: 'Every great restaurant is known for one thing. Define yours deliberately rather than discovering it by accident three years in.',
      fields: [
        { id: 'hero', type: 'text', label: 'My hero item', placeholder: 'e.g. Amritsari kulcha with white butter' },
        { id: 'hero_why', type: 'textarea', label: 'Why will customers come specifically for this?', rows: 3 },
        { id: 'hero_diff', type: 'textarea', label: 'What makes it different from what competitors offer?', rows: 3 },
        { id: 'hero_consist', type: 'textarea', label: 'How will you ensure it is identical every single time?', rows: 3, placeholder: 'Weights, timings, temperatures, plating photo. If a new cook cannot reproduce it from the SOP alone, it is not documented well enough.' },
        { id: 'hero_promo', type: 'textarea', label: 'How will you feature it on the menu and in marketing?', rows: 3 }
      ]
    },

    {
      title: 'Chef input vs customer demand',
      note: 'Chefs suggest dishes they love to cook. Customers order dishes they love to eat. These are not always the same list — and the menu belongs to the customer.',
      fields: [
        {
          id: 'chef', type: 'table', label: 'Chef-suggested dishes, honestly assessed',
          columns: [
            { key: 'dish', label: 'Dish', placeholder: 'Dish' },
            { key: 'want', label: 'Will MY customer order it?', type: 'select', options: ['Definitely', 'Maybe', 'Unlikely'] },
            { key: 'cost', label: 'Adds new ingredients?', type: 'select', options: ['No', 'One or two', 'Several'] },
            {
              key: 'call', label: 'Verdict', calc: function (r) {
                if (!r.want) return { text: '—' };
                if (r.want === 'Definitely' && r.cost !== 'Several') return { text: 'Keep', tone: 'good' };
                if (r.want === 'Unlikely') return { text: 'Cut', tone: 'bad' };
                if (r.cost === 'Several') return { text: 'Version 2', tone: 'warn' };
                return { text: 'Test first', tone: 'warn' };
              }
            }
          ],
          seed: 4
        },
        { id: 'chef_note', type: 'info', tone: 'warn', html: '<strong>Never hand your menu entirely to a chef.</strong> A chef optimises for craft and range. A menu has to optimise for the customer in your area, your kitchen\'s throughput at 8pm, and your food cost. Take their expertise; keep the final call.' }
      ]
    },

    {
      title: 'SOP readiness & menu design',
      note: 'Every dish needs a written SOP before opening — exact quantities, method, time, temperature, plating standard, and a visual quality check. <strong>If a new cook, following only the SOP, cannot make the dish to your standard, the SOP is not finished.</strong>',
      fields: [
        { id: 'sop_done', type: 'number', label: 'How many of your dishes have a completed written SOP?', placeholder: '0' },
        { id: 'sop_missing', type: 'textarea', label: 'Which items still need one before opening?', rows: 3, optional: true },
        { id: 'golden', type: 'text', label: 'Your three Star items for the Golden Triangle (the most-read positions on a menu)', placeholder: '1. …  2. …  3. …' },
        { id: 'hero_copy', type: 'textarea', label: 'Write the menu description for your hero item', rows: 3, placeholder: 'Sensory and specific. Not "delicious paneer tikka" — what it smells like, how it arrives, what it is served with.' },
        { id: 'cats', type: 'text', label: 'What will you call your menu categories?', placeholder: 'Avoid generic names like Starters / Mains' },
        { id: 'menu_format', type: 'radio', label: 'Menu format', options: [{ label: 'Physical only' }, { label: 'Digital / QR only' }, { label: 'Both' }] },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before your menu goes live',
          options: [
            { label: 'I have researched competitor pricing using the Google Maps hack' },
            { label: 'I know my customer\'s spending capacity and have priced for it' },
            { label: 'My menu has 25 items or fewer, each one justified' },
            { label: 'I have calculated food cost % for every item and it is within 28–40%' },
            { label: 'I have mapped ingredient overlaps and dealt with single-use ingredients' },
            { label: 'I have identified and resolved my kitchen bottleneck' },
            { label: 'My hero item is defined, tested and documented' },
            { label: 'I have reviewed every chef-suggested dish against my actual customer' },
            { label: 'Every dish has a written SOP a new cook could follow' }
          ]
        }
      ]
    }
  ],

  benchmarks: function (d) {
    var T = window.App, out = [];
    var all = (d.menu || []).filter(function (r) { return (r.name || '').trim(); });
    var costed = all.filter(function (r) { return T.num(r.cost) > 0 && T.num(r.price) > 0; });
    if (all.length) out.push({ label: 'Menu size', you: all.length + ' items', range: '25 maximum for a launch menu', ok: all.length <= 25, note: 'Too broad' });
    if (costed.length) {
      var c = costed.reduce(function (a, r) { return a + T.num(r.cost) * (T.num(r.units) || 1); }, 0);
      var rv = costed.reduce(function (a, r) { return a + T.num(r.price) * (T.num(r.units) || 1); }, 0);
      out.push({ label: 'Blended food cost', you: T.pct(c / rv * 100), range: '28–35% healthy · 40% ceiling', ok: c / rv <= 0.35, note: c / rv <= 0.4 ? 'High' : 'Unsustainable' });
      var over = costed.filter(function (r) { return T.num(r.cost) / T.num(r.price) > 0.4; }).length;
      out.push({ label: 'Items over 40% food cost', you: over + ' of ' + costed.length, range: 'Zero', ok: over === 0, note: 'Reprice or remove' });
    }
    var ing = (d.ing || []).filter(function (r) { return (r.name || '').trim() && T.num(r.dishes) > 0; });
    if (ing.length) {
      var avg = ing.reduce(function (a, r) { return a + T.num(r.dishes); }, 0) / ing.length;
      out.push({ label: 'Ingredient reuse', you: avg.toFixed(1) + ' dishes each', range: '2.5+ dishes per ingredient', ok: avg >= 2.5, note: 'Wastage risk' });
    }
    return out;
  },

  result: function (d) {
    var T = window.App;
    var all = (d.menu || []).filter(function (r) { return (r.name || '').trim(); });
    var costed = all.filter(function (r) { return T.num(r.cost) > 0 && T.num(r.price) > 0; });
    var totC = costed.reduce(function (a, r) { return a + T.num(r.cost) * (T.num(r.units) || 1); }, 0);
    var totR = costed.reduce(function (a, r) { return a + T.num(r.price) * (T.num(r.units) || 1); }, 0);
    var blend = totR ? totC / totR * 100 : 0;
    var over40 = costed.filter(function (r) { return T.num(r.cost) / T.num(r.price) > 0.4; });
    var ing = (d.ing || []).filter(function (r) { return (r.name || '').trim() && T.num(r.dishes) > 0; });
    var solo = ing.filter(function (r) { return T.num(r.dishes) === 1; });
    var gate = (d.gate || []).length;
    var sopDone = T.num(d.sop_done);

    var withU = costed.filter(function (r) { return T.num(r.units) > 0; });
    var dogs = 0, plough = 0, stars = 0, puzzles = 0;
    if (withU.length >= 3) {
      var avgU = withU.reduce(function (a, x) { return a + T.num(x.units); }, 0) / withU.length;
      var avgM = withU.reduce(function (a, x) { return a + (T.num(x.price) - T.num(x.cost)); }, 0) / withU.length;
      withU.forEach(function (r) {
        var pop = T.num(r.units) >= avgU * 0.7, prof = (T.num(r.price) - T.num(r.cost)) >= avgM * 0.9;
        if (pop && prof) stars++; else if (pop) plough++; else if (prof) puzzles++; else dogs++;
      });
    }

    var score = 0, checks = 0;
    function add(c, w) { checks += w; if (c) score += w; }
    add(all.length > 0 && all.length <= 25, 12);
    add(costed.length >= Math.max(1, all.length * 0.8), 12);
    add(blend > 0 && blend <= 35, 16);
    add(over40.length === 0 && costed.length > 0, 10);
    add(ing.length >= 5, 6);
    add(ing.length >= 5 && solo.length === 0, 8);
    add(String(d.hero || '').trim().length > 2, 8);
    add(String(d.hero_consist || '').trim().length > 30, 6);
    add(d.researched === '8–12 — good' || d.researched === '12+ — excellent', 8);
    add(all.length > 0 && sopDone >= all.length, 8);
    add((d.flow || []).filter(function (r) { return (r.dish || '').trim(); }).length >= 3, 6);
    checks += 10; score += (gate / 9) * 10;
    var pct100 = checks ? score / checks * 100 : 0;

    var band;
    if (pct100 >= 78) band = { label: 'Menu is engineered', color: '#0f7a4a', text: 'Focused, costed, and documented. This is a menu that a kitchen can execute at 8pm on a Saturday and an accountant can defend at the end of the month.' };
    else if (pct100 >= 58) band = { label: 'Close — tighten the numbers', color: '#b06a06', text: 'The shape is right. The flagged items below are where your margin is quietly leaking. Most are fixable this week, before you print anything.' };
    else if (pct100 >= 36) band = { label: 'Not costed enough', color: '#c4400f', text: 'You have a list of dishes, not yet a menu. Until every item has an ingredient cost and a food cost percentage, you are guessing at your own profitability.' };
    else band = { label: 'Start with the costing', color: '#c41230', text: 'Nothing else here works until you know what each dish costs you to make. Do that first — it usually takes one afternoon with a weighing scale.' };

    var flags = [];
    if (all.length > 25) flags.push({ tone: 'bad', icon: '📋', text: '<strong>' + all.length + ' items — over the 25-item Version 1 limit.</strong> Every extra dish adds an ingredient to buy, a recipe to train, a station to occupy and something to throw away. Cut to 25 and save the rest for Version 2.' });
    else if (all.length && all.length <= 25) flags.push({ tone: 'ok', icon: '✓', text: '<strong>' + all.length + ' items.</strong> Focused menus cook faster, waste less and are easier to make consistent. This is the right shape for opening.' });

    if (blend > 40) flags.push({ tone: 'bad', icon: '📉', text: '<strong>Blended food cost is ' + T.pct(blend) + '.</strong> Above 40% you cannot pay rent and staff out of what is left, no matter how busy you get. Reprice, re-portion, or renegotiate supply — in that order.' });
    else if (blend > 35) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Blended food cost is ' + T.pct(blend) + ' — above the 35% target.</strong> Getting to 32% on ' + T.inr(totR) + ' of monthly menu revenue is worth ' + T.inr(totR * (blend - 32) / 100) + ' a month straight to your bottom line.' });
    else if (blend) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Blended food cost at ' + T.pct(blend) + '.</strong> That is inside the healthy band and leaves room for the bad weeks.' });

    if (over40.length) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>' + over40.length + ' item' + (over40.length === 1 ? '' : 's') + ' above 40% food cost:</strong> ' + over40.slice(0, 5).map(function (r) { return T.esc(r.name) + ' (' + T.pct(T.num(r.cost) / T.num(r.price) * 100) + ')'; }).join(', ') + (over40.length > 5 ? ' and others' : '') + '. Reprice these or take them off.' });

    if (dogs) flags.push({ tone: 'bad', icon: '🐕', text: '<strong>' + dogs + ' Dog' + (dogs === 1 ? '' : 's') + ' on the menu</strong> — low profit and low popularity. They cost you inventory, prep time and menu space while earning nothing. Remove them at your next menu revision.' });
    if (plough) flags.push({ icon: '🐎', text: '<strong>' + plough + ' Ploughhorse' + (plough === 1 ? '' : 's') + '</strong> — popular but thin margin. Do not remove these; they bring people in. Either lift the price slightly, re-cost the recipe, or pair them with a high-margin side.' });
    if (puzzles) flags.push({ icon: '🧩', text: '<strong>' + puzzles + ' Puzzle' + (puzzles === 1 ? '' : 's') + '</strong> — profitable but nobody orders them. Move them to the Golden Triangle, rename them, or have staff recommend them. Do not cut a Puzzle before you have tried repositioning it.' });
    if (stars >= 3) flags.push({ tone: 'ok', icon: '⭐', text: '<strong>' + stars + ' Stars.</strong> These pay for everything else. Protect their quality obsessively and give them the best positions on the menu.' });

    if (solo.length) flags.push({ tone: 'bad', icon: '🗑', text: '<strong>' + solo.length + ' ingredient' + (solo.length === 1 ? '' : 's') + ' used in only one dish:</strong> ' + solo.slice(0, 4).map(function (r) { return T.esc(r.name); }).join(', ') + '. Either find a second dish that uses them or cut the dish. Single-use perishables are pure wastage.' });

    if (d.researched === 'Fewer than 5 — I need to do more research') flags.push({ tone: 'bad', icon: '🔍', text: '<strong>Fewer than five competitor menus researched.</strong> Spend one hour on Google Maps reading local menus before you finalise a single price. It is the cheapest research you will ever do.' });

    if (all.length && sopDone < all.length) flags.push({ tone: 'bad', icon: '📄', text: '<strong>' + (all.length - sopDone) + ' dish' + (all.length - sopDone === 1 ? '' : 'es') + ' without a written SOP.</strong> Every undocumented dish is a dish that changes when your cook has a bad day or leaves. Use the <a href="sop.html" style="color:#ff8a96">SOP Builder</a>.' });
    if (!String(d.hero || '').trim()) flags.push({ icon: '⭐', text: '<strong>No hero item defined.</strong> Restaurants people travel for are known for one thing, not thirty. Pick it deliberately and build everything around it.' });

    return {
      title: blend ? 'Blended food cost: ' + T.pct(blend) : 'Your menu, engineered',
      subtitle: all.length ? all.length + ' items · ' + costed.length + ' costed' + (stars + plough + puzzles + dogs ? ' · ' + stars + ' Stars, ' + plough + ' Ploughhorses, ' + puzzles + ' Puzzles, ' + dogs + ' Dogs' : '') : 'Add your dishes above.',
      score: pct100, scoreLabel: Math.round(pct100), scoreUnit: 'MENU HEALTH',
      band: band, flags: flags
    };
  }
};
