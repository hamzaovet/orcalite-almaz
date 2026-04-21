import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Category from '@/models/Category'

function dbError(detail?: string) {
  return NextResponse.json(
    {
      success: false,
      message: 'Database error',
      ...(detail ? { detail } : {}),
    },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const categories = await Category.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, categories })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    const { name, slug, icon, description } = body
    if (!name || !slug || !icon) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: name, slug, icon' },
        { status: 400 }
      )
    }

    const category = await Category.create({
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase(),
      icon: String(icon).trim(),
      description: description ? String(description).trim() : '',
    })

    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { _id, ...updateData } = body

    if (!_id) {
      return NextResponse.json(
        { success: false, message: 'Missing category ID' },
        { status: 400 }
      )
    }

    if (updateData.slug) {
        updateData.slug = updateData.slug.toLowerCase().trim()
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!updatedCategory) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedCategory })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID required' },
        { status: 400 }
      )
    }

    await Category.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}
