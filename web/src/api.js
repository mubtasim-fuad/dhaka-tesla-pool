const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function api(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}) },
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function money(paisa) { return `৳${(Number(paisa) / 100).toFixed(0)}`; }
export function time(value) { return new Date(value).toLocaleString('en-BD',{dateStyle:'medium',timeStyle:'short'}); }
