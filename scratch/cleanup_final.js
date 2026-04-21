const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://hamza_admin:To7a2015AbTo7amza@cluster0.nnrm8hu.mongodb.net/orca_db?appName=Cluster0';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const productSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema, 'products');
    
    const inventorySchema = new mongoose.Schema({}, { strict: false });
    const InventoryUnit = mongoose.models.InventoryUnit || mongoose.model('InventoryUnit', inventorySchema, 'inventoryunits');

    // Find last 10 products
    const products = await Product.find({}).sort({ _id: -1 }).limit(10);
    const ids = products.map(p => p._id);

    console.log(`Cleaning up ${ids.length} products...`);

    if (ids.length > 0) {
      for (const id of ids) {
        console.log(`Deleting product: ${id}`);
        await Product.deleteOne({ _id: id });
        await InventoryUnit.deleteMany({ productId: id });
      }
      console.log('Cleanup successful.');
    } else {
      console.log('No products found to delete.');
    }

    process.exit(0);
  } catch (err) {
    console.error('CRITICAL CLEANUP ERROR:', err);
    process.exit(1);
  }
}

cleanup();
