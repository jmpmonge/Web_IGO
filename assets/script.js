'use strict';
document.documentElement.classList.add('js');

document.querySelectorAll('[data-lang]').forEach((link) => {
  link.addEventListener('click', () => {
    const lang = link.getAttribute('data-lang');
    if (lang !== 'en' && lang !== 'es') return;
    try { localStorage.setItem('seivol-lang', lang); } catch (e) {}
  });
});

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (menuButton && navigation) {
  const closeMenu = () => { menuButton.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); };
  menuButton.addEventListener('click', (event) => {
    event.preventDefault();
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); } });
  window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);
}

// (Bloque `media` retirado: todas sus fuentes estaban vacías y el HTML no tiene [data-media].)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealTargets = [
  ...document.querySelectorAll('[data-reveal]'),
  ...document.querySelectorAll('.section-heading, .cycle-compose, .principles, .cycle, .support-example, .speaking-copy, .experience-shot, .contact-panel, .app-copy')
];

revealTargets.forEach((el) => { el.classList.add('reveal'); });

if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-inview');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-inview'));
}

// (Parallax del hero retirado: education.css fija transform:none en esos elementos, no tenía efecto visible.)

const earlyAccessForm = document.querySelector('#early-access-form');
if (earlyAccessForm) {
  const captchaQuestion = earlyAccessForm.querySelector('#contact-captcha-question');
  const captchaInput = earlyAccessForm.querySelector('#contact-captcha');
  const formError = earlyAccessForm.querySelector('#contact-form-error');
  const a = 2 + Math.floor(Math.random() * 7);
  const b = 1 + Math.floor(Math.random() * 8);
  const captchaAnswer = a + b;
  if (captchaQuestion) captchaQuestion.textContent = `${a} + ${b}`;

  earlyAccessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const honeypot = earlyAccessForm.querySelector('#contact-company')?.value.trim() || '';
    if (honeypot) return;

    const answered = Number.parseInt(captchaInput?.value.trim() || '', 10);
    if (answered !== captchaAnswer) {
      if (formError) formError.hidden = false;
      captchaInput?.focus();
      return;
    }
    if (formError) formError.hidden = true;

    const name = earlyAccessForm.querySelector('#contact-name')?.value.trim() || '';
    const email = earlyAccessForm.querySelector('#contact-email')?.value.trim() || '';
    const role = earlyAccessForm.querySelector('#contact-role')?.value.trim() || '';
    const message = earlyAccessForm.querySelector('#contact-message')?.value.trim() || '';
    if (!name || !email) return;

    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      role ? `Role / Institution: ${role}` : null,
      message ? `Message: ${message}` : null
    ].filter(Boolean);
    const body = encodeURIComponent(lines.join('\n'));
    const subject = encodeURIComponent('Seivol early access');
    window.location.href = `mailto:jmpmonge@gmail.com?subject=${subject}&body=${body}`;
  });
}
