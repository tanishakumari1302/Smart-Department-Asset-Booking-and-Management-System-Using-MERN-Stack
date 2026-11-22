import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel } from './models/User.js';
import { AssetModel } from './models/Asset.js';
import { BookingModel } from './models/Booking.js';
import { AuditLogModel } from './models/AuditLog.js';
import { INITIAL_USERS, INITIAL_ASSETS, INITIAL_BOOKINGS, INITIAL_AUDIT_LOGS } from './seedData.js';

dotenv.config();

async function runSeed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is missing. Please define MONGODB_URI in your .env file.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas at:', uri.replace(/:([^@]+)@/, ':****@'));
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas.');

  console.log('Clearing existing collections...');
  await UserModel.deleteMany({});
  await AssetModel.deleteMany({});
  await BookingModel.deleteMany({});
  await AuditLogModel.deleteMany({});

  console.log('Inserting default academic users (Admin, Faculty, Tech)...');
  for (const u of INITIAL_USERS) {
    const user = new UserModel({
      name: u.name,
      email: u.email,
      password: 'Password@123',
      role: u.role,
      department: u.department,
      designation: u.designation,
      facultyId: u.facultyId,
      phone: u.phone,
      room: u.room,
    });
    await user.save();
  }

  console.log('Inserting 35 asset catalog types across 4 categories...');
  await AssetModel.insertMany(INITIAL_ASSETS);

  console.log('Inserting initial requisitions & active checkouts...');
  await BookingModel.insertMany(INITIAL_BOOKINGS);

  console.log('Inserting activity stream and compliance audit logs...');
  await AuditLogModel.insertMany(INITIAL_AUDIT_LOGS);

  const totalUnits = INITIAL_ASSETS.reduce((s, a) => s + a.totalQuantity, 0);
  console.log('✅ MongoDB Atlas Seed Completed Successfully!');
  console.log('Summary:');
  console.log(`- Database: assethub (Atlas Cluster)`);
  console.log(`- Users: ${INITIAL_USERS.length}`);
  console.log(`- Assets: ${INITIAL_ASSETS.length} (35 catalog types)`);
  console.log(`- Total Units: ${totalUnits} units`);
  console.log(`- Requisitions: ${INITIAL_BOOKINGS.length}`);
  console.log(`- Audit Logs: ${INITIAL_AUDIT_LOGS.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
