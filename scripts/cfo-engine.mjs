import { readFileSync, writeFileSync } from 'fs'

// --- 1. SHIPMENTS API ---
const shipmentsFile = 'd:/Work/freezone-erp/app/api/shipments/route.ts'
let shipmentsContent = readFileSync(shipmentsFile, 'utf8')

// Add import Supplier 
if (!shipmentsContent.includes("import Supplier")) {
  shipmentsContent = shipmentsContent.replace("import Shipment from '@/models/Shipment'", "import Shipment from '@/models/Shipment'\nimport Supplier from '@/models/Supplier'")
}

// Inject supplier balance update
const targetShipmentUpdate = `    const shipment = await Shipment.create({
      shipmentNumber: finalShipmentNumber,
      supplierId,
      date: date || new Date(),
      currency,
      exchangeRate,
      status: status || 'Draft',
      items: processedItems,
      expenses: expenses || [],
      totalForeignCost: Number(totalForeignCost.toFixed(4)),
      totalLandedCostEGP: Number(totalLandedCostEGP.toFixed(4)),
    })`

const shipmentSupplierUpdate = `    const shipment = await Shipment.create({
      shipmentNumber: finalShipmentNumber,
      supplierId,
      date: date || new Date(),
      currency,
      exchangeRate,
      status: status || 'Draft',
      items: processedItems,
      expenses: expenses || [],
      totalForeignCost: Number(totalForeignCost.toFixed(4)),
      totalLandedCostEGP: Number(totalLandedCostEGP.toFixed(4)),
    })

    // CFO LOGIC: Increase Supplier Debt
    const addedDebtEGP = Number(totalForeignCost * exchangeRate)
    await Supplier.findByIdAndUpdate(supplierId, { $inc: { balance: addedDebtEGP } })`

shipmentsContent = shipmentsContent.replace(targetShipmentUpdate, shipmentSupplierUpdate)
writeFileSync(shipmentsFile, shipmentsContent, 'utf8')


// --- 2. TRANSACTIONS API ---
const txFile = 'd:/Work/freezone-erp/app/api/transactions/route.ts'
let txContent = readFileSync(txFile, 'utf8')

// Add imports
if (!txContent.includes("import Supplier")) {
  txContent = txContent.replace(/import Transaction(.*)/, "import Transaction$1\nimport Supplier from '@/models/Supplier'\nimport Shipment from '@/models/Shipment'")
}

// Ensure extraction of forex fields
const extractOriginal = `const { amount, type, paymentMethod, description, entityType, entityId, entityName, date } = body`
const extractNew = `const { amount, type, paymentMethod, description, entityType, entityId, entityName, date, actualExchangeRate, foreignAmountPaid, shipmentId, currency } = body`
txContent = txContent.replace(extractOriginal, extractNew)

// Update valid entities for System_Forex_Adjustment
txContent = txContent.replace(`['Branch', 'Supplier', 'Customer', 'GeneralExpense', 'Sales', 'BankAccount', 'OwnerEquity']`, `['Branch', 'Supplier', 'Customer', 'GeneralExpense', 'Sales', 'BankAccount', 'OwnerEquity', 'System_Forex_Adjustment']`)

// Save forex fields to main transaction
const mainTxOld = `      entityName:    entityName || undefined,
      date:          date ? new Date(date) : new Date(),
    })`
const mainTxNew = `      entityName:    entityName || undefined,
      date:          date ? new Date(date) : new Date(),
      actualExchangeRate: actualExchangeRate ? Number(actualExchangeRate) : undefined,
      foreignAmountPaid: foreignAmountPaid ? Number(foreignAmountPaid) : undefined,
      shipmentId: shipmentId || undefined,
      currency: currency || undefined,
    })`
txContent = txContent.replace(mainTxOld, mainTxNew)

// Insert Double-Entry CFO rules after main transaction creation
const sideEffectLocation = `    // Side Effect: Update Internal Account Balance`
const doubleEntryRule = `
    // CFO LOGIC: Supplier Debt & Auto System Forex Adjustment
    if (entityType === 'Supplier' && type === 'OUT' && entityId) {
      if (shipmentId && foreignAmountPaid && actualExchangeRate) {
        const shipment = await Shipment.findById(shipmentId)
        if (shipment) {
          const bookedRate = shipment.exchangeRate
          const supplierReduction = foreignAmountPaid * bookedRate
          const safeDeduction = foreignAmountPaid * actualExchangeRate

          // 1. Reduce Debt strictly by Booked Rate equivalent
          await Supplier.findByIdAndUpdate(entityId, { $inc: { balance: -supplierReduction } })

          // 2. Adjust Trial Balance for P&L
          const difference = safeDeduction - supplierReduction // +ve means Expense, -ve means Revenue
          if (difference !== 0) {
            await Transaction.create({
              amount: Math.abs(difference),
              type: difference > 0 ? 'OUT' : 'IN', // OUT = Loss (Expense), IN = Gain (Revenue)
              paymentMethod: 'Cash',
              description: \`تسوية فروق عملة دولار/درهم للرسالة $\{shipment.shipmentNumber} ($\{difference > 0 ? 'خسارة' : 'إيراد'}) \`,
              entityType: 'System_Forex_Adjustment',
              entityId: shipment._id,
              date: date ? new Date(date) : new Date(),
            })
          }
        }
      } else {
        // Fallback for regular supplier payments without forex linkage
        await Supplier.findByIdAndUpdate(entityId, { $inc: { balance: -Number(amount) } })
      }
    }

    // Side Effect: Update Internal Account Balance`
txContent = txContent.replace(sideEffectLocation, doubleEntryRule)

writeFileSync(txFile, txContent, 'utf8')


// --- 3. REPORTS DASHBOARD ---
const reportsFile = 'd:/Work/freezone-erp/app/dashboard/reports/page.tsx'
let reportsContent = readFileSync(reportsFile, 'utf8')

const forexOld = `    // ── Forex Gain/Loss Engine (Precise Booked-Rate vs Actual-Rate) ──
    let forexImpact = 0
    allTransactions.forEach(tx => {
      const txDate = new Date(tx.date || tx.createdAt)
      if (txDate >= start && txDate <= end) {
        if (tx.entityType === 'Supplier' && tx.type === 'OUT' && tx.foreignAmountPaid != null && tx.actualExchangeRate != null) {
          let bookedRate = tx.actualExchangeRate  // fallback if no shipment linked
          if (tx.shipmentId) {
            const linkedShipment = allShipments.find(s => String(s._id) === String(tx.shipmentId))
            if (linkedShipment) bookedRate = linkedShipment.exchangeRate
          }
          // Gain = company saved EGP (booked more, paid less)
          // Loss  = company spent more EGP vs what they had budgeted
          forexImpact += (bookedRate - tx.actualExchangeRate) * tx.foreignAmountPaid
        }
      }
    })`

const forexNew = `    // ── CFO SECURED Forex Engine (Explicit Trial Balance Aggregation) ──
    let forexImpact = 0
    allTransactions.forEach(tx => {
      const txDate = new Date(tx.date || tx.createdAt)
      if (txDate >= start && txDate <= end && tx.entityType === 'System_Forex_Adjustment') {
        // System_Forex_Adjustment IN = Gain (+), OUT = Loss (-)
        if (tx.type === 'IN') forexImpact += tx.amount
        else if (tx.type === 'OUT') forexImpact -= tx.amount
      }
    })`
    
reportsContent = reportsContent.replace(forexOld, forexNew)
writeFileSync(reportsFile, reportsContent, 'utf8')

console.log('CFO LOGIC SECURED')
