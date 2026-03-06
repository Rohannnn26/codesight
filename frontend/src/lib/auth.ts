import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db";
// If your Prisma file is located elsewhere, you can change the path

const githubRepoAccess = process.env.GITHUB_REPO_ACCESS;
const githubScopes = [
    "read:user",
    "user:email",
    ...(githubRepoAccess === "private" ? ["repo"] : ["public_repo"]),
];

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    
    socialProviders:{
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            scope: githubScopes,
        },
    }
});