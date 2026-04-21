import pkg from 'bcryptjs';
const { hash } = pkg;
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://hamza_admin:To7a2015AbTo7amza@cluster0.nnrm8hu.mongodb.net/orca_db?appName=Cluster0';

async function forcePassword() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      password: String
    }));

    const hashedPassword = await hash('123456', 10);
    
    const result = await User.updateOne(
      { username: 'maestro' },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      console.log('Maestro user not found, trying SuperAdmin role...');
      const result2 = await User.updateOne(
        { role: 'SuperAdmin' },
        { $set: { password: hashedPassword } }
      );
      console.log('Update result (role):', result2);
    } else {
      console.log('Update result (username):', result);
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  }
}

forcePassword();
