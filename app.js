/* Offboarding Workflow + Dashboard (No external apps, no mailto)
   Storage: localStorage.offboardingRequests = JSON.stringify([...])
   Request model:
   {
     id, createdAt, updatedAt,
     status: 'new'|'in-progress'|'completed'|'rejected',
     currentStep: 0..6,
     data: {...form fields & approvals...},
     history: [{at, by, action, notes}]
   }
*/
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Helpers ----------
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const nowISO = () => new Date().toISOString();
  const fmtDT  = iso => new Date(iso).toLocaleString();

  function uid() { return 'REQ-' + Date.now(); }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem('offboardingRequests') || '[]'); }
    catch { return []; }
  }
  function saveAll(list) {
    localStorage.setItem('offboardingRequests', JSON.stringify(list));
  }
  function saveOne(rec) {
    const list = loadAll();
    const idx = list.findIndex(x => x.id === rec.id);
    if (idx >= 0) list[idx] = rec; else list.unshift(rec);
    saveAll(list);
  }
  function deleteOne(id) {
    const list = loadAll().filter(x => x.id !== id);
    saveAll(list);
  }
  function getOne(id) {
    return loadAll().find(x => x.id === id) || null;
  }

  // ---------- Views (New vs Dashboard) ----------
  const navNew = $('#navNew');
  const navDash = $('#navDashboard');
  const viewNew = $('#view-new');
  const viewDashboard = $('#view-dashboard');
  const printPanel = $('#printPanel');

  function showNewView() {
    viewNew.hidden = false;
    viewDashboard.hidden = true;
    navNew.classList.add('active');
    navDash.classList.remove('active');
  }
  function showDashboardView() {
    viewNew.hidden = true;
    viewDashboard.hidden = false;
    navDash.classList.add('active');
    navNew.classList.remove('active');
    renderTable();
  }

  navNew.addEventListener('click', showNewView);
  navDash.addEventListener('click', showDashboardView);
  $('#btnNewFromDashboard')?.addEventListener('click', showNewView);

  // ---------- Status / Steps ----------
  const steps = ['new','manager','finance','it','admin','hr-final','completed'];
  const stepLabels = [
    'New',
    'Pending Line Manager Approval',
    'Pending Finance Approval',
    'Pending IT Approval',
    'Pending Admin Approval',
    'Pending Final HR Approval',
    'Completed'
  ];

  function updateProgress(currentStep) {
    const items = $$('#statusProgress li');
    items.forEach((li, idx) => {
      li.classList.remove('done','current','pending');
      if (idx < currentStep) li.classList.add('done');
      else if (idx === currentStep) li.classList.add('current');
      else li.classList.add('pending');
    });
  }

  // ---------- Current Working Record in UI ----------
  let currentRecord = null;

  function resetWorkflowUI() {
    // Hide all role sections
    $$('.role-only').forEach(sec => sec.hidden = true);
    // Hide print panel
    if (printPanel) printPanel.hidden = true;
    // Clear messages
    ['#managerMsg','#financeMsg','#itMsg','#adminMsg','#hrFinalMsg','#formMsg']
      .forEach(sel => { const el = $(sel); if (el) el.textContent = ''; });
    // Reset form enabled
    Array.from($('#offboardingForm').elements).forEach(el => el.disabled = false);
  }

  function clearHRForm() {
    $('#offboardingForm').reset();
    Array.from($('#offboardingForm').elements).forEach(el => el.disabled = false);
    $('#formMsg').textContent = '';
    updateProgress(0);
  }

  function populateApproverLabels(rec) {
    $('#labelManagerEmail').textContent   = rec?.data?.lineManagerEmail || '';
    $('#labelFinanceEmail').textContent   = rec?.data?.financeApproverEmail || '';
    $('#labelITEmail').textContent        = rec?.data?.itApproverEmail || '';
    $('#labelAdminEmail').textContent     = rec?.data?.adminApproverEmail || '';
    $('#labelHRFinalEmail').textContent   = rec?.data?.hrFinalApproverEmail || '';
  }

  function goToStep(stepIndex) {
    if (!currentRecord) return;
    currentRecord.currentStep = stepIndex;
    currentRecord.updatedAt = nowISO();
    currentRecord.status = (stepIndex >= 6)
      ? (currentRecord.status === 'rejected' ? 'rejected' : 'completed')
      : 'in-progress';
    saveOne(currentRecord);

    // Hide all role sections
    $$('.role-only').forEach(sec => sec.hidden = true);
    // Show correct section or print panel
    switch (steps[stepIndex]) {
      case 'manager':  $('[data-role="manager"]').hidden = false; break;
      case 'finance':  $('[data-role="finance"]').hidden = false; break;
      case 'it':       $('[data-role="it"]').hidden = false; break;
      case 'admin':    $('[data-role="admin"]').hidden = false; break;
      case 'hr-final': $('[data-role="hr-final"]').hidden = false; break;
      case 'completed':
        if (printPanel) {
          printPanel.hidden = false;
          printPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      default: break;
    }

    updateProgress(stepIndex);
    renderTable(); // keep dashboard live
  }

  function openRecord(rec) {
    currentRecord = rec;
    // Fill HR form and lock (read-only view when opening an existing request)
    $('#employeeName').value = rec.data.employeeName;
    $('#employeeId').value = rec.data.employeeId;
    $('#department').value = rec.data.department;
    $('#jobTitle').value = rec.data.jobTitle;
    $('#lastWorkingDay').value = rec.data.lastWorkingDay;
    $('#reason').value = rec.data.reason;
    $('#lineManager').value = rec.data.lineManagerEmail;
    $('#financeApproverEmail').value = rec.data.financeApproverEmail;
    $('#itApproverEmail').value = rec.data.itApproverEmail;
    $('#adminApproverEmail').value = rec.data.adminApproverEmail;
    $('#hrFinalApproverEmail').value = rec.data.hrFinalApproverEmail;
    $('#assets').value = rec.data.assets || '';
    $('#comments').value = rec.data.comments || '';

    // Lock HR section (view-only after creation)
    Array.from($('#offboardingForm').elements).forEach(el => el.disabled = true);
    $('#formMsg').textContent = `Request ${rec.id} | Created: ${fmtDT(rec.createdAt)} | Status: ${rec.status} | Stage: ${stepLabels[rec.currentStep]}`;

    populateApproverLabels(rec);
    updateProgress(rec.currentStep);

    // Show appropriate section or print panel
    $$('.role-only').forEach(sec => sec.hidden = true);
    if (steps[rec.currentStep] === 'completed' || rec.status === 'completed' || rec.status === 'rejected') {
      if (printPanel) printPanel.hidden = false;
    } else {
      switch (steps[rec.currentStep]) {
        case 'manager':  $('[data-role="manager"]').hidden = false; break;
        case 'finance':  $('[data-role="finance"]').hidden = false; break;
        case 'it':       $('[data-role="it"]').hidden = false; break;
        case 'admin':    $('[data-role="admin"]').hidden = false; break;
        case 'hr-final': $('[data-role="hr-final"]').hidden = false; break;
      }
    }

    showNewView();
  }

  // ---------- HR Form Submit (Create Request) ----------
  $('#offboardingForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const d = {
      employeeName: $('#employeeName').value.trim(),
      employeeId: $('#employeeId').value.trim(),
      department: $('#department').value.trim(),
      jobTitle: $('#jobTitle').value.trim(),
      lastWorkingDay: $('#lastWorkingDay').value,
      reason: $('#reason').value,
      lineManagerEmail: $('#lineManager').value.trim(),
      financeApproverEmail: $('#financeApproverEmail').value.trim(),
      itApproverEmail: $('#itApproverEmail').value.trim(),
      adminApproverEmail: $('#adminApproverEmail').value.trim(),
      hrFinalApproverEmail: $('#hrFinalApproverEmail').value.trim(),
      assets: $('#assets').value.trim(),
      comments: $('#comments').value.trim()
    };

    // Validate required
    const requiredKeys = [
      'employeeName','employeeId','department','jobTitle',
      'lastWorkingDay','reason','lineManagerEmail',
      'financeApproverEmail','itApproverEmail','adminApproverEmail','hrFinalApproverEmail'
    ];
    const missing = requiredKeys.filter(k => !d[k]);
    if (missing.length) {
      $('#formMsg').textContent = `Please fill required fields: ${missing.join(', ')}`;
      return;
    }

    const rec = {
      id: uid(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      status: 'in-progress',
      currentStep: 1, // Move to Manager after creation
      data: d,
      history: [
        { at: nowISO(), by: 'HR', action: 'Created', notes: d.comments || '' }
      ]
    };

    saveOne(rec);
    resetWorkflowUI(); // ensures clean state
    currentRecord = rec;
    $('#formMsg').textContent = `✔ Request ${rec.id} created. Sent to Line Manager stage.`;
    populateApproverLabels(rec);
    // Lock HR form
    Array.from($('#offboardingForm').elements).forEach(el => el.disabled = true);
    goToStep(1);
  });

  // ---------- Approvals ----------
  function addHistory(by, action, notes) {
    currentRecord.history.push({ at: nowISO(), by, action, notes });
    currentRecord.updatedAt = nowISO();
  }

  // Manager
  $('#btnManagerApprove').addEventListener('click', () => {
    const notes = $('#managerComments').value.trim();
    if (!notes) { $('#managerMsg').textContent = 'Manager comments are required.'; return; }
    currentRecord.data.managerComments = notes;
    addHistory('Manager', 'Approved', notes);
    saveOne(currentRecord);
    $('#managerMsg').textContent = '✔ Manager approved. Moving to Finance.';
    goToStep(2);
  });
  $('#btnManagerReject').addEventListener('click', () => {
    const notes = $('#managerComments').value.trim() || '(No comments)';
    currentRecord.data.managerComments = notes;
    addHistory('Manager', 'Rejected', notes);
    currentRecord.status = 'rejected';
    saveOne(currentRecord);
    $('#managerMsg').textContent = '❌ Rejected by Manager. Flow stopped.';
    goToStep(6);
  });

  // Finance
  $('#btnFinanceApprove').addEventListener('click', () => {
    const pendingSalary = $('#pendingSalary').value.trim();
    const recoveryAmount = $('#recoveryAmount').value;
    const finalSettlement = $('#finalSettlement').value;
    const financeComments = $('#financeComments').value.trim();
    if (!pendingSalary || !recoveryAmount || !finalSettlement || !financeComments) {
      $('#financeMsg').textContent = 'Please complete all required fields.'; return;
    }
    Object.assign(currentRecord.data, { pendingSalary, recoveryAmount, finalSettlement, financeComments });
    addHistory('Finance', 'Approved', financeComments);
    saveOne(currentRecord);
    $('#financeMsg').textContent = '✔ Finance approved. Moving to IT.';
    goToStep(3);
  });
  $('#btnFinanceReject').addEventListener('click', () => {
    const financeComments = $('#financeComments').value.trim() || '(No comments)';
    Object.assign(currentRecord.data, { financeComments });
    addHistory('Finance', 'Rejected', financeComments);
    currentRecord.status = 'rejected';
    saveOne(currentRecord);
    $('#financeMsg').textContent = '❌ Rejected by Finance. Flow stopped.';
    goToStep(6);
  });

  // IT
  $('#btnITApprove').addEventListener('click', () => {
    const laptopReturned = $('#laptopReturned').value;
    const emailDisabled = $('#emailDisabled').value;
    const vpnDisabled = $('#vpnDisabled').value;
    const otherSystems = $('#otherSystems').value.trim();
    const itComments = $('#itComments').value.trim();
    if (!laptopReturned || !emailDisabled || !vpnDisabled || !itComments) {
      $('#itMsg').textContent = 'Please complete all required fields.'; return;
    }
    Object.assign(currentRecord.data, { laptopReturned, emailDisabled, vpnDisabled, otherSystems, itComments });
    addHistory('IT', 'Approved', itComments);
    saveOne(currentRecord);
    $('#itMsg').textContent = '✔ IT approved. Moving to Admin.';
    goToStep(4);
  });
  $('#btnITReject').addEventListener('click', () => {
    const itComments = $('#itComments').value.trim() || '(No comments)';
    Object.assign(currentRecord.data, { itComments });
    addHistory('IT', 'Rejected', itComments);
    currentRecord.status = 'rejected';
    saveOne(currentRecord);
    $('#itMsg').textContent = '❌ Rejected by IT. Flow stopped.';
    goToStep(6);
  });

  // Admin
  $('#btnAdminApprove').addEventListener('click', () => {
    const idCardReturned = $('#idCardReturned').value;
    const parkingDisabled = $('#parkingDisabled').value;
    const deskCleared = $('#deskCleared').value;
    const adminComments = $('#adminComments').value.trim();
    if (!idCardReturned || !parkingDisabled || !deskCleared || !adminComments) {
      $('#adminMsg').textContent = 'Please complete all required fields.'; return;
    }
    Object.assign(currentRecord.data, { idCardReturned, parkingDisabled, deskCleared, adminComments });
    addHistory('Admin', 'Approved', adminComments);
    saveOne(currentRecord);
    $('#adminMsg').textContent = '✔ Admin approved. Moving to Final HR.';
    goToStep(5);
  });
  $('#btnAdminReject').addEventListener('click', () => {
    const adminComments = $('#adminComments').value.trim() || '(No comments)';
    Object.assign(currentRecord.data, { adminComments });
    addHistory('Admin', 'Rejected', adminComments);
    currentRecord.status = 'rejected';
    saveOne(currentRecord);
    $('#adminMsg').textContent = '❌ Rejected by Admin. Flow stopped.';
    goToStep(6);
  });

  // Final HR
  $('#btnHRFinalApprove').addEventListener('click', () => {
    const expLetter = $('#expLetter').value;
    const exitInterview = $('#exitInterview').value;
    const finalHrComments = $('#finalHrComments').value.trim();
    if (!expLetter || !exitInterview || !finalHrComments) {
      $('#hrFinalMsg').textContent = 'Please complete all required fields.'; return;
    }
    Object.assign(currentRecord.data, { expLetter, exitInterview, finalHrComments, closedAt: nowISO() });
    addHistory('Final HR', 'Approved & Closed', finalHrComments);
    currentRecord.status = 'completed';
    saveOne(currentRecord);
    $('#hrFinalMsg').textContent = '🎉 Offboarding completed successfully.';
    goToStep(6); // this will show the print panel
  });
  $('#btnHRFinalReject').addEventListener('click', () => {
    const finalHrComments = $('#finalHrComments').value.trim() || '(No comments)';
    Object.assign(currentRecord.data, { finalHrComments });
    addHistory('Final HR', 'Rejected', finalHrComments);
    currentRecord.status = 'rejected';
    saveOne(currentRecord);
    $('#hrFinalMsg').textContent = '❌ Rejected by Final HR. Flow stopped.';
    goToStep(6); // also show print panel if you want to allow print on rejected
  });

  // ---------- Print Summary ----------
  $('#btnPrintSummary').addEventListener('click', () => {
    if (!currentRecord) return;
    const d = currentRecord.data;

    const P = (id) => document.getElementById(id);

    // Basic employee details
    P('p_id').textContent    = currentRecord.id;
    P('p_name').textContent  = d.employeeName || '';
    P('p_empid').textContent = d.employeeId || '';
    P('p_dept').textContent  = d.department || '';
    P('p_job').textContent   = d.jobTitle || '';
    P('p_lwd').textContent   = d.lastWorkingDay || '';
    P('p_reason').textContent= d.reason || '';

    // Manager
    P('p_mgr_email').textContent    = d.lineManagerEmail || '';
    P('p_mgr_comments').textContent = d.managerComments || '';
    P('p_mgr_status').textContent   = currentRecord.history.find(h => h.by === 'Manager')?.action || 'Pending';

    // Finance
    P('p_fin_email').textContent    = d.financeApproverEmail || '';
    P('p_fin_salary').textContent   = d.pendingSalary || '';
    P('p_fin_recovery').textContent = d.recoveryAmount || '';
    P('p_fin_comments').textContent = d.financeComments || '';
    P('p_fin_status').textContent   = currentRecord.history.find(h => h.by === 'Finance')?.action || 'Pending';

    // IT
    P('p_it_email').textContent     = d.itApproverEmail || '';
    P('p_it_laptop').textContent    = d.laptopReturned || '';
    P('p_it_mail').textContent      = d.emailDisabled || '';
    P('p_it_vpn').textContent       = d.vpnDisabled || '';
    P('p_it_other').textContent     = d.otherSystems || '';
    P('p_it_comments').textContent  = d.itComments || '';
    P('p_it_status').textContent    = currentRecord.history.find(h => h.by === 'IT')?.action || 'Pending';

    // Admin
    P('p_admin_email').textContent  = d.adminApproverEmail || '';
    P('p_admin_idcard').textContent = d.idCardReturned || '';
    P('p_admin_parking').textContent= d.parkingDisabled || '';
    P('p_admin_desk').textContent   = d.deskCleared || '';
    P('p_admin_comments').textContent= d.adminComments || '';
    P('p_admin_status').textContent = currentRecord.history.find(h => h.by === 'Admin')?.action || 'Pending';

    // Final HR
    P('p_hr_email').textContent     = d.hrFinalApproverEmail || '';
    P('p_hr_exp').textContent       = d.expLetter || '';
    P('p_hr_exit').textContent      = d.exitInterview || '';
    P('p_hr_comments').textContent  = d.finalHrComments || '';
    P('p_hr_status').textContent    = currentRecord.status || '';

    // History
    P('p_history').textContent = currentRecord.history
      .map(h => `${fmtDT(h.at)} | ${h.by}: ${h.action}\n${h.notes}`)
      .join("\n\n");

    window.print();
  });

  // ---------- Dashboard Table ----------
  const tbody = $('#requestsTable tbody');
  const searchBox = $('#searchBox');
  const statusFilter = $('#statusFilter');
  $('#btnRefresh').addEventListener('click', renderTable);
  searchBox.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  function stageFromStep(step) {
    return stepLabels[step] || '';
  }
  function isOpen(rec) {
    return rec.status === 'in-progress';
  }
  function isRejected(rec) {
    return rec.status === 'rejected';
  }
  function isCompleted(rec) {
    return rec.status === 'completed';
  }

  function renderTable() {
    const q = (searchBox.value || '').toLowerCase();
    const f = statusFilter.value; // all | open | completed | rejected
    const list = loadAll();

    const filtered = list.filter(rec => {
      const hit = (rec.data.employeeName.toLowerCase().includes(q) ||
                   rec.data.employeeId.toLowerCase().includes(q));
      if (!hit) return false;
      if (f === 'open' && !isOpen(rec)) return false;
      if (f === 'completed' && !isCompleted(rec)) return false;
      if (f === 'rejected' && !isRejected(rec)) return false;
      return true;
    });

    tbody.innerHTML = '';
    filtered.forEach(rec => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${rec.id}</td>
        <td>${rec.data.employeeName}</td>
        <td>${rec.data.department}</td>
        <td>${rec.data.lastWorkingDay}</td>
        <td>${stageFromStep(rec.currentStep)}</td>
        <td>
          <span class="pill ${rec.status}">
            ${rec.status}
          </span>
        </td>
        <td>${fmtDT(rec.updatedAt)}</td>
        <td>
          <button class="btn sm" data-open="${rec.id}">Open</button>
          <button class="btn sm danger" data-del="${rec.id}">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Wire "Open" buttons
  tbody.querySelectorAll('button[data-del]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-del');
    const rec = getOne(id);

    if (!rec) return;

    const ok = confirm(`Delete request ${id} for ${rec.data.employeeName}? This cannot be undone.`);
    if (!ok) return;

    // If you're deleting the currently opened record
    if (currentRecord && currentRecord.id === id) {
      currentRecord = null;
      resetWorkflowUI();
      document.getElementById('offboardingForm').reset();
    }

    deleteOne(id);
    renderTable();
  });
});

    // Wire "Delete" buttons
    tbody.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del');
        const rec = getOne(id);
        if (!rec) return;
        const ok = confirm(`Delete request ${id} for ${rec.data.employeeName}? This cannot be undone.`);
        if (!ok) return;

        // If deleting the currently opened record, clear context
        if (currentRecord && currentRecord.id === id) {
          currentRecord = null;
          clearHRForm();
          resetWorkflowUI();
        }

        deleteOne(id);
        renderTable();
      });
    });
  }

  // ---------- Initial UI ----------
  resetWorkflowUI();
  updateProgress(0);
  populateApproverLabels({});
  renderTable();
});


