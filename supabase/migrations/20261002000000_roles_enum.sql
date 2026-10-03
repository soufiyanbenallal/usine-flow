-- Granular operational roles (the permission matrix lives in role_permissions, see next migration).
-- Enum values are added in their own migration so they can be used by the following ones.
alter type public.org_role add value if not exists 'warehouse_manager';
alter type public.org_role add value if not exists 'purchasing_manager';
alter type public.org_role add value if not exists 'sales_manager';
alter type public.org_role add value if not exists 'production_manager';
alter type public.org_role add value if not exists 'quality_manager';
alter type public.org_role add value if not exists 'maintenance_manager';
alter type public.org_role add value if not exists 'operator';
