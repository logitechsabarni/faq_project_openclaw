require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_support';

async function seed() {
  await mongoose.connect(MONGO_URI);
  const User = require('./models/User');

  const exists = await User.findOne({ email: 'admin@faqhub.edu' });
  if (exists) {
    console.log('Admin user already exists:', exists.email);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@faqhub.edu',
    password: 'faqadmin123',
    role: 'admin',
    department: 'Administration',
    isActive: true,
  });

  console.log('✅ Admin user created');
  console.log('   Email:    admin@faqhub.edu');
  console.log('   Password: faqadmin123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });