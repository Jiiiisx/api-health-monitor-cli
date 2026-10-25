// src/service.js
import { endpoints, setEndpoints } from "./data.js";

// Helper internal format waktu lokal
const getCurrentTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace("T", " ").substring(0, 19);
};

// 1. CREATE: Tambah target endpoint baru (Destructuring & Spread Operator)
export const createEndpoint = ({ name, url, method, expectedStatus }) => {
  // Hitung ID numerik berurutan agar rapi (EP-101, EP-102, EP-103 -> EP-104)
  const numericIds = endpoints
    .map((ep) => parseInt(ep.id.replace("EP-", ""), 10))
    .filter((num) => !Number.isNaN(num));
  const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 101;
  const newId = `EP-${nextNum}`;
  
  const newEndpoint = {
    id: newId,
    name,
    url,
    method: method.toUpperCase(),
    expectedStatus: Number(expectedStatus),
    lastStatus: null,
    lastLatencyMs: null,
    health: "UNCHECKED",
    lastChecked: null
  };

  // Spread Operator untuk menyalin data tanpa mutasi langsung
  const updatedEndpoints = [...endpoints, newEndpoint];
  setEndpoints(updatedEndpoints);

  return { ...newEndpoint };
};

// 2. READ: Ambil semua endpoints
export const getAllEndpoints = () => {
  return [...endpoints];
};

// READ FILTERED: Filter endpoint yang bermasalah / DOWN (B.1: .filter())
export const getUnhealthyEndpoints = () => {
  return endpoints.filter(({ health }) => health === "DOWN" || health === "ERROR");
};

// 3. UPDATE: Perbarui konfigurasi endpoint berdasarkan ID (B.1: .map(), B.2: Spread Operator)
export const updateEndpointConfig = (id, { name, url, expectedStatus }) => {
  const updatedEndpoints = endpoints.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        name: name !== undefined && name.trim() !== "" ? name : item.name,
        url: url !== undefined && url.trim() !== "" ? url : item.url,
        expectedStatus: expectedStatus ? Number(expectedStatus) : item.expectedStatus
      };
    }
    return item;
  });

  setEndpoints(updatedEndpoints);
  return updatedEndpoints.find((item) => item.id === id);
};

// 4. DELETE: Hapus endpoint berdasarkan ID (B.1: .filter())
export const deleteEndpointById = (id) => {
  const target = endpoints.find((item) => item.id === id);
  const filtered = endpoints.filter((item) => item.id !== id);
  setEndpoints(filtered);
  return target;
};

//Real HTTP Ping via native fetch() (Async/Await + Update in-memory)
export const pingSingleEndpoint = async (id) => {
  const target = endpoints.find((item) => item.id === id);
  if (!target) return null;

  const startTime = performance.now();
  let status = null;
  let latencyMs = null;
  let health = "DOWN";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(target.url, {
      method: target.method,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const endTime = performance.now();
    status = response.status;
    latencyMs = Math.round(endTime - startTime);
    health = status === target.expectedStatus ? "HEALTHY" : "DOWN";
  } catch (err) {
    const endTime = performance.now();
    latencyMs = Math.round(endTime - startTime);
    status = 0; // Network error / timeout
    health = "ERROR";
  }

  // Update in-memory state via .map() and spread operator
  const updatedEndpoints = endpoints.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        lastStatus: status,
        lastLatencyMs: latencyMs,
        health,
        lastChecked: getCurrentTimestamp()
      };
    }
    return item;
  });

  setEndpoints(updatedEndpoints);
  return updatedEndpoints.find((item) => item.id === id);
};

// Ping all endpoints sequentially
export const pingAllEndpoints = async () => {
  const results = [];
  for (const item of endpoints) {
    const res = await pingSingleEndpoint(item.id);
    results.push(res);
  }
  return results;
};

// Analisis Health & SLA System (B.1: .reduce() & .some())
export const calculateSystemHealth = () => {
  if (endpoints.length === 0) {
    return {
      totalEndpoints: 0,
      checkedCount: 0,
      healthyCount: 0,
      downCount: 0,
      avgLatencyMs: 0,
      uptimePercent: "0.00%",
      hasCriticalFailure: false
    };
  }

  // .reduce() untuk agregasi metrik
  const metrics = endpoints.reduce(
    (acc, { health, lastLatencyMs }) => {
      const isChecked = health !== "UNCHECKED";
      return {
        checkedCount: acc.checkedCount + (isChecked ? 1 : 0),
        healthyCount: acc.healthyCount + (health === "HEALTHY" ? 1 : 0),
        downCount: acc.downCount + (health === "DOWN" || health === "ERROR" ? 1 : 0),
        totalLatency: acc.totalLatency + (lastLatencyMs || 0),
        validLatencyCount: acc.validLatencyCount + (lastLatencyMs !== null ? 1 : 0)
      };
    },
    { checkedCount: 0, healthyCount: 0, downCount: 0, totalLatency: 0, validLatencyCount: 0 }
  );

  const avgLatencyMs = metrics.validLatencyCount > 0
    ? Math.round(metrics.totalLatency / metrics.validLatencyCount)
    : 0;

  const uptimePercent = metrics.checkedCount > 0
    ? ((metrics.healthyCount / metrics.checkedCount) * 100).toFixed(2)
    : "0.00";

  // .some() untuk mendeteksi apakah ada API yang mengalami kegagalan/down
  const hasCriticalFailure = endpoints.some(({ health }) => health === "DOWN" || health === "ERROR");

  return {
    totalEndpoints: endpoints.length,
    checkedCount: metrics.checkedCount,
    healthyCount: metrics.healthyCount,
    downCount: metrics.downCount,
    avgLatencyMs,
    uptimePercent: `${uptimePercent}%`,
    hasCriticalFailure
  };
};
