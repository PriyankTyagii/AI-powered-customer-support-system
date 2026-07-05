import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

// Match db.ts: the runtime adapter needs the target schema passed explicitly.
const schema = new URL(connectionString).searchParams.get("schema") ?? undefined;
const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined);
const prisma = new PrismaClient({ adapter });

/**
 * Seeds only the product catalog (idempotent upserts). Orders, invoices, and
 * refunds are created by real user actions in the Store UI — never seeded.
 */
const products = [
  {
    sku: "SKU-KEYB-01",
    name: "Mechanical Keyboard",
    description: "Hot-swappable 75% board with tactile switches and PBT keycaps.",
    price: 129.99,
    imageEmoji: "⌨️",
  },
  {
    sku: "SKU-MOUS-01",
    name: "Wireless Mouse",
    description: "Lightweight 58g wireless mouse with 4K polling dongle.",
    price: 79.99,
    imageEmoji: "🖱️",
  },
  {
    sku: "SKU-MONI-01",
    name: "27\" 4K Monitor",
    description: "27-inch 4K IPS panel, 144Hz, USB-C with 90W power delivery.",
    price: 449.99,
    imageEmoji: "🖥️",
  },
  {
    sku: "SKU-HEAD-01",
    name: "Noise-Cancelling Headphones",
    description: "Over-ear ANC headphones with 40h battery and multipoint.",
    price: 199.99,
    imageEmoji: "🎧",
  },
  {
    sku: "SKU-DOCK-01",
    name: "USB-C Dock",
    description: "11-in-1 dock: dual HDMI, 2.5GbE, SD, and 100W passthrough.",
    price: 89.99,
    imageEmoji: "🔌",
  },
  {
    sku: "SKU-CHAR-01",
    name: "GaN Fast Charger",
    description: "65W dual-port GaN charger, foldable plug, laptop-ready.",
    price: 39.99,
    imageEmoji: "⚡",
  },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        imageEmoji: product.imageEmoji,
        active: true,
      },
      create: product,
    });
  }

  console.log(`Product catalog seeded (${products.length} products).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
