// X-BOT ADMIN CONTROL CENTER
// Firebase Authentication + Realtime Database
// Existing license records and bot_code are preserved.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  push,
  update
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

import { firebaseConfig } from "./firebase-config.js";

const ADMIN_UID = "g03XiiH3vwarVSwWf9hYxj99tcJ2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const nav = document.querySelector(".sidebar nav");

let records = {};
let currentPage = "overview";

const reservedKeys = new Set([
  "clients",
  "admin_logs",
  "bot_code",
  "bot_config"
]);

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

function dateNow() {
  return new Date().toISOString();
}

function makeKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "XGC-";

  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);

    for (let i = 0; i < bytes.length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 12; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

function licenseEntries() {
  return Object.entries(records).filter(function ([key, value]) {
    return (
      !reservedKeys.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, "client_name") &&
      Object.prototype.hasOwnProperty.call(value, "is_active")
    );
  });
}

function clientEntries() {
  const clients = records.clients || {};

  return Object.entries(clients).filter(function ([key, value]) {
    return value && typeof value === "object";
  });
}

function clientNames() {
  const names = new Set();

  clientEntries().forEach(function ([key, client]) {
    if (client.name) names.add(client.name);
  });

  licenseEntries().forEach(function ([key, license]) {
    if (license.client_name) names.add(license.client_name);
  });

  return Array.from(names).sort();
}

async function loadRecords() {
  const snapshot = await get(ref(db));

  records = snapshot.exists() ? snapshot.val() : {};

  if (!records || typeof records !== "object") {
    records = {};
  }

  return records;
}

async function addLog(action, details) {
  try {
    await push(ref(db, "admin_logs"), {
      action: action,
      details: details || "",
      admin: auth.currentUser ? auth.currentUser.email : "unknown",
      timestamp: dateNow()
    });
  } catch (error) {
    console.error("Log error:", error);
  }
}

function showLogin(message = "") {
  if (nav) {
    nav.innerHTML = "";
  }

  pageTitle.textContent = "Administrator Login";

  content.innerHTML = `
    <div class="panel" style="max-width:480px;margin:40px auto;padding:28px;">
      <h2 style="margin-top:0;">X Administrator</h2>
      <p style="color:#9aa8bd;">Secure administrator sign in</p>

      <form id="loginForm">
        <label>Email Address</label>
        <input
          id="loginEmail"
          type="email"
          placeholder="Admin email"
          autocomplete="username"
          required
        >

        <label>Password</label>
        <input
          id="loginPassword"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          required
        >

        <button type="submit" style="width:100%;margin:12px 0;">
          SIGN IN
        </button>
      </form>

      <p id="loginMessage" style="color:#ff7777;">
        ${safe(message)}
      </p>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const output = document.getElementById("loginMessage");

    output.textContent = "Signing in...";

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      if (result.user.uid !== ADMIN_UID) {
        await signOut(auth);
        output.textContent = "Access denied. This account is not the authorized administrator.";
      }
    } catch (error) {
      output.textContent = error.message;
    }
  });
}

const pages = [
  ["overview", "Dashboard"],
  ["clients", "Clients"],
  ["licenses", "Licenses"],
  ["devices", "Devices"],
  ["logs", "Activity Logs"],
  ["settings", "Settings"]
];

function buildNavigation() {
  nav.innerHTML = pages.map(function ([id, label]) {
    return `
      <button
        type="button"
        data-page="${id}"
        style="display:block;width:100%;text-align:left;margin:5px 0;padding:13px;"
      >
        ${safe(label)}
      </button>
    `;
  }).join("") + `
    <button
      type="button"
      id="logoutButton"
      style="display:block;width:100%;text-align:left;margin-top:25px;background:#8b3030;"
    >
      LOG OUT
    </button>
  `;

  nav.querySelectorAll("[data-page]").forEach(function (button) {
    button.addEventListener("click", function () {
      showPage(button.dataset.page);
    });
  });

  document.getElementById("logoutButton").addEventListener("click", async function () {
    await signOut(auth);
  });
}

function statusLabel(active) {
  return active
    ? '<span style="color:#4ade80;">● Active</span>'
    : '<span style="color:#ff7777;">● Blocked</span>';
}

function panel(contentHTML) {
  return `
    <div class="panel" style="
      padding:20px;
      margin:12px 0;
      border:1px solid #29374b;
      border-radius:10px;
      background:#101a29;
    ">
      ${contentHTML}
    </div>
  `;
}

function overviewPage() {
  const licenses = licenseEntries();
  const clients = clientNames();
  const active = licenses.filter(function ([key, item]) {
    return item.is_active === true;
  }).length;

  const blocked = licenses.length - active;

  const deviceCount = licenses.filter(function ([key, item]) {
    return item.device_id || item.bound_device;
  }).length;

  return `
    <h2>Administrator Dashboard</h2>
    <p style="color:#9aa8bd;">Live Firebase database overview</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;">
      ${panel(`<h3>${clients.length}</h3><p>Total Clients</p>`)}
      ${panel(`<h3>${licenses.length}</h3><p>Total Licenses</p>`)}
      ${panel(`<h3 style="color:#4ade80;">${active}</h3><p>Active Licenses</p>`)}
      ${panel(`<h3 style="color:#ff7777;">${blocked}</h3><p>Blocked Licenses</p>`)}
      ${panel(`<h3>${deviceCount}</h3><p>Bound Devices</p>`)}
    </div>

    ${panel(`
      <h3>Recent License Records</h3>
      ${licenses.slice(-5).reverse().map(function ([key, item]) {
        return `
          <div style="padding:12px 0;border-bottom:1px solid #29374b;">
            <strong>${safe(item.client_name)}</strong>
            <p>${safe(key)}</p>
            ${statusLabel(item.is_active)}
          </div>
        `;
      }).join("") || "<p>No license records found.</p>"}
    `)}

    <button id="refreshDashboard">REFRESH DATA</button>
  `;
}

function clientsPage() {
  const clients = clientEntries();

  return `
    <h2>Client Management</h2>
    <p>Add and manage your clients.</p>

    ${panel(`
      <h3>Add New Client</h3>

      <form id="clientForm">
        <input
          id="clientName"
          type="text"
          placeholder="Enter client name"
          required
        >
        <button type="submit">ADD CLIENT</button>
      </form>
    `)}

    ${panel(`
      <h3>Client List</h3>

      ${clients.map(function ([key, client]) {
        return `
          <div style="padding:12px 0;border-bottom:1px solid #29374b;">
            <strong>${safe(client.name || "Unnamed client")}</strong>
            <p>Created: ${safe(client.created_at || "Unknown")}</p>
          </div>
        `;
      }).join("") || "<p>No separately registered clients yet.</p>"}
    `)}
  `;
}

function licensesPage() {
  const licenses = licenseEntries();
  const names = clientNames();

  const options = names.map(function (name) {
    return `<option value="${safe(name)}">${safe(name)}</option>`;
  }).join("");

  return `
    <h2>License Management</h2>

    ${panel(`
      <h3>Create License</h3>

      <form id="licenseForm">
        <label>Client</label>
        <select id="licenseClient" required>
          <option value="">Select client</option>
          ${options}
        </select>

        <label>License Key</label>
        <input id="licenseKey" type="text" placeholder="Leave blank to generate">

        <label>Device ID (optional)</label>
        <input id="licenseDevice" type="text" placeholder="Device ID">

        <label>Expiry Date</label>
        <input id="licenseExpiry" type="date" required>

        <button type="button" id="generateKey">GENERATE KEY</button>
        <button type="submit">CREATE LICENSE</button>
      </form>
    `)}

    ${panel(`
      <h3>All Licenses (${licenses.length})</h3>

      ${licenses.slice().reverse().map(function ([key, item]) {
        return `
          <div style="padding:15px 0;border-bottom:1px solid #29374b;">
            <strong>${safe(item.client_name)}</strong>
            <p>Key: ${safe(key)}</p>
            <p>Device: ${safe(item.device_id || item.bound_device || "Not bound")}</p>
            <p>Expiry: ${safe(item.expiry_date || "Not set")}</p>
            <p>${statusLabel(item.is_active)}</p>

            <button
              type="button"
              data-toggle-license="${safe(key)}"
              data-next="${item.is_active === true ? "false" : "true"}"
              style="background:${item.is_active === true ? "#8b3030" : "#187044"};"
            >
              ${item.is_active === true ? "BLOCK LICENSE" : "ACTIVATE LICENSE"}
            </button>
          </div>
        `;
      }).join("") || "<p>No licenses found.</p>"}
    `)}
  `;
}

function devicesPage() {
  const licenses = licenseEntries();

  return `
    <h2>Device Management</h2>
    <p>Devices associated with license records.</p>

    ${panel(licenses.map(function ([key, item]) {
      return `
        <div style="padding:13px 0;border-bottom:1px solid #29374b;">
          <strong>${safe(item.client_name)}</strong>
          <p>License: ${safe(key)}</p>
          <p>Device ID: ${safe(item.device_id || item.bound_device || "Not bound")}</p>
          ${statusLabel(item.is_active)}
        </div>
      `;
    }).join("") || "<p>No device records found.</p>")}
  `;
}

function logsPage() {
  const logs = records.admin_logs || {};
  const entries = Object.entries(logs).reverse();

  return `
    <h2>Activity Logs</h2>

    ${panel(entries.map(function ([key, log]) {
      return `
        <div style="padding:12px 0;border-bottom:1px solid #29374b;">
          <strong>${safe(log.action || "Activity")}</strong>
          <p>${safe(log.details || "")}</p>
          <p>${safe(log.admin || "")}</p>
          <small>${safe(log.timestamp || "")}</small>
        </div>
      `;
    }).join("") || "<p>No activity logs yet.</p>")}
  `;
}

function settingsPage() {
  return `
    <h2>Settings</h2>

    ${panel(`
      <h3>Firebase Connection</h3>
      <p style="color:#4ade80;">Connected to Firebase Realtime Database</p>
      <p>Project: ${safe(firebaseConfig.projectId)}</p>
      <p>Database: ${safe(firebaseConfig.databaseURL)}</p>
    `)}

    ${panel(`
      <h3>Administrator Account</h3>
      <p>${safe(auth.currentUser ? auth.currentUser.email : "Not signed in")}</p>
      <p>Admin UID: ${safe(ADMIN_UID)}</p>
    `)}

    ${panel(`
      <h3>Security Notice</h3>
      <p>Database security rules must be secured before this panel is used in production.</p>
      <p>Do not change the current rules until the existing browser bot's license validation has been migrated to a secure server-side validation system.</p>
    `)}
  `;
}

async function showPage(page) {
  currentPage = page;

  const pageInfo = pages.find(function (item) {
    return item[0] === page;
  });

  pageTitle.textContent = pageInfo ? pageInfo[1] : "Dashboard";
  content.innerHTML = '<div class="panel">Loading data...</div>';

  try {
    await loadRecords();

    if (page === "overview") {
      content.innerHTML = overviewPage();
    } else if (page === "clients") {
      content.innerHTML = clientsPage();
    } else if (page === "licenses") {
      content.innerHTML = licensesPage();
    } else if (page === "devices") {
      content.innerHTML = devicesPage();
    } else if (page === "logs") {
      content.innerHTML = logsPage();
    } else if (page === "settings") {
      content.innerHTML = settingsPage();
    } else {
      content.innerHTML = overviewPage();
    }

    connectPageActions();

  } catch (error) {
    content.innerHTML = panel(`
      <h3 style="color:#ff7777;">Database Error</h3>
      <p>${safe(error.message)}</p>
      <button id="retryPage">RETRY</button>
    `);

    document.getElementById("retryPage").addEventListener("click", function () {
      showPage(currentPage);
    });
  }
}

function connectPageActions() {
  const refresh = document.getElementById("refreshDashboard");

  if (refresh) {
    refresh.addEventListener("click", function () {
      showPage("overview");
    });
  }

  const clientForm = document.getElementById("clientForm");

  if (clientForm) {
    clientForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const name = document.getElementById("clientName").value.trim();

      if (!name) return;

      try {
        const clientRef = push(ref(db, "clients"));

        await set(clientRef, {
          name: name,
          created_at: dateNow()
        });

        await addLog("Client Created", name);

        alert("Client added successfully.");
        showPage("clients");

      } catch (error) {
        alert("Client creation failed: " + error.message);
      }
    });
  }

  const generateButton = document.getElementById("generateKey");

  if (generateButton) {
    generateButton.addEventListener("click", function () {
      document.getElementById("licenseKey").value = makeKey();
    });
  }

  const licenseForm = document.getElementById("licenseForm");

  if (licenseForm) {
    licenseForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const clientName = document.getElementById("licenseClient").value.trim();
      const key = (
        document.getElementById("licenseKey").value.trim() || makeKey()
      ).toUpperCase();

      const device = document.getElementById("licenseDevice").value.trim();
      const expiry = document.getElementById("licenseExpiry").value;

      if (!clientName || !expiry) {
        alert("Select a client and expiry date.");
        return;
      }

      if (!/^[A-Z0-9_-]+$/.test(key)) {
        alert("License key can contain only letters, numbers, hyphens and underscores.");
        return;
      }

      if (new Date(expiry + "T23:59:59") < new Date()) {
        alert("Expiry date must be today or a future date.");
        return;
      }

      try {
        const existing = await get(ref(db, key));

        if (existing.exists()) {
          alert("This license key already exists.");
          return;
        }

        await set(ref(db, key), {
          client_name: clientName,
          device_id: device,
          bound_device: device,
          expiry_date: expiry,
          is_active: true,
          created_at: dateNow()
        });

        await addLog("License Created", key + " for " + clientName);

        alert("License created successfully.");
        showPage("licenses");

      } catch (error) {
        alert("License creation failed: " + error.message);
      }
    });
  }

  content.querySelectorAll("[data-toggle-license]").forEach(function (button) {
    button.addEventListener("click", async function () {
      const key = button.dataset.toggleLicense;
      const nextActive = button.dataset.next === "true";

      const action = nextActive ? "activate" : "block";

      if (!confirm("Are you sure you want to " + action + " this license?")) {
        return;
      }

      try {
        await update(ref(db, key), {
          is_active: nextActive
        });

        await addLog(
          nextActive ? "License Activated" : "License Blocked",
          key
        );

        showPage("licenses");

      } catch (error) {
        alert("License update failed: " + error.message);
      }
    });
  });
}

function openDashboard() {
  buildNavigation();
  showPage("overview");
}

onAuthStateChanged(auth, async function (user) {
  if (!user) {
    showLogin();
    return;
  }

  if (user.uid !== ADMIN_UID) {
    await signOut(auth);
    showLogin("Access denied. Unauthorized administrator account.");
    return;
  }

  openDashboard();
});
