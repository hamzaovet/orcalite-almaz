import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RepairTicket } from '@/models/RepairTicket';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ success: false, message: 'Missing search query' }, { status: 400 });
    }

    // Search by Phone Number OR Receipt ID (Last 6 characters of _id)
    // We fetch all potential matches and filter for ID suffix in JS to be safe with public queries
    const q = query.trim();
    
    let tickets = await RepairTicket.find({
      $or: [
        { phoneNumber: q },
        { customerName: { $regex: q, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).lean();

    // If no phone match, try matching the ID suffix
    if (tickets.length === 0 && q.length >= 4) {
      const allTickets = await RepairTicket.find({}).lean();
      tickets = allTickets.filter(t => t._id.toString().toLowerCase().endsWith(q.toLowerCase()));
    }

    if (tickets.length === 0) {
      return NextResponse.json({ success: false, message: 'لا توجد أجهزة مطابقة لهذا الرقم أو الكود' });
    }

    // Sanitize output for public consumption (only non-sensitive data)
    const sanitized = tickets.map(t => ({
      idSuffix: t._id.toString().slice(-6).toUpperCase(),
      customerName: t.customerName.charAt(0) + '***', // Privacy
      deviceModel: t.deviceModel,
      status: t.status,
      estimatedCost: t.estimatedCost,
      deposit: t.deposit,
      updatedAt: t.updatedAt
    }));

    return NextResponse.json({ success: true, tickets: sanitized });

  } catch (error: any) {
    console.error('[API Public Maintenance] Error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء البحث' }, { status: 500 });
  }
}
