/**
 * Availability calendar.
 * - Renders two months side-by-side on desktop, one on mobile
 * - Fetches blocked dates from API
 * - Emits 'dates-selected' CustomEvent on the element when a range is picked
 */
class AvailabilityCalendar {
  constructor(el, options = {}) {
    this.el = el;
    this.options = { minStay: 2, onSelect: null, ...options };
    this.blockedDates = new Set();
    this.pricingMap = {};
    this.startDate = null;
    this.endDate = null;
    this.hoveredDate = null;
    this.viewDate = new Date();
    this.viewDate.setDate(1);
    this.loading = true;
    this._render();
    this._fetchAvailability();
  }

  // ── Data ────────────────────────────────────────
  async _fetchAvailability() {
    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 6, 0).toISOString().split('T')[0];
    try {
      const data = await api.getAvailability(start, end);
      this.blockedDates = new Set(
        (data.calendar?.days || []).filter(d => !d.available).map(d => d.date)
      );
      this.pricingMap = Object.fromEntries(
        (data.calendar?.days || []).filter(d => d.price).map(d => [d.date, d.price])
      );
    } catch (e) {
      console.warn('Calendar: could not load availability', e.message);
    }
    this.loading = false;
    this._render();
  }

  // ── Helpers ──────────────────────────────────────
  _fmt(date) { return date.toISOString().split('T')[0]; }

  _isBlocked(dateStr) { return this.blockedDates.has(dateStr); }

  _isPast(dateStr) {
    const today = this._fmt(new Date());
    return dateStr < today;
  }

  _isInRange(dateStr) {
    if (!this.startDate || !this.endDate) return false;
    return dateStr > this.startDate && dateStr < this.endDate;
  }

  _rangeHasBlockedDate(start, end) {
    let d = new Date(start);
    d.setDate(d.getDate() + 1);
    const e = new Date(end);
    while (d < e) {
      if (this._isBlocked(this._fmt(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  // ── Render ───────────────────────────────────────
  _render() {
    this.el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'calendar-months';

    const isMobile = window.innerWidth < 700;
    const monthsToShow = isMobile ? 1 : 2;

    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(this.viewDate);
      d.setMonth(d.getMonth() + i);
      wrap.appendChild(this._renderMonth(d));
    }

    // Nav
    const nav = document.createElement('div');
    nav.className = 'calendar-nav';
    nav.innerHTML = `
      <button class="calendar-nav-btn" id="cal-prev">&#8592;</button>
      <span class="calendar-month-title">${this._monthRange(monthsToShow)}</span>
      <button class="calendar-nav-btn" id="cal-next">&#8594;</button>
    `;

    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    legend.innerHTML = `
      <div class="calendar-legend-item"><div class="calendar-legend-dot available"></div> Available</div>
      <div class="calendar-legend-item"><div class="calendar-legend-dot blocked"></div> Unavailable</div>
    `;

    this.el.appendChild(nav);
    if (this.loading) {
      const sk = document.createElement('div');
      sk.className = 'skeleton'; sk.style.height = '300px'; sk.style.marginTop = '16px';
      this.el.appendChild(sk);
    } else {
      this.el.appendChild(wrap);
      this.el.appendChild(legend);
    }

    this._bindNav();
  }

  _monthRange(count) {
    const months = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(this.viewDate);
      d.setMonth(d.getMonth() + i);
      months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    return months.join(' – ');
  }

  _renderMonth(date) {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    grid.style.marginBottom = '24px';

    DAYS.forEach(d => {
      const h = document.createElement('div');
      h.className = 'calendar-day-header'; h.textContent = d;
      grid.appendChild(h);
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty'; grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const el = document.createElement('button');
      el.className = 'calendar-day'; el.textContent = day; el.dataset.date = dateStr;

      if (this._isPast(dateStr)) { el.classList.add('past'); el.disabled = true; }
      else if (this._isBlocked(dateStr)) { el.classList.add('blocked'); el.disabled = true; }
      else {
        if (dateStr === this.startDate) el.classList.add('selected-start');
        if (dateStr === this.endDate)   el.classList.add('selected-end');
        if (this._isInRange(dateStr))   el.classList.add('in-range');
        el.addEventListener('click', () => this._handleClick(dateStr));
        el.addEventListener('mouseenter', () => this._handleHover(dateStr));
      }
      grid.appendChild(el);
    }

    return grid;
  }

  _bindNav() {
    this.el.querySelector('#cal-prev')?.addEventListener('click', () => {
      this.viewDate.setMonth(this.viewDate.getMonth() - 1);
      this._render();
    });
    this.el.querySelector('#cal-next')?.addEventListener('click', () => {
      this.viewDate.setMonth(this.viewDate.getMonth() + 1);
      this._render();
    });
  }

  _handleClick(dateStr) {
    if (!this.startDate || (this.startDate && this.endDate)) {
      this.startDate = dateStr; this.endDate = null;
    } else if (dateStr <= this.startDate) {
      this.startDate = dateStr; this.endDate = null;
    } else if (this._rangeHasBlockedDate(this.startDate, dateStr)) {
      showToast('Selected range includes unavailable dates. Please choose different dates.', 'error');
      this.startDate = dateStr; this.endDate = null;
    } else {
      const nights = (new Date(dateStr) - new Date(this.startDate)) / 86400000;
      if (nights < (this.options.minStay || 2)) {
        showToast(`Minimum stay is ${this.options.minStay || 2} nights.`, 'error');
        return;
      }
      this.endDate = dateStr;
      if (this.options.onSelect) {
        this.options.onSelect({ checkIn: this.startDate, checkOut: this.endDate });
      }
    }
    this._render();
  }

  _handleHover(dateStr) {
    this.hoveredDate = dateStr; // future: show hover range highlight
  }

  getSelection() { return { checkIn: this.startDate, checkOut: this.endDate }; }
  clearSelection() { this.startDate = null; this.endDate = null; this._render(); }
}
