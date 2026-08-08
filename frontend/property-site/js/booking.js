/**
 * Booking flow controller.
 * Steps: 1. Dates → 2. Guest details → 3. Payment → Confirmation
 */
const booking = (() => {
  let state = {
    step: 1,
    property: null,
    checkIn: null, checkOut: null, nights: 0,
    guests: { adults: 2, children: 0, infants: 0 },
    pricing: null,
    guest: {},
    bookingId: null, clientSecret: null,
    stripe: null, cardElement: null,
  };

  // ── Pricing calc ────────────────────────────────
  function calcPricing(nights, nightlyRate = 29500) {
    const subtotal = nights * nightlyRate;
    const cleaningFee = 15000;
    const taxes = Math.round((subtotal + cleaningFee) * 0.085); // 8.5% tax
    return { nightlyRate, nights, subtotal, cleaningFee, taxes, total: subtotal + cleaningFee + taxes };
  }

  function fmt(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  // ── Toast helper ─────────────────────────────────
  function toast(msg, type = 'info') { showToast(msg, type); }

  // ── Step rendering ───────────────────────────────
  function updateStepIndicator(step) {
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.remove('active', 'completed');
      if (i + 1 < step) el.classList.add('completed');
      if (i + 1 === step) el.classList.add('active');
    });
  }

  function showSection(id) {
    ['#section-dates','#section-details','#section-payment','#section-confirmation']
      .forEach(s => { const el = document.querySelector(s); if(el) el.hidden = true; });
    const target = document.querySelector(id);
    if (target) { target.hidden = false; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  // ── Step 1: Dates ────────────────────────────────
  function onDatesSelected({ checkIn, checkOut }) {
    state.checkIn = checkIn; state.checkOut = checkOut;
    state.nights = (new Date(checkOut) - new Date(checkIn)) / 86400000;
    state.pricing = calcPricing(state.nights);
    updateBookingSummary();
  }

  function updateBookingSummary() {
    const { pricing, checkIn, checkOut, nights } = state;
    if (!pricing) return;
    const fmt2 = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setInner('#summary-checkin', checkIn ? fmt2(checkIn) : '—');
    setInner('#summary-checkout', checkOut ? fmt2(checkOut) : '—');
    setInner('#summary-nights', nights ? `${nights} nights` : '—');
    setInner('#summary-nightly', fmt(pricing.nightlyRate) + ' × ' + nights);
    setInner('#summary-cleaning', fmt(pricing.cleaningFee));
    setInner('#summary-taxes', fmt(pricing.taxes));
    setInner('#summary-total', fmt(pricing.total));
    setInner('#hero-nightly', fmt(pricing.nightlyRate));
  }

  function setInner(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
  }

  function goToDetails() {
    if (!state.checkIn || !state.checkOut) {
      toast('Please select your check-in and check-out dates first.', 'error'); return;
    }
    state.step = 2;
    updateStepIndicator(2);
    showSection('#section-details');
  }

  function goToPayment() {
    const guestData = collectGuestForm();
    if (!guestData) return;
    state.guest = guestData;
    state.step = 3;
    updateStepIndicator(3);
    showSection('#section-payment');
    initStripe();
    updateBookingSummary();
  }

  function collectGuestForm() {
    const get = (id) => document.getElementById(id)?.value?.trim() || '';
    const guest = {
      firstName: get('guest-first'), lastName: get('guest-last'),
      email: get('guest-email'), phone: get('guest-phone'),
    };
    const adultEl = document.getElementById('guest-adults');
    state.guests.adults = parseInt(adultEl?.value || '2', 10);
    state.guests.children = parseInt(document.getElementById('guest-children')?.value || '0', 10);

    let valid = true;
    const require = (id, msg) => {
      const el = document.getElementById(id);
      if (!el?.value?.trim()) {
        el?.classList.add('error');
        showFieldError(id, msg);
        valid = false;
      } else { el.classList.remove('error'); clearFieldError(id); }
    };
    require('guest-first', 'First name is required');
    require('guest-last', 'Last name is required');
    require('guest-email', 'Email is required');
    const emailEl = document.getElementById('guest-email');
    if (emailEl?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
      emailEl.classList.add('error'); showFieldError('guest-email', 'Enter a valid email'); valid = false;
    }
    if (!valid) return null;
    return guest;
  }

  function showFieldError(id, msg) {
    let err = document.getElementById(`${id}-error`);
    if (!err) { err = document.createElement('div'); err.id = `${id}-error`; err.className = 'form-error';
      document.getElementById(id)?.parentNode?.appendChild(err); }
    err.textContent = msg;
  }
  function clearFieldError(id) {
    const el = document.getElementById(`${id}-error`); if(el) el.textContent = '';
  }

  // ── Step 3: Payment ──────────────────────────────
  async function initStripe() {
    if (state.stripe) return;
    const { bookingId, clientSecret } = await createPendingBooking();
    if (!bookingId) return;
    state.bookingId = bookingId; state.clientSecret = clientSecret;

    state.stripe = Stripe(window.ALTUS_CONFIG.stripePublishableKey);
    const elements = state.stripe.elements();
    state.cardElement = elements.create('card', {
      style: {
        base: {
          fontFamily: "'Inter', sans-serif", fontSize: '16px',
          color: '#1A1A1A', '::placeholder': { color: '#9CA3AF' },
        },
      },
    });
    state.cardElement.mount('#stripe-card-element');
    state.cardElement.on('change', ({ error }) => {
      const el = document.getElementById('stripe-card-errors');
      if (el) el.textContent = error ? error.message : '';
    });
  }

  async function createPendingBooking() {
    try {
      const result = await api.createBooking({
        checkIn: state.checkIn, checkOut: state.checkOut,
        guests: state.guests, guest: state.guest, pricing: state.pricing,
      });
      return result;
    } catch (err) {
      toast(err.message || 'Could not initialize booking. Please try again.', 'error');
      return {};
    }
  }

  async function submitPayment() {
    const btn = document.getElementById('pay-btn');
    if (!btn || !state.stripe || !state.cardElement || !state.clientSecret) return;

    btn.disabled = true; btn.classList.add('btn--loading'); btn.textContent = '';

    const { paymentIntent, error } = await state.stripe.confirmCardPayment(state.clientSecret, {
      payment_method: {
        card: state.cardElement,
        billing_details: {
          name: `${state.guest.firstName} ${state.guest.lastName}`,
          email: state.guest.email,
          phone: state.guest.phone,
        },
      },
    });

    btn.disabled = false; btn.classList.remove('btn--loading'); btn.textContent = 'Complete Booking';

    if (error) {
      const el = document.getElementById('stripe-card-errors');
      if (el) el.textContent = error.message;
      toast(error.message, 'error');
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      showConfirmation();
    }
  }

  // ── Confirmation ─────────────────────────────────
  function showConfirmation() {
    state.step = 4;
    updateStepIndicator(4);
    showSection('#section-confirmation');

    const fmt2 = (s) => new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    setInner('#conf-name', `${state.guest.firstName} ${state.guest.lastName}`);
    setInner('#conf-email', state.guest.email);
    setInner('#conf-checkin', fmt2(state.checkIn));
    setInner('#conf-checkout', fmt2(state.checkOut));
    setInner('#conf-nights', state.nights);
    setInner('#conf-total', fmt(state.pricing.total));
    setInner('#conf-booking-id', state.bookingId);
  }

  // ── Public API ───────────────────────────────────
  return { onDatesSelected, goToDetails, goToPayment, submitPayment, updateBookingSummary };
})();
