
import { firebaseConfig } from "./firebase-config.js";

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
  update,
  push
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const ADMIN_UID = "g03XiiH3vwarVSwWf9hYxj99tcJ2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");

let records = {};
let currentPage = "overview";

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  }[c]));
}

function loginScreen(message = "") {
  document.body.innerHTML = `
    <main style="max-width:420px;margin:70px auto;padding:25px;background:#141f30;border-radius:14px;color:white;font-family:Arial">
      <h2>𝕏 ADMIN LOGIN</h2>
      <p>Administrator Control Center</p>
      <input id="email" type="email" placeholder="Admin Email"
        style="width:100%;padding:13px;margin:10px 0">
      <input id="password" type="password" placeholder="Password"
        style="width:100%;padding:13px;margin:10px 0">
      <button id="loginBtn" style="width:100%;padding:13px;margin-top:10px">
        LOGIN
      </button>
      <p id="loginMessage">${safe(message)}</p>
    </main>`;

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("loginMessage");

    if (!email || !password) {
      msg.textContent = "Email और Password भरें";
      return;
    }

    msg.textContent = "Logging in...";

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      msg.textContent = error.message;
    }
  };
}

function dashboardScreen() {
  document.body.innerHTML = `
    <aside class="sidebar">
      <div class="brand">𝕏 ADMIN <small>CONTROL CENTER</small></div>
      <nav>
        <button data-page="overview">Overview</button>
        <button data-page="clients">Clients</button>
        <button data-page="licenses">Licenses</button>
        <button data-page="devices">Devices</button>
        <button data-page="accounts">X Accounts</button>
        <button data-page="composer">Post Composer</button>
        <button data-page="schedule">Posts & Schedule</button>
        <button data-page="ads">Ads Campaigns</button>
        <button data-page="logs">Activity Logs</button>
        <button data-page="settings">Settings</button>
        <button id="logoutBtn">Logout</button>
      </nav>
    </aside>
    <main>
      <header>
        <h1 id="pageTitle">Overview</h1>
        <span>● FIREBASE CONNECTED</span>
      </header>
      <div id="content"></div>
    </main>`;

  document.querySelectorAll("[data-page]").forEach(button => {
    button.onclick = () => showPage(button.dataset.page);
  });

  document.getElementById("logoutBtn").onclick = () => signOut(auth);

  showPage("overview");
}

async function loadRecords() {
  const snapshot = await get(ref(db));
  records = snapshot.exists() ? snapshot.val() : {};
}

function licenseEntries() {
  return Object.entries(records).filter(([key, value]) =>
    value && typeof value === "object" &&
    "client_name" in value &&
    "is_active" in value
  );
}

function showPage(page) {
  currentPage = page;
  pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);

  const licenses = licenseEntries();

  if (page === "overview") {
    content.innerHTML = `
      <div class="stats">
        <div class="stat">TOTAL CLIENTS<b>${new Set(licenses.map(x=>x[1].client_name)).size}</b></div>
        <div class="stat">LICENSES<b>${licenses.length}</b></div>
        <div class="stat">DEVICES<b>${licenses.filter(x=>x[1].device_id).length}</b></div>
        <div class="stat">ACTIVE LICENSES<b>${licenses.filter(x=>x[1].is_active === true).length}</b></div>
      </div>
      <div class="panel">
        <h2>Administrator Dashboard</h2>
        <p>Firebase Realtime Database connected.</p>
        <p>Existing license records are preserved.</p>
      </div>`;
  }

  if (page === "clients") {
    const clients = [...new Set(licenses.map(x=>x[1].client_name))];
    content.innerHTML = `
      <div class="panel">
        <h2>Client Management</h2>
        <input id="clientName" placeholder="Client name">
        <button id="addClient">Add Client</button>
      </div>
      <div class="panel">
        <h3>Existing Clients</h3>
        ${clients.map(x=>`<p>${safe(x)}</p>`).join("") || "No clients"}
      </div>`;

    document.getElementById("addClient").onclick = () => {
      const name = document.getElementById("clientName").value.trim();
      if (!name) return alert("Client name डालें");
      showPage("licenses");
      document.getElementById("clientName")?.remove();
      alert("अब Licenses में इस Client के लिए License बनाएं।");
    };
  }

  if (page === "licenses") {
    const clients = [...new Set(licenses.map(x=>x[1].client_name))];

    content.innerHTML = `
      <div class="panel">
        <h2>Create License</h2>
        <input id="newClient" placeholder="Client name">
        <input id="newKey" placeholder="License key (optional)">
        <input id="newDevice" placeholder="Device ID (optional)">
        <input id="newExpiry" type="date">
        <button id="createLicense">Create License</button>
      </div>
      <div class="panel">
        <h2>Existing Licenses</h2>
        ${licenses.map(([key,x])=>`
          <div style="padding:12px;border-bottom:1px solid #39465b">
            <b>${safe(key)}</b>
            <p>Client: ${safe(x.client_name)}</p>
            <p>Device: ${safe(x.device_id || "Not bound")}</p>
            <p>Expiry: ${safe(x.expiry_date || "Not set")}</p>
            <p>Status: ${x.is_active ? "Active" : "Blocked"}</p>
            <button data-toggle="${safe(key)}" data-active="${!x.is_active}">
              ${x.is_active ? "Block" : "Activate"}
            </button>
          </div>`).join("")}
      </div>`;

    document.getElementById("createLicense").onclick = async () => {
      const client = document.getElementById("newClient").value.trim();
      const expiry = document.getElementById("newExpiry").value;
      let key = document.getElementById("newKey").value.trim();
      const device = document.getElementById("newDevice").value.trim();

      if (!client || !expiry) return alert("Client और expiry date जरूरी हैं");

      if (!key) key = "XGC-" + crypto.randomUUID().slice(0,8).toUpperCase();
      if (records[key]) return alert("यह License key पहले से मौजूद है");

      try {
        await set(ref(db, key), {
          client_name: client,
          device_id: device,
          bound_device: device,
          expiry_date: expiry,
          is_active: true
        });
        await addLog("Created license " + key);
        await refresh();
        alert("License created: " + key);
      } catch (e) {
        alert("Firebase error: " + e.message);
      }
    };

    document.querySelectorAll("[data-toggle]").forEach(button => {
      button.onclick = async () => {
        const key = button.dataset.toggle;
        try {
          await update(ref(db, key), {
            is_active: button.dataset.active === "true"
          });
          await addLog("Changed license status: " + key);
          await refresh();
        } catch (e) {
          alert(e.message);
        }
      };
    });
  }

  if (page === "devices") {
    content.innerHTML = `
      <div class="panel"><h2>Registered Devices</h2>
      ${licenses.map(([key,x])=>`
        <p>${safe(x.client_name)} | ${safe(x.device_id || "Not registered")} | ${safe(key)}</p>
      `).join("") || "No devices"}
      </div>`;
  }

  if (page === "logs") {
    content.innerHTML = `<div class="panel"><h2>Activity Logs</h2><p>Admin activity records are stored in Firebase.</p></div>`;
  }

  if (page === "accounts") {
    content.innerHTML = `<div class="panel"><h2>X Accounts</h2><p>X OAuth connection is not configured.</p></div>`;
  }

  if (page === "composer") {
    content.innerHTML = `<div class="panel"><h2>Post Composer</h2><textarea id="draft" placeholder="Write post"></textarea><p>Draft only. Publishing is not connected.</p></div>`;
  }

  if (page === "schedule") {
    content.innerHTML = `<div class="panel"><h2>Posts & Schedule</h2><p>Scheduling is not connected.</p></div>`;
  }

  if (page === "ads") {
    content.innerHTML = `<div class="panel"><h2>Ads Campaigns</h2><p>Ads API is not connected.</p></div>`;
  }

  if (page === "settings") {
    content.innerHTML = `<div class="panel"><h2>Administrator Settings</h2><p>Firebase project: x-admin-panel</p><p>Admin UID restricted in this interface.</p></div>`;
  }
}

async function addLog(action) {
  await set(push(ref(db, "admin_logs")), {
    action,
    time: new Date().toISOString()
  });
}

async function refresh() {
  await loadRecords();
  showPage(currentPage);
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    loginScreen();
    return;
  }

  if (user.uid !== ADMIN_UID) {
    await signOut(auth);
    loginScreen("This account is not an authorized administrator.");
    return;
  }

  try {
    await loadRecords();
    dashboardScreen();
  } catch (error) {
    loginScreen("Firebase database error: " + error.message);
  }
});
