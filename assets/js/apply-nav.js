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
    const maxBytes = 15 * 1024 * 1024; // 15 MB — covers phone camera photos
    if (!file) return { ok: false, reason: 'Please upload a file.' };
    // Accept PDF or any image type. Also accept empty/unknown MIME (common on mobile).
    const t = file.type || '';
    const typeOk = t === 'application/pdf' || t.startsWith('image/') || t === '';
    if (!typeOk) return { ok: false, reason: 'File must be a PDF or image (JPG, PNG).' };
    if (file.size > maxBytes) return { ok: false, reason: 'File is too large (max 15 MB). Please compress it or send a PDF instead.' };
    return { ok: true };
  }

  // Find the visible upload label for a file input (used for error anchoring)
  function getUploadLabel(inputId) {
    return document.querySelector('label[for="' + inputId + '"].gs-upload-label');
  }

  function showUploadError(inputId, message) {
    const label = getUploadLabel(inputId);
    const anchor = label || document.getElementById(inputId);
    if (!anchor) return;
    anchor.classList.add('gs-field-error');
    const parent = anchor.parentElement;
    const existing = parent.querySelector('.gs-error-msg');
    if (existing) existing.remove();
    const msg = document.createElement('span');
    msg.className = 'gs-error-msg';
    msg.setAttribute('role', 'alert');
    msg.textContent = message;
    parent.appendChild(msg);
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
        } else if (id === 'gs-dob' && el.value) {
          const yearPart = el.value.split('-')[0];
          if (yearPart && yearPart.length !== 4) {
            showError(el, 'Please enter a valid 4-digit year.');
            valid = false;
          }
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
        showUploadError('gs-enrolment-upload', fileCheck.reason);
        valid = false;
      }
    }

    if (step === 3) {
      const upload = document.getElementById('gs-id-upload');
      const file   = upload && upload.files[0];
      const fileCheck = isValidFile(file);
      if (!fileCheck.ok) {
        showUploadError('gs-id-upload', fileCheck.reason);
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

  // ── Step 4: property card selection + max-3 enforcement ─────────────────────

  document.querySelectorAll('input[name="gs-property"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll('input[name="gs-property"]:checked');
      if (checked.length > 3) {
        cb.checked = false;
        const existing = document.querySelector('.gs-prop-limit-msg');
        if (!existing) {
          const msg = document.createElement('span');
          msg.className = 'gs-prop-limit-msg gs-error-msg';
          msg.setAttribute('role', 'alert');
          msg.textContent = 'You can select up to 3 properties.';
          const grid = document.getElementById('gs-property-group');
          if (grid) grid.appendChild(msg);
          setTimeout(() => msg.remove(), 3000);
        }
        return;
      }
      // Toggle selected state on card
      const card = cb.closest('.gs-prop-card');
      if (card) {
        card.classList.toggle('is-selected', cb.checked);
        // Reset room type select when deselected
        if (!cb.checked) {
          const roomSelect = card.querySelector('.gs-prop-type');
          if (roomSelect) roomSelect.value = '';
        }
      }
    });
  });

  // ── Set move-in date minimum to today ────────────────────────────────────────
  const moveInInput = document.getElementById('gs-movein');
  if (moveInInput) {
    moveInInput.min = new Date().toISOString().split('T')[0];
  }

  // ── Date of birth: cap year to 4 digits, max = today ─────────────────────────
  const dobInput = document.getElementById('gs-dob');
  if (dobInput) {
    dobInput.max = new Date().toISOString().split('T')[0];
    dobInput.addEventListener('change', function () {
      if (!this.value) return;
      const parts = this.value.split('-');
      const year = parts[0];
      if (year.length > 4) {
        // Truncate to last 4 digits typed
        parts[0] = year.slice(-4);
        this.value = parts.join('-');
      }
    });
  }

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
      .map(cb => {
        const card = cb.closest('.gs-prop-card');
        const roomSelect = card ? card.querySelector('.gs-prop-type') : null;
        const roomVal = roomSelect && roomSelect.value ? ' \u2013 ' + roomSelect.value : '';
        return cb.value + roomVal;
      })
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

  // ── Upload preview ───────────────────────────────────────────────────────────

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function setupUploadPreview(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const label = document.querySelector('label[for="' + inputId + '"].gs-upload-label');
    if (!label) return;

    // Build a hidden preview row inside the label once, then show/update it on change
    const previewImg = document.createElement('img');
    previewImg.className = 'gs-upload-preview';
    previewImg.alt = '';
    previewImg.style.display = 'none';

    const fileRow = document.createElement('div');
    fileRow.className = 'gs-upload-file-row';
    fileRow.style.display = 'none';

    const fileIconEl = document.createElement('div');
    fileIconEl.className = 'gs-upload-file-icon';
    fileIconEl.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    const fileInfoEl = document.createElement('div');
    fileInfoEl.className = 'gs-upload-file-info';

    const fileNameEl = document.createElement('span');
    fileNameEl.className = 'gs-upload-filename';

    const fileSizeEl = document.createElement('span');
    fileSizeEl.className = 'gs-upload-filesize';

    const changeEl = document.createElement('span');
    changeEl.className = 'gs-upload-change';
    changeEl.textContent = 'Change file';

    fileInfoEl.appendChild(fileNameEl);
    fileInfoEl.appendChild(fileSizeEl);
    fileInfoEl.appendChild(changeEl);
    fileRow.appendChild(fileIconEl);
    fileRow.appendChild(fileInfoEl);

    label.appendChild(previewImg);
    label.appendChild(fileRow);

    input.addEventListener('change', function () {
      const file = input.files[0];
      if (!file) return;

      label.classList.remove('gs-field-error');
      label.classList.add('has-file');

      // Hide original label content (SVG icon + text spans)
      Array.from(label.children).forEach(function (child) {
        if (child !== previewImg && child !== fileRow) {
          child.style.display = 'none';
        }
      });

      // Always show file info immediately (synchronously) so UI confirms selection
      fileNameEl.textContent = file.name;
      fileNameEl.title = file.name;
      fileSizeEl.textContent = formatBytes(file.size);
      previewImg.style.display = 'none';
      fileIconEl.style.display = '';
      fileRow.style.display = 'flex';

      // Only attempt image preview for formats browsers can actually render
      const ext = file.name.split('.').pop().toLowerCase();
      const previewableExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const previewableType = file.type.startsWith('image/') &&
        file.type !== 'image/heic' && file.type !== 'image/heif';
      const canPreview = previewableType || previewableExts.indexOf(ext) !== -1;

      if (canPreview) {
        try {
          const reader = new FileReader();
          reader.onload = function (e) {
            previewImg.src = e.target.result;
            previewImg.alt = 'Preview: ' + file.name;
            previewImg.style.display = 'block';
            fileIconEl.style.display = 'none';
          };
          reader.onerror = function () {
            // Preview failed — file info row already visible, so nothing to do
          };
          reader.readAsDataURL(file);
        } catch (err) {
          // FileReader not available — file info row already visible
        }
      }
    });
  }

  setupUploadPreview('gs-enrolment-upload');
  setupUploadPreview('gs-id-upload');

  // ── Init ─────────────────────────────────────────────────────────────────────

  showCurrentStep();
});
