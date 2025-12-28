import { apiFetch } from "./api-client";

export async function beginRegistration(username: string) {
  const res = await apiFetch(`/api/auth/register/begin?username=${username}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function finishRegistration(username: string, data: unknown) {
  const res = await apiFetch(`/api/auth/register/finish?username=${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function beginLogin(username: string) {
  const res = await apiFetch(`/api/auth/login/begin?username=${username}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function finishLogin(username: string, data: unknown) {
  const res = await apiFetch(`/api/auth/login/finish?username=${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function loginWithPassword(username: string, password: string) {
  const res = await apiFetch("/api/auth/login/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function registerWithPassword(username: string, password: string) {
  const res = await apiFetch("/api/auth/register/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
