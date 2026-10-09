/**
 * Promote a user to douyin role.
 * Usage: npx tsx scripts/make-admin.ts <phone>
 * Example: npx tsx scripts/make-admin.ts 90123456
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: npx tsx scripts/make-admin.ts <phone>");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(`Aucun utilisateur avec le numéro ${phone}`);
    process.exit(1);
  }
  await prisma.user.update({ where: { phone }, data: { role: "douyin" } });
  console.log(`✅  ${phone} est maintenant douyin.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
