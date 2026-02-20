import React from 'react'
import { SidebarProvider, SidebarTrigger , SidebarInset } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { Separator } from "@/components/ui/separator"
import { requireAuth } from '@/modules/auth/utils/auth-utils'


const DashboardLayout = async(
    { children }: { children: React.ReactNode }
) => {
    await requireAuth();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='bg-background text-foreground min-h-screen'>
        <header className='sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/60 px-4 backdrop-blur-md'>
          <SidebarTrigger className='-ml-1 cursor-pointer'/>
          <Separator orientation='vertical' className='mx-2 h-4' />
          <h1 className='text-lg font-semibold'>Dashboard</h1>
        </header>
        <main className="relative flex-1 overflow-auto p-4 md:p-6">
            <div className='rounded-xl border border-border bg-card/45 p-4 shadow-lg backdrop-blur-sm md:p-6'>
              {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayout
