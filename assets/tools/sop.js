/* Restaurant Casestudy — SOP Builder */
window.TOOL_SCHEMA = {
  id: 'sop',
  icon: '📋',
  title: 'SOP Builder',
  subtitle: 'Build your restaurant\'s memory — one system at a time. Write your first five SOPs here, test them with a real staff member, and turn every complaint into a system that prevents it happening twice.',
  why: "<strong>Why this matters.</strong> Culture is not a poster in the staff room \u2014 it is what happens when you are not there. Every inconsistent dish, awkward greeting and mishandled complaint traces back to a system that was never written down.",
  next: { slug: 'marketing', title: "90-Day Marketing Planner", why: "Systems are in place. Now the part everyone underestimates \u2014 getting the first hundred people through the door." },

  sections: [
    {
      title: 'Your SOP philosophy',
      note: 'Answer these before writing a single procedure. They become the standard every SOP is judged against.',
      fields: [
        { id: 'exp', type: 'textarea', label: 'The ONE experience you want every customer to have, every single visit', rows: 3 },
        { id: 'perfect', type: 'textarea', label: 'What would a customer say about your restaurant if everything went perfectly?', rows: 3 },
        { id: 'never', type: 'textarea', label: 'The one thing you NEVER want a customer to experience here', rows: 3 },
        {
          id: 'owner', type: 'radio', label: 'Who owns writing, updating and enforcing SOPs?',
          options: [
            { label: 'Owner only', sub: 'Works at first, becomes the bottleneck by month six' },
            { label: 'Manager' },
            { label: 'Owner + head cook', sub: 'Usually the most durable split for a small restaurant' },
            { label: 'A dedicated team member' }
          ]
        }
      ]
    },

    {
      title: 'Feedback tracker — praise and complaints',
      note: 'Every piece of feedback is a signal for a new or improved SOP. Log it here. Update weekly, review monthly, and every three months turn the patterns into systems.',
      fields: [
        {
          id: 'feedback', type: 'table', label: 'Feedback log',
          columns: [
            { key: 'date', label: 'Date', placeholder: 'dd/mm' },
            { key: 'type', label: 'Type', type: 'select', options: ['Praise', 'Complaint'] },
            { key: 'what', label: 'What was said', placeholder: 'In their words' },
            { key: 'area', label: 'Area', type: 'select', options: ['Food quality', 'Food consistency', 'Wait time', 'Service manner', 'Cleanliness', 'Billing', 'Ambience', 'Delivery / packaging'] },
            { key: 'sop', label: 'SOP it points to', placeholder: 'What system fixes this?' }
          ],
          seed: 4,
          totals: function (rows) {
            var filled = rows.filter(function (r) { return (r.what || '').trim(); });
            if (!filled.length) return 'Start logging from day one — patterns only appear once you write them down.';
            var comp = filled.filter(function (r) { return r.type === 'Complaint'; });
            var byArea = {};
            comp.forEach(function (r) { if (r.area) byArea[r.area] = (byArea[r.area] || 0) + 1; });
            var worst = null;
            Object.keys(byArea).forEach(function (k) { if (!worst || byArea[k] > byArea[worst]) worst = k; });
            return '<b>' + filled.length + '</b> logged · <b>' + comp.length + '</b> complaints' +
              (worst && byArea[worst] >= 2 ? ' · <b style="color:var(--red)">recurring pattern: ' + worst + ' (' + byArea[worst] + ')</b>' : '');
          }
        },
        { id: 'patterns', type: 'textarea', label: 'The top 3 patterns you are seeing — and the SOPs they point to', rows: 4 }
      ]
    },

    {
      title: 'SOP #1 — The Greeting',
      note: 'The first fifteen seconds set the expectation for everything that follows. Write it as if the reader has never done this before.',
      fields: [
        { id: 's1_purpose', type: 'textarea', label: 'Purpose of this SOP', rows: 2, placeholder: 'Why does this SOP exist? What does it protect?' },
        { id: 's1_steps', type: 'textarea', label: 'Step-by-step instructions', rows: 7, placeholder: '1. Within 10 seconds of the door opening, make eye contact and say…\n2. …\n3. …\nNumber every step. Assume nothing.' },
        { id: 's1_good', type: 'textarea', label: 'What good looks like — the standard this produces', rows: 3 },
        { id: 's1_wrong', type: 'textarea', label: 'What to do when something goes wrong', rows: 3, placeholder: 'What is the exception? Who is it escalated to? What exactly is said to the customer?' },
        {
          id: 's1_test', type: 'checks', tone: 'good', label: 'SOP test',
          options: [
            { label: 'A new staff member read this and executed it correctly with no extra explanation' },
            { label: 'This SOP has been reviewed after real customer feedback and updated' }
          ]
        }
      ]
    },

    {
      title: 'SOP #2 — Hero item recipe',
      note: 'Your signature dish must be identical whoever is on shift. Exact quantities in grams and millilitres, exact times, exact temperatures, and a photo of correct plating.',
      fields: [
        { id: 's2_dish', type: 'text', label: 'Which dish?', placeholder: 'Your hero item' },
        { id: 's2_purpose', type: 'textarea', label: 'Purpose of this SOP', rows: 2 },
        { id: 's2_steps', type: 'textarea', label: 'Step-by-step, with weights, times and temperatures', rows: 8, placeholder: '1. Weigh 180g of…\n2. Heat the tawa to…\n3. Cook for exactly…' },
        { id: 's2_good', type: 'textarea', label: 'What good looks like — colour, texture, temperature at the pass, plating', rows: 3 },
        { id: 's2_wrong', type: 'textarea', label: 'What to do when it goes wrong', rows: 3 },
        {
          id: 's2_test', type: 'checks', tone: 'good', label: 'SOP test',
          options: [
            { label: 'A new cook made this correctly from the document alone' },
            { label: 'Reviewed after customer feedback and updated' }
          ]
        }
      ]
    },

    {
      title: 'SOP #3 — Opening procedure',
      note: 'Everything that must be true before the first customer walks in.',
      fields: [
        { id: 's3_purpose', type: 'textarea', label: 'Purpose of this SOP', rows: 2 },
        { id: 's3_steps', type: 'textarea', label: 'Step-by-step opening sequence, with times', rows: 8, placeholder: '9:00 — Unlock, lights on, check overnight temperatures in both fridges and log them\n9:15 — …' },
        { id: 's3_good', type: 'textarea', label: 'What good looks like at opening time', rows: 3 },
        { id: 's3_wrong', type: 'textarea', label: 'What to do when something is wrong at opening', rows: 3, placeholder: 'Fridge failed overnight. Gas not delivered. Key staff absent. Who decides what?' },
        {
          id: 's3_test', type: 'checks', tone: 'good', label: 'SOP test',
          options: [
            { label: 'A new staff member opened correctly using only this document' },
            { label: 'Reviewed and updated after real use' }
          ]
        }
      ]
    },

    {
      title: 'SOP #4 — Closing procedure',
      note: 'A bad close becomes tomorrow\'s bad open. This is where hygiene, stock and cash discipline are actually decided.',
      fields: [
        { id: 's4_purpose', type: 'textarea', label: 'Purpose of this SOP', rows: 2 },
        { id: 's4_steps', type: 'textarea', label: 'Step-by-step closing sequence', rows: 8, placeholder: 'Include cash reconciliation, stock count, waste log, deep-clean rota, fridge checks, gas and electrical shut-off, lock-up.' },
        { id: 's4_good', type: 'textarea', label: 'What good looks like at close', rows: 3 },
        { id: 's4_wrong', type: 'textarea', label: 'What to do when something is wrong at close', rows: 3, placeholder: 'Cash does not reconcile. Stock is short. Equipment fault found. Who is called, tonight or tomorrow?' },
        {
          id: 's4_test', type: 'checks', tone: 'good', label: 'SOP test',
          options: [
            { label: 'A new staff member closed correctly using only this document' },
            { label: 'Reviewed and updated after real use' }
          ]
        }
      ]
    },

    {
      title: 'SOP #5 — Complaint handling',
      note: 'A complaint handled well produces a more loyal customer than one who never complained. A complaint handled badly produces a review that costs you bookings for a year.',
      fields: [
        { id: 's5_purpose', type: 'textarea', label: 'Purpose of this SOP', rows: 2 },
        { id: 's5_steps', type: 'textarea', label: 'Step-by-step, including the exact words your team should use', rows: 8, placeholder: '1. Listen fully without interrupting or defending.\n2. Say: "I am really sorry — that is not the standard we want. Let me fix it right now."\n3. …' },
        { id: 's5_auth', type: 'textarea', label: 'What can your team resolve without calling you?', rows: 3, placeholder: 'Give an explicit rupee limit and a list. A server who has to find the owner for every remake creates two problems instead of one.' },
        { id: 's5_good', type: 'textarea', label: 'What good looks like — how the customer should feel leaving', rows: 3 },
        {
          id: 's5_test', type: 'checks', tone: 'good', label: 'SOP test',
          options: [
            { label: 'A new staff member handled a real complaint correctly using only this document' },
            { label: 'Reviewed and updated after real use' }
          ]
        }
      ]
    },

    {
      title: 'Your SOP roadmap',
      note: 'The first five are the ones with the biggest immediate impact. These are the ones that come next — list what you will write, who owns it, and by when.',
      fields: [
        {
          id: 'roadmap', type: 'table', label: 'Next SOPs to write',
          columns: [
            { key: 'name', label: 'SOP', placeholder: 'e.g. Order-taking & upselling' },
            { key: 'why', label: 'Problem it prevents', placeholder: 'What goes wrong without it' },
            { key: 'who', label: 'Owner', placeholder: 'Who writes it' },
            { key: 'when', label: 'By when', placeholder: 'Week / date' },
            { key: 'status', label: 'Status', type: 'select', options: ['Not started', 'Drafted', 'Tested with staff', 'Live'] }
          ],
          seed: [
            { name: 'Order-taking & upselling' }, { name: 'Table turnaround & cleaning' },
            { name: 'Stock ordering & receiving' }, { name: 'Daily hygiene & FSSAI checklist' },
            { name: 'Cash handling & reconciliation' }, { name: 'Delivery packaging & handover' },
            { name: 'New staff induction — first 3 days' }
          ],
          totals: function (rows) {
            var filled = rows.filter(function (r) { return (r.name || '').trim(); });
            var live = filled.filter(function (r) { return r.status === 'Live'; }).length;
            var tested = filled.filter(function (r) { return r.status === 'Tested with staff' || r.status === 'Live'; }).length;
            if (!filled.length) return 'What are the next systems your restaurant needs?';
            return '<b>' + filled.length + '</b> planned · <b>' + tested + '</b> tested · <b style="color:var(--green)">' + live + '</b> live';
          }
        },
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Before opening day',
          options: [
            { label: 'All five core SOPs are written, not just planned' },
            { label: 'Each one has been tested by a real staff member, not just read by me' },
            { label: 'Every dish on the menu has a recipe SOP' },
            { label: 'My team knows where the SOPs live and can find them without asking me' },
            { label: 'Someone other than me is responsible for keeping them updated' },
            { label: 'We have a weekly slot to review feedback and update SOPs' }
          ]
        }
      ]
    }
  ],

  result: function (d) {
    var T = window.App;
    var sops = [
      { n: 'The Greeting', p: 's1_purpose', s: 's1_steps', g: 's1_good', w: 's1_wrong', t: 's1_test' },
      { n: 'Hero Item Recipe', p: 's2_purpose', s: 's2_steps', g: 's2_good', w: 's2_wrong', t: 's2_test' },
      { n: 'Opening Procedure', p: 's3_purpose', s: 's3_steps', g: 's3_good', w: 's3_wrong', t: 's3_test' },
      { n: 'Closing Procedure', p: 's4_purpose', s: 's4_steps', g: 's4_good', w: 's4_wrong', t: 's4_test' },
      { n: 'Complaint Handling', p: 's5_purpose', s: 's5_steps', g: 's5_good', w: 's5_auth', t: 's5_test' }
    ];

    var complete = 0, drafted = 0, tested = 0, weak = [];
    sops.forEach(function (s) {
      var steps = String(d[s.s] || '').trim();
      var parts = [s.p, s.s, s.g, s.w].filter(function (k) { return String(d[k] || '').trim().length > 20; }).length;
      var stepCount = (steps.match(/^\s*\d+[.)]/gm) || []).length;
      if (steps.length > 40) drafted++;
      if (parts === 4 && stepCount >= 3) complete++;
      else if (steps.length > 40) weak.push(s.n + (stepCount < 3 ? ' (steps not numbered)' : ' (missing sections)'));
      else if (steps.length <= 40) weak.push(s.n + ' (not written)');
      if (((d[s.t] || []).length) >= 1) tested++;
    });

    var phil = ['exp', 'perfect', 'never'].filter(function (k) { return String(d[k] || '').trim().length > 20; }).length;
    var fb = (d.feedback || []).filter(function (r) { return (r.what || '').trim(); }).length;
    var road = (d.roadmap || []).filter(function (r) { return (r.name || '').trim(); });
    var roadLive = road.filter(function (r) { return r.status === 'Live'; }).length;
    var gate = (d.gate || []).length;

    var score = 0, checks = 0;
    function add(c, w) { checks += w; if (c) score += w; }
    add(phil === 3, 12);
    checks += 34; score += (complete / 5) * 34;
    checks += 16; score += (tested / 5) * 16;
    add(fb >= 3, 8);
    add(String(d.patterns || '').length > 30, 6);
    add(road.length >= 5, 8);
    checks += 6; score += Math.min(6, roadLive * 1.5);
    checks += 10; score += (gate / 6) * 10;
    var pct100 = checks ? score / checks * 100 : 0;

    var band;
    if (pct100 >= 78) band = { label: 'Systems in place', color: '#0f7a4a', text: 'Your core SOPs are written, tested and owned. This is the difference between a restaurant that depends on you being there and one that runs the same way on your day off.' };
    else if (pct100 >= 55) band = { label: 'Half-built', color: '#b06a06', text: 'You have started. The gap between an SOP you wrote and an SOP a new hire can execute is where most restaurants lose consistency — close it by testing each one with a real staff member.' };
    else if (pct100 >= 32) band = { label: 'Mostly in your head', color: '#c4400f', text: 'Right now the restaurant runs on you remembering things. That works until you are ill, or busy, or a good cook resigns in month four.' };
    else band = { label: 'No systems yet', color: '#c41230', text: 'Every inconsistent dish, every awkward greeting and every mishandled complaint traces back to a system that was never written down. Start with the five above — they take an afternoon each.' };

    var flags = [];
    flags.push({ tone: complete === 5 ? 'ok' : (complete >= 3 ? '' : 'bad'), icon: complete === 5 ? '✓' : '📋', text: '<strong>' + complete + ' of 5 core SOPs complete</strong> (purpose, numbered steps, standard, and exception handling all written).' + (weak.length ? ' Still to finish: ' + T.esc(weak.join(', ')) + '.' : '') });
    if (tested < complete) flags.push({ tone: 'bad', icon: '🧪', text: '<strong>' + (complete - tested) + ' written SOP' + (complete - tested === 1 ? '' : 's') + ' not yet tested on a real staff member.</strong> An SOP that has only been read by the person who wrote it is a wish. Hand it to someone new and watch what happens — the gaps show up in the first two minutes.' });
    if (phil < 3) flags.push({ icon: '✎', text: '<strong>Your SOP philosophy is incomplete.</strong> Without the one experience you want every visit, and the one thing you never want, you have no standard to judge any procedure against.' });
    if (String(d.s5_auth || '').trim().length < 25) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You have not defined what your team can resolve without calling you.</strong> Give an explicit rupee limit and a list of situations. Without it, every complaint becomes two problems: the original one, and the wait while someone finds you.' });
    if (d.owner === 'Owner only') flags.push({ icon: '⏱', text: '<strong>You are the only SOP owner.</strong> That works for the first few months and then becomes the bottleneck. Nominate a second person now, while things are calm enough to train them.' });
    if (fb < 3) flags.push({ icon: '💬', text: '<strong>Feedback log nearly empty.</strong> Log every praise and every complaint from day one. Three months of logged feedback will write your next ten SOPs for you.' });
    if (road.length < 5) flags.push({ icon: '🗺', text: '<strong>Your SOP roadmap is thin.</strong> After the core five, ordering, stock receiving, hygiene checks and staff induction are the ones that pay back fastest.' });
    if (complete === 5 && tested === 5) flags.push({ tone: 'ok', icon: '✓', text: '<strong>All five core SOPs written and tested.</strong> Now set a fixed weekly slot to review feedback and update them — an SOP that never changes stops matching the restaurant within a season.' });

    return {
      title: complete + ' of 5 core SOPs ready',
      subtitle: tested + ' tested with a real staff member · ' + road.length + ' more planned · ' + roadLive + ' live',
      score: pct100, scoreLabel: Math.round(pct100), scoreUnit: 'SYSTEMS',
      band: band, flags: flags
    };
  }
};
