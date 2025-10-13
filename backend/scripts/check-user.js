const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking users in database...\n');
  
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.log('No users found in database!');
    return;
  }
  
  console.log(`Found ${users.length} user(s):\n`);
  
  for (const user of users) {
    console.log('----------------------------');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Created:', user.createdAt);
    
    // Test password 'admin123'
    const testPassword = 'admin123';
    const passwordMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password '${testPassword}' matches:`, passwordMatch);
    console.log('----------------------------\n');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

