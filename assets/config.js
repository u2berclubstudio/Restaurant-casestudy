/* ==========================================================================
   Restaurant Casestudy — configuration
   This is the only file you need to edit to wire the product up.
   Most day-to-day settings now live in the admin panel instead: /admin.html
   ========================================================================== */
window.APP_CONFIG = {

  product: 'Restaurant Casestudy',
  tagline: 'Run your restaurant on numbers, not hope.',

  /* ---- Backend -----------------------------------------------------------
     The Node API is proxied at /api by nginx. Change only if you move it.    */
  apiBase: '/api',

  /* ---- Pricing -----------------------------------------------------------
     These are fallbacks. Once the backend is running, the admin panel's
     Pricing fields override them.                                          */
  pricing: {
    monthly: null,          // e.g. 799
    yearly: null,           // e.g. 7999
    currency: '₹',
    yearlyNote: null,
    checkoutUrl: null,      // Razorpay / Stripe / Lemon Squeezy
    trialDays: 14
  },

  /* ---- Email capture -----------------------------------------------------
     Leads now go to the backend automatically. Set this only if you ALSO
     want them mirrored to an external form service.                        */
  leadEndpoint: null,

  /* ---- Pro preview -------------------------------------------------------
     Was a local unlock while there was no backend. Now that plans are
     enforced server-side, leave this off — it can no longer bypass anything
     that matters, and it only confuses the interface.                      */
  allowProPreview: false,

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
    if (v === null || v === undefined) return;
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
