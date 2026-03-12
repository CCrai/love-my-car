'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Business } from '@/types';
import { getBusinessById } from '@/lib/firestore/businesses';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessContextType {
  currentBusiness: Business | null;
  setCurrentBusinessId: (id: string) => void;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const storageKey = user ? `selectedBusinessId:${user.uid}` : null;
  const userBusinesses = useMemo(() => userProfile?.businesses || [], [userProfile?.businesses]);

  useEffect(() => {
    if (!userProfile || userBusinesses.length === 0) {
      setCurrentBusinessId(null);
      setCurrentBusiness(null);
      return;
    }

    const stored =
      typeof window !== 'undefined' && storageKey
        ? localStorage.getItem(storageKey)
        : null;

    const nextBusinessId = stored && userBusinesses.includes(stored)
      ? stored
      : userBusinesses[0];

    if (currentBusinessId !== nextBusinessId) {
      setCurrentBusinessId(nextBusinessId);
    }
  }, [userProfile, userBusinesses, storageKey, currentBusinessId]);

  useEffect(() => {
    if (!currentBusinessId) {
      setCurrentBusiness(null);
      return;
    }

    if (userBusinesses.length > 0 && !userBusinesses.includes(currentBusinessId)) {
      setCurrentBusinessId(userBusinesses[0] || null);
      return;
    }

    setLoading(true);
    getBusinessById(currentBusinessId)
      .then((b) => {
        setCurrentBusiness(b);
        if (typeof window !== 'undefined' && storageKey) {
          localStorage.setItem(storageKey, currentBusinessId);
        }
      })
      .catch(() => {
        // Business fetch failed; currentBusiness remains null
      })
      .finally(() => setLoading(false));
  }, [currentBusinessId, userBusinesses, storageKey]);

  const handleSetCurrentBusinessId = (id: string) => {
    if (!userBusinesses.includes(id)) return;
    setCurrentBusinessId(id);
  };

  return (
    <BusinessContext.Provider
      value={{ currentBusiness, setCurrentBusinessId: handleSetCurrentBusinessId, loading }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusinessContext must be used within BusinessProvider');
  return context;
}
