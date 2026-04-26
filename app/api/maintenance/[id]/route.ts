import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { RepairTicket } from '@/models/RepairTicket'
import Product from '@/models/Product'
import Transaction from '@/models/Transaction'
import Supplier from '@/models/Supplier'
import Purchase from '@/models/Purchase'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { id } = params
    const body = await request.json()

    if (body.addPart) {
      const { productId, quantity, price } = body.addPart
      
      const product = await Product.findById(productId)
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      if ((product.stock || 0) < quantity) {
         return NextResponse.json({ error: 'Insufficient stock for this part' }, { status: 400 })
      }

      // Add to ticket (do NOT deduct yet, deduct at delivery)
      const ticket = await RepairTicket.findByIdAndUpdate(
        id, 
        { $push: { spareParts: { product: productId, quantity, price } } },
        { new: true }
      ).populate('spareParts.product')
      
      return NextResponse.json({ success: true, ticket })
    }
    
    const ticketBefore = await RepairTicket.findById(id)
    const ticket = await RepairTicket.findByIdAndUpdate(id, body, { new: true }).populate('spareParts.product')

    if (ticketBefore && ticketBefore.status !== 'Delivered' && ticket && ticket.status === 'Delivered') {
      const ticketId = ticket._id.toString().slice(-6).toUpperCase()

      // Scenario 1: Deduct usedInventoryParts (spareParts) from existing Product stock
      if (ticket.spareParts && ticket.spareParts.length > 0) {
        for (const sp of ticket.spareParts) {
          await Product.findByIdAndUpdate(sp.product._id || sp.product, {
            $inc: { stock: -sp.quantity }
          })
        }
      }

      // Scenario 2: External Parts Auto-Plumbing
      if (ticket.externalParts && ticket.externalParts.length > 0) {
        let emergencySupplier = await Supplier.findOne({ name: 'مورد صيانة طوارئ' })
        if (!emergencySupplier) {
          emergencySupplier = await Supplier.create({ name: 'مورد صيانة طوارئ', type: 'Supplier' })
        }

        let totalExtCost = 0
        const purchaseItems = []

        for (const ep of ticket.externalParts) {
          const cost = Number(ep.cost)
          totalExtCost += cost

          // Auto-Stock IN: Create/Update Product
          let emergencyProduct = await Product.findOne({ name: ep.name })
          if (!emergencyProduct) {
            emergencyProduct = await Product.create({ 
              name: ep.name, 
              category: 'قطع غيار طوارئ', 
              price: cost, 
              costPrice: cost, 
              stock: 0 
            })
          }

          purchaseItems.push({
            productId: emergencyProduct._id,
            productName: ep.name,
            qty: 1,
            unitCost: cost
          })

          // We effectively Stock IN and Stock OUT immediately, so net stock change is 0.
        }

        if (totalExtCost > 0) {
          // Auto-Purchase
          const purchase = await Purchase.create({
            supplierId: emergencySupplier._id,
            supplierName: emergencySupplier.name,
            items: purchaseItems,
            totalAmount: totalExtCost,
            amountPaid: totalExtCost,
            remaining: 0,
            paymentMethod: 'Cash',
            date: new Date()
          })

          // Deduct its cost from Treasury (OUT)
          await Transaction.create({
            entityType: 'Supplier',
            entityId: emergencySupplier._id,
            amount: totalExtCost,
            type: 'OUT',
            paymentMethod: 'Cash',
            description: `شراء سريع - قطع غيار لتذكرة صيانة رقم ${ticketId}`,
            date: new Date()
          })
        }
      }

      // Scenario 3: Deduct outsourcedRepairCost from Treasury (OUT)
      const outsourcedCost = Number(ticket.outsourcedRepairCost || 0)
      if (outsourcedCost > 0) {
        await Transaction.create({
          entityType: 'GeneralExpense',
          amount: outsourcedCost,
          type: 'OUT',
          paymentMethod: 'Cash',
          description: `تكلفة صيانة خارجية لتذكرة رقم ${ticketId}`,
          date: new Date()
        })
      }

      // Final Settlement: Add the TOTAL collected from the customer to the Treasury (IN)
      // Since deposit was collected earlier, we collect the remaining. But the prompt says "TOTAL collected".
      // Wait, let's collect the remaining so it balances out, or collect TOTAL and remove the deposit logic?
      // Since deposit logic is still in POST, we collect the REMAINING here to equal TOTAL.
      const remaining = Number(ticket.estimatedCost) - Number(ticket.deposit)
      if (remaining > 0) {
        await Transaction.create({
          entityType: 'Customer',
          amount: remaining,
          type: 'IN',
          paymentMethod: 'Cash',
          description: `سداد باقي تكلفة صيانة تذكرة رقم ${ticketId}`,
          date: new Date()
        })
      }
      
      ticket.financialStatus = 'Paid'
      await ticket.save()
    }

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('[API Maintenance] PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}


export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { id } = params

    const body = await request.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    await RepairTicket.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API Maintenance] DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
