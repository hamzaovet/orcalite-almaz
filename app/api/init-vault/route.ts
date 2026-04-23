import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    await connectDB()
    
    // Check if any users exist
    const userCount = await User.countDocuments()
    
    if (userCount > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'The vault is already initialized with users.' 
      }, { status: 400 })
    }

    console.log('🚀 [Explicit Vault] Initializing Godfather (maestro)...')
    
    const hashedPassword = await hashPassword('123456')
    
    const maestro = await User.create({
      name: 'Godfather',
      username: 'maestro',
      password: hashedPassword,
      role: 'SuperAdmin'
    })

    return NextResponse.json({
      success: true,
      message: 'EXPLICIT VAULT KEY CREATED: Godfather (maestro) injected successfully.',
      user: {
        id: maestro._id,
        username: maestro.username,
        role: maestro.role
      }
    })
  } catch (error: any) {
    console.error('[Init Vault Error]:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to initialize vault',
      error: error.message 
    }, { status: 500 })
  }
}
