import { NextResponse } from 'next/server'
import { connectDB as dbConnect } from '@/lib/db'
import Sale from '@/models/Sale'
import Expense from '@/models/Expense'
import Product from '@/models/Product'

export async function GET() {
  try {
    await dbConnect()

    const [salesAggr, expenseAggr, productsAggr] = await Promise.all([
      Sale.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalSalePrice" },
            totalCost:    { $sum: "$totalCost" },
            totalSalesCount: { $sum: 1 },
          }
        }
      ]),
      Expense.aggregate([
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: "$amount" }
          }
        }
      ]),
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalInventoryValue: { $sum: { $multiply: ["$stock", "$costPrice"] } }
          }
        }
      ])
    ])

    const salesStats = salesAggr[0] || { totalRevenue: 0, totalCost: 0, totalSalesCount: 0 }
    const expensesStats = expenseAggr[0] || { totalExpenses: 0 }
    const productsStats = productsAggr[0] || { totalProducts: 0, totalInventoryValue: 0 }

    const netProfit = salesStats.totalRevenue - salesStats.totalCost - expensesStats.totalExpenses

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: salesStats.totalRevenue,
        totalCost: salesStats.totalCost,
        totalExpenses: expensesStats.totalExpenses,
        netProfit,
        totalOrders: salesStats.totalSalesCount,
        totalProducts: productsStats.totalProducts,
        totalInventoryValue: productsStats.totalInventoryValue,
      }
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
