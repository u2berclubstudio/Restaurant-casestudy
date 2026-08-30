/* ==========================================================================
   Restaurant Casestudy — configuration
   This is the only file you need to edit to wire the product up.
   ========================================================================== */
window.APP_CONFIG = {

  product: 'Restaurant Casestudy',
  tagline: 'Run your restaurant on numbers, not hope.',

  /* ---- Pricing -----------------------------------------------------------
     Set these when you've decided. Anything left as null renders as
     "Pricing coming soon" rather than a fake number.                        */
  pricing: {
    monthly: null,          // e.g. 799
    yearly: null,           // e.g. 7999
    currency: '₹',
    yearlyNote: null,       // e.g. 'Two months free'
    checkoutUrl: null,      // Razorpay / Stripe / Lemon Squeezy link
    trialDays: 14
  },

  /* ---- Email capture -----------------------------------------------------
     POST target receiving JSON {email, source, at}.
     Works with Formspree, Getform, Basin, a Zapier hook, a Netlify Function.
     Leave null and addresses are only kept in the visitor's own browser.     */
  leadEndpoint: null,

  /* ---- Pro preview -------------------------------------------------------
     While there is no payment backend, visitors can switch Pro features on
     locally to see what they do. It is clearly labelled as a preview and
     charges nothing. Set to false once real checkout is live.                */
  allowProPreview: true,

  /* ---- Plan limits -------------------------------------------------------
     Free covers one outlet and every tool. Pro lifts the outlet cap and
     unlocks export, benchmarks, snapshots and comparison.                    */
  freeOutlets: 1,

  /* ---- Contact -----------------------------------------------------------*/
  email: 'honestdigitalmarketer@gmail.com',
  whatsapp: ''
};

/* Paint configured prices into any [data-price] element. */
document.addEventListener('DOMContentLoaded', function () {
  var p = window.APP_CONFIG.pricing;
  Array.prototype.forEach.call(document.querySelectorAll('[data-price]'), function (n) {
    var which = n.getAttribute('data-price');
    var v = p[which];
    if (v === null || v === undefined) return;          // leave the placeholder
    n.innerHTML = p.currency + Number(v).toLocaleString('en-IN') +
      (which === 'monthly' ? '<small>/month</small>' : '<small>/year</small>');
  });
  if (p.checkoutUrl) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-checkout]'), function (a) {
      a.setAttribute('href', p.checkoutUrl);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }
});
