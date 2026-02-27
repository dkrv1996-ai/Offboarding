// Simple Offboarding Workflow Controller
// Stages: HR -> Manager -> Finance -> IT -> Admin -> Final HR -> Completed

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentStep: 0, // 0-New, 1-Manager, 2-Finance, 3-IT, 4-Admin, 5-HR Final, 6-Completed
    data: {}
  };

  const steps = [
    'new',       // 0
    'manager',   // 1
    'finance',   // 2
    'it',        // 3
    'admin',     // 4
    'hr-final',  // 5
    'completed'  // 6
  ];

  // Helpers
  const $ = (sel) => document.querySelector(sel);
  const show = (el) => { el && (el.hidden = false); };
  const hide = (el) => { el && (el.hidden = true); };

  const sectionManager = document.querySelector('[data-role="manager"]');
  const sectionFinance = document.querySelector('[data-role="finance"]');
  const sectionIT = document.querySelector('[data-role="it"]');
  const sectionAdmin = document.querySelector('[data-role="admin"]');
  const sectionHRFinal = document.querySelector('[data-role="hr-final"]');

  const allRoleSections = [sectionManager, sectionFinance, sectionIT, sectionAdmin, sectionHRFinal];

  function updateProgress() {
    const items = Array.from($('#statusProgress').querySelectorAll('li'));
    items.forEach((li, idx) => {
      li.classList.remove('done', 'current', 'pending');
      if (idx < state.currentStep) li.classList.add('done');
      else if (idx === state.currentStep) li.classList.add('current');
      else li.classList.add('pending');
    });
  }

  function goToStep(stepIndex) {
    state.currentStep = stepIndex;
    // Hide all role sections then show the current one (if any)
    allRoleSections.forEach(hide);
    switch (steps[stepIndex]) {
      case 'manager': show(sectionManager); break;
      case 'finance': show(sectionFinance); break;
      case 'it':      show(sectionIT);      break;
      case 'admin':   show(sectionAdmin);   break;
      case 'hr-final':show(sectionHRFinal); break;
      case 'completed':
        toast('✅ Offboarding flow completed.');
        break;
    }
    updateProgress();
  }

  function toast(msg, targetSelector) {
    if (targetSelector) {
      const node = $(targetSelector);
      if (node) node.textContent = msg;
    } else {
      console.log(msg);
    }
  }

  function mailto(to, subject, body) {
    if (!to) return;
    const s = encodeURIComponent(subject || '');
    const b = encodeURIComponent(body || '');
    const href = `mailto:${to}?subject=${s}&body=${b}`;
    window.open(href, '_blank');
  }

  // --- HR Form Submit ---
  $('#offboardingForm').addEventListener('submit', (e) => {
    e.preventDefault();

    // Grab HR form data
    const d = {
      employeeName: $('#employeeName').value.trim(),
      employeeId: $('#employeeId').value.trim(),
      department: $('#department').value.trim(),
      jobTitle: $('#jobTitle').value.trim(),
      lastWorkingDay: $('#lastWorkingDay').value,
      reason: $('#reason').value,
      lineManagerEmail: $('#lineManager').value.trim(),
      assets: $('#assets').value.trim(),
      comments: $('#comments').value.trim(),
      createdAt: new Date().toISOString()
    };

    // Basic validation
    const requiredKeys = ['employeeName', 'employeeId', 'department', 'jobTitle', 'lastWorkingDay', 'reason', 'lineManagerEmail'];
    const missing = requiredKeys.filter(k => !d[k]);
    if (missing.length) {
      $('#formMsg').textContent = `Please fill required fields: ${missing.join(', ')}`;
      return;
    }

    state.data = d;

    // Lock HR form (make read-only)
    Array.from($('#offboardingForm').elements).forEach(el => el.disabled = true);
    $('#formMsg').textContent = '✔ Request created. Sent to Line Manager for approval.';
    
    // Notify Line Manager
    mailto(
      d.lineManagerEmail,
      `Offboarding Approval Needed: ${d.employeeName} (${d.employeeId})`,
      [
        `Dear Manager,`,
        ``,
        `An offboarding request requires your approval.`,
        ``,
        `Employee: ${d.employeeName} (${d.employeeId})`,
        `Department: ${d.department}`,
        `Job Title: ${d.jobTitle}`,
        `Last Working Day: ${d.lastWorkingDay}`,
        `Reason: ${d.reason}`,
        ``,
        `Assets (if any): ${d.assets || 'N/A'}`,
        ``,
        `Comments: ${d.comments || 'N/A'}`,
        ``,
        `Please review and approve in the workflow tool.`,
      ].join('\n')
    );

    // Move to Manager step
    goToStep(1);
  });

  // --- Manager Approve/Reject ---
  $('#btnManagerApprove').addEventListener('click', () => {
    const mgrComments = $('#managerComments').value.trim();
    if (!mgrComments) {
      toast('Manager comments are required.', '#managerMsg');
      return;
    }
    state.data.managerComments = mgrComments;
    toast('✔ Manager approved. Moving to Finance.', '#managerMsg');
    goToStep(2);
  });

  $('#btnManagerReject').addEventListener('click', () => {
    const mgrComments = $('#managerComments').value.trim();
    state.data.managerComments = mgrComments || '(No comments)';
    toast('❌ Rejected by Manager. Flow stopped.', '#managerMsg');
    goToStep(6);
  });

  // --- Finance Approve/Reject ---
  $('#btnFinanceApprove').addEventListener('click', () => {
    const financeEmail = $('#financeApproverEmail').value.trim();
    const pendingSalary = $('#pendingSalary').value.trim();
    const recoveryAmount = $('#recoveryAmount').value;
    const finalSettlement = $('#finalSettlement').value;
    const financeComments = $('#financeComments').value.trim();

    if (!financeEmail || !pendingSalary || !recoveryAmount || !finalSettlement || !financeComments) {
      toast('Please complete all required fields.', '#financeMsg');
      return;
    }

    Object.assign(state.data, {
      financeEmail,
      pendingSalary,
      recoveryAmount,
      finalSettlement,
      financeComments
    });

    toast('✔ Finance approved. Moving to IT.', '#financeMsg');

    // Pre-notify IT if IT email already filled (optional)
    const itEmailNow = $('#itApproverEmail')?.value.trim();
    if (itEmailNow) {
      mailto(
        itEmailNow,
        `IT Offboarding Actions Required: ${state.data.employeeName} (${state.data.employeeId})`,
        [
          `Dear IT,`,
          ``,
          `Please complete offboarding actions for the employee.`,
          ``,
          `Employee: ${state.data.employeeName} (${state.data.employeeId})`,
          `Last Working Day: ${state.data.lastWorkingDay}`,
          ``,
          `Finance Notes:`,
          `- Pending Salary/Dues: ${pendingSalary}`,
          `- Recovery Amount: ₹${recoveryAmount}`,
          `- Final Settlement Completed: ${finalSettlement}`,
          `- Comments: ${financeComments}`,
        ].join('\n')
      );
    }

    goToStep(3);
  });

  $('#btnFinanceReject').addEventListener('click', () => {
    toast('❌ Rejected by Finance. Flow stopped.', '#financeMsg');
    goToStep(6);
  });

  // --- IT Approve/Reject ---
  $('#btnITApprove').addEventListener('click', () => {
    const itEmail = $('#itApproverEmail').value.trim();
    const laptopReturned = $('#laptopReturned').value;
    const emailDisabled = $('#emailDisabled').value;
    const vpnDisabled = $('#vpnDisabled').value;
    const otherSystems = $('#otherSystems').value.trim();
    const itComments = $('#itComments').value.trim();

    if (!itEmail || !laptopReturned || !emailDisabled || !vpnDisabled || !itComments) {
      toast('Please complete all required fields.', '#itMsg');
      return;
    }

    Object.assign(state.data, {
      itEmail,
      laptopReturned,
      emailDisabled,
      vpnDisabled,
      otherSystems,
      itComments
    });

    toast('✔ IT approved. Moving to Admin.', '#itMsg');

    // Pre-notify Admin if Admin email already filled
    const adminEmailNow = $('#adminApproverEmail')?.value.trim();
    if (adminEmailNow) {
      mailto(
        adminEmailNow,
        `Admin Offboarding Actions Required: ${state.data.employeeName} (${state.data.employeeId})`,
        [
          `Dear Admin,`,
          ``,
          `Please complete admin offboarding steps.`,
          ``,
          `Employee: ${state.data.employeeName} (${state.data.employeeId})`,
          `Last Working Day: ${state.data.lastWorkingDay}`,
          ``,
          `IT Notes:`,
          `- Laptop Returned: ${laptopReturned}`,
          `- Email Access Disabled: ${emailDisabled}`,
          `- VPN Access Disabled: ${vpnDisabled}`,
          `- Other Systems: ${otherSystems || 'N/A'}`,
          `- IT Comments: ${itComments}`,
        ].join('\n')
      );
    }

    goToStep(4);
  });

  $('#btnITReject').addEventListener('click', () => {
    toast('❌ Rejected by IT. Flow stopped.', '#itMsg');
    goToStep(6);
  });

  // --- Admin Approve/Reject ---
  $('#btnAdminApprove').addEventListener('click', () => {
    const adminEmail = $('#adminApproverEmail').value.trim();
    const idCardReturned = $('#idCardReturned').value;
    const parkingDisabled = $('#parkingDisabled').value;
    const deskCleared = $('#deskCleared').value;
    const adminComments = $('#adminComments').value.trim();

    if (!adminEmail || !idCardReturned || !parkingDisabled || !deskCleared || !adminComments) {
      toast('Please complete all required fields.', '#adminMsg');
      return;
    }

    Object.assign(state.data, {
      adminEmail,
      idCardReturned,
      parkingDisabled,
      deskCleared,
      adminComments
    });

    toast('✔ Admin approved. Moving to Final HR.', '#adminMsg');

    // Pre-notify Final HR if email already filled
    const hrFinalEmailNow = $('#hrFinalApproverEmail')?.value.trim();
    if (hrFinalEmailNow) {
      mailto(
        hrFinalEmailNow,
        `Final HR Closure Needed: ${state.data.employeeName} (${state.data.employeeId})`,
        [
          `Dear HR,`,
          ``,
          `Please complete final HR steps and close the offboarding.`,
          ``,
          `Employee: ${state.data.employeeName} (${state.data.employeeId})`,
          `Last Working Day: ${state.data.lastWorkingDay}`,
          ``,
          `Admin Notes:`,
          `- ID Card Returned: ${idCardReturned}`,
          `- Parking Access Disabled: ${parkingDisabled}`,
          `- Desk Cleared: ${deskCleared}`,
          `- Admin Comments: ${adminComments}`,
        ].join('\n')
      );
    }

    goToStep(5);
  });

  $('#btnAdminReject').addEventListener('click', () => {
    toast('❌ Rejected by Admin. Flow stopped.', '#adminMsg');
    goToStep(6);
  });

  // --- Final HR Approve/Reject ---
  $('#btnHRFinalApprove').addEventListener('click', () => {
    const hrFinalEmail = $('#hrFinalApproverEmail').value.trim();
    const expLetter = $('#expLetter').value;
    const exitInterview = $('#exitInterview').value;
    const finalHrComments = $('#finalHrComments').value.trim();

    if (!hrFinalEmail || !expLetter || !exitInterview || !finalHrComments) {
      toast('Please complete all required fields.', '#hrFinalMsg');
      return;
    }

    Object.assign(state.data, {
      hrFinalEmail,
      expLetter,
      exitInterview,
      finalHrComments,
      closedAt: new Date().toISOString()
    });

    toast('🎉 Offboarding completed successfully.', '#hrFinalMsg');

    // Optional FYI email to HR/Manager
    mailto(
      state.data.lineManagerEmail,
      `Offboarding Completed: ${state.data.employeeName} (${state.data.employeeId})`,
      [
        `Hello,`,
        ``,
        `The offboarding request has been completed.`,
        ``,
        `Employee: ${state.data.employeeName} (${state.data.employeeId})`,
        `Department: ${state.data.department}`,
        `Job Title: ${state.data.jobTitle}`,
        `Last Working Day: ${state.data.lastWorkingDay}`,
        `Reason: ${state.data.reason}`,
        ``,
        `Final HR:`,
        `- Experience Letter Issued: ${expLetter}`,
        `- Exit Interview Completed: ${exitInterview}`,
        `- Comments: ${finalHrComments}`,
        ``,
        `Closed At: ${new Date().toLocaleString()}`
      ].join('\n')
    );

    goToStep(6);
  });

  $('#btnHRFinalReject').addEventListener('click', () => {
    toast('❌ Rejected by Final HR. Flow stopped.', '#hrFinalMsg');
    goToStep(6);
  });

  // Initialize
  updateProgress();
  // Start hidden sections (already hidden in HTML)
});
