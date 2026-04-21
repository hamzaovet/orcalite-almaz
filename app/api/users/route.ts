import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { hashPassword } from '@/lib/auth'
import { StoreSettings } from '@/models/StoreSettings'
import { SYSTEM_ROLES } from '@/lib/constants'

export async function GET(req: Request) {
  try {
    await connectDB()
    const headerData = req.headers.get('x-user-data')
    let isSuper = false
    if (headerData) {
      const p = JSON.parse(headerData)
      if (p.role === 'SuperAdmin') isSuper = true
    }

    const filter = isSuper ? {} : { role: { $ne: 'SuperAdmin' } }
    
    // Don't leak passwords in the GET endpoint!
    const users = await User.find(filter).select('-password').populate('branchId', 'name').sort({ createdAt: -1 })
    
    const mapped = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      role: u.role, // Use technical role names consistently
      branchId: (u.branchId as any)?._id?.toString(),
      branchName: (u.branchId as any)?.name || 'غير محدد'
    }))

    return NextResponse.json({ users: mapped })
  } catch (error) {
    console.error('[Users API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const { name, username, role, password, branchId } = await req.json()

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // STRICT VALIDATION: Rejection instead of Fallback
    if (!Object.keys(SYSTEM_ROLES).includes(role) && role !== 'DEMO') {
      return NextResponse.json({ error: `Invalid role: ${role}. Must be a valid SYSTEM_ROLE.` }, { status: 400 })
    }

    const settings = await StoreSettings.findOne()
    if (settings) {
      const usersCount = await User.countDocuments()
      if (usersCount >= settings.maxUsers) {
        return NextResponse.json({ error: 'License limit reached. Please upgrade.' }, { status: 403 })
      }
    }

    const existing = await User.findOne({ username })
    if (existing) {
      return NextResponse.json({ error: 'المستخدم موجود مسبقاً' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    
    const user = await User.create({
      name,
      username,
      role,
      password: hashedPassword,
      branchId: branchId || undefined
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      }
    })
  } catch (error) {
    console.error('[Users API] POST error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB()
    const { id, name, username, role, password, branchId } = await req.json()

    if (!id || !name || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Role Validation in PUT
    if (role && !Object.keys(SYSTEM_ROLES).includes(role) && role !== 'DEMO') {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
    }

    const updateData: any = { name, username, branchId: branchId || null }
    if (role) {
       // Anti-lockout: Admin/SuperAdmin cannot downgrade themselves
       const headerData = req.headers.get('x-user-data')
       if (headerData) {
         const p = JSON.parse(headerData)
         if (p.sub === id && (['Manager', 'Cashier', 'Sales', 'Technician', 'Inventory', 'Accountant'].includes(role))) {
            return NextResponse.json({ error: 'لا يمكنك تغيير صلاحياتك لتجنب فقدان الوصول' }, { status: 403 })
         }
       }
       updateData.role = role
    }

    if (password && password.trim() !== '') {
       updateData.password = await hashPassword(password)
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password')
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('[Users API] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

    await connectDB()
    await User.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('[Users API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
