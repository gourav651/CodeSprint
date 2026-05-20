'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export function UserSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !syncedRef.current) {
      syncedRef.current = true;
      
      const syncUser = async () => {
        try {
          const response = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (!response.ok) {
            console.error('Failed to sync user data:', await response.text());
            // Reset synced ref so it retries on next mount/update if it failed
            syncedRef.current = false;
          }
        } catch (err) {
          console.error('Error syncing user:', err);
          syncedRef.current = false;
        }
      };

      syncUser();
    }
  }, [user, isSignedIn, isLoaded]);

  return null;
}
