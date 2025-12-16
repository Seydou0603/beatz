document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');

  if (!toggle || !menu) return;

  function setExpanded(val) {
    toggle.setAttribute('aria-expanded', String(val));
    if (val) {
      menu.classList.add('open');
      toggle.setAttribute('aria-label', 'Fermer le menu');
    } else {
      menu.classList.remove('open');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    }
  }

  toggle.addEventListener('click', function () {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setExpanded(!expanded);
  });

  // Close when clicking a link
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      setExpanded(false);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setExpanded(false);
  });

  // On resize, ensure menu is visible when desktop
  function onResize() {
    if (window.innerWidth >= 768) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  window.addEventListener('resize', onResize);
  
  // Product filter (prods.html)
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function () {
      const val = this.value;
      const cards = document.querySelectorAll('.prod-card');
      cards.forEach(card => {
        if (val === 'all') {
          card.style.display = '';
        } else {
          card.style.display = card.getAttribute('data-category') === val ? '' : 'none';
        }
      });
    });
  }

  // Scroll reveal animation for product cards (staggered)
  const prodCards = document.querySelectorAll('.prod-card');
  if (prodCards && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // compute index for slight stagger based on position in grid
          const cards = Array.from(document.querySelectorAll('.prod-card'));
          const idx = cards.indexOf(el);
          el.style.transitionDelay = `${(idx % 6) * 80}ms`;
          el.classList.add('in-view');
          obs.unobserve(el);
        }
      });
    }, {root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12});

    prodCards.forEach(card => observer.observe(card));
  } else {
    // fallback: reveal all
    prodCards.forEach(card => card.classList.add('in-view'));
  }

  // Purchase modal logic
  const modal = document.getElementById('purchase-modal');
  const modalTitle = document.getElementById('modal-product-title');
  const modalCategory = document.getElementById('modal-product-category');
  const modalPriceCopy = document.getElementById('modal-price-copy');
  const modalPriceProject = document.getElementById('modal-price-project');
  const modalConfirm = document.getElementById('modal-confirm');

  function openModal(card) {
    const title = card.querySelector('.prod-title').textContent;
    const category = card.querySelector('.prod-category').textContent;
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const project = parseFloat(card.getAttribute('data-project-price')) || price * 6;

    modalTitle.textContent = title;
    modalCategory.textContent = category;
    modalPriceCopy.textContent = price.toFixed(2) + '€';
    modalPriceProject.textContent = project.toFixed(2) + '€';

    modal.setAttribute('aria-hidden', 'false');
    // lock body scroll while modal is open
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    // store current prices
    modal.dataset.currentPrice = price;
    modal.dataset.currentProject = project;
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    try { document.body.style.overflow = ''; } catch (e) {}
  }

  // Attach click handlers to buy buttons
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const card = e.target.closest('.prod-card');
      if (!card) return;
      if (modal) {
        openModal(card);
      } else {
        // If no purchase modal on this page, redirect user to the main products page
        // where the purchase flow is available.
        window.location.href = 'prods.html';
      }
    });
  });

  // close when clicking backdrop or elements with [data-close]
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || (e.target.closest('.modal-backdrop') && !e.target.closest('.modal-panel'))) {
      closeModal();
    }
  });

  // prevent backdrop clicks inside panel from closing
  document.querySelectorAll('[data-stop]').forEach(el => {
    el.addEventListener('click', function (ev) { ev.stopPropagation(); });
  });

  // Ensure any element marked with [data-close] directly closes modals (handles clicks on icons/children)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      closeAllModals();
    });
  });

  // Backdrop click: close when clicking on the backdrop itself (outside the panel)
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeAllModals();
    });
  });

  // Update selected price when radio changes
  document.querySelectorAll('input[name="buytype"]').forEach(r => {
    r.addEventListener('change', function () {
      // nothing to do here, price computed on confirm
    });
  });

  // Payment buttons: show corresponding detail fields and set selected method
  const pmPhone = document.querySelector('.pm-phone');
  const pmCard = document.querySelector('.pm-card');
  const payButtons = Array.from(document.querySelectorAll('.pay-btn'));
  let selectedPayMethod = null;

  function clearPaySelection() {
    payButtons.forEach(b => b.classList.remove('active'));
    selectedPayMethod = null;
    if (pmPhone) pmPhone.style.display = 'none';
    if (pmCard) pmCard.style.display = 'none';
    updateConfirmState();
  }

  function showPaymentFields(method) {
    clearPaySelection();
    selectedPayMethod = method;
    const btn = document.querySelector(`.pay-btn[data-method="${method}"]`);
    if (btn) btn.classList.add('active');
    if ((method === 'orange' || method === 'wave') && pmPhone) pmPhone.style.display = '';
    if (method === 'card' && pmCard) pmCard.style.display = '';
    updateConfirmState();
  }

  payButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const method = btn.dataset.method;
      // Quick feedback then show fields
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = 'Chargement...';
      setTimeout(() => {
        btn.textContent = orig;
        btn.disabled = false;
        showPaymentFields(method);
      }, 240);
    });
  });

  // Validation helpers
  function onlyDigits(str) { return (str || '').replace(/\D/g, ''); }

  function validatePhone() {
    const country = document.getElementById('country-code');
    const phone = document.getElementById('phone-number');
    if (!country || !phone) return false;
    const digits = onlyDigits(phone.value);
    const ok = digits.length >= 6 && digits.length <= 15;
    phone.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) phone.style.borderColor = '#ff4d6d'; else phone.style.borderColor = '';
    return ok;
  }

  // Luhn algorithm for basic card number validation
  function luhnCheck(num) {
    const s = onlyDigits(num);
    let sum = 0; let shouldDouble = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = parseInt(s.charAt(i), 10);
      if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
      sum += d; shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0 && s.length >= 12;
  }

  function validateCard() {
    const name = document.getElementById('card-name');
    const number = document.getElementById('card-number');
    const expiry = document.getElementById('card-expiry');
    const cvc = document.getElementById('card-cvc');
    if (!name || !number || !expiry || !cvc) return false;
    const nameOk = name.value.trim().length > 1;
    const numOk = luhnCheck(number.value);
    // expiry MM/YY
    let expOk = false;
    const m = expiry.value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (m) {
      const mm = parseInt(m[1], 10);
      const yy = parseInt(m[2], 10) + 2000;
      const now = new Date();
      const exp = new Date(yy, mm - 1, 1);
      expOk = exp >= new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const cvcOk = /^\d{3,4}$/.test(cvc.value.trim());

    name.setAttribute('aria-invalid', nameOk ? 'false' : 'true');
    number.setAttribute('aria-invalid', numOk ? 'false' : 'true');
    expiry.setAttribute('aria-invalid', expOk ? 'false' : 'true');
    cvc.setAttribute('aria-invalid', cvcOk ? 'false' : 'true');

    number.style.borderColor = numOk ? '' : '#ff4d6d';
    expiry.style.borderColor = expOk ? '' : '#ff4d6d';
    cvc.style.borderColor = cvcOk ? '' : '#ff4d6d';
    name.style.borderColor = nameOk ? '' : '#ff4d6d';

    return nameOk && numOk && expOk && cvcOk;
  }

  function updateConfirmState() {
    if (!modalConfirm) return;
    const buy = document.querySelector('input[name="buytype"]:checked');
    if (!buy) { modalConfirm.disabled = true; return; }
    if (!selectedPayMethod) { modalConfirm.disabled = true; return; }
    let ok = false;
    if (selectedPayMethod === 'card') ok = validateCard(); else ok = validatePhone();
    modalConfirm.disabled = !ok;
  }

  // wire input events to revalidate
  ['phone-number','card-name','card-number','card-expiry','card-cvc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateConfirmState);
  });

  // ensure modal resets payment selection on open
  const originalOpenModal = openModal;
  openModal = function(card) {
    originalOpenModal(card);
    clearPaySelection();
    // clear inputs
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(i => { if (i.type !== 'radio') i.value = ''; i.removeAttribute('aria-invalid'); i.style.borderColor = ''; });
    const selects = modal.querySelectorAll('select');
    selects.forEach(s => { s.selectedIndex = 0; });
    // disable confirm until valid
    if (modalConfirm) modalConfirm.disabled = true;
  };

  // Confirm payment (client-side validation + simulated success)
  if (modalConfirm) {
    modalConfirm.addEventListener('click', function (e) {
      e.preventDefault();
      const buyType = document.querySelector('input[name="buytype"]:checked');
      if (!buyType) return;
      const amount = buyType.value === 'copy' ? parseFloat(modal.dataset.currentPrice) : parseFloat(modal.dataset.currentProject);
      if (!selectedPayMethod) {
        // nothing selected
        alert('Veuillez choisir un moyen de paiement.');
        return;
      }
      const valid = selectedPayMethod === 'card' ? validateCard() : validatePhone();
      if (!valid) { updateConfirmState(); return; }

      // Simulate processing
      modalConfirm.disabled = true;
      modalConfirm.textContent = 'Traitement...';
      setTimeout(() => {
        modalConfirm.textContent = 'Payer';
        modalConfirm.disabled = false;
        closeModal();
        showToast(`Paiement simulé : ${amount.toFixed(2)}€ — ${selectedPayMethod.toUpperCase()}`);
      }, 900);
    });
  }

  // Simple toast notification
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'site-toast';
    t.textContent = msg;
    Object.assign(t.style, {position:'fixed',right:'20px',bottom:'20px',background:'#0b1724',color:'#fff',padding:'12px 16px',borderRadius:'8px',boxShadow:'0 8px 24px rgba(2,6,23,0.4)',zIndex:9999});
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  // Generic close for any open modal (used by backdrop/cancel handlers)
  function closeAllModals() {
    const open = document.querySelectorAll('.modal[aria-hidden="false"]');
    open.forEach(m => m.setAttribute('aria-hidden', 'true'));
    try { document.body.style.overflow = ''; } catch (e) {}
  }

  // Rendez-vous modal logic
  const rvModal = document.getElementById('rendezvous-modal');
  const rvForm = document.getElementById('rv-form');
  const rvSend = document.getElementById('rv-send');
  const rvFirst = document.getElementById('rv-first');
  const rvLast = document.getElementById('rv-last');
  const rvPseudo = document.getElementById('rv-pseudo');
  const rvEmail = document.getElementById('rv-email');
  const rvPhone = document.getElementById('rv-phone');
  const rvCountry = document.getElementById('rv-country-code');
  const rvMessage = document.getElementById('rv-message');
  const rvDate = document.getElementById('rv-date');
  const rvTime = document.getElementById('rv-time');

  function openRvModal() {
    if (!rvModal) return;
    rvModal.setAttribute('aria-hidden', 'false');
    // reset form
    if (rvForm) rvForm.reset();
    if (rvSend) rvSend.disabled = false;
  }

  // Hook CTA buttons (Prendre Un Rendez-Vous)
  document.querySelectorAll('.btn-cta').forEach(btn => {
    btn.addEventListener('click', function (e) {
      // if href used, prevent navigation
      e.preventDefault();
      openRvModal();
    });
  });

  // validation helpers for rendezvous form
  function validateRvEmail() {
    if (!rvEmail) return false;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rvEmail.value.trim());
    rvEmail.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  function validateRvPhone() {
    if (!rvPhone) return false;
    const digits = onlyDigits(rvPhone.value);
    const ok = digits.length >= 6 && digits.length <= 15;
    rvPhone.setAttribute('aria-invalid', ok ? 'false' : 'true');
    rvPhone.style.borderColor = ok ? '' : '#ff4d6d';
    return ok;
  }

  function validateRvName() {
    if (!rvFirst || !rvLast) return false;
    const ok = rvFirst.value.trim().length >= 2 && rvLast.value.trim().length >= 2;
    rvFirst.setAttribute('aria-invalid', rvFirst.value.trim().length >= 2 ? 'false' : 'true');
    rvLast.setAttribute('aria-invalid', rvLast.value.trim().length >= 2 ? 'false' : 'true');
    rvFirst.style.borderColor = rvFirst.value.trim().length >= 2 ? '' : '#ff4d6d';
    rvLast.style.borderColor = rvLast.value.trim().length >= 2 ? '' : '#ff4d6d';
    return ok;
  }

  function validateRvMessage() {
    if (!rvMessage) return false;
    const ok = rvMessage.value.trim().length >= 8;
    rvMessage.setAttribute('aria-invalid', ok ? 'false' : 'true');
    rvMessage.style.borderColor = ok ? '' : '#ff4d6d';
    return ok;
  }

  function validateRvCountry() {
    if (!rvCountry) return true; // optional if not present
    const v = (rvCountry.value || '').trim();
    const ok = /^\+?\d{1,4}$/.test(v);
    rvCountry.setAttribute('aria-invalid', ok ? 'false' : 'true');
    rvCountry.style.borderColor = ok ? '' : '#ff4d6d';
    return ok;
  }

  function validateRvDateTime() {
    if (!rvDate || !rvTime) return false;
    if (!rvDate.value || !rvTime.value) return false;
    const selected = new Date(rvDate.value + 'T' + rvTime.value);
    const now = new Date();
    // allow same-day future times
    return selected >= new Date(now.getTime() - 5 * 60 * 1000);
  }

  function updateRvSendState() {
    if (!rvSend) return;
    const ok = validateRvName() && validateRvEmail() && validateRvCountry() && validateRvPhone() && validateRvDateTime() && validateRvMessage();
    rvSend.disabled = !ok;
  }

  [rvFirst, rvLast, rvPseudo, rvEmail, rvCountry, rvPhone, rvDate, rvTime, rvMessage].forEach(el => {
    if (!el) return;
    el.addEventListener('input', updateRvSendState);
  });

  // form submit
  if (rvForm) {
    rvForm.addEventListener('submit', function (e) {
      e.preventDefault();
      updateRvSendState();
      if (!rvSend || rvSend.disabled) return;
      rvSend.disabled = true;
      const orig = rvSend.textContent;
      rvSend.textContent = 'Envoi...';
      setTimeout(() => {
        rvSend.textContent = orig;
        rvSend.disabled = false;
        closeAllModals();
        showToast('Demande de rendez-vous envoyée — je vous contacterai bientôt.');
      }, 900);
    });
  }

  // ensure the generic click handler closes any modal (replace previous close call)
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || (e.target.closest('.modal-backdrop') && !e.target.closest('.modal-panel'))) {
      closeAllModals();
    }
  });
});
