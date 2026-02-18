"use client"
import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

type LogoutProps = React.ComponentProps<typeof Button>

const Logout = ({
    children,
    className,
    variant = "default",
    size = "default",
    ...props
}: LogoutProps) => {
    const [isPending, startTransition] = useTransition()
    const router = useRouter();
    return(
        <Button
            type="button"
            className={`${className} cursor-pointer enabled:hover:opacity-90 transition-opacity`}
            variant={variant}
            size={size}
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
            {...props}
        >
            {children ?? "Logout"}
        </Button>
    )
}

export default Logout
