const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let toastTimer;

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast show${isError ? " error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = "toast", 3500);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed. Please try again.");
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function formatDate(value) {
  if (!value) return "—";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function visitorRow(v, withCheckoutColumn = false) {
  const checkedIn = v.status === "checked_in";
  const initials = String(v.visitor_name || "V").trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  return `<tr>
    <td><div class="visitor-cell"><div class="visitor-avatar">${escapeHtml(initials)}</div><div class="visitor-info"><b>${escapeHtml(v.visitor_name)}</b><small>${escapeHtml(v.phone)}</small></div></div></td>
    <td><div class="flat-cell"><b>${escapeHtml(v.flat_number)}</b><small>${escapeHtml(v.block_name || "")}</small></div></td>
    <td>${escapeHtml(v.purpose)}</td>
    <td>${formatDate(v.check_in)}</td>
    ${withCheckoutColumn ? `<td>${formatDate(v.check_out)}</td>` : ""}
    <td><span class="status-badge ${checkedIn ? "inside" : "outside"}">${checkedIn ? "Inside" : "Checked out"}</span></td>
    <td>${checkedIn ? `<button class="action-button" data-checkout="${Number(v.id)}">Check out ↗</button>` : `<span style="color:#a0abb5">Completed</span>`}</td>
  </tr>`;
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="empty-cell">${escapeHtml(message)}</td></tr>`;
}

async function loadFlats() {
  const select = $("#flatSelect");
  try {
    const flats = await api("/api/flats");
    select.innerHTML = '<option value="">Select apartment flat</option>' + flats.map(flat =>
      `<option value="${Number(flat.id)}">${escapeHtml(flat.flat_number)} — ${escapeHtml(flat.block_name)}</option>`
    ).join("");
    if (!flats.length) select.innerHTML = '<option value="">No flats found — add flats in MySQL</option>';
  } catch (error) {
    select.innerHTML = '<option value="">Could not load flats</option>';
    showToast(error.message, true);
  }
}

async function loadStats() {
  const stats = await api("/api/stats");
  $("#totalStat").textContent = stats.total;
  $("#insideStat").textContent = stats.insideNow;
  $("#todayStat").textContent = stats.visitsToday;
  $("#departedStat").textContent = stats.checkedOutToday;
}

async function loadVisitors(target = "dashboard") {
  const search = target === "records" ? $("#recordsSearch").value : $("#dashboardSearch").value;
  const status = target === "records" ? $("#statusFilter").value : "";
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const visitors = await api(`/api/visitors?${params.toString()}`);
  if (target === "dashboard") {
    const recent = visitors.slice(0, 7);
    $("#recentRows").innerHTML = recent.length ? recent.map(v => visitorRow(v)).join("") : emptyRow(6, "No visitor records found. Register your first visitor.");
    $("#dashboardCount").textContent = `${visitors.length} result${visitors.length === 1 ? "" : "s"}`;
  } else {
    $("#allRows").innerHTML = visitors.length ? visitors.map(v => visitorRow(v, true)).join("") : emptyRow(7, "No visitor records match your search.");
  }
}

async function refreshAll() {
  try {
    await Promise.all([loadStats(), loadVisitors("dashboard"), loadVisitors("records")]);
  } catch (error) {
    showToast(error.message, true);
    $("#recentRows").innerHTML = emptyRow(6, "Cannot load records. Check your database connection.");
    $("#allRows").innerHTML = emptyRow(7, "Cannot load records. Check your database connection.");
  }
}

function showSection(name) {
  const names = ["dashboard", "visitors", "register"];
  names.forEach(n => $(`#${n}Section`).classList.toggle("hidden", n !== name));
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.section === name));
  $("#crumb").textContent = name === "dashboard" ? "Dashboard" : name === "visitors" ? "Visitor records" : "Register visitor";
  $("#sidebar").classList.remove("open");
  if (name === "visitors") loadVisitors("records").catch(e => showToast(e.message, true));
  if (name === "dashboard") refreshAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach(button => button.addEventListener("click", () => showSection(button.dataset.section)));
$("#heroRegister").addEventListener("click", () => showSection("register"));
$("#recordsRegister").addEventListener("click", () => showSection("register"));
$("#viewAll").addEventListener("click", () => showSection("visitors"));
$("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#refreshBtn").addEventListener("click", refreshAll);

let dashboardSearchTimer, recordsSearchTimer;
$("#dashboardSearch").addEventListener("input", () => {
  clearTimeout(dashboardSearchTimer);
  dashboardSearchTimer = setTimeout(() => loadVisitors("dashboard").catch(e => showToast(e.message, true)), 250);
});
$("#recordsSearch").addEventListener("input", () => {
  clearTimeout(recordsSearchTimer);
  recordsSearchTimer = setTimeout(() => loadVisitors("records").catch(e => showToast(e.message, true)), 250);
});
$("#statusFilter").addEventListener("change", () => loadVisitors("records").catch(e => showToast(e.message, true)));

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-checkout]");
  if (!button) return;
  if (!confirm("Check this visitor out now?")) return;
  button.disabled = true;
  try {
    const result = await api(`/api/visitors/${button.dataset.checkout}/checkout`, { method: "PATCH", body: "{}" });
    showToast(result.message);
    await refreshAll();
  } catch (error) {
    showToast(error.message, true);
    button.disabled = false;
  }
});

$("#visitorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#submitVisitor");
  const data = Object.fromEntries(new FormData(form).entries());
  data.flat_id = Number(data.flat_id);
  button.disabled = true;
  button.textContent = "Saving visitor…";
  try {
    const result = await api("/api/visitors", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    await loadFlats();
    await refreshAll();
    showToast(`${result.message} Record #${result.id}`);
    showSection("dashboard");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Save & check in <span>→</span>';
  }
});

$("#todayLabel").textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
$("#year").textContent = new Date().getFullYear();

(async function init() {
  try {
    const health = await api("/api/health");
    if (!health.ok) throw new Error("Database is not connected.");
    await Promise.all([loadFlats(), refreshAll()]);
  } catch (error) {
    showToast(error.message, true);
    $("#recentRows").innerHTML = emptyRow(6, "Database connection failed. Follow README.md to configure MySQL.");
    $("#allRows").innerHTML = emptyRow(7, "Database connection failed. Follow README.md to configure MySQL.");
    loadFlats();
  }
})();
