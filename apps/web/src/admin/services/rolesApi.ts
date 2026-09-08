import { apiRequest } from '../../lib/api';

export const ROLE_PERMISSIONS = [
  'agents.read', 'agents.write', 'agents.publish',
  'knowledge.read', 'knowledge.write',
  'tools.read', 'tools.write', 'tools.execute',
  'integrations.read', 'integrations.write',
  'conversations.read', 'conversations.manage',
  'people.read', 'people.manage',
  'analytics.read', 'admin.manage',
  'billing.read', 'billing.manage', 'settings.manage',
] as const;

export type RolePermission = (typeof ROLE_PERMISSIONS)[number];
export type RoleStatus = 'draft' | 'active' | 'deprecated';

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string;
  status: RoleStatus;
  permissions: RolePermission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleInput {
  key: string;
  name: string;
  description: string;
  status: RoleStatus;
  permissions: RolePermission[];
}

export interface RolePolicy {
  version: 1;
  roles: RoleInput[];
}

export const rolesApi = {
  async list(): Promise<AdminRole[]> {
    return (await apiRequest<{ roles: AdminRole[] }>('/api/v1/admin/roles')).roles;
  },
  create(input: RoleInput): Promise<AdminRole> {
    return apiRequest<AdminRole>('/api/v1/admin/roles', { method: 'POST', body: input });
  },
  update(id: string, input: Partial<Omit<RoleInput, 'key'>>): Promise<AdminRole> {
    return apiRequest<AdminRole>(`/api/v1/admin/roles/${id}`, { method: 'PUT', body: input });
  },
  delete(id: string): Promise<null> {
    return apiRequest<null>(`/api/v1/admin/roles/${id}`, { method: 'DELETE' });
  },
  importPolicy(policy: RolePolicy): Promise<{ roles: AdminRole[]; imported: number }> {
    return apiRequest<{ roles: AdminRole[]; imported: number }>('/api/v1/admin/roles/import', {
      method: 'POST',
      body: policy,
    });
  },
};
