import { connectDB } from './db'
import { StoreSettings } from '@/models/StoreSettings'

/**
 * Verifies if the provided password matches the master adminPassword stored in StoreSettings.
 * Used for dual-verification of sensitive actions like deletions.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;

  try {
    await connectDB();
    const settings = await StoreSettings.findOne();
    
    if (!settings || !settings.adminPassword) {
      // If no admin password is set in settings, we deny all deletions to force them to set it.
      return false;
    }

    return settings.adminPassword === password;
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return false;
  }
}
