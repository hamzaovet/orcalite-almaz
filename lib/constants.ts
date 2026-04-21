export const SYSTEM_ROLES = {
  SuperAdmin: 'مالك النظام',
  Admin: 'مدير نظام',
  Accountant: 'محاسب',
  Inventory: 'مسؤول مخازن',
  Manager: 'مدير فرع',
  Sales: 'مسؤول مبيعات',
  Technician: 'فني صيانة',
  Cashier: 'كاشير'
} as const;

export type SystemRole = keyof typeof SYSTEM_ROLES;
