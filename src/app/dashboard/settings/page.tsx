"use client"
import React from 'react'
import { ProfileForm } from '@/modules/settings/components/profile-form'

const SettingsPage = () => {
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
        <p className='text-muted-foreground'>Manage your account and application settings</p>
      </div>
      <ProfileForm />
    </div>
  )
}

export default SettingsPage
