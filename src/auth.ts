import { useSyncExternalStore } from 'react';
import type { SessionUser } from './types';

const ACCESS_KEY = 'kh.accessToken';
const REFRESH_KEY = 'kh.refreshToken';

let user: SessionUser | null = null;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  user = null;
  emit();
}

export function setSessionUser(next: SessionUser | null) {
  user = next;
  emit();
}

export function markAuthReady() {
  ready = true;
  emit();
}

export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => user, () => user);
  const booted = useSyncExternalStore(subscribe, () => ready, () => ready);
  return { user: current, ready: booted };
}
