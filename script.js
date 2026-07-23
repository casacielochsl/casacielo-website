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
