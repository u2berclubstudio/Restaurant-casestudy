/* Restaurant Casestudy — The Idea Validator */
window.TOOL_SCHEMA = {
  id: 'idea',
  icon: '💡',
  title: 'The Idea Validator',
  subtitle: 'Everyone loves your food. But will they pay for it? Put your idea on paper — fully, honestly, in detail — and find out whether it is ready to move forward or still needs sharpening.',
  why: "<strong>Why this matters.</strong> \"Everyone loves my food\" is the most expensive sentence in this industry. Friends eat for free and praise you regardless. This tool separates a concept a stranger would pay for, repeatedly, from one that only works among people who like you.",
  next: { slug: 'location', title: "Location Audit Scorecard", why: "Your idea is defined. The next thing that decides whether it works is where you put it." },

  sections: [
    {
      title: 'Describe your idea',
      note: 'In your own words, as completely as you can right now. Do not worry about it being perfect — just get it out of your head.',
      fields: [
        { id: 'idea', type: 'textarea', label: 'My restaurant idea in 3–5 sentences', rows: 5, placeholder: 'What you serve, to whom, where, and why it will work.' },
        {
          id: 'format', type: 'select', label: 'Format',
          options: ['QSR / Quick service', 'Café', 'Casual dining', 'Fine dining', 'Cloud kitchen', 'Food truck', 'Bakery / Dessert', 'Bar / Pub']
        }
      ]
    },

    {
      title: 'The three pillars',
      note: 'Every strong restaurant idea stands on three pillars. Fill each one in as specifically as you can. Vagueness here becomes expensive later.',
      fields: [
        { id: 'p_food', type: 'textarea', label: 'Pillar 1 — The food. What exactly will you serve?', hint: 'Be specific. "Indian food" is not an answer. "Amritsari kulcha, chole, lassi and three seasonal specials" is.', rows: 3 },
        { id: 'p_food_diff', type: 'textarea', label: 'What makes your food stand out from what already exists nearby?', rows: 3 },
        { id: 'p_exp', type: 'textarea', label: 'Pillar 2 — The experience. Describe the ambience, décor and feel.', rows: 3 },
        { id: 'p_exp_feel', type: 'textarea', label: 'What should a customer feel walking in — and walking out?', rows: 3 },
        { id: 'p_price_avg', type: 'money', label: 'Pillar 3 — The price point. Target average spend per person', placeholder: '350' },
        { id: 'p_price_why', type: 'textarea', label: 'Why is that the right number for your customer?', rows: 3, placeholder: 'What can they actually afford, how often, and what do they pay elsewhere for the same occasion?' }
      ]
    },

    {
      title: 'Who is your customer?',
      note: '"Everyone" is not a customer. <em>"College students aged 18–24 in Jalandhar who eat out 3–4 times a week and spend ₹100–200 per visit"</em> is a customer.',
      fields: [
        { id: 'cust', type: 'textarea', label: 'My customer, described precisely', rows: 4, placeholder: 'Age, occupation, where they live or work, how often they eat out, what they spend, what they currently do instead.' },
        { id: 'cust_age', type: 'text', label: 'Age range', placeholder: '18–24' },
        { id: 'cust_freq', type: 'select', label: 'How often will they visit you?', options: ['Daily', '3–4 times a week', 'Weekly', '2–3 times a month', 'Monthly', 'Occasion only — a few times a year'] },
        { id: 'cust_now', type: 'textarea', label: 'Where do they eat right now instead of you — and what is wrong with it?', rows: 3 }
      ],
      metrics: function (d) {
        var T = window.App, spend = T.num(d.p_price_avg);
        var perMonth = { 'Daily': 26, '3–4 times a week': 14, 'Weekly': 4, '2–3 times a month': 2.5, 'Monthly': 1, 'Occasion only — a few times a year': 0.25 }[d.cust_freq] || 0;
        var lv = spend * perMonth * 12;
        if (!spend || !perMonth) return [{ k: 'Annual value per customer', v: '—', n: 'Fill in spend and frequency' }];
        return [
          { k: 'Spend per visit', v: T.inr(spend) },
          { k: 'Visits per year', v: Math.round(perMonth * 12) },
          { k: 'Value of one regular / year', v: T.inr(lv), n: 'Why repeat customers matter more than new ones', tone: lv >= 12000 ? 'good' : (lv >= 4000 ? 'warn' : 'bad') }
        ];
      }
    },

    {
      title: 'Is your idea new, or does it already exist?',
      note: 'There is no wrong answer — but each answer demands a different kind of homework.',
      fields: [
        {
          id: 'novelty', type: 'radio', label: 'Which best describes your idea?',
          options: [
            { label: 'Completely new — nobody has done this before', sub: 'Highest risk. You must explain why not.' },
            { label: 'Exists elsewhere, new to my market', sub: 'Lowest risk if adapted properly. Usually the sweet spot.' },
            { label: 'Exists in my market already — I will do it better', sub: 'Needs a tangible differentiator, not just "better quality".' }
          ]
        },
        { id: 'nov_why', type: 'textarea', label: 'If it is completely new — why has nobody done this before? Is it ahead of its time, or did someone try and fail?', optional: true, rows: 3 },
        { id: 'nov_where', type: 'textarea', label: 'If it exists elsewhere — where have you seen it work, and why will it work in your city specifically?', optional: true, rows: 3 },
        { id: 'nov_adapt', type: 'textarea', label: 'What will you adapt for the local customer, culture and budget?', optional: true, rows: 3 },
        { id: 'nov_diff', type: 'textarea', label: 'If it exists here already — what is your specific, tangible twist?', optional: true, rows: 3, placeholder: 'Must be something a customer can point at. "Better quality" is not a differentiator.' }
      ]
    },

    {
      title: 'Trend or need?',
      note: 'Trends bring a rush and then leave. Needs pay rent for a decade. Tick whatever is true — the mix tells you how to plan.',
      fields: [
        {
          id: 'trend', type: 'checks', tone: 'risk', label: 'This idea is TREND-based if…',
          options: [
            { label: 'People are excited about it now but may not be in 3 years' },
            { label: 'It is built on a currently fashionable food format' },
            { label: 'I discovered it mainly through social media' },
            { label: 'The novelty IS the main selling point' }
          ]
        },
        {
          id: 'need', type: 'checks', tone: 'good', label: 'This idea is NEED-based if…',
          options: [
            { label: 'People need this regularly — daily or several times a week' },
            { label: 'There is a genuine gap; no good option exists today' },
            { label: 'The need will exist 5 years from now as much as today' },
            { label: 'Customers will return repeatedly, not once out of curiosity' }
          ]
        },
        { id: 'trend_plan', type: 'textarea', label: 'If it is trend-led — what is your plan when the trend cools?', optional: true, rows: 3, placeholder: 'What do you sell in year three when the novelty is gone?' }
      ],
      metrics: function (d) {
        var t = (d.trend || []).length, n = (d.need || []).length;
        var verdict = n > t ? 'Need-led' : (t > n ? 'Trend-led' : (t + n === 0 ? '—' : 'Even mix'));
        return [
          { k: 'Trend signals', v: t + ' / 4', tone: t >= 3 ? 'bad' : '' },
          { k: 'Need signals', v: n + ' / 4', tone: n >= 3 ? 'good' : '' },
          { k: 'Verdict', v: verdict, n: n > t ? 'Built to last' : (t > n ? 'Plan your second act now' : 'Anchor it in a real need'), tone: n > t ? 'good' : (t > n ? 'warn' : '') }
        ];
      }
    },

    {
      title: 'Has someone tried this before?',
      note: 'Research is not optional. Find what has been tried in your city or a comparable market — and what happened to it. Add one row per place.',
      fields: [
        {
          id: 'priors', type: 'table', label: 'Places that tried something similar',
          columns: [
            { key: 'name', label: 'Place', placeholder: 'Name' },
            { key: 'city', label: 'City / area', placeholder: 'Where' },
            { key: 'outcome', label: 'What happened', type: 'select', options: ['Still running & busy', 'Still running, struggling', 'Closed within 1 year', 'Closed after 1–3 years', 'Pivoted to something else'] },
            { key: 'why', label: 'Why do you think so?', placeholder: 'Your read on it' }
          ],
          seed: 3,
          totals: function (rows) {
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            var closed = filled.filter(function (r) { return (r.outcome || '').indexOf('Closed') === 0; }).length;
            if (!filled.length) return 'Research at least 3 comparable places.';
            return '<b>' + filled.length + '</b> researched · <b>' + closed + '</b> closed' + (filled.length >= 3 ? ' · good research depth' : ' · <span style="color:var(--red)">do more research</span>');
          }
        },
        { id: 'prior_learn', type: 'textarea', label: 'What did you learn from researching them?', rows: 3 },
        { id: 'prior_diff', type: 'textarea', label: 'What will you do differently based on what you found?', rows: 3 }
      ]
    },

    {
      title: 'Rate the strength of your idea',
      note: 'Be harsh. A 3 today is better than a 1 after you have already signed the lease.',
      fields: [
        {
          id: 'strength', type: 'ratings', label: 'Score each dimension 1–5',
          items: [
            { id: 'clarity', label: 'Clarity', sub: 'Can I explain it in one sentence?' },
            { id: 'demand', label: 'Demand evidence', sub: 'Do I have proof people want this, beyond friends and family?' },
            { id: 'differ', label: 'Differentiation', sub: 'Is my twist tangible and visible to a customer?' },
            { id: 'afford', label: 'Affordability', sub: 'Can my customer actually pay my price, at my frequency?' },
            { id: 'exec', label: 'Executability', sub: 'Can my kitchen deliver this consistently, every day?' },
            { id: 'durable', label: 'Durability', sub: 'Will this still be wanted in 5 years?' },
            { id: 'reach', label: 'Reachability', sub: 'Do I know exactly how to reach this customer?' },
            { id: 'margin', label: 'Margin headroom', sub: 'Does the price leave room for 65–70% gross margin?' }
          ]
        }
      ],
      metrics: function (d) {
        var v = d.strength || {}, sum = 0, n = 0;
        Object.keys(v).forEach(function (k) { sum += v[k]; n++; });
        var weakest = null;
        Object.keys(v).forEach(function (k) { if (!weakest || v[k] < v[weakest]) weakest = k; });
        var names = { clarity: 'Clarity', demand: 'Demand evidence', differ: 'Differentiation', afford: 'Affordability', exec: 'Executability', durable: 'Durability', reach: 'Reachability', margin: 'Margin headroom' };
        return [
          { k: 'Idea score', v: sum + ' / 40', tone: sum >= 30 ? 'good' : (sum >= 22 ? 'warn' : (n ? 'bad' : '')) },
          { k: 'Dimensions rated', v: n + ' / 8' },
          { k: 'Weakest link', v: weakest ? names[weakest] : '—', n: weakest ? 'Fix this before anything else' : '' }
        ];
      }
    },

    {
      title: 'The five-sentence test',
      note: 'Write your idea in exactly five sentences. No more, no less. Plain language, no jargon. If you cannot, the idea is not clear enough yet — and an idea you cannot explain is an idea you cannot sell.',
      fields: [
        { id: 'five', type: 'textarea', label: 'My idea in five sentences', rows: 7, placeholder: '1. …\n2. …\n3. …\n4. …\n5. …' },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before you move on',
          options: [
            { label: 'My three pillars — food, experience, price — are each specific' },
            { label: 'I can describe my customer precisely, not as "everyone"' },
            { label: 'I know whether my idea is a trend or a need, and I have planned accordingly' },
            { label: 'I have researched at least three places that tried something similar' },
            { label: 'I have written and read aloud my five-sentence version' }
          ]
        }
      ]
    }
  ],

  result: function (d) {
    var T = window.App;
    var st = d.strength || {}, sum = 0, rated = 0;
    Object.keys(st).forEach(function (k) { sum += st[k]; rated++; });
    var t = (d.trend || []).length, n = (d.need || []).length;
    var priors = (d.priors || []).filter(function (r) { return (r.name || '').trim(); }).length;
    var gate = (d.gate || []).length;
    var fiveOK = String(d.five || '').trim().split(/\s+/).length >= 40;
    var pillars = ['p_food', 'p_food_diff', 'p_exp', 'p_exp_feel', 'p_price_why'].filter(function (k) { return String(d[k] || '').trim().length > 25; }).length;
    var custOK = String(d.cust || '').trim().length > 60;

    var score = 0;
    score += (sum / 40) * 40;                        // self-rated strength
    score += (pillars / 5) * 14;                     // pillars defined
    score += custOK ? 10 : 0;                        // customer defined
    score += Math.min(10, priors * 3.4);             // research done
    score += (n - t) >= 2 ? 10 : ((n - t) >= 0 ? 6 : 0); // need over trend
    score += fiveOK ? 8 : 0;
    score += (gate / 5) * 8;
    if (rated < 8) score *= 0.92;

    var band;
    if (score >= 76) band = { label: 'Ready to test', color: '#0f7a4a', text: 'This idea is specific, grounded in a real need, and researched. Take it to the Location Audit and start scoring spaces — but keep testing the food with strangers, not friends.' };
    else if (score >= 56) band = { label: 'Promising, needs sharpening', color: '#b06a06', text: 'The bones are good. The flagged gaps below are the difference between an idea that reads well on paper and one that fills tables on a Tuesday.' };
    else if (score >= 34) band = { label: 'Too vague to fund', color: '#c4400f', text: 'There is something here, but it is not yet a concept a customer could describe to a friend. Sharpen the pillars and the customer before you look at locations.' };
    else band = { label: 'Back to the drawing board', color: '#c41230', text: 'Right now this is a wish, not a concept. That is entirely fixable — but do it here, on paper, where it costs nothing.' };

    var flags = [];
    if (t > n && t >= 3) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>This is a trend-led idea.</strong> Trends produce a great month three and a terrible month eighteen. Write your second act now — what do you sell when the novelty wears off?' });
    if (n >= 3) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Need-based idea.</strong> These are the ones that survive. Repeat customers, not curiosity traffic.' });
    if (priors < 3) flags.push({ tone: 'bad', icon: '🔍', text: '<strong>Only ' + priors + ' comparable place' + (priors === 1 ? '' : 's') + ' researched.</strong> Find at least three. Someone has already run your experiment — learn what it cost them.' });
    if (d.novelty === 'Completely new — nobody has done this before' && String(d.nov_why || '').trim().length < 30)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You claim the idea is completely new but have not explained why nobody has done it.</strong> In food, "nobody has done this" usually means somebody tried and it did not work. Find out which.' });
    if (d.novelty === 'Exists in my market already — I will do it better' && String(d.nov_diff || '').trim().length < 25)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>No tangible differentiator written.</strong> If your only advantage is "we will do it better", your competitor\'s existing customers have no reason to switch.' });
    if ((st.demand || 0) <= 2) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Weak demand evidence.</strong> Friends and family are not evidence. Run a pop-up, a stall, or two weekends of delivery-only before you commit capital.' });
    if ((st.margin || 0) <= 2) flags.push({ tone: 'bad', icon: '₹', text: '<strong>Margin headroom is thin.</strong> Take your top ten dishes through the <a href="menu.html" style="color:#ff8a96">Menu Engineering tool</a> before you finalise pricing — target 28–35% food cost.' });
    if ((st.exec || 0) <= 2) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You are not sure your kitchen can deliver this consistently.</strong> That is the single most common reason good concepts die. The <a href="sop.html" style="color:#ff8a96">SOP Builder</a> exists for exactly this.' });
    if (!custOK) flags.push({ icon: '✎', text: '<strong>Your customer is still described loosely.</strong> Rewrite it with an age, an area, a frequency and a spend. Everything downstream — menu, price, marketing — depends on this one paragraph.' });
    if (!fiveOK) flags.push({ icon: '✎', text: '<strong>Five-sentence test not completed.</strong> If you cannot explain it in five plain sentences, your customer will not be able to explain it to their friend — and word of mouth is how restaurants actually grow.' });

    return {
      title: 'Idea strength: ' + (rated ? sum + '/40' : 'not yet rated'),
      subtitle: 'How ready your concept is to move into location and money decisions.',
      score: score, scoreLabel: Math.round(score), scoreUnit: 'READINESS',
      band: band, flags: flags
    };
  }
};
