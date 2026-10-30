import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAdminAuthChange } from '../services/authService';

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAdminAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, isAdmin: !!user, setUser };
}
