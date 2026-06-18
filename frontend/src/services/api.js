const API_BASE_URL = 'http://localhost:5000/api';

export const getStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching status:", error);
    return null;
  }
};

export const getLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/logs`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

export const clearLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/logs/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error clearing logs:", error);
    return { error: error.message };
  }
};

export const updateSettings = async (settings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating settings:", error);
    return { error: error.message };
  }
};

export const getDbLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/manager/logs`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching MongoDB logs:", error);
    return [];
  }
};

export const clearDbLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/manager/logs/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error clearing MongoDB logs:", error);
    return { error: error.message };
  }
};

export const queryRag = async (query) => {
  try {
    const response = await fetch(`${API_BASE_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error calling RAG query endpoint:", error);
    return { error: error.message };
  }
};

export const signupManager = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/manager/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error("Error signing up manager:", error);
    return { error: error.message };
  }
};

export const loginManager = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/manager/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error("Error logging in manager:", error);
    return { error: error.message };
  }
};
