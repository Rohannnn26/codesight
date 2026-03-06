"use server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { deleteWebhook } from "@/modules/github/lib/github"


export async function getUserProfile() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if(!session){
            throw new Error("Unauthorized");
        }
        const user= await prisma.user.findUnique({
            where:{
                id:session.user.id
            },
            select:{
                id:true,
                name:true,
                email:true,
                image:true,
                createdAt:true,
            }
        })
        return user
    }catch (error) {
        console.error("Error fetching user profile:", error);
        throw new Error("Failed to fetch user profile");
    }
}

export async function updateUserProfile({ name, email }: { name: string; email: string }) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if(!session){
            throw new Error("Unauthorized");
        }
        const updatedUser = await prisma.user.update({
            where:{
                id:session.user.id
            },
            data:{
                name,
                email
            },
            select:{
                id:true,
                name:true,
                email:true,                
            }
        })
        revalidatePath("/dashboard/settings" , "page")
        return {
            success : true,
            updatedUser
        }
    }catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error("Failed to update user profile");
    }
}

export async function getConnectedRepositories() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if(!session){
            throw new Error("Unauthorized");
        }
        const repos= await prisma.repository.findMany({
            where:{
                userId:session.user.id
            },
            select:{
                id:true,
                name:true,
                fullName:true,
                url:true,
                createdAt:true,
            },
            orderBy:{
                createdAt:"desc"
            }
        })
        return repos
    }catch (error) {
        console.error("Error fetching connected repositories:", error);
        throw new Error("Failed to fetch connected repositories");
        return []
    }
}

export async function disconnectRepository(repoId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if(!session){
            throw new Error("Unauthorized");
        }
        const repo = await prisma.repository.findFirst({
            where:{
                id:repoId,
                userId:session.user.id
            }
        })
        if(!repo){
            throw new Error("Repository not found");
        }
        await deleteWebhook(repo.owner, repo.name)
        
        await prisma.repository.delete({
            where:{
                id:repoId,
                userId:session.user.id
            }
        })
        revalidatePath("/dashboard/settings" , "page")
        revalidatePath("/dashboard/repositories" , "page") 
        return {
            success : true,
        }
       
    }catch (error) {
        console.error("Error disconnecting repository:", error);
        return { 
            success : false,
            error : "Failed to disconnect repository"
        }
    }
}  

export async function disconnectAllRepositories() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if(!session){
            throw new Error("Unauthorized");
        }

        const repos = await prisma.repository.findMany({
            where:{
                userId:session.user.id,
            }
        })
        await Promise.all(repos.map((r) => deleteWebhook(r.owner, r.name)))
        await prisma.repository.deleteMany({
            where:{
                userId:session.user.id,
            }
        })

        const count = repos.length

        revalidatePath("/dashboard/settings" , "page")
        revalidatePath("/dashboard/repositories" , "page") 
        
        return {
            success : true,
            count,
        }
    }catch (error) {
        console.error("Error disconnecting all repositories:", error);
        return { 
            success : false,
            count: 0,
            error : "Failed to disconnect all repositories"
        }
    }
}