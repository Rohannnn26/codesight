"use server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getRepositories } from "@/modules/github/lib/github"
import { create } from "node:domain"
import { createWebhook } from "@/modules/github/lib/github"
import { bigint } from "zod"

export const fetchRepositories = async (page: number = 1, perPage: number = 10) => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("Unauthorized");
    }
    
    const githubRepos = await getRepositories(page, perPage);

    const dbRepos = await prisma.repository.findMany({
        where: {
            userId: session.user.id,
        },
    });

    const connectedRepoIds = new Set(dbRepos.map((repo => repo.githubId)));

    return githubRepos.map((repo:any) => ({
        ...repo,
        isConnected: connectedRepoIds.has(repo.id.toString())
    }))
}


export const connectRepository = async (owner: string, repo: string, githubId: number) => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        throw new Error("Unauthorized");
    }

    const webhook= await createWebhook(owner, repo)
    if(webhook){
        await prisma.repository.create({
            data:{
                githubId: BigInt(githubId),
                owner,
                name:repo,  
                fullName:`${owner}/${repo}`,
                url:`https://github.com/${owner}/${repo}`,
                userId:session.user.id,
            }
        })
    }

    //todo :increment repo count in user table
    //todo : trigger repo indexing for rag (fire and forget)

    return webhook
}