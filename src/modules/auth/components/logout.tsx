"use client"
import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

type LogoutProps = {
    children?: React.ReactNode,
    className?: string
}

const Logout = ({ children, className }: LogoutProps) => {
    const [isPending, startTransition] = useTransition()
    const router = useRouter();
    return(
        <Button
            type="button"
            className={className}
            disabled={isPending}
            onClick={() => {
                startTransition(() => {
                    signOut({
                        fetchOptions: {
                            onSuccess: () => {
                                router.push("/login");
                            }
                        }
                    })
                })
            }}
        >
            {children ?? "Logout"}
        </Button>
    )
}

export default Logout
