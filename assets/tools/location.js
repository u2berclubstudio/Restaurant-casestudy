/* Restaurant Casestudy — Location Audit Scorecard */
window.TOOL_SCHEMA = {
  id: 'location',
  icon: '📍',
  title: 'Location Audit Scorecard',
  subtitle: 'Do not sign the lease until you have completed this. One sheet per location — fill it, print it, and compare them side by side before you commit a rupee.',
  why: "<strong>Why this matters.</strong> Location is the one decision you cannot undo without losing your deposit and your fit-out. Rent above 10% of realistic revenue puts you under pressure from day one; above 15% you are effectively working for your landlord. Complete one sheet per location and compare them.",
  next: { slug: 'break-even', title: "Break-Even Calculator", why: "You have a location and a rent number. Now find out how many customers a day it takes to survive it." },

  sections: [
    {
      title: 'Location basics',
      note: 'Complete one sheet per location you are seriously considering.',
      fields: [
        { id: 'addr', type: 'text', label: 'Address / identifier for this location', placeholder: 'e.g. Shop 12, Model Town Market' },
        { id: 'area', type: 'number', label: 'Carpet area (sq ft)', placeholder: '900' },
        { id: 'seats', type: 'number', label: 'Seats you can realistically fit', placeholder: '32' },
        { id: 'floor', type: 'select', label: 'Floor', options: ['Ground floor, street facing', 'Ground floor, set back', 'First floor', 'Second floor or above', 'Basement', 'Inside a mall / food court'] }
      ]
    },

    {
      title: 'The rent maths — do this before anything else',
      note: 'This is where most restaurants are lost, months before they open. Rent must stay at or below <strong>10%</strong> of realistic monthly revenue. Above 15% and you are working for your landlord.',
      fields: [
        { id: 'rent', type: 'money', label: 'Monthly rent', placeholder: '45000' },
        { id: 'deposit', type: 'money', label: 'Security deposit', placeholder: '270000' },
        { id: 'cam', type: 'money', label: 'CAM / maintenance per month', optional: true, placeholder: '0' },
        { id: 'escal', type: 'number', label: 'Annual rent escalation (%)', placeholder: '10', hint: 'Most Indian commercial leases escalate 5–15% a year. Ask, and get it in writing.' },
        { id: 'lease_years', type: 'number', label: 'Lease term (years)', placeholder: '5' },
        { id: 'exp_spend', type: 'money', label: 'Realistic average spend per customer', placeholder: '300' },
        { id: 'exp_cust', type: 'number', label: 'Realistic customers per day', placeholder: '60', hint: 'Realistic means the number you would still hit on a wet Tuesday in July — not your best Saturday.' },
        { id: 'days', type: 'number', label: 'Operating days per month', placeholder: '26' }
      ],
      metrics: function (d) {
        var T = window.App;
        var rent = T.num(d.rent) + T.num(d.cam);
        var rev = T.num(d.exp_spend) * T.num(d.exp_cust) * (T.num(d.days) || 26);
        if (!rent || !rev) return [{ k: 'Rent as % of revenue', v: '—', n: 'Enter rent, spend and covers' }];
        var ratio = rent / rev * 100;
        var y3 = T.num(d.rent) * Math.pow(1 + T.num(d.escal) / 100, 2);
        return [
          { k: 'Projected monthly revenue', v: T.inr(rev) },
          { k: 'Rent as % of revenue', v: T.pct(ratio), n: 'Target ≤ 10% · Danger > 15%', tone: ratio <= 10 ? 'good' : (ratio <= 15 ? 'warn' : 'bad') },
          { k: 'Revenue needed for 10% rent', v: T.inr(rent * 10), n: 'i.e. ' + Math.ceil(rent * 10 / ((T.num(d.exp_spend) || 1) * (T.num(d.days) || 26))) + ' customers/day' },
          { k: 'Rent in year 3', v: T.inr(y3), n: 'At ' + (T.num(d.escal) || 0) + '% escalation', tone: y3 / rev * 100 > 15 ? 'bad' : '' },
          { k: 'Cash locked in deposit', v: T.inr(T.num(d.deposit)), n: 'Money that cannot be used for anything else' }
        ];
      }
    },

    {
      title: 'Footfall tracker — go and count',
      note: 'Sit near the location and count how many people walk past per hour. Profile who they are. Do this on at least <strong>two different days</strong>, including one weekday and one weekend.',
      fields: [
        {
          id: 'footfall', type: 'table', label: 'Counted footfall by time slot',
          columns: [
            { key: 'slot', label: 'Time slot', type: 'select', options: ['Morning rush (8–10am)', 'Late morning (10am–12pm)', 'Lunch (12–3pm)', 'Afternoon (3–6pm)', 'Evening peak (6–9pm)', 'Night (9–11pm)'] },
            { key: 'day', label: 'Day', type: 'select', options: ['Weekday', 'Saturday', 'Sunday'] },
            { key: 'count', label: 'People / hour', type: 'number', placeholder: '0', width: '110px' },
            { key: 'mine', label: 'My customer type (%)', type: 'number', placeholder: '0', width: '130px' },
            {
              key: 'qual', label: 'Qualified / hr', calc: function (r) {
                var T = window.App, q = T.num(r.count) * T.num(r.mine) / 100;
                if (!T.num(r.count)) return { text: '—' };
                return { text: Math.round(q), tone: q >= 60 ? 'good' : (q >= 25 ? 'warn' : 'bad') };
              }
            }
          ],
          seed: [{ slot: 'Lunch (12–3pm)', day: 'Weekday' }, { slot: 'Evening peak (6–9pm)', day: 'Weekday' }, { slot: 'Evening peak (6–9pm)', day: 'Saturday' }, {}],
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return T.num(r.count) > 0; });
            if (!filled.length) return 'Go and count. Estimating this is how people lose lakhs.';
            var totQ = filled.reduce(function (a, r) { return a + T.num(r.count) * T.num(r.mine) / 100; }, 0);
            var avg = totQ / filled.length;
            return '<b>' + filled.length + '</b> slots counted · avg <b>' + Math.round(avg) + '</b> qualified people/hour' +
              (filled.length < 3 ? ' · <span style="color:var(--red)">count at least 3 slots</span>' : '');
          }
        },
        {
          id: 'ff_verdict', type: 'radio', label: 'Overall footfall verdict — is this enough of MY customer walking past?',
          options: [
            { label: 'Strong', tone: 'good' },
            { label: 'Moderate' },
            { label: 'Weak', tone: 'risk' },
            { label: 'Wrong customer type entirely', tone: 'risk' }
          ]
        }
      ]
    },

    {
      title: 'Visibility & access',
      note: 'Answer from an actual physical visit, not from a photo or a Google Street View still.',
      fields: [
        {
          id: 'access', type: 'checks', tone: 'good', label: 'Tick everything that is true',
          options: [
            { label: 'The frontage is visible from at least 50 metres away' },
            { label: 'A signboard here would be seen by passing traffic' },
            { label: 'There is usable parking within 100 metres' },
            { label: 'Two-wheeler parking is easy and free' },
            { label: 'The entrance is at street level or has an easy ramp/steps' },
            { label: 'It is on the side of the road people travel on their way home' },
            { label: 'Delivery riders can stop and wait without being moved on' },
            { label: 'The area is well lit and feels safe after 8pm' },
            { label: 'Public transport stops within 300 metres' },
            { label: 'It is easy to describe on the phone — "next to X"' }
          ]
        },
        { id: 'access_worry', type: 'textarea', label: 'Biggest visibility or access concern with this location', rows: 3 }
      ]
    },

    {
      title: 'Neighbourhood profile',
      note: 'Walk the area at two different times of day. Observe rather than assume.',
      fields: [
        { id: 'nb_type', type: 'select', label: 'Neighbourhood type', options: ['Residential', 'Commercial / offices', 'College area', 'Market', 'Mixed use', 'Industrial', 'Highway / transit'] },
        { id: 'nb_income', type: 'select', label: 'Dominant income level', options: ['Budget', 'Lower-middle', 'Middle', 'Upper-middle', 'Premium'] },
        {
          id: 'nb_match', type: 'radio', label: 'Does the neighbourhood match your target customer?',
          options: [{ label: 'Strong match', tone: 'good' }, { label: 'Partial match' }, { label: 'Poor match', tone: 'risk' }]
        },
        { id: 'nb_gap', type: 'textarea', label: 'What is currently missing here that your restaurant would provide?', rows: 3 }
      ]
    },

    {
      title: 'What came before',
      note: 'Find out the history of this exact space. A unit that has burned through three restaurants in five years is telling you something the landlord will not.',
      fields: [
        { id: 'hist_prev', type: 'text', label: 'What operated in this space before?', placeholder: 'e.g. A pizza outlet, closed after 14 months' },
        { id: 'hist_count', type: 'select', label: 'How many food businesses have occupied this space in the last 5 years?', options: ['This would be the first', 'One', 'Two', 'Three or more', 'I do not know yet'] },
        { id: 'hist_found', type: 'textarea', label: 'What did you find out — and who did you ask?', rows: 3, placeholder: 'Ask the neighbouring shopkeepers, not the broker. They will tell you the truth.' },
        { id: 'hist_concern', type: 'textarea', label: 'Does this history concern you? If yes, explain.', rows: 3, optional: true }
      ]
    },

    {
      title: 'Competition map — 500 metre radius',
      note: 'Walk a 500-metre radius. List every food business you find. Note the format, price point, how busy it looks, and whether it directly threatens your concept.',
      fields: [
        {
          id: 'comp', type: 'table', label: 'Every food business within 500m',
          columns: [
            { key: 'name', label: 'Name', placeholder: 'Business' },
            { key: 'format', label: 'Format', type: 'select', options: ['QSR', 'Café', 'Casual dining', 'Fine dining', 'Street / stall', 'Bakery', 'Cloud kitchen', 'Bar'] },
            { key: 'price', label: 'Avg spend ₹', type: 'number', placeholder: '250', width: '110px' },
            { key: 'busy', label: 'How busy', type: 'select', options: ['Packed', 'Steady', 'Quiet', 'Nearly empty'] },
            { key: 'threat', label: 'Threat to me', type: 'select', options: ['Direct', 'Partial', 'None'] }
          ],
          seed: 4,
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            if (!filled.length) return 'Walk the radius. This takes 40 minutes and changes decisions.';
            var direct = filled.filter(function (r) { return r.threat === 'Direct'; }).length;
            var prices = filled.map(function (r) { return T.num(r.price); }).filter(function (p) { return p > 0; });
            var avg = prices.length ? prices.reduce(function (a, b) { return a + b; }, 0) / prices.length : 0;
            return '<b>' + filled.length + '</b> mapped · <b>' + direct + '</b> direct competitors' +
              (avg ? ' · market avg spend <b>' + T.inr(avg) + '</b>' : '');
          }
        },
        {
          id: 'comp_verdict', type: 'radio', label: 'Is there a direct competitor already doing what you plan to do?',
          options: [
            { label: 'Yes — this is a serious concern', tone: 'risk' },
            { label: 'Partially — my concept is different enough' },
            { label: 'No — the gap is clear', tone: 'good' }
          ]
        },
        { id: 'comp_gap', type: 'textarea', label: 'What gap in the competition does your restaurant fill in this location?', rows: 3 }
      ]
    },

    {
      title: 'Seasonality & lease terms',
      note: 'How will this location behave across the year — and what are you actually signing?',
      fields: [
        { id: 'season', type: 'textarea', label: 'Seasonal patterns you need to plan for here', rows: 3, placeholder: 'e.g. College area — dead through May and June, and again over Diwali week. That is 10 weeks of low revenue a year.' },
        {
          id: 'lease_terms', type: 'checks', tone: 'good', label: 'Lease terms confirmed in writing',
          options: [
            { label: 'Lock-in period is defined and acceptable' },
            { label: 'Exit clause and notice period are clear' },
            { label: 'Escalation percentage is written into the agreement' },
            { label: 'Permission for kitchen exhaust / chimney is explicit' },
            { label: 'Permission for signage and branding is explicit' },
            { label: 'Sanctioned electrical load is enough for my kitchen' },
            { label: 'Water supply and drainage are adequate and confirmed' },
            { label: 'Who pays for structural repairs is written down' },
            { label: 'Property has clear title and the landlord can legally lease it' },
            { label: 'A lawyer has read the full agreement' }
          ]
        },
        { id: 'landlord', type: 'textarea', label: 'Your read on the landlord — and anything you have negotiated', rows: 3, placeholder: 'A difficult landlord turns a good location into a nightmare. Talk to their other tenants.' }
      ]
    },

    {
      title: 'Overall location scorecard',
      note: 'Rate this location on each dimension. <strong>1</strong> = serious concern &nbsp;·&nbsp; <strong>3</strong> = acceptable &nbsp;·&nbsp; <strong>5</strong> = strong advantage.',
      fields: [
        {
          id: 'score', type: 'ratings', label: 'Score this location',
          items: [
            { id: 'ff', label: 'Footfall volume & quality', sub: 'Enough of MY customer passing by' },
            { id: 'vis', label: 'Visibility & signage', sub: 'Can people see me?' },
            { id: 'acc', label: 'Access & parking', sub: 'Is it easy to arrive and easy to leave?' },
            { id: 'rentfit', label: 'Rent affordability', sub: 'Rent ÷ realistic revenue' },
            { id: 'nbfit', label: 'Neighbourhood fit', sub: 'Does this area want what I sell?' },
            { id: 'compfit', label: 'Competition position', sub: 'Is there a clear gap for me?' },
            { id: 'size', label: 'Size & layout workability', sub: 'Kitchen, seating, storage, staff' },
            { id: 'infra', label: 'Infrastructure', sub: 'Power, water, drainage, exhaust' },
            { id: 'lease', label: 'Lease terms & landlord', sub: 'Fair, clear, and legally sound' },
            { id: 'growth', label: 'Area trajectory', sub: 'Is this area getting better or worse?' }
          ]
        }
      ]
    },

    {
      title: 'Final decision',
      note: 'Before you sign anything, answer these three in writing.',
      fields: [
        { id: 'fd_why', type: 'textarea', label: '1. Why is this the right location for MY specific restaurant and MY specific customer?', rows: 3 },
        { id: 'fd_risk', type: 'textarea', label: '2. What is my biggest concern about this location — and how will I address it?', rows: 3 },
        { id: 'fd_plan', type: 'textarea', label: '3. If this location does not perform as expected in 6 months, what is my plan?', rows: 3 },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before you sign the lease',
          options: [
            { label: 'I have visited at least 3 times, at different times of day' },
            { label: 'I have counted and profiled the footfall myself' },
            { label: 'I have confirmed rent is ≤ 10% of realistic projected revenue' },
            { label: 'I have spoken to neighbouring businesses about the area' },
            { label: 'I have researched what operated in this space before' },
            { label: 'I have mapped the competition within 500 metres' },
            { label: 'I have had a lawyer review the lease' },
            { label: 'I can answer the three final questions with evidence, not hope' }
          ]
        }
      ]
    }
  ],

  benchmarks: function (d) {
    var T = window.App, out = [];
    var rent = T.num(d.rent) + T.num(d.cam);
    var rev = T.num(d.exp_spend) * T.num(d.exp_cust) * (T.num(d.days) || 26);
    if (rent && rev) {
      var ratio = rent / rev * 100;
      out.push({ label: 'Rent as % of revenue', you: T.pct(ratio), range: '6–10% healthy · up to 15% workable', ok: ratio <= 10, note: ratio <= 15 ? 'Tight' : 'Too high' });
    }
    if (T.num(d.escal)) out.push({ label: 'Annual rent escalation', you: T.num(d.escal) + '%', range: '5–7% negotiable · 10%+ aggressive', ok: T.num(d.escal) <= 7, note: 'Negotiate down' });
    if (T.num(d.deposit) && T.num(d.rent)) {
      var mo = T.num(d.deposit) / T.num(d.rent);
      out.push({ label: 'Deposit in months of rent', you: mo.toFixed(1) + ' months', range: '3–6 months typical in India', ok: mo <= 6, note: 'Unusually high' });
    }
    var ff = (d.footfall || []).filter(function (r) { return T.num(r.count) > 0; });
    if (ff.length) {
      var q = ff.reduce(function (a, r) { return a + T.num(r.count) * T.num(r.mine) / 100; }, 0) / ff.length;
      out.push({ label: 'Qualified footfall per hour', you: Math.round(q) + ' people', range: '40+ strong · 20–40 workable · under 20 thin', ok: q >= 20, note: 'Destination-dependent' });
    }
    return out;
  },

  result: function (d) {
    var T = window.App;
    var sc = d.score || {}, sum = 0, rated = 0;
    Object.keys(sc).forEach(function (k) { sum += sc[k]; rated++; });

    var rent = T.num(d.rent) + T.num(d.cam);
    var rev = T.num(d.exp_spend) * T.num(d.exp_cust) * (T.num(d.days) || 26);
    var ratio = rev ? rent / rev * 100 : 0;

    var ffRows = (d.footfall || []).filter(function (r) { return T.num(r.count) > 0; });
    var avgQ = ffRows.length ? ffRows.reduce(function (a, r) { return a + T.num(r.count) * T.num(r.mine) / 100; }, 0) / ffRows.length : 0;
    var comp = (d.comp || []).filter(function (r) { return (r.name || '').trim(); });
    var direct = comp.filter(function (r) { return r.threat === 'Direct'; }).length;
    var gate = (d.gate || []).length;
    var access = (d.access || []).length;
    var terms = (d.lease_terms || []).length;

    var score = 0;
    score += (sum / 50) * 42;
    if (rev) score += ratio <= 8 ? 16 : (ratio <= 10 ? 13 : (ratio <= 12 ? 8 : (ratio <= 15 ? 4 : 0)));
    score += Math.min(10, ffRows.length * 2.5) * (avgQ >= 40 ? 1 : (avgQ >= 20 ? 0.7 : 0.4));
    score += (access / 10) * 10;
    score += (terms / 10) * 10;
    score += Math.min(6, comp.length * 1.2);
    score += (gate / 8) * 6;

    var band;
    if (score >= 76) band = { label: 'Strong location', color: '#0f7a4a', text: 'The numbers, the footfall and the terms all hold up. Get the lease legally reviewed, negotiate the escalation, and move to the Break-Even Calculator.' };
    else if (score >= 58) band = { label: 'Workable with fixes', color: '#b06a06', text: 'This location can work, but not as it stands. Address the flagged items — most are negotiable before you sign and impossible after.' };
    else if (score >= 38) band = { label: 'Risky — negotiate hard or walk', color: '#c4400f', text: 'There are real structural problems here. Either the rent comes down substantially or you keep looking. Do not fall in love with a space.' };
    else band = { label: 'Do not sign', color: '#c41230', text: 'On the evidence you have entered, this location would put your restaurant under pressure from day one. Keep looking. The right space is worth three more months of searching.' };

    var flags = [];
    if (rev && ratio > 15) flags.push({ tone: 'bad', icon: '₹', text: '<strong>Rent is ' + T.pct(ratio) + ' of realistic revenue.</strong> Above 15% you are running the restaurant for your landlord. You need revenue of ' + T.inr(rent * 10) + '/month to make this rent sane — that is ' + Math.ceil(rent * 10 / ((T.num(d.exp_spend) || 1) * (T.num(d.days) || 26))) + ' customers a day, every day.' });
    else if (rev && ratio > 10) flags.push({ tone: 'bad', icon: '₹', text: '<strong>Rent is ' + T.pct(ratio) + ' of revenue — above the 10% target.</strong> Either negotiate the rent down to ' + T.inr(rev * 0.1) + ', or be honest that your revenue projection needs to be higher than you think it is.' });
    else if (rev && ratio > 0) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Rent at ' + T.pct(ratio) + ' of revenue.</strong> That is inside the healthy band and gives you room to survive a slow quarter.' });

    if (T.num(d.escal) >= 12) flags.push({ tone: 'bad', icon: '📈', text: '<strong>' + T.num(d.escal) + '% annual escalation is aggressive.</strong> By year three your rent is ' + T.inr(T.num(d.rent) * Math.pow(1 + T.num(d.escal) / 100, 2)) + '. Negotiate this down to 5–7% now — it is the cheapest negotiation you will ever make.' });

    if (ffRows.length < 3) flags.push({ tone: 'bad', icon: '👣', text: '<strong>Footfall counted in only ' + ffRows.length + ' time slot' + (ffRows.length === 1 ? '' : 's') + '.</strong> Go back and count at least three, across two different days. Nothing else on this sheet matters if the people are not walking past.' });
    else if (avgQ < 20) flags.push({ tone: 'bad', icon: '👣', text: '<strong>Only about ' + Math.round(avgQ) + ' of your target customers pass per hour.</strong> That is thin. You would be relying on destination traffic — which means your marketing budget has to do the work the location is not doing.' });
    else if (avgQ >= 50) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Roughly ' + Math.round(avgQ) + ' qualified people pass per hour.</strong> Strong passing trade — this is the kind of location that forgives early mistakes.' });

    if (d.ff_verdict === 'Wrong customer type entirely') flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You have marked the passing customer as the wrong type entirely.</strong> That is a dealbreaker, not a fixable problem. No amount of marketing changes who walks down a street.' });

    if (direct >= 2) flags.push({ tone: 'bad', icon: '⚔', text: '<strong>' + direct + ' direct competitors within 500 metres.</strong> You need a differentiator a customer can see from the doorway, not one you have to explain.' });
    if (d.hist_count === 'Three or more') flags.push({ tone: 'bad', icon: '🏚', text: '<strong>Three or more food businesses have failed in this exact space.</strong> That pattern is rarely a coincidence. Find out what killed them before you become the fourth — bad kitchen ventilation, poor visibility from the road, and a landlord who does not maintain the building are the usual culprits.' });
    if (terms < 7) flags.push({ tone: 'bad', icon: '📄', text: '<strong>' + (10 - terms) + ' lease terms still unconfirmed.</strong> Every one of these is negotiable today and permanent tomorrow. Exhaust permission and sanctioned electrical load are the two that most often surface after the deposit is paid.' });
    if ((d.lease_terms || []).indexOf('A lawyer has read the full agreement') < 0) flags.push({ tone: 'bad', icon: '⚖', text: '<strong>No lawyer has read the lease.</strong> ₹8,000–15,000 for a proper review against a multi-lakh deposit is the best value spend in this entire process.' });
    if (comp.length < 4) flags.push({ icon: '🔍', text: '<strong>Only ' + comp.length + ' competitor' + (comp.length === 1 ? '' : 's') + ' mapped.</strong> Walk the full 500 metres and list every food business, including the tea stall. They are all competing for the same lunch money.' });
    if (rated < 10) flags.push({ icon: '✎', text: '<strong>' + (10 - rated) + ' scorecard dimensions unrated.</strong> Complete the scorecard so you can compare this location against the next one objectively.' });

    return {
      title: (d.addr ? d.addr : 'This location') + ' — audit',
      subtitle: rated ? 'Scorecard: ' + sum + '/50 · ' + (rev ? 'Rent at ' + T.pct(ratio) + ' of projected revenue' : 'rent maths incomplete') : 'Complete the sheet to see your verdict.',
      score: score, scoreLabel: Math.round(score), scoreUnit: 'LOCATION',
      band: band, flags: flags
    };
  }
};
