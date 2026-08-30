/* Restaurant Casestudy — 90-Day Marketing Planner */
window.TOOL_SCHEMA = {
  id: 'marketing',
  icon: '📣',
  title: '90-Day Marketing Planner',
  subtitle: 'From zero awareness to full tables — 30 days before opening and 60 days after. Every task, every rupee, every review, tracked in one place.',
  why: "<strong>Why this matters.</strong> Most restaurants open to silence and then pay three months of rent while the neighbourhood works out they exist. Almost everything in the pre-launch list here is free, takes an afternoon, and cannot be done retrospectively.",
  next: { slug: 'revenue', title: "Dead Hours Revenue Planner", why: "You are trading. Now look at the hours you are already paying for and earning nothing from." },

  sections: [
    {
      title: 'Customer & positioning — the foundation',
      note: 'Answer these before you plan a single post or spend a single rupee. This is your marketing brief, and every decision below refers back to it.',
      fields: [
        { id: 'cust', type: 'textarea', label: 'Who is your customer? Age, occupation, area, habits, spending capacity.', rows: 4 },
        {
          id: 'platform', type: 'checks', label: 'Where does this customer actually spend their attention?',
          options: [
            { label: 'Instagram' }, { label: 'YouTube Shorts' }, { label: 'WhatsApp' },
            { label: 'Snapchat' }, { label: 'Facebook' }, { label: 'Google Maps / Search' },
            { label: 'Zomato / Swiggy browsing' }
          ]
        },
        { id: 'positioning', type: 'textarea', label: 'Your positioning statement', rows: 3, placeholder: 'For [customer], [restaurant] is the [category] that [unique benefit], because [reason to believe].' },
        {
          id: 'personality', type: 'radio', label: 'Content personality — how should your restaurant sound online?',
          options: [
            { label: 'Funny & relatable' }, { label: 'Aspirational & premium' },
            { label: 'Warm & community' }, { label: 'Bold & edgy' }, { label: 'Educational & informative' }
          ]
        }
      ]
    },

    {
      title: 'Content pillars — what you will post',
      note: 'Three or four pillars. Every post belongs to one. This is what gives you variety and consistency at the same time — and stops you posting nothing but plates of food.',
      fields: [
        { id: 'pillar_c', type: 'textarea', label: 'Pillar 1 — Culture / entertainment', rows: 2, placeholder: 'Content that reflects your customer\'s world. What do they laugh at? What do they relate to?' },
        { id: 'pillar_p', type: 'textarea', label: 'Pillar 2 — People / character', rows: 2, placeholder: 'Your team, your founder story, the faces behind the restaurant.' },
        { id: 'pillar_f', type: 'textarea', label: 'Pillar 3 — Food / product', rows: 2, placeholder: 'Your food in context — being made, being eaten, being enjoyed. Not flat plate photos.' },
        { id: 'pillar_s', type: 'textarea', label: 'Pillar 4 — Community / social proof', rows: 2, placeholder: 'Customer stories, reviews, user content, local events.' },
        { id: 'face', type: 'text', label: 'Who is the face of your content?', placeholder: 'A person, not a logo. Faces outperform food on every platform.' },
        { id: 'series', type: 'text', label: 'Your recurring series idea', placeholder: 'e.g. a weekly "kitchen at 7pm" mini-series' }
      ]
    },

    {
      title: 'The 90-day execution calendar',
      note: '30 days before opening and 60 days after. Work in sequence and you open with momentum instead of silence. Tick as you go.',
      fields: [
        {
          id: 'w_pre', type: 'checks', tone: 'good', label: 'Days −30 to −1 · Before opening',
          options: [
            { label: 'Instagram page live with bio, profile photo and 3+ posts' },
            { label: 'Google Business Profile complete with 15+ photos and a keyword-rich description' },
            { label: 'Zomato and Swiggy listings created and optimised' },
            { label: 'WhatsApp Business set up with catalogue and away messages' },
            { label: 'Signage installed and visible from the road' },
            { label: '8–10 micro-influencers identified and personally invited' },
            { label: 'Influencer brief written — objective, messaging, positioning' },
            { label: 'Soft-launch / tasting evening held for friends, family and neighbours' },
            { label: 'Review cards printed and the post-meal script rehearsed with staff' },
            { label: 'Opening-week offer designed with a clear end date' },
            { label: 'Local WhatsApp groups, RWAs and nearby offices informed' },
            { label: 'Professional photos of hero dishes shot for ads and listings' }
          ]
        },
        {
          id: 'w_m1', type: 'checks', tone: 'good', label: 'Days 1–30 · Opening month',
          options: [
            { label: 'Posting 3+ times a week across the pillars' },
            { label: 'Every review responded to within 24 hours' },
            { label: 'First Meta ad campaign live with a tracked objective' },
            { label: 'Influencer visits completed and content published' },
            { label: 'Asking every satisfied table for a Google review' },
            { label: 'Collecting customer WhatsApp numbers with consent' },
            { label: 'Tracking which dishes are actually ordered' },
            { label: 'First 25 Google reviews targeted' }
          ]
        },
        {
          id: 'w_m2', type: 'checks', tone: 'good', label: 'Days 31–60 · Building repeat',
          options: [
            { label: 'Repeat-visit offer launched to the WhatsApp list' },
            { label: 'Best-performing content format identified and doubled down on' },
            { label: 'Ad creative refreshed based on results' },
            { label: 'User-generated content reposted weekly' },
            { label: 'Corporate or bulk-order outreach started nearby' },
            { label: 'Menu adjusted based on 60 days of real sales data' },
            { label: 'A second offer designed for a specific slow daypart' }
          ]
        },
        {
          id: 'w_m3', type: 'checks', tone: 'good', label: 'Days 61–90 · Compounding',
          options: [
            { label: 'Loyalty or subscription mechanic launched' },
            { label: 'Second influencer wave, chosen from the first wave\'s performers' },
            { label: 'Off-hours revenue stream started' },
            { label: 'Google review count above 25 with a 4.2+ rating' },
            { label: 'Ad spend reallocated to the channel with the lowest cost per lead' },
            { label: 'Local partnership or collaboration live' },
            { label: '90-day KPI review completed and next quarter planned' }
          ]
        }
      ],
      metrics: function (d) {
        var keys = ['w_pre', 'w_m1', 'w_m2', 'w_m3'];
        var totals = [12, 8, 7, 7];
        return keys.map(function (k, i) {
          var n = (d[k] || []).length;
          return {
            k: ['Pre-launch', 'Month 1', 'Month 2', 'Month 3'][i],
            v: n + '/' + totals[i],
            tone: n === totals[i] ? 'good' : (n >= totals[i] * 0.5 ? 'warn' : (n ? '' : 'bad'))
          };
        });
      }
    },

    {
      title: 'Influencer campaign tracker',
      note: 'Only reinvest in the ones who deliver creative, audience-relevant content that generates real footfall. Follower count is the least useful number on this table.',
      fields: [
        { id: 'inf_obj', type: 'textarea', label: 'Campaign objective', rows: 2, placeholder: 'What specifically should this campaign achieve? Awareness is not an objective; 40 bookings in two weeks is.' },
        { id: 'inf_msg', type: 'textarea', label: 'Messaging brief — what every piece of content must communicate', rows: 2 },
        { id: 'inf_pos', type: 'textarea', label: 'Positioning direction — how the restaurant should be shown', rows: 2 },
        {
          id: 'inf', type: 'table', label: 'Influencers',
          columns: [
            { key: 'name', label: 'Handle', placeholder: '@handle' },
            { key: 'followers', label: 'Followers', type: 'number', placeholder: '0', width: '110px' },
            { key: 'cost', label: 'Cost ₹', type: 'number', placeholder: '0', width: '105px' },
            { key: 'views', label: 'Views', type: 'number', placeholder: '0', width: '105px' },
            { key: 'walkins', label: 'Walk-ins from it', type: 'number', placeholder: '0', width: '140px' },
            {
              key: 'cpw', label: 'Cost / walk-in', calc: function (r) {
                var T = window.App, c = T.num(r.cost), w = T.num(r.walkins);
                if (!c) return { text: '—' };
                if (!w) return { text: 'no walk-ins', tone: 'bad' };
                var v = c / w;
                return { text: T.inr(v), tone: v <= 150 ? 'good' : (v <= 400 ? 'warn' : 'bad') };
              }
            }
          ],
          seed: 4,
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            if (!filled.length) return 'Track every collaboration. Guessing is how budgets disappear.';
            var spend = filled.reduce(function (a, r) { return a + T.num(r.cost); }, 0);
            var walk = filled.reduce(function (a, r) { return a + T.num(r.walkins); }, 0);
            return '<b>' + filled.length + '</b> collabs · spend <b>' + T.inr(spend) + '</b> · walk-ins <b>' + walk + '</b>' +
              (walk ? ' · blended <b>' + T.inr(spend / walk) + '</b> per walk-in' : '');
          }
        },
        { id: 'inf_best', type: 'textarea', label: 'Top performer — and what specifically made their content work', rows: 2, optional: true }
      ]
    },

    {
      title: 'Review engine',
      note: 'Target: <strong>25 Google reviews at 4.2+ within 90 days.</strong> Respond to every review within 24 hours — including, especially, the bad ones.',
      fields: [
        { id: 'g_reviews', type: 'number', label: 'Google reviews so far', placeholder: '0' },
        { id: 'g_rating', type: 'number', label: 'Google rating', placeholder: '4.2' },
        { id: 'z_reviews', type: 'number', label: 'Zomato reviews', optional: true, placeholder: '0' },
        { id: 'z_rating', type: 'number', label: 'Zomato rating', optional: true, placeholder: '0' },
        { id: 'resp_rate', type: 'select', label: 'How many reviews do you respond to?', options: ['All, within 24 hours', 'Most of them', 'Only the bad ones', 'Rarely / never'] },
        { id: 'ask_script', type: 'textarea', label: 'The post-meal conversation your team uses to ask for a review — write it word for word', rows: 3, placeholder: '"I hope everything was good today. If you have thirty seconds, a Google review genuinely helps a small place like ours — here is the QR."' },
        { id: 'common_complaint', type: 'textarea', label: 'Most common complaint in your reviews — and the SOP you created to fix it', rows: 3 }
      ],
      metrics: function (d) {
        var T = window.App;
        var r = T.num(d.g_reviews), rt = T.num(d.g_rating);
        var out = [];
        if (r || rt) {
          out.push({ k: 'Google reviews', v: r, n: 'Target 25 in 90 days', tone: r >= 25 ? 'good' : (r >= 12 ? 'warn' : 'bad') });
          if (rt) out.push({ k: 'Rating', v: rt.toFixed(1), n: 'Target 4.2+', tone: rt >= 4.2 ? 'good' : (rt >= 3.8 ? 'warn' : 'bad') });
          if (r < 25) out.push({ k: 'Reviews still needed', v: Math.max(0, 25 - r), n: 'About ' + Math.ceil(Math.max(0, 25 - r) / 12) + ' weeks at 12 asks/week and a 20% conversion' });
        }
        return out;
      }
    },

    {
      title: 'Paid ads — every rupee accountable',
      note: 'If a campaign is not producing measurable leads or footfall, pause it, change the creative, relaunch. Never let a non-performing ad run on autopilot.',
      fields: [
        {
          id: 'ads', type: 'table', label: 'Campaigns',
          columns: [
            { key: 'name', label: 'Campaign', placeholder: 'e.g. Weekend brunch — 5km' },
            { key: 'obj', label: 'Objective', type: 'select', options: ['Reach / awareness', 'Traffic', 'Engagement', 'Leads / Instant form', 'Messages / WhatsApp', 'Sales'] },
            { key: 'spend', label: 'Spend ₹', type: 'number', placeholder: '0', width: '105px' },
            { key: 'leads', label: 'Leads / bookings', type: 'number', placeholder: '0', width: '145px' },
            {
              key: 'cpl', label: 'Cost / lead', calc: function (r) {
                var T = window.App, s = T.num(r.spend), l = T.num(r.leads);
                if (!s) return { text: '—' };
                if (!l) return { text: 'no leads', tone: 'bad' };
                var v = s / l;
                return { text: T.inr(v), tone: v <= 80 ? 'good' : (v <= 200 ? 'warn' : 'bad') };
              }
            }
          ],
          seed: 3,
          totals: function (rows) {
            var T = window.App;
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            if (!filled.length) return 'Log every campaign, including the ones that failed. Especially those.';
            var s = filled.reduce(function (a, r) { return a + T.num(r.spend); }, 0);
            var l = filled.reduce(function (a, r) { return a + T.num(r.leads); }, 0);
            return 'Spend <b>' + T.inr(s) + '</b> · leads <b>' + l + '</b>' + (l ? ' · blended CPL <b>' + T.inr(s / l) + '</b>' : ' · <span style="color:var(--red)">zero leads</span>');
          }
        },
        { id: 'ad_spend_month', type: 'money', label: 'Total monthly ad budget', placeholder: '15000' },
        { id: 'ad_fix', type: 'textarea', label: 'If cost per lead is too high — what creative or targeting change will you make?', rows: 3 }
      ]
    },

    {
      title: 'Offers & packages — built with intent',
      note: 'No random discounts. Every offer needs a clear objective, a clear customer, and a clear end date or condition. A permanent discount is not an offer, it is a price cut.',
      fields: [
        {
          id: 'offers', type: 'table', label: 'Planned offers',
          columns: [
            { key: 'name', label: 'Offer', placeholder: 'e.g. Student Tuesday' },
            { key: 'goal', label: 'Objective', type: 'select', options: ['Fill a dead daypart', 'Drive first visit', 'Drive repeat visit', 'Increase bill size', 'Clear slow stock', 'Launch a new item'] },
            { key: 'who', label: 'For whom', placeholder: 'Specific customer' },
            { key: 'ends', label: 'Ends when', placeholder: 'Date or condition' }
          ],
          seed: 3,
          totals: function (rows) {
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            var openEnded = filled.filter(function (r) { return !(r.ends || '').trim(); }).length;
            if (!filled.length) return 'Design offers deliberately, not in a panic on a slow Tuesday.';
            return '<b>' + filled.length + '</b> offers' + (openEnded ? ' · <b style="color:var(--red)">' + openEnded + ' with no end date</b>' : ' · all time-bound');
          }
        }
      ]
    },

    {
      title: '90-day KPIs',
      note: 'Set targets now. Review at day 30, 60 and 90. If you are behind on any metric, find out why and change the approach immediately rather than waiting for the quarter to end.',
      fields: [
        {
          id: 'kpi', type: 'table', label: 'Targets vs actuals',
          columns: [
            { key: 'metric', label: 'Metric', placeholder: 'Metric' },
            { key: 'target', label: 'Day-90 target', type: 'number', placeholder: '0', width: '135px' },
            { key: 'actual', label: 'Actual now', type: 'number', placeholder: '0', width: '125px' },
            {
              key: 'gap', label: 'Progress', calc: function (r) {
                var T = window.App, t = T.num(r.target), a = T.num(r.actual);
                if (!t) return { text: '—' };
                var p = a / t * 100;
                return { text: T.pct(p), tone: p >= 100 ? 'good' : (p >= 60 ? 'warn' : 'bad') };
              }
            }
          ],
          seed: [
            { metric: 'Instagram followers' }, { metric: 'Google reviews' },
            { metric: 'Daily customers' }, { metric: 'Repeat customer %' },
            { metric: 'WhatsApp list size' }, { metric: 'Avg spend per customer ₹' }
          ]
        },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Marketing readiness check',
          options: [
            { label: 'My customer is defined precisely — age, habits, spending, content preferences' },
            { label: 'My positioning statement is written and my team knows it' },
            { label: 'My content pillars are defined with ideas for each' },
            { label: 'My Instagram is live with bio, photo and 3+ posts before opening' },
            { label: 'My Google Business Profile is complete with 15+ photos' },
            { label: 'Zomato and Swiggy listings are optimised' },
            { label: 'I have identified 8–10 micro-influencers and invited them personally' },
            { label: 'I have a written influencer brief' },
            { label: 'Review cards are printed and my team knows the post-meal script' }
          ]
        }
      ]
    }
  ],

  benchmarks: function (d) {
    var T = window.App, out = [];
    if (T.num(d.g_reviews)) out.push({ label: 'Google reviews', you: T.num(d.g_reviews), range: '25+ within 90 days', ok: T.num(d.g_reviews) >= 25, note: 'Below threshold' });
    if (T.num(d.g_rating)) out.push({ label: 'Google rating', you: T.num(d.g_rating).toFixed(1), range: '4.2+ to win the click', ok: T.num(d.g_rating) >= 4.2, note: 'Costing you bookings' });
    var ads = (d.ads || []).filter(function (r) { return (r.name || '').trim(); });
    var s = ads.reduce(function (a, r) { return a + T.num(r.spend); }, 0);
    var l = ads.reduce(function (a, r) { return a + T.num(r.leads); }, 0);
    if (s && l) out.push({ label: 'Cost per lead', you: T.inr(s / l), range: '₹40–120 typical for local food', ok: s / l <= 200, note: 'Change the creative' });
    var inf = (d.inf || []).filter(function (r) { return (r.name || '').trim(); });
    var ic = inf.reduce(function (a, r) { return a + T.num(r.cost); }, 0);
    var iw = inf.reduce(function (a, r) { return a + T.num(r.walkins); }, 0);
    if (ic && iw) out.push({ label: 'Cost per influencer walk-in', you: T.inr(ic / iw), range: 'Under ₹150 good · over ₹400 poor', ok: ic / iw <= 400, note: 'Not converting' });
    return out;
  },

  result: function (d) {
    var T = window.App;
    var pre = (d.w_pre || []).length, m1 = (d.w_m1 || []).length, m2 = (d.w_m2 || []).length, m3 = (d.w_m3 || []).length;
    var totalTasks = pre + m1 + m2 + m3, maxTasks = 34;
    var pillars = ['pillar_c', 'pillar_p', 'pillar_f', 'pillar_s'].filter(function (k) { return String(d[k] || '').trim().length > 15; }).length;
    var gate = (d.gate || []).length;
    var revs = T.num(d.g_reviews), rating = T.num(d.g_rating);
    var infRows = (d.inf || []).filter(function (r) { return (r.name || '').trim(); });
    var infSpend = infRows.reduce(function (a, r) { return a + T.num(r.cost); }, 0);
    var infWalk = infRows.reduce(function (a, r) { return a + T.num(r.walkins); }, 0);
    var adRows = (d.ads || []).filter(function (r) { return (r.name || '').trim(); });
    var adSpend = adRows.reduce(function (a, r) { return a + T.num(r.spend); }, 0);
    var adLeads = adRows.reduce(function (a, r) { return a + T.num(r.leads); }, 0);
    var cpl = adLeads ? adSpend / adLeads : 0;
    var offers = (d.offers || []).filter(function (r) { return (r.name || '').trim(); });
    var openEnded = offers.filter(function (r) { return !(r.ends || '').trim(); }).length;

    var score = 0, checks = 0;
    function add(c, w) { checks += w; if (c) score += w; }
    add(String(d.cust || '').length > 60, 8);
    add(String(d.positioning || '').length > 40, 8);
    checks += 10; score += (pillars / 4) * 10;
    checks += 34; score += (totalTasks / maxTasks) * 34;
    add(revs >= 25, 8);
    add(rating >= 4.2, 6);
    add(d.resp_rate === 'All, within 24 hours', 6);
    add(String(d.ask_script || '').length > 30, 5);
    add(infRows.length >= 3, 5);
    checks += 10; score += (gate / 9) * 10;
    var pct100 = checks ? score / checks * 100 : 0;

    var band;
    if (pct100 >= 76) band = { label: 'Momentum built', color: '#0f7a4a', text: 'The foundation, the calendar and the measurement are all in place. Keep the review engine running and reallocate spend to whatever is producing the cheapest walk-ins.' };
    else if (pct100 >= 54) band = { label: 'On track, gaps remain', color: '#b06a06', text: 'You are doing the work. The flagged items are the ones with the highest return per hour spent — the review engine especially.' };
    else if (pct100 >= 32) band = { label: 'Behind the plan', color: '#c4400f', text: 'Marketing is happening in bursts rather than as a system. Pick the pre-launch checklist first — most of it is free and takes an afternoon each.' };
    else band = { label: 'Opening to silence', color: '#c41230', text: 'Without this groundwork you will pay three months of rent while the neighbourhood works out you exist. Start with the Google Business Profile and the Instagram page today — both are free.' };

    var flags = [];
    if (pre < 8) flags.push({ tone: 'bad', icon: '🚩', text: '<strong>Only ' + pre + ' of 12 pre-launch tasks done.</strong> Almost all of these are free and cannot be done retrospectively. A Google Business Profile with 15+ photos is the single highest-return hour in the whole 90-day plan.' });
    if (revs > 0 && revs < 25) flags.push({ tone: 'bad', icon: '⭐', text: '<strong>' + revs + ' Google reviews — target is 25 in 90 days.</strong> At twelve asks a week and a 20% conversion you get there in about ' + Math.ceil((25 - revs) / 2.4) + ' weeks. It only happens if the post-meal ask is scripted and every server does it.' });
    else if (revs >= 25 && rating >= 4.2) flags.push({ tone: 'ok', icon: '✓', text: '<strong>' + revs + ' reviews at ' + rating.toFixed(1) + '.</strong> You have cleared the trust threshold most customers use to decide. Protect it — a single unanswered one-star does more damage now than it did at review five.' });
    if (rating > 0 && rating < 4.0) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Rating of ' + rating.toFixed(1) + ' is below the threshold where people choose you over the next result.</strong> Read the last twenty reviews, find the repeating word, and build an SOP for it in the <a href="sop.html" style="color:#ff8a96">SOP Builder</a>.' });
    if (d.resp_rate === 'Rarely / never' || d.resp_rate === 'Only the bad ones') flags.push({ tone: 'bad', icon: '💬', text: '<strong>You are not responding to reviews consistently.</strong> Responses are read by the next customer, not by the reviewer. Reply to all of them within 24 hours — briefly, by name, without being defensive.' });
    if (!String(d.ask_script || '').trim()) flags.push({ icon: '✎', text: '<strong>No post-meal review script written.</strong> "Please review us" gets ignored. A specific, warm, thirty-second ask with a QR code on the table converts several times better — and it has to be the same words from every server.' });

    if (cpl > 200) flags.push({ tone: 'bad', icon: '₹', text: '<strong>Blended cost per lead is ' + T.inr(cpl) + '.</strong> Change the creative before you change the targeting — in local food advertising the creative is nearly always the problem. A 30-second video of the food being made outperforms a static offer graphic almost every time.' });
    else if (cpl && cpl <= 80) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Cost per lead at ' + T.inr(cpl) + '.</strong> That is efficient. Scale the budget on this campaign by 20% at a time rather than doubling it — sharp increases reset the learning.' });
    if (adRows.length && !adLeads) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>' + T.inr(adSpend) + ' spent on ads with zero recorded leads.</strong> Either the tracking is not set up or the campaign objective is wrong. Reach and awareness objectives do not produce bookings for a local restaurant — use Messages or Instant Forms.' });
    if (infRows.length && !infWalk) flags.push({ tone: 'bad', icon: '📱', text: '<strong>' + T.inr(infSpend) + ' spent on influencers with no walk-ins recorded.</strong> Give every collaborator a unique code or a specific dish to mention, so you can tell who actually brings people through the door.' });
    if (openEnded) flags.push({ tone: 'bad', icon: '🏷', text: '<strong>' + openEnded + ' offer' + (openEnded === 1 ? '' : 's') + ' with no end date.</strong> An offer with no end date is a price cut, and customers stop paying full price permanently. Give every offer a date or a condition.' });
    if (pillars < 3) flags.push({ icon: '✎', text: '<strong>Only ' + pillars + ' content pillar' + (pillars === 1 ? '' : 's') + ' defined.</strong> Without pillars you end up posting nothing but plates of food, and the algorithm and your audience both lose interest by week three.' });
    if (!String(d.face || '').trim()) flags.push({ icon: '👤', text: '<strong>No face for your content.</strong> People follow people. A restaurant account with a recurring human in it outperforms a food-only account consistently.' });

    return {
      title: totalTasks + ' of ' + maxTasks + ' 90-day tasks complete',
      subtitle: (revs ? revs + ' Google reviews' + (rating ? ' at ' + rating.toFixed(1) : '') : 'Review engine not started') + (cpl ? ' · CPL ' + T.inr(cpl) : ''),
      score: pct100, scoreLabel: Math.round(pct100), scoreUnit: 'MARKETING',
      band: band, flags: flags
    };
  }
};
