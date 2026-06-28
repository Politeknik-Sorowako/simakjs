import { db } from '../utils/db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding initial active admin...');
  const email = process.env.ADMIN_EMAIL || 'admin@simak.id';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  const hashedPassword = await Bun.password.hash(adminPassword, {
    algorithm: 'bcrypt',
    cost: 10,
  });

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    await db.update(users)
      .set({
        nama: 'Admin SIMAK',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      })
      .where(eq(users.id, existing.id));
    console.log('Updated existing admin to active.');
  } else {
    await db.insert(users).values({
      email,
      password: hashedPassword,
      nama: 'Admin SIMAK',
      role: 'admin',
      isActive: true,
    });
    console.log('Created new active admin.');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
