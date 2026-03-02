const data = JSON.parse(localStorage.getItem("offboardingPrint"));

p_employeeName.textContent = data.hr.name;
p_employeeId.textContent = data.hr.id;
p_department.textContent = data.hr.department;
p_jobTitle.textContent = data.hr.jobTitle;
p_lwd.textContent = data.hr.lwd;
p_reason.textContent = data.hr.reason;
p_assets.textContent = data.hr.assets;
p_hr_comments.textContent = data.hr.comments;

p_mgr_email.textContent = data.manager.email;
p_mgr_status.textContent = data.manager.status;
p_mgr_comments.textContent = data.manager.comments;

p_fin_email.textContent = data.finance.email;
p_fin_salary.textContent = data.finance.salary;
p_fin_recovery.textContent = data.finance.recovery;
p_fin_status.textContent = data.finance.status;
p_fin_comments.textContent = data.finance.comments;

p_it_laptop.textContent = data.it.laptop;
p_it_emailDisabled.textContent = data.it.emailDisabled;
p_it_vpn.textContent = data.it.vpn;
p_it_other.textContent = data.it.other;
p_it_status.textContent = data.it.status;
p_it_comments.textContent = data.it.comments;

p_admin_idcard.textContent = data.admin.idcard;
p_admin_parking.textContent = data.admin.parking;
p_admin_desk.textContent = data.admin.desk;
p_admin_status.textContent = data.admin.status;
p_admin_comments.textContent = data.admin.comments;

p_hr_exp.textContent = data.finalHr.exp;
p_hr_exit.textContent = data.finalHr.exit;
p_hr_final_status.textContent = data.finalHr.status;
p_hr_final_comments.textContent = data.finalHr.comments;

window.print();
