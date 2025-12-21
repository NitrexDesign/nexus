export async function beginRegistration(username: string) {
  const res = await fetch(`/api/auth/register/begin?username=${username}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function finishRegistration(username: string, data: any) {
  const res = await fetch(`/api/auth/register/finish?username=${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function beginLogin(username: string) {
  const res = await fetch(`/api/auth/login/begin?username=${username}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function finishLogin(username: string, data: any) {
  const res = await fetch(`/api/auth/login/finish?username=${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
