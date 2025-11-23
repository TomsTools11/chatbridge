import { prisma } from './index';

async function main() {
  console.log('Starting database seed...');

  // Create a demo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', adminUser);

  // Create a demo email connection
  const emailConnection = await prisma.emailConnection.upsert({
    where: { id: 'demo-email-connection' },
    update: {},
    create: {
      id: 'demo-email-connection',
      provider: 'SES',
      domain: 'bridge.yourapp.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'DEMO_KEY',
        secretAccessKey: 'DEMO_SECRET',
      },
      status: 'ACTIVE',
    },
  });

  console.log('Created email connection:', emailConnection);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
