// API configuration — reads from Vite env variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.54:5353';
export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:3001';
export const SPLINE_SCENE_URL =
  import.meta.env.VITE_SPLINE_SCENE_URL ||
  'https://prod.spline.design/n0jtCS5uFc2dw946/scene.splinecode';
export const R4X_SPLINE_SCENE_URL =
  import.meta.env.VITE_R4X_SPLINE_SCENE_URL ||
  'https://prod.spline.design/P3JMbPO8XWOghTzg/scene.splinecode';
