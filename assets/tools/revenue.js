/* Restaurant Casestudy — Dead Hours Revenue Planner */
window.TOOL_SCHEMA = {
  id: 'revenue',
  icon: '🕯️',
  title: 'Dead Hours Revenue Planner',
  subtitle: 'Your fixed costs run 24 hours a day. Your revenue does not have to be limited to the four hours when your dining room is full. Model four revenue streams from the kitchen you already have.',
  why: "<strong>Why this matters.</strong> Your fixed costs run whether the dining room is full or empty. A restaurant earning \u20b950,000 across its peak four hours and nothing across the other eight is leaving more than half its capacity unused \u2014 while paying for all of it.",
  next: null,

  sections: [
    {
      title: 'Your fixed cost reality',
      note: 'Before anything else, work out what an empty hour actually costs you. Every hour you generate less than this, you are losing money before a single ingredient is bought.',
      fields: [
        { id: 'rent', type: 'money', label: 'Monthly rent', placeholder: '45000' },
        { id: 'salaries', type: 'money', label: 'Monthly staff salaries', placeholder: '60000' },
        { id: 'utils', type: 'money', label: 'Monthly utilities — electricity, water, gas', placeholder: '15000' },
        { id: 'emi', type: 'money', label: 'Monthly EMI / other fixed', placeholder: '10000' },
        { id: 'opdays', type: 'number', label: 'Operating days per month', placeholder: '26' },
        { id: 'ophours', type: 'number', label: 'Operating hours per day', placeholder: '12' },
        { id: 'deadhours', type: 'number', label: 'Of those, how many are genuinely dead?', placeholder: '5', hint: 'Be honest. For most restaurants it is late morning plus early-to-mid afternoon — usually 4 to 6 hours a day.' }
      ],
      metrics: function (d) {
        var T = window.App;
        var fixed = T.num(d.rent) + T.num(d.salaries) + T.num(d.utils) + T.num(d.emi);
        var days = T.num(d.opdays) || 26, hrs = T.num(d.ophours) || 12, dead = T.num(d.deadhours);
        if (!fixed) return [{ k: 'Cost of an empty hour', v: '—', n: 'Enter your fixed costs' }];
        var perHour = fixed / days / hrs;
        return [
          { k: 'Fixed cost per month', v: T.inr(fixed) },
          { k: 'Per operating day', v: T.inr(fixed / days) },
          { k: 'Per trading hour', v: T.inr(perHour), n: 'Revenue needed every hour just to break even', tone: 'warn' },
          { k: 'Bleeding in dead hours', v: T.inr(perHour * dead * days), n: dead ? dead + ' dead hours × ' + days + ' days a month' : 'Enter your dead hours', tone: dead ? 'bad' : '' }
        ];
      }
    },

    {
      title: 'Which streams fit your restaurant?',
      note: 'Not every stream works for every format. Pick honestly — a candlelit occasion package is hard to pull off in a bright fast-food unit, and a tiffin service near a mall has no customer.',
      fields: [
        {
          id: 'fit', type: 'checks', tone: 'good', label: 'What is true about your restaurant?',
          options: [
            { label: 'My ambience is warm and intimate enough for couples', sub: 'Points to occasion packages' },
            { label: 'I can create a private or curtained section', sub: 'Points to kitty parties and private dining' },
            { label: 'I am within 1km of a college, hostel or PG cluster', sub: 'Points to tiffin subscriptions' },
            { label: 'I am within 1km of offices or a corporate park', sub: 'Points to corporate lunches and tiffin' },
            { label: 'My kitchen has spare capacity in the late morning', sub: 'Points to cloud kitchen and tiffin' },
            { label: 'I already do delivery and understand the logistics', sub: 'Points to a second cloud kitchen brand' },
            { label: 'My team could be trained to set up and photograph a table', sub: 'Essential for occasion packages' },
            { label: 'I have space to seat 10–20 people together', sub: 'Points to kitty parties and events' }
          ]
        },
        {
          id: 'pick', type: 'radio', label: 'Which ONE stream will you start with?',
          hint: 'Start with one, not four. Get it working, then add the next.',
          options: [
            { label: 'Occasion packages — candlelight, anniversaries, proposals' },
            { label: 'Cloud kitchen — a second brand from the same kitchen' },
            { label: 'Tiffin subscriptions — recurring daily revenue' },
            { label: 'Private dining, kitty parties & corporate lunches' }
          ]
        }
      ]
    },

    {
      title: 'Stream 1 — Occasion packages',
      note: 'A curated, bookable experience for couples celebrating something, during the hours your tables would otherwise be empty. Working benchmark: <strong>₹1,999 average package, 5 bookings a week, ₹1,400–1,600 net contribution each.</strong>',
      fields: [
        { id: 'occ_price', type: 'money', label: 'Your package price', placeholder: '1999', optional: true },
        { id: 'occ_food', type: 'money', label: 'Food cost for the set menu (for two)', placeholder: '350', optional: true },
        { id: 'occ_decor', type: 'money', label: 'Decoration cost per setup — in-house', placeholder: '120', optional: true, hint: 'Candles, petals, name card, ribbon. Reusable kit, refreshed each time.' },
        { id: 'occ_out', type: 'money', label: 'Anything you plan to outsource, per booking', placeholder: '0', optional: true, hint: 'Decorator, photographer, bakery cake. This is where the margin goes to die.' },
        { id: 'occ_week', type: 'number', label: 'Realistic bookings per week', placeholder: '5', optional: true },
        {
          id: 'occ_ready', type: 'checks', tone: 'good', label: 'Execution readiness', optional: true,
          options: [
            { label: 'A dedicated Occasion Package SOP is written' },
            { label: 'One area is designated as the occasion section' },
            { label: 'Two staff trained in basic phone photography' },
            { label: 'A WhatsApp pre-booking template exists' },
            { label: 'A 30–60 second demo Reel has been shot' },
            { label: 'Decoration is fully in-house, nothing outsourced' }
          ]
        }
      ],
      metrics: function (d) {
        var T = window.App;
        var p = T.num(d.occ_price), f = T.num(d.occ_food), dc = T.num(d.occ_decor), o = T.num(d.occ_out), w = T.num(d.occ_week);
        if (!p || !w) return [];
        var varc = f + dc + o;
        var net = p - varc;
        var monthly = w * 4.3;
        return [
          { k: 'Net per booking', v: T.inr(net), n: net > 0 ? T.pct(net / p * 100) + ' contribution' : 'Losing money per booking', tone: net <= 0 ? 'bad' : (net / p >= 0.6 ? 'good' : 'warn') },
          { k: 'Monthly bookings', v: Math.round(monthly) },
          { k: 'Monthly gross', v: T.inr(p * monthly) },
          { k: 'Monthly net contribution', v: T.inr(net * monthly), n: 'From hours that earned nothing before', tone: net > 0 ? 'good' : 'bad' },
          { k: 'Margin lost to outsourcing', v: T.inr(o * monthly), n: o ? 'Bring this in-house' : 'Fully in-house', tone: o ? 'bad' : 'good' }
        ];
      }
    },

    {
      title: 'Stream 2 — Cloud kitchen',
      note: 'A second brand, a different menu, the same kitchen — running in your idle hours. Separate name, separate logo, separate listing. The customer should never know it is the same kitchen.',
      fields: [
        { id: 'cl_brand', type: 'text', label: 'Second brand name idea', optional: true },
        { id: 'cl_menu', type: 'textarea', label: 'What will it serve, and how does it overlap with your existing ingredients?', rows: 3, optional: true, placeholder: 'e.g. North Indian dinner restaurant → breakfast and lunch brand: parathas, egg dishes, rice bowls. Same base ingredients, same equipment, different hours.' },
        { id: 'cl_aov', type: 'money', label: 'Expected average order value', placeholder: '280', optional: true },
        { id: 'cl_orders', type: 'number', label: 'Realistic orders per day', placeholder: '15', optional: true },
        { id: 'cl_food', type: 'number', label: 'Food cost %', placeholder: '30', optional: true },
        { id: 'cl_comm', type: 'number', label: 'Aggregator commission + packaging %', placeholder: '25', optional: true, hint: 'Zomato and Swiggy commissions typically run 18–25% before packaging. Count it honestly — it is the number that decides whether this stream works.' }
      ],
      metrics: function (d) {
        var T = window.App;
        var a = T.num(d.cl_aov), o = T.num(d.cl_orders), fc = T.num(d.cl_food), cm = T.num(d.cl_comm);
        var days = T.num(d.opdays) || 26;
        if (!a || !o) return [];
        var gross = a * o * days;
        var net = gross * (1 - (fc + cm) / 100);
        return [
          { k: 'Monthly gross', v: T.inr(gross) },
          { k: 'Contribution margin', v: T.pct(100 - fc - cm), tone: (100 - fc - cm) >= 40 ? 'good' : ((100 - fc - cm) >= 25 ? 'warn' : 'bad') },
          { k: 'Monthly net contribution', v: T.inr(net), n: 'Before any extra staff cost', tone: net > 0 ? 'good' : 'bad' }
        ];
      }
    },

    {
      title: 'Stream 3 — Tiffin subscriptions',
      note: 'The most underrated revenue stream in Indian food. Working benchmark: <strong>₹2,200/month per subscriber, 50 subscribers, ₹35–50 variable cost per tiffin, ₹43,000–63,500 net profit a month.</strong> Committed revenue that arrives whether the dining room is full or empty.',
      fields: [
        { id: 'tf_price', type: 'money', label: 'Monthly subscription price per person', placeholder: '2200', optional: true, hint: '₹2,000–2,500 for 22 working days is ₹90–115 a meal — competitive with a canteen, far below daily delivery.' },
        { id: 'tf_subs', type: 'number', label: 'Realistic subscribers within 3 months', placeholder: '50', optional: true },
        { id: 'tf_cost', type: 'money', label: 'Variable cost per tiffin', placeholder: '45', optional: true },
        { id: 'tf_meals', type: 'number', label: 'Meals per subscriber per month', placeholder: '22', optional: true },
        { id: 'tf_staff', type: 'money', label: 'Additional monthly staff cost (delivery person)', placeholder: '10000', optional: true },
        {
          id: 'tf_ready', type: 'checks', tone: 'good', label: 'Model readiness', optional: true,
          options: [
            { label: 'Fixed weekly rotating menu — one veg, one non-veg per day' },
            { label: 'Monthly subscription pricing, not daily ordering' },
            { label: 'WhatsApp broadcast set up for menu and reminders' },
            { label: 'A ₹400–500 trial week offer exists' },
            { label: 'A loyalty benefit for 3-month subscribers' },
            { label: 'Separate brand name — warm, home-style, not "restaurant tiffin"' }
          ]
        }
      ],
      metrics: function (d) {
        var T = window.App;
        var p = T.num(d.tf_price), s = T.num(d.tf_subs), c = T.num(d.tf_cost), m = T.num(d.tf_meals) || 22, st = T.num(d.tf_staff);
        if (!p || !s) return [];
        var gross = p * s;
        var varc = c * m * s;
        var net = gross - varc - st;
        return [
          { k: 'Monthly gross', v: T.inr(gross), n: 'Committed and paid in advance' },
          { k: 'Effective price per meal', v: T.inr(p / m) },
          { k: 'Monthly variable cost', v: T.inr(varc) },
          { k: 'Net profit from tiffin', v: T.inr(net), n: 'From kitchen hours that were idle', tone: net > 0 ? 'good' : 'bad' },
          { k: 'Food cost on tiffin', v: T.pct(varc / gross * 100), n: 'Keep below 45%', tone: varc / gross <= 0.45 ? 'good' : 'bad' }
        ];
      }
    },

    {
      title: 'Stream 4 — Private dining, kitty parties & corporate',
      note: 'Your space is an asset. Working benchmark for a kitty party: <strong>14 women × ₹800 per head + ₹698 add-ons = ₹11,898 per booking, ₹8,400–9,100 net, 2 bookings a week ≈ ₹67,000–73,000 monthly contribution.</strong> On Wednesday and Thursday afternoons that were previously empty.',
      fields: [
        { id: 'kp_head', type: 'money', label: 'Per-head package price', placeholder: '800', optional: true },
        { id: 'kp_size', type: 'number', label: 'Typical group size', placeholder: '14', optional: true },
        { id: 'kp_addon', type: 'money', label: 'Average add-ons per booking', placeholder: '698', optional: true, hint: 'Customised cake ₹499, tambola/games kit ₹199, extended time ₹100 per person per hour.' },
        { id: 'kp_cost', type: 'money', label: 'Variable cost per booking — food, décor, photography', placeholder: '3000', optional: true },
        { id: 'kp_week', type: 'number', label: 'Realistic bookings per week', placeholder: '2', optional: true },
        {
          id: 'kp_ready', type: 'checks', tone: 'good', label: 'What kitty groups actually need', optional: true,
          options: [
            { label: 'Private or curtained section — not a corner of the main floor' },
            { label: 'A pre-set menu with 2–3 options per course, not the full à la carte' },
            { label: 'Occasion touches — welcome drink, table décor, personalised menu card' },
            { label: 'An entertainment or activity option — tambola, card games, a quiz' },
            { label: 'Single consolidated billing, never 15 separate bills' },
            { label: 'A named package, promoted on a dedicated WhatsApp number' },
            { label: 'A 30% advance to confirm the booking' }
          ]
        },
        { id: 'corp', type: 'textarea', label: 'Corporate lunch plan — which offices are nearby and what will you offer them?', rows: 3, optional: true, placeholder: 'A fixed menu, private area, quick service, clean presentation and easy invoice billing at ₹500–800 per head is a compelling offer for an office manager who needs lunch for 20 people by tomorrow.' }
      ],
      metrics: function (d) {
        var T = window.App;
        var h = T.num(d.kp_head), s = T.num(d.kp_size), a = T.num(d.kp_addon), c = T.num(d.kp_cost), w = T.num(d.kp_week);
        if (!h || !s || !w) return [];
        var value = h * s + a;
        var net = value - c;
        var monthly = w * 4.3;
        return [
          { k: 'Value per booking', v: T.inr(value) },
          { k: 'Net per booking', v: T.inr(net), n: net > 0 ? T.pct(net / value * 100) + ' contribution' : 'Losing money', tone: net > 0 ? 'good' : 'bad' },
          { k: 'Monthly gross', v: T.inr(value * monthly) },
          { k: 'Monthly net contribution', v: T.inr(net * monthly), tone: net > 0 ? 'good' : 'bad' }
        ];
      }
    },

    {
      title: 'In-house vs outsourced — where the margin lives',
      note: 'A worked example: a ₹1,999 package executed in-house costs ₹470 and nets <strong>₹1,529</strong>. The same package with an outsourced decorator, photographer and cake costs ₹3,150 and loses <strong>₹1,151</strong>. Same package, same customer, same evening.',
      fields: [
        {
          id: 'inhouse', type: 'checks', tone: 'good', label: 'What your team can already do in-house',
          options: [
            { label: 'Set up a decorated table with candles and flowers in 15 minutes' },
            { label: 'Take 10 decent photographs on a good phone' },
            { label: 'Bake or source cakes at ingredient cost' },
            { label: 'Assemble reusable decoration kits at ₹100–150 per setup' },
            { label: 'Run the full occasion package without any external vendor' }
          ]
        },
        { id: 'train_plan', type: 'textarea', label: 'What will you train your team on, and by when?', rows: 3 }
      ]
    },

    {
      title: 'Your off-hours plan',
      note: 'Start with one stream. Launch it simply, test it honestly, iterate on what customers actually want. Within three months you will know exactly what your market will pay for, how often, and why.',
      fields: [
        { id: 'differentiator', type: 'textarea', label: 'What is your differentiator within the stream you picked?', rows: 3, placeholder: 'The themed décor nobody else offers. The specific cuisine nobody serves as a tiffin. The invoice billing that makes corporate expense claims easy.' },
        { id: 'launch_date', type: 'text', label: 'Launch date for stream one', placeholder: 'e.g. First Wednesday of next month' },
        { id: 'first_steps', type: 'textarea', label: 'The first five things you will do to launch it', rows: 4 },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before you launch',
          options: [
            { label: 'I know my fixed cost per trading hour' },
            { label: 'I have chosen exactly ONE stream to start with' },
            { label: 'I have modelled the numbers and the contribution is positive' },
            { label: 'Everything is executed in-house — no outsourced margin leaks' },
            { label: 'A dedicated SOP is written for this stream' },
            { label: 'A demo video or photo set exists to sell it with' },
            { label: 'A WhatsApp number and booking process is live' },
            { label: 'My team is trained and knows the exact conversation to have' }
          ]
        }
      ]
    }
  ],

  benchmarks: function (d) {
    var T = window.App, out = [];
    var fixed = T.num(d.rent) + T.num(d.salaries) + T.num(d.utils) + T.num(d.emi);
    var days = T.num(d.opdays) || 26, hrs = T.num(d.ophours) || 12;
    if (fixed) out.push({ label: 'Fixed cost per trading hour', you: T.inr(fixed / days / hrs), range: 'Every hour must clear this to break even', ok: true });
    if (T.num(d.occ_price)) {
      var net = T.num(d.occ_price) - T.num(d.occ_food) - T.num(d.occ_decor) - T.num(d.occ_out);
      var m = net / T.num(d.occ_price) * 100;
      out.push({ label: 'Occasion package margin', you: T.pct(m), range: '70–80% when executed in-house', ok: m >= 60, note: 'Outsourcing is eating it' });
    }
    if (T.num(d.tf_price) && T.num(d.tf_cost)) {
      var per = T.num(d.tf_price) / (T.num(d.tf_meals) || 22);
      out.push({ label: 'Tiffin price per meal', you: T.inr(per), range: '₹90–115 competitive with a canteen', ok: per >= 80 && per <= 130, note: per < 80 ? 'Too cheap to profit' : 'Above canteen pricing' });
      var fc = T.num(d.tf_cost) / per * 100;
      out.push({ label: 'Tiffin food cost', you: T.pct(fc), range: 'Under 45%', ok: fc <= 45, note: 'No margin left' });
    }
    if (T.num(d.kp_head)) out.push({ label: 'Kitty party per head', you: T.inr(T.num(d.kp_head)), range: '₹600–1,200 for Tier 2 casual dining', ok: T.num(d.kp_head) >= 500, note: 'Under-priced for the effort' });
    if (T.num(d.cl_food) && T.num(d.cl_comm)) {
      var cm = 100 - T.num(d.cl_food) - T.num(d.cl_comm);
      out.push({ label: 'Cloud kitchen margin', you: T.pct(cm), range: '40%+ workable after commission', ok: cm >= 30, note: 'Aggregator eats the margin' });
    }
    return out;
  },

  result: function (d) {
    var T = window.App;
    var fixed = T.num(d.rent) + T.num(d.salaries) + T.num(d.utils) + T.num(d.emi);
    var days = T.num(d.opdays) || 26, hrs = T.num(d.ophours) || 12, dead = T.num(d.deadhours);
    var perHour = fixed ? fixed / days / hrs : 0;
    var bleeding = perHour * dead * days;

    // stream contributions
    var occNet = 0, occOut = 0;
    if (T.num(d.occ_price) && T.num(d.occ_week)) {
      occOut = T.num(d.occ_out) * T.num(d.occ_week) * 4.3;
      occNet = (T.num(d.occ_price) - T.num(d.occ_food) - T.num(d.occ_decor) - T.num(d.occ_out)) * T.num(d.occ_week) * 4.3;
    }
    var clNet = 0;
    if (T.num(d.cl_aov) && T.num(d.cl_orders))
      clNet = T.num(d.cl_aov) * T.num(d.cl_orders) * days * (1 - (T.num(d.cl_food) + T.num(d.cl_comm)) / 100);
    var tfNet = 0;
    if (T.num(d.tf_price) && T.num(d.tf_subs))
      tfNet = T.num(d.tf_price) * T.num(d.tf_subs) - T.num(d.tf_cost) * (T.num(d.tf_meals) || 22) * T.num(d.tf_subs) - T.num(d.tf_staff);
    var kpNet = 0;
    if (T.num(d.kp_head) && T.num(d.kp_size) && T.num(d.kp_week))
      kpNet = (T.num(d.kp_head) * T.num(d.kp_size) + T.num(d.kp_addon) - T.num(d.kp_cost)) * T.num(d.kp_week) * 4.3;

    var streams = [
      { n: 'Occasion packages', v: occNet }, { n: 'Cloud kitchen', v: clNet },
      { n: 'Tiffin subscriptions', v: tfNet }, { n: 'Private dining & kitty', v: kpNet }
    ].filter(function (s) { return s.v !== 0; });
    var totalNew = streams.reduce(function (a, s) { return a + s.v; }, 0);
    var best = streams.slice().sort(function (a, b) { return b.v - a.v; })[0];

    var fit = (d.fit || []).length;
    var inhouse = (d.inhouse || []).length;
    var gate = (d.gate || []).length;
    var modelled = streams.length;

    var score = 0, checks = 0;
    function add(c, w) { checks += w; if (c) score += w; }
    add(fixed > 0 && dead > 0, 12);
    add(fit >= 3, 8);
    add(!!d.pick, 10);
    checks += 20; score += Math.min(20, modelled * 7);
    add(totalNew > 0, 10);
    add(fixed > 0 && totalNew >= fixed * 0.25, 10);
    checks += 12; score += (inhouse / 5) * 12;
    add(String(d.differentiator || '').length > 30, 5);
    add(String(d.first_steps || '').length > 40, 5);
    checks += 8; score += (gate / 8) * 8;
    var pct100 = checks ? score / checks * 100 : 0;

    var band;
    if (pct100 >= 76) band = { label: 'Ready to launch', color: '#0f7a4a', text: 'You know what an empty hour costs, you have modelled the numbers, and your execution is in-house. Launch one stream, run it for eight weeks, then add the next.' };
    else if (pct100 >= 54) band = { label: 'Model it further', color: '#b06a06', text: 'The direction is right. Finish the numbers on your chosen stream and close the in-house execution gaps — that is where the entire margin is decided.' };
    else if (pct100 >= 30) band = { label: 'Opportunity untouched', color: '#c4400f', text: 'You are paying for these hours whether you use them or not. Pick one stream, model it properly, and you will usually find more monthly profit here than in a marketing budget three times the size.' };
    else band = { label: 'Dead hours are costing you', color: '#c41230', text: 'Start with the fixed cost maths at the top. Once you see what an empty Wednesday afternoon actually costs, the case for one extra revenue stream makes itself.' };

    var flags = [];
    if (perHour) flags.push({ tone: 'bad', icon: '⏰', text: '<strong>Every hour your restaurant is open costs ' + T.inr(perHour) + ' before you buy a single ingredient.</strong>' + (dead ? ' Across ' + dead + ' dead hours a day, that is <strong>' + T.inr(bleeding) + ' a month</strong> of fixed cost running against near-zero revenue.' : '') });
    if (best && best.v > 0) flags.push({ tone: 'ok', icon: '💰', text: '<strong>' + T.esc(best.n) + ' is your strongest modelled stream at ' + T.inr(best.v) + ' net contribution a month.</strong>' + (fixed ? ' That covers ' + T.pct(Math.min(100, best.v / fixed * 100)) + ' of your entire fixed cost base — from hours you are already paying for.' : '') });
    if (streams.length > 1) flags.push({ icon: '📊', text: '<strong>Combined modelled contribution: ' + T.inr(totalNew) + ' a month.</strong> Start with one anyway. Four half-launched streams produce less than one properly executed.' });
    if (occOut > 0) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>' + T.inr(occOut) + ' a month walking out to outside vendors.</strong> A team member who sets up candles and petals costs you nothing extra; a decorator charges ₹500–1,500 per booking. Train instead of outsourcing — it is the difference between ₹1,529 profit and ₹1,151 loss on the same package.' });
    if (inhouse < 3) flags.push({ tone: 'bad', icon: '🎓', text: '<strong>Only ' + inhouse + ' of 5 in-house capabilities in place.</strong> Training two staff on phone photography alone justifies adding ₹500–1,000 to a package price. This is the highest-return training you will do all year.' });
    if (!d.pick) flags.push({ icon: '🎯', text: '<strong>No stream chosen yet.</strong> Pick one. Not four. The restaurants that try all four simultaneously execute none of them well and conclude the whole idea does not work.' });
    if (d.pick === 'Tiffin subscriptions — recurring daily revenue' && (d.fit || []).indexOf('I am within 1km of a college, hostel or PG cluster') < 0 && (d.fit || []).indexOf('I am within 1km of offices or a corporate park') < 0)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You have chosen tiffin but are not near a college, hostel or office cluster.</strong> Proximity is the entire structural advantage in this stream. Without it you are competing on delivery logistics you do not have.' });
    if (d.pick === 'Occasion packages — candlelight, anniversaries, proposals' && (d.fit || []).indexOf('My ambience is warm and intimate enough for couples') < 0)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You have chosen occasion packages but have not confirmed your ambience suits couples.</strong> A candlelight package under bright white QSR lighting produces disappointed customers and honest bad reviews.' });
    if (fixed && totalNew > 0 && totalNew >= fixed * 0.5)
      flags.push({ tone: 'ok', icon: '✓', text: '<strong>Your modelled off-hours streams cover ' + T.pct(totalNew / fixed * 100) + ' of monthly fixed costs.</strong> This is what lets a restaurant survive a slow dine-in quarter — a rainy season, a festival week, a new competitor. The tiffin revenue keeps coming.' });
    if (!String(d.differentiator || '').trim())
      flags.push({ icon: '✎', text: '<strong>No differentiator written for your chosen stream.</strong> Find the gap that exists specifically for your customer, in your market, in your off-hours — then build the product around it.' });

    return {
      title: totalNew > 0 ? T.inr(totalNew) + ' a month from hours that earn nothing today' : 'Your dead-hours opportunity',
      subtitle: perHour ? 'An empty trading hour costs you ' + T.inr(perHour) + (dead ? ' · ' + T.inr(bleeding) + ' a month in dead hours' : '') : 'Start with your fixed cost maths above.',
      score: pct100, scoreLabel: Math.round(pct100), scoreUnit: 'OFF-HOURS',
      band: band, flags: flags
    };
  }
};
