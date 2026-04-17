/**
 * apply-submit.js
 * Submits the Grandspace application form to Supabase.
 * Uploads documents to Storage, inserts application + document records.
 */

document.addEventListener('DOMContentLoaded', function () {
  var SUPABASE_URL      = 'https://royqbympojdlgtszkemk.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveXFieW1wb2pkbGd0c3prZW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDgxNDEsImV4cCI6MjA5MTk4NDE0MX0.S2I6WP4LlJO_F3sXU6xZnTC4VNFOHrbxCG2wW7RscTA';

  var client    = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var formEl    = document.getElementById('gs-apply-form');
  var submitBtn = document.getElementById('gs-submit');
  var confirmEl = document.getElementById('gs-confirm');

  if (!formEl || !submitBtn) return;

  // Remove the placeholder action — submission is handled entirely via JS
  formEl.removeAttribute('action');

  // ── Error message element ──────────────────────────────────────────────────
  var errorMsg = document.createElement('p');
  errorMsg.id = 'gs-submit-error';
  errorMsg.style.cssText = 'color:#c0392b;font-size:0.82rem;margin-top:0.75rem;display:none;line-height:1.5;';
  errorMsg.textContent = 'There was a problem submitting your application. Please try again or email admin@grandspace.co.za directly.';
  submitBtn.parentNode.insertBefore(errorMsg, submitBtn.nextSibling);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function getFile(id) {
    var el = document.getElementById(id);
    return (el && el.files && el.files[0]) ? el.files[0] : null;
  }

  function getCheckedProperties() {
    return Array.from(document.querySelectorAll('input[name="gs-property"]:checked'))
      .map(function (cb) { return cb.value; });
  }

  async function uploadFile(file, folder, appId) {
    if (!file) return null;
    var ext    = file.name.split('.').pop();
    var path   = folder + '/' + appId + '/' + Date.now() + '.' + ext;
    var result = await client.storage
      .from('application-docs')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (result.error) throw new Error('File upload failed: ' + result.error.message);
    return { path: result.data.path, name: file.name };
  }

  // ── Submit handler ─────────────────────────────────────────────────────────

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    errorMsg.style.display = 'none';
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Submitting\u2026';

    try {
      var appId = crypto.randomUUID();

      // 1. Upload both documents to Storage
      var enrolmentResult = await uploadFile(getFile('gs-enrolment-upload'), 'enrolment', appId);
      var idResult        = await uploadFile(getFile('gs-id-upload'),        'identity',  appId);

      // 2. Insert the application record
      var appInsert = await client.from('applications').insert({
        id:                      appId,
        first_name:              val('gs-fname'),
        last_name:               val('gs-lname'),
        date_of_birth:           val('gs-dob')     || null,
        nationality:             val('gs-nationality'),
        phone:                   val('gs-phone'),
        email:                   val('gs-email'),
        institution:             val('gs-institution'),
        year_of_study:           val('gs-year'),
        id_document_path:        idResult        ? idResult.path        : null,
        enrolment_document_path: enrolmentResult ? enrolmentResult.path : null,
        property_preferences:    getCheckedProperties(),
        movein_date:             val('gs-movein') || null,
        lease_duration:          val('gs-lease'),
        status:                  'pending'
      });

      if (appInsert.error) throw new Error(appInsert.error.message);

      // 3. Insert document records
      var docs = [];
      if (enrolmentResult) docs.push({
        application_id: appId, file_type: 'enrolment',
        file_path: enrolmentResult.path, file_name: enrolmentResult.name
      });
      if (idResult) docs.push({
        application_id: appId, file_type: 'identity',
        file_path: idResult.path, file_name: idResult.name
      });
      if (docs.length) {
        var docsInsert = await client.from('documents').insert(docs);
        if (docsInsert.error) throw new Error(docsInsert.error.message);
      }

      showSuccess();

    } catch (err) {
      console.error('Submission error:', err);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Application';
      errorMsg.style.display = 'block';
      errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // ── Success screen ─────────────────────────────────────────────────────────

  function showSuccess() {
    formEl.style.display = 'none';
    var progressBar = document.querySelector('.gs-progress');
    if (progressBar) progressBar.style.display = 'none';
    if (confirmEl) {
      confirmEl.classList.add('gs-confirm--visible');
      confirmEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});
