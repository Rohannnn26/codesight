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
      <div className='relative flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-neutral-900 text-zinc-100'>
        <div className='pointer-events-none absolute inset-0'>
          <div className='absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-zinc-500/10 blur-3xl animate-pulse' />
          <div className='absolute bottom-0 right-0 h-80 w-80 rounded-full bg-slate-500/10 blur-3xl animate-pulse [animation-delay:1200ms]' />
        </div>

        <AppSidebar />
        <SidebarInset className='bg-transparent'>
          <header className='sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800/70 bg-zinc-900/60 px-4 backdrop-blur-md'>
            <SidebarTrigger className='-ml-1 text-zinc-100 hover:bg-zinc-800/80 cursor-pointer'/>
            <Separator orientation='vertical' className='mx-2 h-4 bg-zinc-700/80' />
            <h1 className='text-lg font-semibold text-zinc-100'>Dashboard</h1>
          </header>
          <main className="relative flex-1 overflow-auto p-4 md:p-6">
              <div className='rounded-xl border border-zinc-800/70 bg-zinc-900/45 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-6'>
                {children}
              </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout
