// Clockify BILD-AI: browser side

const $ = (selector) => document.querySelector(selector);

let running = null;   // the entry whose timer is running, or null
let ticker = null;    // interval that updates the timer display
let entries = [];     // finished entries, newest first

// ---------- Small helpers ----------

async function api(method, url, body) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

const pad = (n) => String(n).padStart(2, "0");

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dateKey(d) === dateKey(today)) return "Today";
  if (dateKey(d) === dateKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// "9", "930", "9:30", "09.30" -> { h: 9, m: 30 }
function parseTime(text) {
  const match = text.trim().match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2] || 0);
  return h < 24 && m < 60 ? { h, m } : null;
}

function showMessage(text) {
  const box = $("#message");
  box.textContent = text;
  box.hidden = false;
  clearTimeout(showMessage.timeout);
  showMessage.timeout = setTimeout(() => (box.hidden = true), 6000);
}

// ---------- Projects ----------

async function loadProjects() {
  const projects = await api("GET", "/api/projects");
  $("#project-list").replaceChildren(...projects.map((p) => el("option", { value: p.name })));
}

// ---------- Timer ----------

function renderTimer() {
  const button = $("#timer-button");
  if (running) {
    const elapsed = formatDuration(Date.now() - new Date(running.start_at));
    $("#timer-display").textContent = elapsed;
    document.title = `${elapsed} · Clockify BILD-AI`;
    button.textContent = "Stop";
    button.classList.add("stop");
  } else {
    $("#timer-display").textContent = "0:00:00";
    document.title = "Clockify BILD-AI";
    button.textContent = "Start";
    button.classList.remove("stop");
  }
}

function setRunning(entry) {
  running = entry;
  clearInterval(ticker);
  if (running) ticker = setInterval(renderTimer, 1000);
  renderTimer();
}

async function loadTimer() {
  const entry = await api("GET", "/api/timer");
  if (entry) {
    $("#timer-description").value = entry.description;
    $("#timer-project").value = entry.project || "";
  }
  setRunning(entry);
}

async function toggleTimer() {
  const body = { description: $("#timer-description").value, project: $("#timer-project").value };
  try {
    if (running) {
      await api("POST", "/api/timer/stop", body);
      setRunning(null);
      $("#timer-description").value = "";
      $("#timer-project").value = "";
      await loadEntries();
    } else {
      setRunning(await api("POST", "/api/timer/start", body));
    }
    await loadProjects();
  } catch (err) {
    showMessage(err.message);
    await loadTimer();
  }
}

// ---------- Add / edit form ----------

// Builds the form. `entry` is null when adding time manually.
function buildEntryForm(entry, onDone) {
  const form = $("#entry-form-template").content.firstElementChild.cloneNode(true);
  const f = form.elements;

  if (entry) {
    const start = new Date(entry.start_at);
    const end = new Date(entry.end_at);
    f.description.value = entry.description;
    f.project.value = entry.project || "";
    f.date.value = dateKey(start);
    f.start.value = formatTime(start);
    f.end.value = formatTime(end);
  } else {
    f.date.value = dateKey(new Date());
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const start = parseTime(f.start.value);
    const end = parseTime(f.end.value);
    if (!f.date.value || !start || !end) {
      showMessage("Please enter times as HH:MM, for example 09:00 or 17:30.");
      return;
    }
    const [y, mo, d] = f.date.value.split("-").map(Number);
    const startAt = new Date(y, mo - 1, d, start.h, start.m);
    const endAt = new Date(y, mo - 1, d, end.h, end.m);
    if (endAt < startAt) endAt.setDate(endAt.getDate() + 1); // past midnight

    const body = {
      description: f.description.value,
      project: f.project.value,
      start: startAt.toISOString(),
      end: endAt.toISOString(),
    };
    try {
      if (entry) await api("PUT", `/api/entries/${entry.id}`, body);
      else await api("POST", "/api/entries", body);
      onDone();
      await Promise.all([loadEntries(), loadProjects()]);
    } catch (err) {
      showMessage(err.message);
    }
  });

  form.querySelector(".cancel").addEventListener("click", () => {
    onDone();
    renderEntries();
  });
  return form;
}

function toggleManualForm() {
  const container = $("#manual-container");
  if (container.firstChild) {
    container.replaceChildren();
    return;
  }
  const form = buildEntryForm(null, () => container.replaceChildren());
  container.append(form);
  form.elements.description.focus();
}

// ---------- Entries list ----------

async function loadEntries() {
  entries = await api("GET", "/api/entries");
  renderEntries();
}

function entryRow(entry) {
  const start = new Date(entry.start_at);
  const end = new Date(entry.end_at);

  const editButton = el("button", { className: "link", textContent: "Edit" });
  const deleteButton = el("button", { className: "link danger", textContent: "Delete" });

  const row = el("div", { className: "entry" },
    el("span", {
      className: entry.description ? "desc" : "desc empty",
      textContent: entry.description || "(no description)",
    }),
    el("span", { className: "project" },
      el("span", { className: "dot", style: `background:${entry.color || "transparent"}` }),
      entry.project || ""),
    el("span", { className: "times", textContent: `${formatTime(start)} – ${formatTime(end)}` }),
    el("span", { className: "dur", textContent: formatDuration(end - start) }),
    editButton,
    deleteButton);

  editButton.addEventListener("click", () => {
    const form = buildEntryForm(entry, () => {});
    row.replaceWith(form);
    form.elements.description.focus();
  });

  deleteButton.addEventListener("click", async () => {
    const name = entry.description || "this entry";
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api("DELETE", `/api/entries/${entry.id}`);
      await loadEntries();
    } catch (err) {
      showMessage(err.message);
    }
  });

  return row;
}

function renderEntries() {
  const container = $("#entries");
  if (entries.length === 0) {
    container.replaceChildren(el("p", {
      className: "empty-state",
      textContent: "No time entries yet. Start the timer or add time manually.",
    }));
    return;
  }

  // Group by local day, keeping newest first
  const days = new Map();
  for (const entry of entries) {
    const key = dateKey(new Date(entry.start_at));
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(entry);
  }

  const sections = [];
  for (const dayEntries of days.values()) {
    const total = dayEntries.reduce((sum, e) => sum + (new Date(e.end_at) - new Date(e.start_at)), 0);
    sections.push(el("section", { className: "card entries-day" },
      el("div", { className: "day-header" },
        el("span", { textContent: dayLabel(new Date(dayEntries[0].start_at)) }),
        el("span", {}, "Total: ", el("strong", { textContent: formatDuration(total) }))),
      ...dayEntries.map(entryRow)));
  }
  container.replaceChildren(...sections);
}

// ---------- Spreadsheet download ----------

function setDefaultExportRange() {
  // This week, Monday to Sunday
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  $("#export-from").value = dateKey(monday);
  $("#export-to").value = dateKey(sunday);
}

function downloadSpreadsheet(event) {
  event.preventDefault();
  const from = $("#export-from").value;
  const to = $("#export-to").value;
  if (to < from) {
    showMessage("The 'To' date must be on or after the 'From' date.");
    return;
  }
  window.location = `/export.xlsx?from=${from}&to=${to}`;
}

// ---------- Start ----------

$("#timer-button").addEventListener("click", toggleTimer);
$("#manual-toggle").addEventListener("click", toggleManualForm);
$("#export-form").addEventListener("submit", downloadSpreadsheet);
for (const id of ["#timer-description", "#timer-project"]) {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !running) toggleTimer();
  });
}

setDefaultExportRange();
Promise.all([loadProjects(), loadEntries(), loadTimer()])
  .catch((err) => showMessage("Could not load your data: " + err.message));
