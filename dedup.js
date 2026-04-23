const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function deduplicateProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const Product = require('./models/Product').default;
  const InventoryUnit = require('./models/InventoryUnit').default;
  const Purchase = require('./models/Purchase').default;
  const Sale = require('./models/Sale').default;

  // Find all products
  const products = await Product.find({});
  
  // Group by name (lowercase/trimmed) + categoryId
  const groups = {};
  for (const p of products) {
    const key = `${p.name.trim().toLowerCase()}_${p.categoryId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  for (const key in groups) {
    const group = groups[key];
    if (group.length > 1) {
      console.log(`Found ${group.length} duplicates for ${key}`);
      
      // Sort by creation date (oldest first), we will keep the oldest (first one)
      group.sort((a, b) => a._id.getTimestamp() - b._id.getTimestamp());
      
      const master = group[0];
      let addedStock = 0;
      
      for (let i = 1; i < group.length; i++) {
        const dup = group[i];
        console.log(`  Merging duplicate ${dup._id} into master ${master._id}`);
        
        addedStock += (dup.stock || 0);

        // Update InventoryUnits
        await InventoryUnit.updateMany(
          { productId: dup._id },
          { $set: { productId: master._id } }
        );

        // Update Purchases (items array)
        // Mongoose might need arrayFilters for nested arrays, or just fetch and save
        const purchases = await Purchase.find({ 'items.productId': dup._id });
        for (const purchase of purchases) {
          purchase.items.forEach(item => {
            if (item.productId && item.productId.toString() === dup._id.toString()) {
              item.productId = master._id;
            }
          });
          await purchase.save();
        }

        // Update Sales (items array)
        const sales = await Sale.find({ 'items.productId': dup._id });
        for (const sale of sales) {
          sale.items.forEach(item => {
            if (item.productId && item.productId.toString() === dup._id.toString()) {
              item.productId = master._id;
            }
          });
          await sale.save();
        }

        // Delete duplicate
        await Product.deleteOne({ _id: dup._id });
      }

      // Update master stock
      if (addedStock > 0) {
        master.stock += addedStock;
        await master.save();
        console.log(`  Updated master stock by +${addedStock} to ${master.stock}`);
      }
    }
  }

  console.log('Deduplication complete.');
  process.exit(0);
}

deduplicateProducts().catch(console.error);
