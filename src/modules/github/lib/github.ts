import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";
import { get } from "http";

export const getGitHubToken = async () => {
    const session = await auth.api.getSession({
        headers:await headers()
    });

    if (!session) {
        throw new Error("Not authenticated");
    }   

    const account= await prisma.account.findFirst({
        where:{
            userId:session.user.id,
            providerId:"github"
        }
    });

    if(!account?.accessToken){
        throw new Error("No GitHub access token found");
    }
    return account.accessToken;
}

export async function fetchUserContributions(token: string, username: string) {
    const octokit = new Octokit({
        auth: token,
    });

    const query = `
    query($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                            color
                        }
                    }
                }
            }
        }
    }

    `
    interface contributeiondata {
    user: {
        contributionsCollection: {
            contributionCalendar: {
                totalContributions: number;
                weeks: {
                    contributionDays: {
                        date: string;
                        contributionCount: number;
                        color: string;
                    }[];
                }[];
            };
        };
    };
}
    try {
        const response:contributeiondata = await octokit.graphql(query, {
            username: username
        });
        return response.user.contributionsCollection.contributionCalendar;
    } catch (error) {
        throw new Error("Failed to fetch GitHub contributions");
    }
}

export const getRepositories = async (page: number=1 , perPage: number=10) => {
    const token = await getGitHubToken();
    const octokit = new Octokit({
        auth: token,
    });

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        visibility: "all",
        per_page: perPage,
        page: page,
    });

    return data;
}

export const createWebhook = async (owner: string, repo: string) => {
    const token = await getGitHubToken();
    const octokit = new Octokit({
        auth: token,
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const urlWithScheme = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
    const webhookUrl = `${urlWithScheme}/api/webhooks/github`;
    
    const {data:hooks}= await octokit.rest.repos.listWebhooks({
        owner,
        repo,
    });

    const existingHook = hooks.find((hook) => hook.config.url === webhookUrl);

    if (existingHook) {
        return existingHook;
    }

    const{data} = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
            url: webhookUrl,
            content_type: "json",
        },
        events: ["push", "pull_request"],
    });

    return data;
}
    
export const deleteWebhook = async (owner: string, repo: string) => {
    const token = await getGitHubToken();
    const octokit = new Octokit({
        auth: token,
    });
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/github`;

    try{
            const {data:hooks}= await octokit.rest.repos.listWebhooks({
            owner,
            repo,
            }); 

        const hooktoDelete = hooks.find((hook) => hook.config.url === webhookUrl);

        if (hooktoDelete) {
            await octokit.rest.repos.deleteWebhook({
                owner,
                repo,
                hook_id: hooktoDelete.id,
            });

            return true;
        }
    }catch (error) {
        console.error("Failed to delete webhook:", error);
        throw new Error("Failed to delete webhook");
    }
    
}