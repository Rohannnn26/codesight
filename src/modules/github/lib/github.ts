import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

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