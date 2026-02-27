// ====== CONFIG ======
// Point this to your Azure Function (or API Gateway) that creates issues.
const API_BASE = "https://<your-azure-function-app>.azurewebsites.net/api";
const CREATE_ENDPOINT = `${API_BASE}/offboarding/create`;

// Optional: gate role sections (client-side only; enforce on server too)
const ROLE_EMAIL_MAP = {
  manager:   [/^.+@yourcompany\.com$/i], // refine with exact emails later
  finance:   [/^finance-.+@yourcompany\.com$/i, /^fin\./i],
  it:        [/^it-.+@yourcompany\.com$/i, /^it\./i],
  admin:     [/^admin-.+@yourcompany\.com$/i],
  "hr-final":[/^hr-.+@yourcompany\.com$/i, /^hr\./i]
};

// ====== HELPERS ======
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function setProgress(activeIndex) {
  const items = qsa("#statusProgress li");
  items.forEach((li, i) => li.classList.toggle("active", i <= activeIndex));
}

// Show/hide role cards (for preview/testing on this page)
function showRole(role) {
  qsa(".role-only").forEach(sec => {
    sec.style.display = (sec.dataset.role === role) ? "block" : "none";
  });
}

function collectHrPayload(form) {
  const data = new FormData(form);
  const obj = Object.fromEntries(data.entries());
  return {
    type: "offboarding",
    status: "status: New",
    request: {
      employeeName: obj.employeeName?.trim(),
      employeeId: obj.employeeId?.trim(),
      department: obj.department?.trim(),
      jobTitle: obj.jobTitle?.trim(),
      lastWorkingDay: obj.lastWorkingDay,
      reason: obj.reason,
      assets: obj.assets?.trim() || "",
      comments: obj.comments?.trim() || "",

      managerEmail: obj.managerEmail?.trim(),
      financeEmail: obj.financeEmail?.trim(),
      itEmail: obj.itEmail?.trim(),
      adminEmail: obj.adminEmail?.trim(),
      hrFinalEmail: obj.hrFinalEmail?.trim()
    }
  };
}

async function createOffboarding(payload) {
  const res = await fetch(CREATE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  // Initialise visual progress
  setProgress(0);
  showRole("manager"); // for preview; change as needed

  const form = qs("#offboardingForm");
  const msg = qs("#formMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Creating request…";
    try {
      // Basic HR validation
      const required = ["#employeeName","#employeeId","#department","#jobTitle","#lastWorkingDay","#reason","#lineManager"];
      for (const sel of required) {
        const el = qs(sel);
        if (!el.value || (el.type === "select-one" && el.value === "")) {
          el.focus();
          throw new Error("Please fill all required fields.");
        }
      }

      const payload = collectHrPayload(form);
      const result = await createOffboarding(payload);

      msg.textContent = `Request created: #${result.issueNumber}. Emails sent for Line Manager approval.`;
      msg.classList.remove("muted");
      setProgress(1);
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = `Error: ${err.message}`;
      msg.classList.remove("muted");
    }
  });
});