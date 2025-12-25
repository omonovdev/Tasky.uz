// --- API FETCH FUNCTION (MUST BE DEFINED FOR ALL API CALLS) ---
const apiFetch = async <T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> => {
  const url = joinUrl(API_BASE_URL, path);
  const headers = new Headers(init.headers);
  const skipAuth = Boolean(init.skipAuth);

  // Tokenni headerga qo‘shish
  if (!skipAuth) {
    const accessToken = authStorage.getAccessToken();
    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  }

  const body = init.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let res = await fetch(url, { ...init, headers });
  // Agar 401 va token muddati tugagan bo‘lsa, refresh qilib qayta so‘rov yuborish
  if (res.status === 401 && !skipAuth) {
    try {
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken) {
        const refreshRes = await fetch(joinUrl(API_BASE_URL, '/auth/refresh'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          authStorage.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          headers.set('authorization', `Bearer ${data.accessToken}`);
          res = await fetch(url, { ...init, headers });
        } else {
          authStorage.clear();
          throw new Error('Session expired. Please login again.');
        }
      }
    } catch (err) {
      authStorage.clear();
      throw new Error('Session expired. Please login again.');
    }
  }
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = errorText;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorText;
    } catch {
      // Use errorText as is if not JSON
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
  return isJsonResponse(res) ? await res.json() : ((await res.text()) as any);
};
import { authStorage, type AuthTokens } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4010/api';

type ApiErrorBody = { message?: string | string[]; error?: string; statusCode?: number };

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const isJsonResponse = (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json');
};


export type ApiAuthResponse = {
  user: any;
  accessToken: string;
  refreshToken: string;
};

export const api = {
  auth: {
    async register(payload: { email: string; password: string; firstName: string; lastName: string; dateOfBirth?: string }) {
      const data = await apiFetch<ApiAuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      authStorage.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    },
    async login(payload: { email: string; password: string }) {
      const data = await apiFetch<ApiAuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      authStorage.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    },
    async logout() {
      authStorage.clear();
    },
    async requestReset(payload: { email: string }) {
      return apiFetch<{ success: true }>('/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
    async verifyResetCode(payload: { token: string }) {
      return apiFetch<{ success: true; valid: true }>('/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
    async resetPassword(payload: { token: string; newPassword: string }) {
      const data = await apiFetch<ApiAuthResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      authStorage.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    },
    async changePassword(payload: { currentPassword: string; newPassword: string }) {
      return apiFetch<{ success: true }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async verifyPassword(payload: { password: string }) {
      return apiFetch<{ success: true }>('/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
  users: {
    me() {
      return apiFetch<any>('/users/me');
    },
    deleteMe() {
      return apiFetch<{ success: true }>('/users/me', { method: 'DELETE' });
    },
    updateMe(payload: any) {
      return apiFetch<any>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
    },
    setRole(payload: { role: string }) {
      return apiFetch<any>('/users/me/role', { method: 'PATCH', body: JSON.stringify(payload) });
    },
    getMyRole() {
      return apiFetch<{ role: string }>('/users/me/role');
    },
    search(query: string, exclude?: string) {
      const usp = new URLSearchParams();
      usp.set('q', query);
      if (exclude) usp.set('exclude', exclude);
      return apiFetch<any[]>(`/users/search?${usp.toString()}`);
    },
  },
  organizations: {
    create(payload: any) {
      return apiFetch<any>('/organizations', { method: 'POST', body: JSON.stringify(payload) });
    },
    mine() {
      return apiFetch<any[]>('/organizations/me');
    },
    myMemberships() {
      return apiFetch<any[]>('/organizations/me/memberships');
    },
    get(id: string) {
      return apiFetch<any>(`/organizations/${id}`);
    },
    update(id: string, payload: any) {
      return apiFetch<any>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    delete(id: string) {
      return apiFetch<{ success: true }>(`/organizations/${id}`, { method: 'DELETE' });
    },
    members(id: string) {
      return apiFetch<any[]>(`/organizations/${id}/members`);
    },
    updateMemberPosition(memberId: string, payload: { position: string }) {
      return apiFetch<any>(`/organizations/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    removeMember(memberId: string) {
      return apiFetch<{ success: true }>(`/organizations/members/${memberId}`, { method: 'DELETE' });
    },
    invite(orgId: string, payload: any) {
      return apiFetch<any>(`/organizations/${orgId}/invitations`, { method: 'POST', body: JSON.stringify(payload) });
    },
    acceptInvitation(invId: string) {
      return apiFetch<{ success: true }>(`/organizations/invitations/${invId}/accept`, { method: 'POST' });
    },
    declineInvitation(invId: string) {
      return apiFetch<{ success: true }>(`/organizations/invitations/${invId}/decline`, { method: 'POST' });
    },
    myInvitations(status?: string) {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return apiFetch<any[]>(`/organizations/invitations/me${qs}`);
    },
    getMyRoleForOrg(orgId: string) {
      return apiFetch<string | null>(`/organizations/${orgId}/my-role`);
    },
    invitations(orgId: string) {
      return apiFetch<any[]>(`/organizations/${orgId}/invitations`);
    },
  },
  search(query: string) {
    const encoded = encodeURIComponent(query);
    return apiFetch<any[]>(`/organizations/search?q=${encoded}`);
  },
  acceptAgreement(orgId: string, payload: { agreementVersion: number }) {
    return apiFetch<{ success: true }>(`/organizations/${orgId}/agreement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  tasks: {
    list(params: {
      organizationId?: string;
      status?: string;
      all?: boolean;
      ids?: string[];
      assignedById?: string;
    }) {
      const usp = new URLSearchParams();
      if (params.organizationId) usp.set('organizationId', params.organizationId);
      if (params.status) usp.set('status', params.status);
      if (typeof params.all === 'boolean') usp.set('all', String(params.all));
      if (params.ids?.length) usp.set('ids', params.ids.join(','));
      if (params.assignedById) usp.set('assignedById', params.assignedById);
      const qs = usp.toString();
      return apiFetch<any[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    get(id: string) {
      return apiFetch<any>(`/tasks/${id}`);
    },
    create(payload: any) {
      return apiFetch<any>('/tasks', { method: 'POST', body: JSON.stringify(payload) });
    },
    update(id: string, payload: any) {
      return apiFetch<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    delete(id: string) {
      return apiFetch<{ success: true }>(`/tasks/${id}`, { method: 'DELETE' });
    },
    updateStatus(id: string, payload: any) {
      return apiFetch<any>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    setAssignments(id: string, payload: { assigneeIds: string[] }) {
      return apiFetch<any>(`/tasks/${id}/assignments`, { method: 'POST', body: JSON.stringify(payload) });
    },
    addStage(id: string, payload: any) {
      return apiFetch<any>(`/tasks/${id}/stages`, { method: 'POST', body: JSON.stringify(payload) });
    },
    updateStage(stageId: string, payload: any) {
      return apiFetch<any>(`/tasks/stages/${stageId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    deleteStage(stageId: string) {
      return apiFetch<any>(`/tasks/stages/${stageId}`, { method: 'DELETE' });
    },
    addReport(id: string, payload: any) {
      return apiFetch<any>(`/tasks/${id}/reports`, { method: 'POST', body: JSON.stringify(payload) });
    },
  },
  subgroups: {
    list(organizationId: string) {
      return apiFetch<any[]>(`/subgroups?organizationId=${encodeURIComponent(organizationId)}`);
    },
    get(id: string) {
      return apiFetch<any>(`/subgroups/${id}`);
    },
    create(payload: any) {
      return apiFetch<any>('/subgroups', { method: 'POST', body: JSON.stringify(payload) });
    },
    update(id: string, payload: any) {
      return apiFetch<any>(`/subgroups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    delete(id: string) {
      return apiFetch<{ success: true }>(`/subgroups/${id}`, { method: 'DELETE' });
    },
    setMembers(id: string, payload: { userIds: string[] }) {
      return apiFetch<any>(`/subgroups/${id}/members`, { method: 'POST', body: JSON.stringify(payload) });
    },
    removeMember(id: string, userId: string) {
      return apiFetch<any>(`/subgroups/${id}/members/${userId}`, { method: 'DELETE' });
    },
  },
  goals: {
    list() {
      return apiFetch<any[]>('/goals');
    },
    create(payload: any) {
      return apiFetch<any>('/goals', { method: 'POST', body: JSON.stringify(payload) });
    },
    update(id: string, payload: any) {
      return apiFetch<any>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    delete(id: string) {
      return apiFetch<{ success: true }>(`/goals/${id}`, { method: 'DELETE' });
    },
  },
  notifications: {
    reads() {
      return apiFetch<any[]>('/notifications/reads');
    },
    markRead(payload: { notificationType: string; notificationId: string }) {
      return apiFetch<any>('/notifications/reads', { method: 'POST', body: JSON.stringify(payload) });
    },
  },
  chat: {
    list(orgId: string, limit = 100) {
      return apiFetch<any[]>(`/chat/${orgId}?limit=${limit}`);
    },
    send(payload: any) {
      return apiFetch<any>('/chat', { method: 'POST', body: JSON.stringify(payload) });
    },
    react(payload: any) {
      return apiFetch<any>('/chat/react', { method: 'POST', body: JSON.stringify(payload) });
    },
    edit(id: string, payload: any) {
      return apiFetch<any>(`/chat/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    delete(id: string) {
      return apiFetch<any>(`/chat/${id}`, { method: 'DELETE' });
    },
  },
  ideas: {
    list(orgId: string) {
      return apiFetch<any[]>(`/ideas/${orgId}`);
    },
    create(payload: any) {
      return apiFetch<any>('/ideas', { method: 'POST', body: JSON.stringify(payload) });
    },
  },
  uploads: {
    async upload(file: File, folder: string) {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      return apiFetch<{ url: string; fileName: string; fileType: string; fileSize: number }>('/uploads', {
        method: 'POST',
        body: form,
      });
    },
  },
};
