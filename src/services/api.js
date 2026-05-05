const BASE_URL = 'http://localhost:5000/api';

export const api = {
  async get(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.error || `API Error: ${res.status}`);
      error.status = res.status;
      error.data = errorData;
      throw error;
    }
    return res.json();
  },

  async put(endpoint, data) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE'
    });
    if (!res.ok && res.status !== 204) throw new Error(`API Error: ${res.status}`);
    return true;
  }
};
