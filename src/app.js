// src/app.js
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { endpoints } from "./data.js";
import {
  isValidMethod,
  isValidUrl,
  isValidStatusCode,
  isIdExist
} from "./validator.js";
import {
  createEndpoint,
  getAllEndpoints,
  getUnhealthyEndpoints,
  updateEndpointConfig,
  deleteEndpointById,
  pingSingleEndpoint,
  pingAllEndpoints,
  calculateSystemHealth
} from "./service.js";

const rl = readline.createInterface({ input, output });

// ANSI Styling & Palettes (Zero-dependency)
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  
  // Foreground Colors
  white: "\x1b[97m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  brightCyan: "\x1b[96m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  brightYellow: "\x1b[93m",
  red: "\x1b[31m",
  brightRed: "\x1b[91m",

  // Background Badges
  bgGreen: "\x1b[42m\x1b[30m\x1b[1m",
  bgRed: "\x1b[41m\x1b[97m\x1b[1m",
  bgYellow: "\x1b[43m\x1b[30m\x1b[1m",
  bgGray: "\x1b[100m\x1b[97m\x1b[1m",
  bgCyan: "\x1b[46m\x1b[30m\x1b[1m",
  bgBlue: "\x1b[44m\x1b[97m\x1b[1m"
};

const getMethodBadge = (method) => {
  switch (method) {
    case "GET":
      return `${C.brightGreen}[GET]${C.reset}   `;
    case "POST":
      return `${C.brightCyan}[POST]${C.reset}  `;
    case "PUT":
      return `${C.brightYellow}[PUT]${C.reset}   `;
    case "DELETE":
      return `${C.brightRed}[DELETE]${C.reset}`;
    default:
      return `${C.gray}[${method}]${C.reset} `;
  }
};

const getHealthBadge = (health) => {
  switch (health) {
    case "HEALTHY":
      return `${C.bgGreen} HEALTHY ${C.reset}`;
    case "DOWN":
      return `${C.bgYellow}  DOWN   ${C.reset}`;
    case "ERROR":
      return `${C.bgRed}  ERROR  ${C.reset}`;
    default:
      return `${C.bgGray} UNCHECK ${C.reset}`;
  }
};

const printBanner = () => {
  console.clear();
  console.log(`${C.brightCyan}  +==========================================================================+${C.reset}`);
  console.log(`${C.brightCyan}  |${C.white}${C.bold}    __     _______ _____ _____ ____      _    _   _   _____ _____ ____ _   _    ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.white}${C.bold}    \\ \\   / / ____|_   _| ____|  _ \\    / \\  | \\ | | |_   _| ____/ ___| | | |   ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.white}${C.bold}     \\ \\ / /|  _|   | | |  _| | |_) |  / _ \\ |  \\| |   | | |  _|| |   | |_| |   ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.white}${C.bold}      \\ V / | |___  | | | |___|  _ <  / ___ \\| |\\  |   | | | |__| |___|  _  |   ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.white}${C.bold}       \\_/  |_____| |_| |_____|_| \\_\\/_/   \\_\\_| \\_|   |_| |_____\\____|_| |_|   ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.yellow}${C.bold}              REAL-TIME BACKEND API & SLA HEALTH MONITOR                   ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  |${C.dim}              Pure Node.js Standard Library - Zero Dependencies             ${C.brightCyan}|${C.reset}`);
  console.log(`${C.brightCyan}  +==========================================================================+${C.reset}\n`);

  // System Status Summary Ribbon
  const m = calculateSystemHealth();
  const statusSummary = m.hasCriticalFailure
    ? `${C.bgRed} INCIDENT DETECTED ${C.reset} ${C.red}[!] Gangguan terdeteksi pada cluster target${C.reset}`
    : `${C.bgGreen} ALL SYSTEMS GO ${C.reset} ${C.green}[*] Seluruh cluster beroperasi normal (${m.uptimePercent} Uptime)${C.reset}`;

  console.log(`  ${C.bold}STATUS :${C.reset} ${statusSummary}`);
  console.log(`  ${C.bold}TARGET :${C.reset} ${C.brightCyan}${m.totalEndpoints} Registered${C.reset} | ${C.green}${m.healthyCount} Healthy${C.reset} | ${C.red}${m.downCount} Failing${C.reset} | ${C.gray}Avg Latency: ${m.avgLatencyMs}ms${C.reset}`);
  console.log(`${C.gray}  ----------------------------------------------------------------------------${C.reset}`);
};

const printMenu = () => {
  console.log(`  ${C.brightYellow}${C.bold}[+] OBSERVABILITY & LIVE TESTING${C.reset}`);
  console.log(`    ${C.brightCyan}[1]${C.reset} ${C.white}Run Full Cluster Ping Test${C.reset}  ${C.dim}-- Uji koneksi HTTP nyata ke semua endpoint${C.reset}`);
  console.log(`    ${C.brightCyan}[2]${C.reset} ${C.white}Ping Single Target API${C.reset}      ${C.dim}-- Periksa respons & latensi 1 target spesifik${C.reset}`);
  console.log(`    ${C.brightCyan}[3]${C.reset} ${C.white}View Metrics & SLA Health${C.reset}   ${C.dim}-- Metrik agregasi uptime, rasio, dan rata-rata latensi${C.reset}`);

  console.log(`\n  ${C.brightYellow}${C.bold}[+] IN-MEMORY REGISTRY (CRUD)${C.reset}`);
  console.log(`    ${C.brightCyan}[4]${C.reset} ${C.white}List All Target Endpoints${C.reset}   ${C.dim}-- Tampilkan semua endpoint terdaftar${C.reset}`);
  console.log(`    ${C.brightCyan}[5]${C.reset} ${C.white}Filter Incidents Only${C.reset}       ${C.dim}-- Tampilkan target dengan status DOWN atau ERROR${C.reset}`);
  console.log(`    ${C.brightCyan}[6]${C.reset} ${C.white}Register New Target API${C.reset}     ${C.dim}-- Tambah endpoint baru ke array data${C.reset}`);
  console.log(`    ${C.brightCyan}[7]${C.reset} ${C.white}Update Endpoint Config${C.reset}      ${C.dim}-- Ubah URL, label, atau expected status${C.reset}`);
  console.log(`    ${C.brightCyan}[8]${C.reset} ${C.white}Delete Target Endpoint${C.reset}     ${C.dim}-- Hapus endpoint dari in-memory array${C.reset}`);

  console.log(`\n  ${C.brightYellow}${C.bold}[+] SYSTEM${C.reset}`);
  console.log(`    ${C.brightRed}[9]${C.reset} ${C.white}Exit Application${C.reset}           ${C.dim}(atau ketik 'q' / 'exit')${C.reset}`);
  console.log(`${C.gray}  ----------------------------------------------------------------------------${C.reset}`);
};

const renderFancyCards = (items) => {
  if (items.length === 0) {
    console.log(`\n  ${C.dim}Tidak ada target endpoint yang ditemukan.${C.reset}`);
    return;
  }

  console.log("");
  items.forEach((ep) => {
    const latencyColor = !ep.lastLatencyMs
      ? C.gray
      : ep.lastLatencyMs < 200
      ? C.brightGreen
      : ep.lastLatencyMs < 500
      ? C.brightYellow
      : C.brightRed;

    const latencyText = ep.lastLatencyMs !== null ? `${latencyColor}${ep.lastLatencyMs} ms${C.reset}` : `${C.gray}None${C.reset}`;
    const statusCodeText = ep.lastStatus !== null ? `${C.white}${ep.lastStatus}${C.reset}` : `${C.gray}None${C.reset}`;

    console.log(`  ${C.brightCyan}+--[ ${C.white}${C.bold}${ep.id}${C.brightCyan} ]---------------------------------------------------------+${C.reset}`);
    console.log(`  ${C.brightCyan}|${C.reset}  ${ep.name.padEnd(46).substring(0, 46)} Health: ${getHealthBadge(ep.health)}  ${C.brightCyan}|${C.reset}`);
    console.log(`  ${C.brightCyan}|${C.reset}  Method : ${getMethodBadge(ep.method)}  Expected: ${C.cyan}${String(ep.expectedStatus).padEnd(3)}${C.reset} | Actual: ${statusCodeText.padEnd(5)}        ${C.brightCyan}|${C.reset}`);
    console.log(`  ${C.brightCyan}|${C.reset}  URL    : ${C.dim}${ep.url.padEnd(61).substring(0, 61)}${C.reset} ${C.brightCyan}|${C.reset}`);
    console.log(`  ${C.brightCyan}|${C.reset}  Latency: ${(ep.lastLatencyMs !== null ? `${ep.lastLatencyMs} ms` : "None").padEnd(16)}  Checked: ${C.dim}${(ep.lastChecked || "Never").padEnd(19)}${C.reset} ${C.brightCyan}|${C.reset}`);
    console.log(`  ${C.brightCyan}+-----------------------------------------------------------------------+${C.reset}`);

  });
};

const handleCreate = async () => {
  console.log(`\n  ${C.bgCyan} [CREATE] REGISTRASI TARGET API BARU ${C.reset}\n`);
  
  const name = await rl.question(`  ${C.white}* Nama Layanan API${C.reset} ${C.dim}(contoh: ReqRes Users / ketik cancel): ${C.reset}`);
  if (!name.trim() || name.trim().toLowerCase() === "cancel") {
    console.log(`  ${C.yellow}[!] Registrasi dibatalkan.${C.reset}`);
    return;
  }

  const url = await rl.question(`  ${C.white}* Endpoint URL${C.reset} ${C.dim}(contoh: https://jsonplaceholder.typicode.com/posts/1): ${C.reset}`);
  if (!isValidUrl(url)) {
    console.log(`  ${C.red}[Error] Format URL tidak valid. Harus diawali http:// atau https://${C.reset}`);
    return;
  }

  const method = await rl.question(`  ${C.white}* HTTP Method${C.reset} ${C.dim}[GET, POST, PUT, DELETE, PATCH] (default: GET): ${C.reset}`);
  const chosenMethod = method.trim() === "" ? "GET" : method.toUpperCase();
  if (!isValidMethod(chosenMethod)) {
    console.log(`  ${C.red}[Error] HTTP Method '${chosenMethod}' tidak didukung.${C.reset}`);
    return;
  }

  const expectedStatus = await rl.question(`  ${C.white}* Expected Status Code${C.reset} ${C.dim}(default: 200): ${C.reset}`);
  const chosenExpected = expectedStatus.trim() === "" ? "200" : expectedStatus;
  if (!isValidStatusCode(chosenExpected)) {
    console.log(`  ${C.red}[Error] Status code '${chosenExpected}' tidak valid (100-599).${C.reset}`);
    return;
  }

  const newEp = createEndpoint({
    name: name.trim(),
    url: url.trim(),
    method: chosenMethod,
    expectedStatus: chosenExpected
  });

  console.log(`\n  ${C.brightGreen}[OK] Target '${newEp.name}' berhasil terdaftar dengan ID: ${C.bold}${newEp.id}${C.reset}`);

  const testNow = await rl.question(`\n  ${C.brightYellow}Uji koneksi ke target ini sekarang? (y/n) [default: y]: ${C.reset}`);
  if (testNow.trim().toLowerCase() !== "n") {
    process.stdout.write(`  Menghubungi ${C.cyan}${newEp.url}${C.reset} ... `);
    const tested = await pingSingleEndpoint(newEp.id);
    console.log(`${C.brightGreen}Selesai.${C.reset}`);
    renderFancyCards([tested]);
  }
};

const handleUpdate = async () => {
  console.log(`\n  ${C.bgCyan} [UPDATE] PERBARUI KONFIGURASI TARGET API ${C.reset}\n`);
  renderFancyCards(getAllEndpoints());

  const id = await rl.question(`\n  ${C.white}Masukkan Target ID yang ingin diubah${C.reset} ${C.dim}(Enter untuk batal): ${C.reset}`);
  if (!id.trim()) {
    console.log(`  ${C.yellow}[!] Update dibatalkan.${C.reset}`);
    return;
  }

  if (!isIdExist(id, endpoints)) {
    console.log(`  ${C.red}[Error] Target ID '${id}' tidak ditemukan.${C.reset}`);
    return;
  }

  const current = endpoints.find((item) => item.id === id);
  console.log(`  ${C.dim}Tekan [Enter] langsung untuk mempertahankan nilai yang sudah ada.${C.reset}\n`);

  const name = await rl.question(`  * Nama Baru [saat ini: ${C.cyan}${current.name}${C.reset}]: `);
  const url = await rl.question(`  * URL Baru [saat ini: ${C.cyan}${current.url}${C.reset}]: `);
  if (url.trim() && !isValidUrl(url)) {
    console.log(`  ${C.red}[Error] Format URL tidak valid.${C.reset}`);
    return;
  }

  const expectedStatus = await rl.question(`  * Expected Status Baru [saat ini: ${C.cyan}${current.expectedStatus}${C.reset}]: `);
  if (expectedStatus.trim() && !isValidStatusCode(expectedStatus)) {
    console.log(`  ${C.red}[Error] Status code tidak valid.${C.reset}`);
    return;
  }

  const updated = updateEndpointConfig(id, { name, url, expectedStatus });
  console.log(`\n  ${C.brightGreen}[OK] Konfigurasi target '${updated.id}' berhasil diperbarui.${C.reset}`);
  renderFancyCards([updated]);
};

const handleDelete = async () => {
  console.log(`\n  ${C.bgRed} [DELETE] HAPUS TARGET API ${C.reset}\n`);
  renderFancyCards(getAllEndpoints());

  const id = await rl.question(`\n  ${C.white}Masukkan Target ID yang ingin dihapus${C.reset} ${C.dim}(Enter untuk batal): ${C.reset}`);
  if (!id.trim()) {
    console.log(`  ${C.yellow}[!] Penghapusan dibatalkan.${C.reset}`);
    return;
  }

  if (!isIdExist(id, endpoints)) {
    console.log(`  ${C.red}[Error] Target ID '${id}' tidak ditemukan.${C.reset}`);
    return;
  }

  const target = endpoints.find((item) => item.id === id);
  const confirm = await rl.question(`  ${C.brightRed}Yakin ingin menghapus permanent '${target.name}' (${target.id})? (y/N): ${C.reset}`);
  if (confirm.trim().toLowerCase() !== "y") {
    console.log(`  ${C.yellow}[!] Tindakan penghapusan dibatalkan.${C.reset}`);
    return;
  }

  deleteEndpointById(id);
  console.log(`\n  ${C.brightGreen}[OK] Target '${target.name}' (${target.id}) berhasil dihapus.${C.reset}`);
};

const handlePingSingle = async () => {
  console.log(`\n  ${C.bgBlue} [LIVE TEST] PING TARGET API SPESIFIK ${C.reset}\n`);
  renderFancyCards(getAllEndpoints());

  const id = await rl.question(`\n  ${C.white}Masukkan Target ID yang ingin di-ping: ${C.reset}`);
  if (!isIdExist(id, endpoints)) {
    console.log(`  ${C.red}[Error] Target ID '${id}' tidak ditemukan.${C.reset}`);
    return;
  }

  const target = endpoints.find((item) => item.id === id);
  process.stdout.write(`  ${C.dim}Mengirim HTTP request ke ${target.url}...${C.reset} `);
  const result = await pingSingleEndpoint(id);
  console.log(`${C.brightGreen}Selesai.${C.reset}\n`);

  renderFancyCards([result]);
};

const handlePingAll = async () => {
  console.log(`\n  ${C.bgBlue} [LIVE TEST] RUN FULL CLUSTER PING ${C.reset}`);
  console.log(`  ${C.dim}Menguji koneksi jaringan nyata ke seluruh endpoint...${C.reset}\n`);

  for (const ep of endpoints) {
    process.stdout.write(`  Testing ${C.brightCyan}${ep.name.padEnd(32)}${C.reset} ... `);
    const res = await pingSingleEndpoint(ep.id);
    const badge = getHealthBadge(res.health);
    const latencyColor = res.lastLatencyMs < 200 ? C.brightGreen : C.brightYellow;
    console.log(`HTTP ${res.lastStatus || "ERR"} | ${latencyColor}${res.lastLatencyMs}ms${C.reset} | ${badge}`);
  }

  console.log(`\n  ${C.brightGreen}[OK] Pengujian cluster selesai. Seluruh status telah diperbarui.${C.reset}`);
  const showList = await rl.question(`\n  Tampilkan rincian status terbaru sekarang? (y/n) [default: y]: `);
  if (showList.trim().toLowerCase() !== "n") {
    renderFancyCards(getAllEndpoints());
  }
};

const handleHealthCheck = () => {
  console.log(`\n  ${C.bgCyan} [METRICS] DASHBOARD SLA & KESEHATAN SISTEM ${C.reset}\n`);
  const m = calculateSystemHealth();

  const progressBarLength = 30;
  const healthRatio = m.checkedCount > 0 ? m.healthyCount / m.checkedCount : 0;
  const filledBars = Math.round(healthRatio * progressBarLength);
  const emptyBars = progressBarLength - filledBars;
  const barDisplay = `${C.brightGreen}${"#".repeat(filledBars)}${C.brightRed}${"-".repeat(emptyBars)}${C.reset}`;

  console.log(`  +-- ${C.bold}KESEHATAN CLUSTER (SLA UPTIME)${C.reset} --------------------------------------+`);
  console.log(`  |  Uptime Score : ${C.brightGreen}${C.bold}${m.uptimePercent}${C.reset}`.padEnd(79) + `|`);
  console.log(`  |  Health Bar   : [${barDisplay}]                    |`);
  console.log(`  |                                                                      |`);
  console.log(`  |  * Total Target API      : ${C.bold}${m.totalEndpoints}${C.reset}`.padEnd(76) + `|`);
  console.log(`  |  * Telah Diuji (Checked) : ${C.cyan}${m.checkedCount}${C.reset} / ${m.totalEndpoints}`.padEnd(76) + `|`);
  console.log(`  |  * Layanan Optimal (OK)  : ${C.brightGreen}${m.healthyCount} Healthy${C.reset}`.padEnd(76) + `|`);
  console.log(`  |  * Gangguan / Error      : ${m.downCount > 0 ? C.brightRed : C.gray}${m.downCount} Failed${C.reset}`.padEnd(76) + `|`);
  console.log(`  |  * Rata-rata Latensi     : ${C.brightYellow}${m.avgLatencyMs} ms${C.reset}`.padEnd(76) + `|`);
  console.log(`  |                                                                      |`);
  console.log(`  |  Status Operasional : ` + (m.hasCriticalFailure ? `${C.bgRed} INCIDENT DETECTED ${C.reset} (Ada API bermasalah) ` : `${C.bgGreen} OPERATIONAL NORMAL ${C.reset} (Semua API siap)   `) + `|`);
  console.log(`  +----------------------------------------------------------------------+`);
};

const main = async () => {
  let isRunning = true;

  while (isRunning) {
    printBanner();
    printMenu();

    const choice = await rl.question(`\n  ${C.brightCyan}${C.bold}Command [1-9 / q]: ${C.reset}`);

    const normalizedChoice = choice.trim().toLowerCase();

    switch (normalizedChoice) {
      case "1":
        await handlePingAll();
        break;

      case "2":
        await handlePingSingle();
        break;

      case "3":
        handleHealthCheck();
        break;

      case "4":
        console.log(`\n  ${C.bgCyan} [REGISTRY] DAFTAR LENGKAP TARGET API ${C.reset}`);
        renderFancyCards(getAllEndpoints());
        break;

      case "5": {
        console.log(`\n  ${C.bgRed} [INCIDENTS] DAFTAR TARGET API YANG BERMASALAH ${C.reset}`);
        const unhealthies = getUnhealthyEndpoints();
        if (unhealthies.length === 0) {
          console.log(`\n  ${C.brightGreen}[OK] Bersih. Tidak ada target API berstatus DOWN atau ERROR.${C.reset}`);
        } else {
          renderFancyCards(unhealthies);
        }
        break;
      }

      case "6":
        await handleCreate();
        break;

      case "7":
        await handleUpdate();
        break;

      case "8":
        await handleDelete();
        break;

      case "9":
      case "0":
      case "q":
      case "exit":
        console.log(`\n  ${C.brightCyan}[*] Menutup Sentinel API Monitor. Terima kasih & sampai jumpa!${C.reset}\n`);
        isRunning = false;
        break;

      default:
        console.log(`\n  ${C.red}[Error] Pilihan '${choice}' tidak valid. Masukkan angka 1 s.d 9 (atau 'q' untuk keluar).${C.reset}`);
        break;
    }

    if (isRunning) {
      await rl.question(`\n  ${C.gray}Tekan [Enter] untuk kembali ke command dashboard...${C.reset}`);
    }
  }

  rl.close();
};

main();


