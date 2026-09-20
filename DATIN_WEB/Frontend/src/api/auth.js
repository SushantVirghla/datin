import axios from 'axios';
import { AUTH_BASE_URL } from './config';

const api = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('datinToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(email, password) {
  const { data } = await api.post('/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  if (data.token) {
    localStorage.setItem('datinToken', data.token);
    localStorage.setItem('datinUser', JSON.stringify(data.user));
  }
  return data;
}

export async function sendSignupOtp(fullName, email, password, walletAddress = '') {
  const { data } = await api.post('/send-signup-otp', {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
    walletAddress: walletAddress.trim(),
  });
  return data;
}

export async function verifySignupOtp(email, otp) {
  const { data } = await api.post('/verify-signup-otp', {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
  });
  if (data.token) {
    localStorage.setItem('datinToken', data.token);
    localStorage.setItem('datinUser', JSON.stringify(data.user));
  }
  return data;
}

export async function resendSignupOtp(email) {
  const { data } = await api.post('/resend-signup-otp', {
    email: email.trim().toLowerCase(),
  });
  return data;
}

export async function signup(fullName, email, password, walletAddress = '') {
  const { data } = await api.post('/signup', {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
    walletAddress: walletAddress.trim(),
  });
  if (data.token) {
    localStorage.setItem('datinToken', data.token);
    localStorage.setItem('datinUser', JSON.stringify(data.user));
  }
  return data;
}

export function logout() {
  localStorage.removeItem('datinToken');
  localStorage.removeItem('datinUser');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('datinUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('datinToken');
}

export function isAuthenticated() {
  return !!getToken();
}

export async function verifyToken() {
  const { data } = await api.get('/verify-token');
  return data;
}
