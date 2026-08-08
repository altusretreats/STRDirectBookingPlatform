function confirmationEmail({ guest, checkIn, checkOut, nights, pricing, bookingId, propertyName, guidebookUrl }) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const money = (c) => '$' + (c/100).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const subject = `You're booked! ${propertyName} · ${fmt(checkIn)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
<style>
  body { margin:0; padding:0; background:#F2F0EC; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:600px; margin:0 auto; }
  .header { background:#2D3A2E; padding:36px 40px; text-align:center; }
  .header-logo { color:#fff; font-size:22px; font-weight:700; letter-spacing:0.02em; }
  .header-sub { color:rgba(255,255,255,0.65); font-size:13px; margin-top:4px; }
  .hero { background:#2D3A2E; padding:0 40px 40px; text-align:center; }
  .hero-icon { font-size:56px; display:block; margin-bottom:12px; }
  .hero-title { color:#fff; font-size:26px; font-weight:700; margin:0 0 8px; }
  .hero-sub { color:rgba(255,255,255,0.75); font-size:15px; margin:0; }
  .body { background:#fff; padding:40px; }
  .greeting { font-size:17px; color:#1A1A1A; margin-bottom:24px; }
  .dates-row { display:flex; gap:0; margin-bottom:32px; border:1px solid #E0DDD8; border-radius:10px; overflow:hidden; }
  .date-box { flex:1; padding:20px; text-align:center; }
  .date-box:first-child { border-right:1px solid #E0DDD8; }
  .date-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B6B6B; margin-bottom:6px; }
  .date-value { font-size:17px; font-weight:700; color:#1A1A1A; }
  .date-day { font-size:13px; color:#6B6B6B; margin-top:2px; }
  .section-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#6B6B6B; margin:32px 0 12px; border-bottom:1px solid #E0DDD8; padding-bottom:10px; }
  .line { display:flex; justify-content:space-between; padding:8px 0; font-size:15px; color:#1A1A1A; }
  .line-total { font-weight:700; border-top:2px solid #E0DDD8; margin-top:4px; padding-top:12px; font-size:16px; }
  .cta-box { background:#F2F0EC; border-radius:10px; padding:28px; text-align:center; margin:32px 0; }
  .cta-title { font-size:17px; font-weight:700; color:#1A1A1A; margin-bottom:8px; }
  .cta-sub { font-size:14px; color:#6B6B6B; margin-bottom:20px; }
  .cta-btn { display:inline-block; background:#2D3A2E; color:#fff; padding:13px 28px; border-radius:8px; font-size:15px; font-weight:600; text-decoration:none; }
  .booking-id { text-align:center; font-size:12px; color:#9CA3AF; margin-top:8px; }
  .footer { padding:32px 40px; text-align:center; }
  .footer-text { font-size:12px; color:#9CA3AF; line-height:1.6; }
  .footer-contact { color:#2D3A2E; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="header-logo">Altus Retreats</div>
    <div class="header-sub">Direct Booking Confirmation</div>
  </div>
  <div class="hero">
    <span class="hero-icon">🎉</span>
    <h1 class="hero-title">You're confirmed!</h1>
    <p class="hero-sub">${propertyName}</p>
  </div>
  <div class="body">
    <p class="greeting">Hi ${guest.firstName},<br><br>
    Your reservation is confirmed and your spot is held. We can't wait to host you!</p>

    <div class="dates-row">
      <div class="date-box">
        <div class="date-label">Check-in</div>
        <div class="date-value">${new Date(checkIn).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="date-day">${new Date(checkIn).toLocaleDateString('en-US',{weekday:'long',year:'numeric'})}</div>
      </div>
      <div class="date-box">
        <div class="date-label">Check-out</div>
        <div class="date-value">${new Date(checkOut).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="date-day">${new Date(checkOut).toLocaleDateString('en-US',{weekday:'long',year:'numeric'})}</div>
      </div>
    </div>

    <div class="section-title">Price Summary</div>
    <div class="line"><span>${money(pricing.nightlyRate)} × ${nights} nights</span><span>${money(pricing.subtotal)}</span></div>
    <div class="line"><span>Cleaning fee</span><span>${money(pricing.cleaningFee)}</span></div>
    <div class="line"><span>Taxes</span><span>${money(pricing.taxes)}</span></div>
    <div class="line line-total"><span>Total paid</span><span>${money(pricing.total)}</span></div>

    <div class="section-title">What's Next</div>
    <div class="line"><span>📖 Digital guidebook</span><span style="color:#6B6B6B">Sent 48hrs before arrival</span></div>
    <div class="line"><span>🔑 Check-in code</span><span style="color:#6B6B6B">Sent 24hrs before arrival</span></div>
    <div class="line"><span>📞 Questions?</span><span style="color:#6B6B6B"><a href="mailto:support@altusretreats.net" style="color:#2D3A2E">support@altusretreats.net</a></span></div>

    ${guidebookUrl ? `
    <div class="cta-box">
      <div class="cta-title">Your digital guidebook is ready</div>
      <div class="cta-sub">Browse local recommendations, check-in instructions, and everything you need before you arrive.</div>
      <a href="${guidebookUrl}" class="cta-btn">Open Guidebook →</a>
    </div>` : ''}

    <div class="booking-id">Booking ID: ${bookingId}</div>
  </div>
  <div class="footer">
    <p class="footer-text">
      Questions? Reach us at <a href="mailto:support@altusretreats.net" class="footer-contact">support@altusretreats.net</a><br>
      © 2026 Altus Retreats LLC · altusretreats.net
    </p>
  </div>
</div>
</body>
</html>`;

  const text = `Hi ${guest.firstName},

Your reservation at ${propertyName} is confirmed!

Check-in:  ${fmt(checkIn)}
Check-out: ${fmt(checkOut)}
Nights:    ${nights}
Total:     ${money(pricing.total)}

Booking ID: ${bookingId}

Your digital guidebook and check-in code will be sent before arrival.

Questions? Email us at support@altusretreats.net

Altus Retreats LLC`;

  return { subject, html, text };
}

function preArrivalEmail({ guest, checkIn, checkOut, propertyName, guidebookUrl, checkInCode }) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const subject = `You arrive tomorrow! Here's everything you need — ${propertyName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
<style>
  body { margin:0; padding:0; background:#F2F0EC; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:600px; margin:0 auto; }
  .header { background:#2D3A2E; padding:32px 40px; text-align:center; }
  .header-logo { color:#fff; font-size:20px; font-weight:700; }
  .body { background:#fff; padding:40px; }
  .greeting { font-size:16px; color:#1A1A1A; margin-bottom:28px; line-height:1.6; }
  .info-card { background:#F2F0EC; border-radius:10px; padding:24px; margin-bottom:20px; }
  .info-card-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#6B6B6B; margin-bottom:14px; }
  .info-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #E0DDD8; font-size:15px; }
  .info-row:last-child { border:none; }
  .info-label { color:#6B6B6B; }
  .info-value { font-weight:600; color:#1A1A1A; }
  .code-box { background:#2D3A2E; border-radius:10px; padding:28px; text-align:center; margin:28px 0; }
  .code-label { color:rgba(255,255,255,0.7); font-size:13px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; }
  .code-value { color:#C9A84C; font-size:36px; font-weight:700; letter-spacing:0.15em; }
  .code-hint { color:rgba(255,255,255,0.55); font-size:12px; margin-top:8px; }
  .cta-btn { display:block; background:#C9A84C; color:#fff; padding:14px 28px; border-radius:8px; font-size:15px; font-weight:600; text-decoration:none; text-align:center; margin:28px 0; }
  .footer { padding:28px 40px; text-align:center; font-size:12px; color:#9CA3AF; line-height:1.6; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><div class="header-logo">Altus Retreats</div></div>
  <div class="body">
    <p class="greeting">Hi ${guest.firstName}! 🌿<br><br>
    You're arriving <strong>tomorrow</strong> at ${propertyName}. Here's everything you need for a smooth check-in.</p>

    <div class="info-card">
      <div class="info-card-title">Your Stay</div>
      <div class="info-row"><span class="info-label">Check-in</span><span class="info-value">${fmt(checkIn)} · 3:00 PM</span></div>
      <div class="info-row"><span class="info-label">Check-out</span><span class="info-value">${fmt(checkOut)} · 11:00 AM</span></div>
      <div class="info-row"><span class="info-label">Property</span><span class="info-value">${propertyName}</span></div>
    </div>

    ${checkInCode ? `
    <div class="code-box">
      <div class="code-label">Door Code</div>
      <div class="code-value">${checkInCode}</div>
      <div class="code-hint">Enter on the keypad at the front door</div>
    </div>` : ''}

    ${guidebookUrl ? `
    <a href="${guidebookUrl}" class="cta-btn">Open Your Digital Guidebook →</a>
    <p style="text-align:center;font-size:13px;color:#6B6B6B;margin-top:-16px">
      WiFi, local recommendations, appliance guides, and more
    </p>` : ''}

    <p style="font-size:14px;color:#6B6B6B;text-align:center;margin-top:28px">
      Questions before arrival? Reply to this email or reach us at<br>
      <a href="mailto:support@altusretreats.net" style="color:#2D3A2E">support@altusretreats.net</a>
    </p>
  </div>
  <div class="footer">© 2026 Altus Retreats LLC · altusretreats.net</div>
</div>
</body>
</html>`;

  const text = `Hi ${guest.firstName}!

You arrive TOMORROW at ${propertyName}.

Check-in: ${fmt(checkIn)} at 3:00 PM
Check-out: ${fmt(checkOut)} at 11:00 AM
${checkInCode ? `\nDoor code: ${checkInCode}\n` : ''}
${guidebookUrl ? `Guidebook: ${guidebookUrl}\n` : ''}
Questions? Email support@altusretreats.net

See you soon!
Altus Retreats`;

  return { subject, html, text };
}

module.exports = { confirmationEmail, preArrivalEmail };
