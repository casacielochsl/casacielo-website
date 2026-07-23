const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const year = document.getElementById('year');
const noticeMarquee = document.getElementById('notice-marquee');
const noticeMarqueeText = document.getElementById('noticeMarqueeText');

if (noticeMarquee && noticeMarqueeText) {
  fetch('/api/notices')
    .then((res) => (res.ok ? res.json() : { notices: [] }))
    .then((data) => {
      const activeNotices = (data.notices || []).filter((notice) => notice.active);
      if (!activeNotices.length) return;
      noticeMarqueeText.textContent = activeNotices.map((notice) => notice.message).join('   •   ');
      noticeMarquee.hidden = false;
    })
    .catch(() => {});
}

const eventsSection = document.getElementById('events');
const eventsGrid = document.getElementById('eventsGrid');
const eventsNavLink = document.getElementById('eventsNavLink');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

if (eventsSection && eventsGrid) {
  fetch('/api/events')
    .then((res) => (res.ok ? res.json() : { events: [] }))
    .then((data) => {
      const activeEvents = (data.events || []).filter((event) => event.active);
      if (!activeEvents.length) return;
      eventsGrid.innerHTML = activeEvents.map((event) => `
        <article class="event-card">
          ${event.image?.dataUrl ? `<img src="${event.image.dataUrl}" alt="${escapeHtml(event.title)}" />` : ''}
          ${event.date ? `<span class="event-date">${escapeHtml(event.date)}</span>` : ''}
          <h3>${escapeHtml(event.title)}</h3>
          ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
        </article>
      `).join('');
      eventsSection.hidden = false;
      if (eventsNavLink) eventsNavLink.hidden = false;
    })
    .catch(() => {});
}

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}
