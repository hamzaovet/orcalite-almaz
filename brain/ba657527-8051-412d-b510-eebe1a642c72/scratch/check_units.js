const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const total = await db.collection('inventoryunits').countDocuments({});
    const withLoc = await db.collection('inventoryunits').countDocuments({ locationId: { $ne: null } });
    const statuses = await db.collection('inventoryunits').distinct('status');
    const locations = await db.collection('inventoryunits').distinct('locationType');

    console.log(JSON.stringify({
      total,
      withLocationId: withLoc,
      uniqueStatuses: statuses,
      uniqueLocationTypes: locations
    }, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkData();
