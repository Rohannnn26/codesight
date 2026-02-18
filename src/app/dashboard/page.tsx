import React from 'react'


const MainPage = () => {
  return (
    <div className='relative space-y-6'>
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute top-0 right-8 h-40 w-40 rounded-full bg-zinc-400/10 blur-3xl animate-pulse' />
      </div>

      <section className='rounded-xl border border-zinc-700/70 bg-gradient-to-r from-zinc-900/70 via-zinc-800/50 to-zinc-900/70 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]'>
        <h2 className='text-2xl font-semibold text-zinc-100'>Welcome to your dashboard</h2>
        <p className='mt-2 text-sm text-zinc-400'>
          Monitor repositories, reviews, and subscription activity in one place.
        </p>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        <article className='rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-800/65'>
          <p className='text-xs uppercase tracking-widest text-zinc-500'>Repositories</p>
          <p className='mt-3 text-3xl font-semibold text-zinc-100'>0</p>
        </article>
        <article className='rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-800/65'>
          <p className='text-xs uppercase tracking-widest text-zinc-500'>Reviews</p>
          <p className='mt-3 text-3xl font-semibold text-zinc-100'>0</p>
        </article>
        <article className='rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-800/65'>
          <p className='text-xs uppercase tracking-widest text-zinc-500'>Active Plan</p>
          <p className='mt-3 text-3xl font-semibold text-zinc-100'>Free</p>
        </article>
      </section>

      <section className='rounded-xl border border-zinc-800/70 bg-zinc-900/55 p-6'>
        <h3 className='text-base font-medium text-zinc-200'>Recent Activity</h3>
        <p className='mt-2 text-sm text-zinc-400'>No recent activity yet.</p>
      </section>
    </div>
  )
}

export default MainPage
