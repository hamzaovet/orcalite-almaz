import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from './lib/auth'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('orca_auth')?.value
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isApi = path.startsWith('/api/')

  // Unified Token Verification
  let payload = null
  if (token) {
    try {
      payload = await verifyTokenEdge(token)
    } catch {
      // invalid token
    }
  }

  // Gate 1: Unauthenticated Dashboard Access -> Redirect to Login
  if (isDashboard && !payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Gate 2: Header Propagation for Authenticated Routes
  const res = NextResponse.next()
  if (payload) {
    res.headers.set('x-user-data', JSON.stringify(payload))
    
    const role = payload.role as string

    // ── GATE: Admin-Only Dashboard Routes ──────────────────────────────────
    // Settings & Employees screens are STRICTLY for Admin / SuperAdmin only.
    // Any other role (Cashier, Manager, Technician, Sales, DEMO …) gets
    // hard-redirected to /dashboard before any page code ever runs.
    const ADMIN_ONLY_PATHS = [
      '/dashboard/employees',
      '/dashboard/settings',
      '/dashboard/godfather-calc',
    ]
    const isAdminRole = role === 'SuperAdmin' || role === 'Admin'
    if (isDashboard && !isAdminRole && ADMIN_ONLY_PATHS.some((p2) => path.startsWith(p2))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ── GATE: Admin-Only API Mutations on /api/users ─────────────────────────
    // POST / PUT / DELETE to /api/users requires Admin or SuperAdmin.
    if (isApi && path.startsWith('/api/users') && !isAdminRole) {
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
      if (isWrite) {
        return NextResponse.json(
          { success: false, error: 'Access denied. Admin privileges required.' },
          { status: 403 }
        )
      }
    }

    // Cashier Security Lock
    if (isDashboard && (role === 'Cashier' || role === 'كاشير')) {
      const blockedPaths = [
        '/dashboard/reports',
        '/dashboard/treasury',
        '/dashboard/expenses',
        '/dashboard/branches',
      ]
      if (blockedPaths.some((bp) => path.startsWith(bp))) {
        return NextResponse.redirect(new URL('/dashboard/sales', request.url))
      }
    }

    // DEMO API Lock (Destructive only)
    if (isApi && payload.role === 'DEMO') {
      const isAuthPath = path.startsWith('/api/auth/')
      const isSeederPath = path.startsWith('/api/seed-')
      if (!isAuthPath && !isSeederPath) {
        const isDestructive = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
        if (isDestructive) {
          return NextResponse.json(
            {
              success: false,
              isDemoInterception: true,
              message: 'عفواً، هذه النسخة للتجربة فقط. لتفعيل نسختك الخاصة، تواصل مع مبيعات ORCA: 201551190990',
            },
            { status: 403 }
          )
        }
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/api/:path*'],
}
