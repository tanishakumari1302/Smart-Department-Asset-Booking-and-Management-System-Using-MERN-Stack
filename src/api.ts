import { User, Asset, Booking, AuditLog, DashboardKPIs, ClusterInfo } from './types';

const TOKEN_KEY = 'assethub_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error (${response.status})`;
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

// ---------------- AUTH ----------------
export async function loginApi(credentials: { email: string; password: string }) {
  const data = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  setAuthToken(data.token);
  return data;
}

export async function registerApi(userData: Partial<User> & { password: string }) {
  const data = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  setAuthToken(data.token);
  return data;
}

export async function getCurrentUserApi() {
  return await apiRequest<{ user: User }>('/api/auth/me');
}

export async function switchDemoRoleApi(role: 'admin' | 'faculty' | 'tech') {
  const data = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/switch-demo-role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  setAuthToken(data.token);
  return data;
}

// ---------------- ASSETS ----------------
export async function getAssetsApi(params?: { category?: string; stockStatus?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  return await apiRequest<{ count: number; assets: Asset[] }>(`/api/assets${qs ? `?${qs}` : ''}`);
}

export async function adjustStockApi(assetCode: string, availableQuantity: number) {
  return await apiRequest<{ message: string; asset: Asset }>(`/api/assets/${assetCode}/adjust-stock`, {
    method: 'PATCH',
    body: JSON.stringify({ availableQuantity }),
  });
}

export async function createAssetApi(assetData: Partial<Asset>) {
  return await apiRequest<{ message: string; asset: Asset }>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(assetData),
  });
}

// ---------------- BOOKINGS ----------------
export async function getBookingsApi(params?: { requesterEmail?: string; status?: string; type?: string }) {
  const query = new URLSearchParams();
  if (params?.requesterEmail) query.set('requesterEmail', params.requesterEmail);
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);

  const qs = query.toString();
  return await apiRequest<{ count: number; bookings: Booking[] }>(`/api/bookings${qs ? `?${qs}` : ''}`);
}

export async function checkBookingConflictApi(params: {
  assetCode: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  excludeReqId?: string;
}) {
  return await apiRequest<{ hasConflict: boolean; message: string; conflictingBooking?: Booking }>(
    '/api/bookings/check-conflict',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

export async function createBookingApi(bookingData: any) {
  return await apiRequest<{ message: string; booking: Booking }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

export async function approveBookingApi(reqId: string, isStockIssue = false) {
  return await apiRequest<{ message: string; booking: Booking }>(`/api/bookings/${reqId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ isStockIssue }),
  });
}

export async function rejectBookingApi(reqId: string, reason: string, remarks?: string) {
  return await apiRequest<{ message: string; booking: Booking }>(`/api/bookings/${reqId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, remarks }),
  });
}

export async function dispatchBookingApi(reqId: string) {
  return await apiRequest<{ message: string; booking: Booking }>(`/api/bookings/${reqId}/dispatch`, {
    method: 'POST',
  });
}

export async function returnBookingApi(reqId: string, condition: 'intact' | 'damaged' | 'minor-wear') {
  return await apiRequest<{ message: string; booking: Booking }>(`/api/bookings/${reqId}/return`, {
    method: 'POST',
    body: JSON.stringify({ condition }),
  });
}

export async function cancelBookingApi(reqId: string) {
  return await apiRequest<{ message: string; booking: Booking }>(`/api/bookings/${reqId}/cancel`, {
    method: 'POST',
  });
}

// ---------------- STATS & AUDIT ----------------
export async function getDashboardDataApi() {
  return await apiRequest<{
    success: boolean;
    data: DashboardKPIs;
    cluster: ClusterInfo;
  }>('/api/stats/dashboard');
}

export async function getAuditLogsApi(limit = 30) {
  return await apiRequest<{ count: number; logs: AuditLog[] }>(`/api/stats/audit-logs?limit=${limit}`);
}
