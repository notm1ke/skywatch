import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";

const globalForPrisma = global as unknown as {
	prismaTasks?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 8 });
export const prismaTasks = globalForPrisma.prismaTasks || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaTasks = prismaTasks;
