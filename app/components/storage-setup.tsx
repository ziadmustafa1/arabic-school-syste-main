"use client"

import { useState, useEffect } from "react"

// Component that sets up storage buckets on first app load
export function StorageSetup() {
  const [setupDone, setSetupDone] = useState(false)
  
  useEffect(() => {
    // Check if storage setup has already been run in this session
    if (sessionStorage.getItem('storage-setup-complete')) {
      setSetupDone(true)
      return
    }
    
    // Run setup only once per session
    const runStorageSetup = async () => {
      try {
        const response = await fetch('/api/storage-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        
        if (data.success) {
          console.log('Storage setup successful', data)
          sessionStorage.setItem('storage-setup-complete', 'true')
        } else {
          console.error('Storage setup failed:', data.error)
        }
      } catch (error) {
        console.error('Error during storage setup:', error)
      } finally {
        setSetupDone(true)
      }
    }
    
    runStorageSetup()
  }, [])
  
  // This component doesn't render anything
  return null
} 