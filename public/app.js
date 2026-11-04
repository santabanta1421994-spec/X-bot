
const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");

const data = {
  clients: [],
  licenses: [],
  devices: [],
  logs: []
};

function log(action) {
  data.logs.unshift({
    time: new Date().toLocaleString(),
    action
  });
}

function showPage(page) {
  pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);

  const pages = {
    overview: `
      <div class="stats">
        <div class="stat">TOTAL CLIENTS<b>${data.clients.length}</b></div>
        <div class="stat">LICENSES<b>${data.licenses.length}</b></div>
        <div class="stat">DEVICES<b>${data.devices.length}</b></div>
        <div class="stat">ACTIVE LICENSES<b>${data.licenses.filter(x=>x.active).length}</b></div>
      </div>
      <div class="panel">
        <h2>Administrator Dashboard</h2>
        <p>Welcome to X Administrator Control Center.</p>
        <p>Manage clients, licenses and devices from the sidebar.</p>
      </div>
    `,

    clients: `
      <div class="panel">
        <h2>Client Management</h2>
        <input id="clientName" placeholder="Enter client name">
        <button onclick="addClient()">Add Client</button>
      </div>
      <div class="panel" id="clientList"></div>
    `,

    licenses: `
      <div class="panel">
        <h2>License Management</h2>
        <select id="licenseClient">
          ${data.clients.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}
        </select>
        <input id="expiry" type="date">
        <button onclick="addLicense()">Generate License</button>
      </div>
      <div class="panel" id="licenseList"></div>
    `,

    devices: `
      <div class="panel">
        <h2>Device Management</h2>
        <div id="deviceList">No connected devices.</div>
      </div>
    `,

    accounts: `<div class="panel"><h2>X Accounts</h2><p>OAuth connection is not configured yet.</p></div>`,

    composer: `
      <div class="panel">
        <h2>Post Composer</h2>
        <textarea id="postText" placeholder="Write your post"></textarea>
        <p>Draft only. X publishing is not connected.</p>
        <button onclick="saveDraft()">Save Draft</button>
      </div>
    `,

    schedule: `<div class="panel"><h2>Posts & Schedule</h2><p>Scheduling module is not connected.</p></div>`,

    ads: `<div class="panel"><h2>Ads Campaigns</h2><p>Campaign API is not connected.</p></div>`,

    logs: `
      <div class="panel">
        <h2>Activity Logs</h2>
        <div id="logList"></div>
      </div>
    `,

    settings: `
      <div class="panel">
        <h2>Administrator Settings</h2>
        <p>Panel version: 1.0</p>
        <p>System: X Administrator</p>
        <p>Storage: Browser memory (temporary)</p>
      </div>
    `
  };

  content.innerHTML = pages[page] || pages.overview;

  if(page==="clients") renderClients();
  if(page==="licenses") renderLicenses();
  if(page==="devices") renderDevices();
  if(page==="logs") renderLogs();
}

function addClient() {
  const input = document.getElementById("clientName");
  const name = input.value.trim();
  if(!name) return alert("Enter client name");

  data.clients.push({
    id: "CL-" + Date.now(),
    name
  });

  log("New client created: " + name);
  showPage("clients");
}

function renderClients() {
  document.getElementById("clientList").innerHTML =
    data.clients.map(x=>`<p>${x.id} | ${x.name}</p>`).join("") || "No clients yet.";
}

function addLicense() {
  const client = document.getElementById("licenseClient").value;
  const expiry = document.getElementById("expiry").value;

  if(!client || !expiry) return alert("Select client and expiry date");

  const key = "XGC-" + Math.random().toString(36).slice(2,10).toUpperCase();

  data.licenses.push({
    key,
    client,
    expiry,
    active: true
  });

  log("License generated: " + key);
  showPage("licenses");
}

function renderLicenses() {
  document.getElementById("licenseList").innerHTML =
    data.licenses.map(x=>`<p>${x.key} | ${x.expiry} | Active</p>`).join("") || "No licenses yet.";
}

function renderDevices() {
  document.getElementById("deviceList").innerHTML =
    data.devices.map(x=>`<p>${x.id} | ${x.name}</p>`).join("") || "No connected devices.";
}

function renderLogs() {
  document.getElementById("logList").innerHTML =
    data.logs.map(x=>`<p>${x.time} | ${x.action}</p>`).join("") || "No activity yet.";
}

function saveDraft() {
  const text = document.getElementById("postText").value.trim();
  if(!text) return alert("Write something first");
  log("Post draft saved");
  alert("Draft saved in current session.");
}

showPage("overview");
