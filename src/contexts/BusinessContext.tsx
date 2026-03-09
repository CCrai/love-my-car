'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
  const { userProfile } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-select the first business if user has businesses
    if (userProfile?.businesses?.length && !currentBusinessId) {
      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem('selectedBusinessId')
          : null;
      const id = stored || userProfile.businesses[0];
      setCurrentBusinessId(id);
    }
  }, [userProfile, currentBusinessId]);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    getBusinessById(currentBusinessId)
      .then((b) => {
        setCurrentBusiness(b);
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedBusinessId', currentBusinessId);
        }
      })
      .catch(() => {
        // Business fetch failed; currentBusiness remains null
      })
      .finally(() => setLoading(false));
  }, [currentBusinessId]);

  const handleSetCurrentBusinessId = (id: string) => {
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
