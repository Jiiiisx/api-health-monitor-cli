// src/data.js

export let endpoints = [
  {
    id: "EP-101",
    name: "JSONPlaceholder Users",
    url: "https://jsonplaceholder.typicode.com/users",
    method: "GET",
    expectedStatus: 200,
    lastStatus: null,
    lastLatencyMs: null,
    health: "UNCHECKED",
    lastChecked: null
  },
  {
    id: "EP-102",
    name: "JSONPlaceholder Single Post",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    method: "GET",
    expectedStatus: 200,
    lastStatus: null,
    lastLatencyMs: null,
    health: "UNCHECKED",
    lastChecked: null
  },
  {
    id: "EP-103",
    name: "Not Found Route (Simulasi 404)",
    url: "https://jsonplaceholder.typicode.com/non-existing-path-404",
    method: "GET",
    expectedStatus: 200,
    lastStatus: null,
    lastLatencyMs: null,
    health: "UNCHECKED",
    lastChecked: null
  }
];

export const setEndpoints = (newEndpoints) => {
  endpoints = newEndpoints;
};
