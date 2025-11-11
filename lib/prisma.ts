import { PrismaClient } from "~/prisma/generated/client";

export * from "~/prisma/generated/models";

const globalForPrisma = global as unknown as {
	prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
