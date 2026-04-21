import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';

// Manual .env parsing
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split(/\r?\n/).forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const index = trimmedLine.indexOf('=');
      if (index !== -1) {
        const key = trimmedLine.substring(0, index).trim();
        const value = trimmedLine.substring(index + 1).trim()
          .replace(/^["'](.*)["']$/, '$1');
        env[key] = value;
      }
    });
    return env;
  } catch (err) {
    console.error('Error loading .env file:', err);
    return {};
  }
}

const env = loadEnv();
const MONGODB_URI = env.MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env or environment');
  process.exit(1);
}

// Define the schema inline to avoid importing .ts file
const landingPageSchema = new mongoose.Schema(
  {
    heroTitle: { type: String, required: true },
    heroSubtitle: { type: String, required: true },
    brandPromiseTitle: { type: String, required: true, default: 'لماذا ORCA؟' },
    brandPromiseDescription: { type: String, required: true, default: 'نحن لا نبيع الهواتف فحسب، نحن نبني مستقبل التجارة الذكية في مصر.' },
    footerDescription: { type: String, required: true },
    advantages: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true, default: 'Zap' },
      },
    ],
    contact: {
      phone: { type: String, default: '01129592916' },
      whatsapp: { type: String, default: '01129592916' },
      address: { type: String, default: 'السراج مول، مكرم عبيد، مدينة نصر' },
    },
  },
  { timestamps: true, collection: 'landingpages' } // Explicitly set the collection name
);

const LandingPage = mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema);

const NEW_TEXT = 'أوركا ERP: درعك المحاسبي ومحرك مبيعاتك. المنظومة الأولى المصممة خصيصاً لتجار وموزعي الهواتف الذكية للسيطرة على حركة السوق.';

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await LandingPage.findOneAndUpdate(
      {},
      { $set: { footerDescription: NEW_TEXT } },
      { upsert: true, new: true }
    );

    console.log('Successfully updated LandingPage footer description:');
    console.log(result.footerDescription);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error updating footer description:', error);
    process.exit(1);
  }
}

run();
