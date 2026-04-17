/**
 * apply-nav.js
 * Multi-step application form navigation, validation, and review for Grandspace.
 */

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL_STEPS = 5;
  let currentStep = 1;

  // ── Element references ──────────────────────────────────────────────────────
  const form       = document.getElementById('gs-apply-form');
  const btnPrev    = document.getElementById('gs-prev');
  const btnNext    = document.getElementById('gs-next');
  const btnSubmit  = document.getElementById('gs-submit');
  const confirmEl  = document.getElementById('gs-confirm');

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getStep(n) {
    return document.querySelector(`.gs-step[data-step="${n}"]`);
  }

  function getProgressStep(n) {
    return document.querySelector(`.gs-progress__step[data-progress-step="${n}"]`);
  }

  function showError(input, message) {
    input.classList.add('gs-field-error');
    const existing = input.parentElement.querySelector('.gs-error-msg');
    if (existing) existing.remove();
    const msg = document.createElement('span');
    msg.className = 'gs-error-msg';
    msg.setAttribute('role', 'alert');
    msg.textContent = message;
    input.parentElement.appendChild(msg);
  }

  function clearErrors() {
    document.querySelectorAll('.gs-field-error').forEach(el => el.classList.remove('gs-field-error'));
    document.querySelectorAll('.gs-error-msg').forEach(el => el.remove());
  }

  function scrollToFirstError() {
    const first = document.querySelector('.gs-field-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidFile(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg'];
    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (!file) return { ok: false, reason: 'Please upload a file.' };
    if (!allowedTypes.includes(file.type)) return { ok: false, reason: 'File must be a PDF or JPG.' };
    if (file.size > maxBytes) return { ok: false, reason: 'File must be 2 MB or smaller.' };
    return { ok: true };
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validateStep(step) {
    clearErrors();
    let valid = true;

    if (step === 1) {
      const required = ['gs-fname', 'gs-lname', 'gs-dob', 'gs-nationality', 'gs-phone', 'gs-email'];
      required.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el.value.trim()) {
          showError(el, 'This field is required.');
          valid = false;
        } else if (id === 'gs-email' && !isValidEmail(el.value.trim())) {
          showError(el, 'Please enter a valid email address.');
          valid = false;
        }
      });
    }

    if (step === 2) {
      const institution = document.getElementById('gs-institution');
      const year        = document.getElementById('gs-year');
      const upload      = document.getElementById('gs-enrolment-upload');

      if (!institution.value.trim()) {
        showError(institution, 'Please enter your institution.');
        valid = false;
      }
      if (!year.value) {
        showError(year, 'Please select your year of study.');
        valid = false;
      }
      const file = upload && upload.files[0];
      const fileCheck = isValidFile(file);
      if (!fileCheck.ok) {
        showError(upload, fileCheck.reason);
        valid = false;
      }
    }

    if (step === 3) {
      const upload = document.getElementById('gs-id-upload');
      const file   = upload && upload.files[0];
      const fileCheck = isValidFile(file);
      if (!fileCheck.ok) {
        showError(upload, fileCheck.reason);
        valid = false;
      }
    }

    if (step === 4) {
      const checked  = document.querySelectorAll('input[name="gs-property"]:checked');
      const moveIn   = document.getElementById('gs-movein');
      const lease    = document.getElementById('gs-lease');
      // Use first checkbox as anchor for error display
      const firstProp = document.querySelector('input[name="gs-property"]');

      if (checked.length === 0) {
        if (firstProp) showError(firstProp, 'Please select at least one property.');
        valid = false;
      }
      if (!moveIn.value) {
        showError(moveIn, 'Please select a move-in date.');
        valid = false;
      }
      if (!lease.value) {
        showError(lease, 'Please select a lease duration.');
        valid = false;
      }
    }

    if (step === 5) {
      const check = document.getElementById('gs-confirm-check');
      if (!check.checked) {
        showError(check, 'You must confirm before submitting.');
        valid = false;
      }
    }

    if (!valid) scrollToFirstError();
    return valid;
  }

  // ── Step 4: max-3 property checkbox enforcement ──────────────────────────────

  document.querySelectorAll('input[name="gs-property"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll('input[name="gs-property"]:checked');
      if (checked.length > 3) {
        cb.checked = false;
        // Show a transient message near the group
        const existing = document.querySelector('.gs-prop-limit-msg');
        if (!existing) {
          const msg = document.createElement('span');
          msg.className = 'gs-prop-limit-msg gs-error-msg';
          msg.setAttribute('role', 'alert');
          msg.textContent = 'You can select up to 3 properties.';
          cb.parentElement.parentElement.appendChild(msg);
          setTimeout(() => msg.remove(), 3000);
        }
      }
    });
  });

  // ── Review summary ───────────────────────────────────────────────────────────

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function fileName(id) {
    const el = document.getElementById(id);
    return el && el.files[0] ? el.files[0].name : '(no file selected)';
  }

  function buildReviewSummary() {
    const container = document.getElementById('gs-review-summary');
    if (!container) return;

    const selected = Array.from(document.querySelectorAll('input[name="gs-property"]:checked'))
      .map(cb => cb.value || cb.dataset.label || cb.nextSibling?.textContent?.trim() || cb.id)
      .join(', ') || '(none)';

    const rows = [
      // Personal details
      ['First Name',       val('gs-fname')],
      ['Last Name',        val('gs-lname')],
      ['Date of Birth',    val('gs-dob')],
      ['Nationality',      val('gs-nationality')],
      ['Phone',            val('gs-phone')],
      ['Email',            val('gs-email')],
      // University
      ['Institution',      val('gs-institution')],
      ['Year of Study',    val('gs-year')],
      ['Enrolment Doc',    fileName('gs-enrolment-upload')],
      // Identity
      ['Identity Doc',     fileName('gs-id-upload')],
      // Property
      ['Properties',       selected],
      ['Move-in Date',     val('gs-movein')],
      ['Lease Duration',   val('gs-lease')],
    ];

    const dl = document.createElement('dl');
    dl.className = 'gs-review-list';

    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value || '—';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    container.innerHTML = '';
    container.appendChild(dl);
  }

  // ── Navigation display ───────────────────────────────────────────────────────

  function updateNavButtons() {
    if (btnPrev)   btnPrev.hidden   = (currentStep === 1);
    if (btnNext)   btnNext.hidden   = (currentStep === TOTAL_STEPS);
    if (btnSubmit) btnSubmit.hidden = (currentStep !== TOTAL_STEPS);
  }

  function updateProgressIndicator() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const el = getProgressStep(i);
      if (!el) continue;
      el.classList.remove('is-active', 'is-completed');
      if (i < currentStep) el.classList.add('is-completed');
      if (i === currentStep) el.classList.add('is-active');
    }
  }

  function showCurrentStep() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const el = getStep(i);
      if (!el) continue;
      el.classList.toggle('gs-step--active', i === currentStep);
    }
    updateProgressIndicator();
    updateNavButtons();
  }

  // ── Navigation handlers ──────────────────────────────────────────────────────

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < TOTAL_STEPS) {
        currentStep++;
        if (currentStep === 5) buildReviewSummary();
        showCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        clearErrors();
        showCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Submit button: validate step 5 only.
  // apply-submit.js intercepts the form submit event and handles Formspree + success screen.
  if (btnSubmit) {
    btnSubmit.addEventListener('click', (e) => {
      if (!validateStep(5)) {
        e.preventDefault();
      }
      // If valid, allow the native submit event to bubble — apply-submit.js takes over.
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  showCurrentStep();
});
