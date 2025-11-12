// src/api.js
const API_BASE = import.meta.env.VITE_API_BASE;

export async function getUsers() {
  const res = await fetch(`${API_BASE}/api/users`);
  return res.json();
}
