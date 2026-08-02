import { eq } from 'drizzle-orm';
import { parseArgs } from 'util';
import { users } from '../models/schema';
import { db } from '../utils/db';

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      nama: { type: 'string' },
    },
    strict: false,
    allowPositionals: true,
  });

  const rawEmail = typeof values.email === 'string' ? values.email : '';
  const email = rawEmail.trim();
  const password = typeof values.password === 'string' ? values.password : 'SuperAdmin123!';
  const nama = typeof values.nama === 'string' ? values.nama : 'Super Administrator';

  if (!email) {
    console.error(
      '❌ Usage: bun run src/scripts/manage-superadmin.ts --email=<email> [--password=<password>] [--nama=<nama>]',
    );
    process.exit(1);
  }

  const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    await db
      .update(users)
      .set({
        role: 'super_admin',
        password: hashedPassword,
        isActive: true,
        mustChangePassword: false,
      })
      .where(eq(users.id, existingUser.id));

    console.log(`✅ Success: User '${email}' (ID: ${existingUser.id}) has been promoted/taken over as super_admin.`);
    console.log(`   Password updated to: ${password}`);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle insert typing
    const insertData: any = {
      email,
      password: hashedPassword,
      nama,
      role: 'super_admin',
      isActive: true,
      mustChangePassword: false,
    };
    const [newUser] = await db.insert(users).values(insertData).returning();

    console.log(`✅ Success: New super_admin user created successfully!`);
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error executing manage-superadmin:', err);
  process.exit(1);
});
