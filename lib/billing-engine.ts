/**
 * SMART BILLING & SAAS ENGINE
 * Calculates the health status of a store based on its renewal date and Godfather settings.
 */

export type BillingStatus = 'NORMAL' | 'WARNING' | 'GRACE' | 'SUSPENDED'

export interface BillingInfo {
  status: BillingStatus
  daysRemaining: number
  isHardSuspended: boolean
  renewalDate: Date
}

export function getBillingStatus(renewalDate: Date | string, isSuspended: boolean = false): BillingInfo {
  const now = new Date()
  const renewal = new Date(renewalDate)
  
  // Calculate difference in milliseconds
  const diffTime = renewal.getTime() - now.getTime()
  // Convert to days (rounded down)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // 1. Hard Kill Switch (Explicitly Suspended by Godfather)
  if (isSuspended) {
    return { status: 'SUSPENDED', daysRemaining: diffDays, isHardSuspended: true, renewalDate: renewal }
  }

  // 2. Suspended (After 48-hour Grace Period)
  // Logic: 2 days after renewal date (diffDays < -2)
  if (diffDays <= -2) {
    return { status: 'SUSPENDED', daysRemaining: diffDays, isHardSuspended: false, renewalDate: renewal }
  }

  // 3. Grace Period (0 to 2 days after deadline)
  // Logic: Post-deadline but within 48h (diffDays is 0, -1)
  if (diffDays <= 0 && diffDays > -2) {
    return { status: 'GRACE', daysRemaining: diffDays, isHardSuspended: false, renewalDate: renewal }
  }

  // 4. Warning (7 days before deadline)
  // Logic: 1 to 7 days remaining
  if (diffDays > 0 && diffDays <= 7) {
    return { status: 'WARNING', daysRemaining: diffDays, isHardSuspended: false, renewalDate: renewal }
  }

  // 5. Normal
  return { status: 'NORMAL', daysRemaining: diffDays, isHardSuspended: false, renewalDate: renewal }
}
