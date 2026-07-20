import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SEED_TEMPLATES } from "../lib/social/templates";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Seeding social templates…");
  for (const template of SEED_TEMPLATES) {
    await prisma.socialTemplate.upsert({
      where: { name: template.name },
      create: {
        name: template.name,
        platform: template.platform,
        hook: template.hook,
        script: template.script,
        caption: template.caption,
        hashtags: template.hashtags,
      },
      update: {
        platform: template.platform,
        hook: template.hook,
        script: template.script,
        caption: template.caption,
        hashtags: template.hashtags,
      },
    });
    console.log(`  ✓ ${template.name}`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
