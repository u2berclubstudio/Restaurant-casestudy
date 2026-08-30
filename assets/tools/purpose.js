/* Restaurant Casestudy — The Purpose Check */
window.TOOL_SCHEMA = {
  id: 'purpose',
  icon: '🪞',
  title: 'The Purpose Check',
  subtitle: 'Why are YOU opening a restaurant? This is the mirror. It will not judge your reasons — but it will ask you to be honest with them.',
  why: "<strong>Why this comes first.</strong> Sixty percent of restaurants close within a year, ninety percent within five \u2014 and almost none of them fail because the food was bad. They fail because the reason for opening was never tested against what running a restaurant actually demands. Twenty honest minutes here changes what you build.",
  next: { slug: 'idea', title: "The Idea Validator", why: "You know why you are doing this. Now find out whether the concept itself holds up to a stranger reading it." },

  sections: [
    {
      title: 'About your restaurant idea',
      note: 'A few basics so your saved plan and PDF are labelled properly.',
      fields: [
        { id: 'name', type: 'text', label: 'Restaurant name (or working title)', placeholder: 'e.g. Atul\'s Café' },
        { id: 'city', type: 'text', label: 'City / area you are planning for', placeholder: 'e.g. Jalandhar, Model Town' },
        {
          id: 'format', type: 'select', label: 'Format you have in mind',
          options: ['QSR / Quick service', 'Café', 'Casual dining', 'Fine dining', 'Cloud kitchen', 'Food truck', 'Bakery / Dessert', 'Bar / Pub', 'Not decided yet']
        },
        {
          id: 'stage', type: 'radio', label: 'Where are you right now?',
          options: [
            { label: 'Just an idea', sub: 'Nothing committed yet — still thinking' },
            { label: 'Actively planning', sub: 'Looking at locations, budgets, menus' },
            { label: 'Money committed', sub: 'Lease signed or deposit paid' },
            { label: 'Already open', sub: 'Running, and want to fix what is not working' }
          ]
        }
      ]
    },

    {
      title: 'Why are you opening this restaurant?',
      note: 'Tick every reason that applies. Be honest — even if you tick many. There is no wrong answer here, only an unexamined one.',
      fields: [
        {
          id: 'reasons', type: 'checks', label: 'Every reason that is true for you',
          options: [
            { label: 'I am passionate about food and cooking', sub: 'I genuinely love making or curating food' },
            { label: 'I want a business of my own', sub: 'I want to be my own boss' },
            { label: 'It looks like a fun, exciting business', sub: 'The lifestyle appeals to me' },
            { label: 'I saw a packed restaurant and assumed it was profitable', sub: 'Revenue looked attractive from outside' },
            { label: 'Someone I know opened one and is doing well', sub: 'Their success inspired me' },
            { label: 'I have savings or capital I want to invest', sub: 'Looking for a business opportunity' },
            { label: 'I want social recognition — a brand with my name on it', sub: 'Status and visibility matter to me' },
            { label: 'I have a specific food concept I believe in', sub: 'A unique idea I want to bring to life' },
            { label: 'I want to create jobs and contribute to my community', sub: 'Larger social motivation' },
            { label: 'I feel stuck in my current job and want to escape', sub: 'Seeking change more than opportunity' },
            { label: 'My family has always been in the food business', sub: 'Legacy or continuation of family work' }
          ]
        },
        { id: 'other_reason', type: 'textarea', label: 'Any other reason, in your own words', optional: true, rows: 3, placeholder: 'Write it plainly. Nobody else reads this.' }
      ]
    },

    {
      title: 'How strongly does each one drive you?',
      note: 'Score each dimension from 1 to 5. <strong>1</strong> = barely applies &nbsp;·&nbsp; <strong>3</strong> = somewhat true &nbsp;·&nbsp; <strong>5</strong> = this is a core reason for me.',
      fields: [
        {
          id: 'drivers', type: 'ratings', label: 'Rate your motivation',
          items: [
            { id: 'food', label: 'Love of food and cooking', sub: 'The craft itself pulls you' },
            { id: 'indep', label: 'Independence and ownership', sub: 'Being your own boss' },
            { id: 'money', label: 'Financial return', sub: 'You expect this to make money' },
            { id: 'status', label: 'Status and recognition', sub: 'Being known for it' },
            { id: 'concept', label: 'Belief in a specific concept', sub: 'This exact idea, not just any restaurant' },
            { id: 'escape', label: 'Escape from your current situation', sub: 'Getting out of something' },
            { id: 'legacy', label: 'Family legacy or expectation', sub: 'Continuing what came before' },
            { id: 'community', label: 'Building something for your community', sub: 'A place people gather' }
          ]
        }
      ],
      metrics: function (d) {
        var v = d.drivers || {};
        var sum = 0, n = 0;
        Object.keys(v).forEach(function (k) { sum += v[k]; n++; });
        var ext = (v.food || 0) + (v.concept || 0) + (v.indep || 0) + (v.community || 0);
        var frag = (v.status || 0) + (v.escape || 0) + (v.legacy || 0);
        return [
          { k: 'Rated so far', v: n + ' / 8' },
          { k: 'Durable drivers', v: ext + ' / 20', n: 'Craft, concept, ownership, community', tone: ext >= 12 ? 'good' : (ext >= 8 ? 'warn' : 'bad') },
          { k: 'Fragile drivers', v: frag + ' / 15', n: 'Status, escape, obligation', tone: frag >= 10 ? 'bad' : (frag >= 6 ? 'warn' : 'good') }
        ];
      }
    },

    {
      title: 'Watch out for these',
      note: 'Some motivations lead you in with the wrong expectations. Tick anything that feels true — not to judge yourself, but so you know where your blind spots are before they cost you money.',
      fields: [
        {
          id: 'risks', type: 'checks', tone: 'risk', label: 'Blind spot check',
          options: [
            { label: 'I think it will be easy to manage', sub: 'Entry seemed simple; haven\'t thought deeply about operations' },
            { label: 'I haven\'t researched the financials yet', sub: 'Going on instinct and gut feeling' },
            { label: 'I have never worked in or closely observed a restaurant', sub: 'No real industry exposure' },
            { label: 'My plan is based mainly on what I have seen from outside', sub: 'Copying the result, not the process' },
            { label: 'I believe passion alone will make it work', sub: 'Haven\'t considered systems or operations' },
            { label: 'My main motivation is to prove something to others', sub: 'Ego is a stronger driver than business sense' },
            { label: 'I have not spoken to anyone who has closed a restaurant', sub: 'Only heard the success stories' },
            { label: 'I am counting on this to replace my income within 6 months', sub: 'No runway for the middle period' }
          ]
        },
        { id: 'risk_plan', type: 'textarea', label: 'If you ticked two or more above — what will you do about them before you invest?', rows: 4, placeholder: 'e.g. "I will work 4 weekend shifts at a friend\'s restaurant before I sign anything. I will build a full 12-month cash flow with my CA before committing capital."' }
      ]
    },

    {
      title: 'The question that matters most',
      note: 'Answer these three properly. If you cannot, you are not ready to spend money yet — and that is useful information, not a failure.',
      fields: [
        { id: 'q_survive', type: 'textarea', label: 'If this restaurant made no profit for 12 months, would you still want to run it? Why?', rows: 4, placeholder: 'Be honest. Most restaurants do not turn real profit before month 9–12.' },
        { id: 'q_customer', type: 'textarea', label: 'Who exactly is the person you want to feed, and what problem does your restaurant solve for them?', rows: 4, placeholder: 'Not "everyone". A specific person, in a specific place, at a specific moment of their day.' },
        { id: 'q_worst', type: 'textarea', label: 'What is the worst realistic outcome — and can you absorb it?', rows: 3, placeholder: 'e.g. "I lose ₹18 lakhs and take two years to recover. I can absorb it because…"' }
      ]
    },

    {
      title: 'Your purpose statement',
      note: 'In 3–5 sentences, write why you are opening this restaurant. Not the pitch. The truth. This one is just for you.',
      fields: [
        {
          id: 'purpose', type: 'textarea', label: 'My purpose statement', rows: 6,
          placeholder: 'Example: "I want to open a restaurant because I genuinely believe street-style Punjabi food deserves a clean, well-run space. I have seen people love this food but find no great place to eat it in my city. I want to build that place — and I want to run it properly, not just passionately."'
        }
      ]
    },

    {
      title: 'Before you move on',
      note: 'Tick each box only when you can honestly say yes.',
      fields: [
        {
          id: 'gate', type: 'checks', tone: 'good', label: 'Readiness gate',
          options: [
            { label: 'I know my primary reason for opening this restaurant' },
            { label: 'I have identified at least one motivation that could become a blind spot' },
            { label: 'I understand that passion alone is not enough — I need systems too' },
            { label: 'I am willing to learn what I don\'t yet know before I invest' },
            { label: 'I have written my honest purpose statement above' }
          ]
        }
      ]
    }
  ],

  result: function (d) {
    var T = window.App;
    var drivers = d.drivers || {};
    var rated = Object.keys(drivers).length;
    var durable = (drivers.food || 0) + (drivers.concept || 0) + (drivers.indep || 0) + (drivers.community || 0);
    var fragile = (drivers.status || 0) + (drivers.escape || 0) + (drivers.legacy || 0);
    var risks = (d.risks || []).length;
    var gate = (d.gate || []).length;
    var hasPurpose = String(d.purpose || '').trim().split(/\s+/).length >= 25;
    var answered = ['q_survive', 'q_customer', 'q_worst'].filter(function (k) { return String(d[k] || '').trim().length > 30; }).length;

    // Clarity score out of 100
    var score = 0;
    score += Math.min(28, durable / 20 * 28);            // durable motivation
    score += Math.max(0, 18 - (fragile / 15 * 18));      // low fragile motivation
    score += Math.max(0, 20 - risks * 2.5);              // few blind spots
    score += answered / 3 * 16;                          // hard questions answered
    score += hasPurpose ? 10 : 0;                        // purpose written
    score += gate / 5 * 8;                               // gate ticked
    if (rated < 8) score *= 0.9;

    var band;
    if (score >= 75) band = { label: 'Clear-eyed', color: '#0f7a4a', text: 'Your reasons are durable and you have already named your blind spots. This is the mindset that survives the middle period. Move on to the Idea Validator and pressure-test the concept itself.' };
    else if (score >= 55) band = { label: 'Mostly ready', color: '#b06a06', text: 'Your motivation is real, but there are gaps you have not closed yet. Work through the flagged items below before you spend money — they are cheap to fix now and expensive to fix later.' };
    else if (score >= 32) band = { label: 'Needs work', color: '#c4400f', text: 'There is enough here to build on, but right now you are relying more on hope than on evidence. Do not sign a lease this month. Close the gaps below first.' };
    else band = { label: 'Not yet', color: '#c41230', text: 'Be glad you found this out on a worksheet rather than six months into a lease. Nothing here is fatal — but you have real homework before capital goes anywhere near this.' };

    var flags = [];
    if (fragile >= 10) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Fragile motivation is high.</strong> Status, escape and family obligation are the three reasons that hold up worst at month seven, when the dining room is empty on a Tuesday. Make sure something more durable is underneath them.' });
    if (durable >= 14) flags.push({ tone: 'ok', icon: '✓', text: '<strong>Your durable drivers are strong.</strong> Craft, concept and ownership are the motivations that keep owners going through the slow months.' });
    if ((d.risks || []).indexOf('I have never worked in or closely observed a restaurant') > -1)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Zero industry exposure is the single most expensive gap on this list.</strong> Before you invest, work or shadow a real restaurant for at least two weeks — including a Saturday dinner service and a stock-take.' });
    if ((d.risks || []).indexOf('I haven\'t researched the financials yet') > -1)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>You have not done the numbers.</strong> Go to the <a href="break-even.html" style="color:#ff8a96">Budget &amp; Break-Even Calculator</a> next — it takes twenty minutes and it changes most people\'s plans.' });
    if ((d.risks || []).indexOf('I am counting on this to replace my income within 6 months') > -1)
      flags.push({ tone: 'bad', icon: '⚠', text: '<strong>Six months is not a realistic runway.</strong> Plan for month 9–12 before the restaurant pays you anything, and keep a separate cash reserve you never touch for setup.' });
    if (risks >= 4) flags.push({ tone: 'bad', icon: '⚠', text: '<strong>' + risks + ' blind spots ticked.</strong> Write your plan for each one in Section 4 before moving on. An unnamed blind spot is the one that closes restaurants.' });
    if (!hasPurpose) flags.push({ icon: '✎', text: '<strong>Write your purpose statement.</strong> It is the thing you will reread on the bad days, and it is the filter for every decision from menu to décor.' });
    if (answered < 3) flags.push({ icon: '✎', text: '<strong>' + (3 - answered) + ' of the three hard questions still unanswered.</strong> These are the ones that separate a plan from a wish.' });
    if (d.stage === 'Money committed' && score < 55) flags.push({ tone: 'bad', icon: '⏱', text: '<strong>You have already committed money.</strong> That raises the stakes on everything above — work through Break-Even, Menu, SOPs, Marketing and Off-Hours quickly, in that order, and prioritise cash reserve and menu focus.' });

    return {
      title: (d.name ? d.name + ' — ' : '') + 'Your Purpose Check',
      subtitle: 'How clear and durable your reasons for opening are.',
      score: score,
      scoreLabel: Math.round(score),
      scoreUnit: 'CLARITY',
      band: band,
      flags: flags
    };
  }
};
