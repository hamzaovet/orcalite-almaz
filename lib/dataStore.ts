// src/lib/dataStore.ts => app/lib/dataStore.ts
export interface Product {
  id: number
  name: string
  category: 'موبايلات' | 'تابلت' | 'اكسسوارات'
  price: number
  stock: number
  badge?: string
}

export const products: Product[] = [
  {
    id: 1,
    name: 'iPhone 17 Pro Max',
    category: 'موبايلات',
    price: 89999,
    stock: 14,
    badge: 'الأحدث',
  },
  {
    id: 2,
    name: 'Samsung Galaxy Z Fold 6',
    category: 'موبايلات',
    price: 74999,
    stock: 7,
    badge: 'حصري',
  },
  {
    id: 3,
    name: 'Google Pixel 9 Pro',
    category: 'موبايلات',
    price: 52999,
    stock: 11,
  },
  {
    id: 4,
    name: 'iPad Pro M4 13"',
    category: 'تابلت',
    price: 63999,
    stock: 5,
    badge: 'الأقوى',
  },
  {
    id: 5,
    name: 'AirPods Pro 3',
    category: 'اكسسوارات',
    price: 12999,
    stock: 30,
    badge: 'الأكثر مبيعاً',
  },
]
