/**
 * Tenants API module.
 */

import { api } from './client';

interface Tenant {
  id: string;
  business_name: string;
  logo_url: string | undefined;
  primary_color: string | undefined;
  secondary_color: string | undefined;
  accent_color: string | undefined;
  header_font: string | undefined;
  body_font: string | undefined;
  border_radius: string | undefined;
  background_image_url: string | undefined;
  favicon_url: string | undefined;
  tagline: string | undefined;
  website_url: string | undefined;
  support_email: string | undefined;
  custom_css: string | undefined;
  login_background_url: string | undefined;
  dashboard_layout: string | undefined;
  sidebar_position: string | undefined;
  created_at: string;
  updated_at: string;
}

interface TenantConfig {
  id: string;
  tenant_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export const tenantsApi = {
  get(id: string): Promise<Tenant> {
    return api.get<Tenant>(`/api/v1/tenants/${id}`);
  },

  update(id: string, data: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>): Promise<Tenant> {
    return api.put<Tenant>(`/api/v1/tenants/${id}`, data);
  },

  getConfig(tenantId: string): Promise<TenantConfig[]> {
    return api.get<TenantConfig[]>(`/api/v1/tenants/${tenantId}/config`);
  },

  updateConfig(tenantId: string, key: string, value: string): Promise<TenantConfig> {
    return api.put<TenantConfig>(`/api/v1/tenants/${tenantId}/config`, { key, value });
  },

  getBrandingHistory(tenantId: string): Promise<unknown[]> {
    return api.get(`/api/v1/tenants/${tenantId}/branding-history`);
  },
};
