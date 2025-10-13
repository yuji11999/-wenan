const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking AI configurations in database...\n');
  
  const configs = await prisma.aIConfig.findMany({
    include: {
      user: {
        select: {
          username: true
        }
      }
    }
  });
  
  if (configs.length === 0) {
    console.log('No AI configurations found in database!');
    return;
  }
  
  console.log(`Found ${configs.length} AI configuration(s):\n`);
  
  for (const config of configs) {
    console.log('----------------------------');
    console.log('ID:', config.id);
    console.log('User:', config.user.username);
    console.log('Provider:', config.provider, `(${config.providerName})`);
    console.log('Model:', config.model, `(${config.modelName})`);
    console.log('Base URL:', config.baseUrl);
    console.log('API Key:', config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'Not set');
    console.log('Active:', config.isActive ? '✅ YES' : '❌ NO');
    console.log('Created:', config.createdAt);
    console.log('----------------------------\n');
  }
  
  // Check for active config
  const activeConfig = configs.find(c => c.isActive);
  if (!activeConfig) {
    console.log('⚠️ WARNING: No active AI configuration found!');
    console.log('Please activate one configuration in the frontend settings.');
  } else {
    console.log('✅ Active configuration:', activeConfig.provider, '-', activeConfig.model);
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
