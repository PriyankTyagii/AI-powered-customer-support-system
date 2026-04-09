import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg(new Pool({ connectionString }));
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = "user_001";

  await prisma.refund.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();

  const orderA = await prisma.order.create({
    data: {
      userId,
      orderNumber: "ORD-1001",
      status: "SHIPPED",
      trackingNumber: "TRK-889911",
      eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const orderB = await prisma.order.create({
    data: {
      userId,
      orderNumber: "ORD-1002",
      status: "PROCESSING",
    },
  });

  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNo: "INV-3001",
      userId,
      orderId: orderA.id,
      amount: 149.99,
      currency: "USD",
      status: "PAID",
      issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNo: "INV-3002",
      userId,
      orderId: orderB.id,
      amount: 49.99,
      currency: "USD",
      status: "PENDING",
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.refund.create({
    data: {
      invoiceId: invoiceA.id,
      amount: 20,
      reason: "Partial refund for delayed shipping",
      status: "COMPLETED",
      requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: "Refund and delivery question",
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: "Hi, where is my order ORD-1001?",
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: "Your order ORD-1001 is in transit and should arrive in 2 days.",
        agentType: "order",
      },
    ],
  });

  console.log("Seed data inserted successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
