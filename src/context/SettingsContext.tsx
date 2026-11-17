import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings, Category, Product } from '../types';
import { store } from '../lib/store';
import { isSupabaseConfigured } from '../lib/supabase';

interface SettingsContextType {
  settings: SiteSettings;
  isHydratedRemote: boolean;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<SiteSettings>;
  categories: Category[];
  refreshCategories: () => void;
  products: Product[];
  refreshProducts: () => void;
  refreshAllFromSupabase: () => Promise<void>;
  resetAll: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => store.getSettings());
  const [categories, setCategories] = useState<Category[]>(() => store.getCategories());
  const [products, setProducts] = useState<Product[]>(() => store.getProducts());
  const [isHydratedRemote, setIsHydratedRemote] = useState<boolean>(() => !isSupabaseConfigured);

  const hydrateFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsHydratedRemote(true);
      return;
    }

    try {
      const [remoteSettings, catalog] = await Promise.all([
        store.syncSettingsFromSupabase(),
        store.syncCatalogFromSupabase()
      ]);

      if (remoteSettings) {
        setSettings(remoteSettings);
      }
      if (catalog.categories !== undefined) {
        setCategories(catalog.categories);
      }
      if (catalog.products !== undefined) {
        setProducts(catalog.products);
      }
    } catch {
      // Keep local cache fallback when network is temporarily unavailable
    } finally {
      setIsHydratedRemote(true);
    }
  }, []);

  useEffect(() => {
    hydrateFromSupabase();

    // Re-sync storefront when a browser tab returns to focus (with light throttling)
    let lastSyncedAt = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncedAt > 15_000) {
        lastSyncedAt = Date.now();
        hydrateFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hydrateFromSupabase]);

  const refreshCategories = useCallback(() => {
    setCategories(store.getCategories());
  }, []);

  const refreshProducts = useCallback(() => {
    setProducts(store.getProducts());
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<SiteSettings>): Promise<SiteSettings> => {
    const updated = await store.updateSettingsAsync(newSettings);
    setSettings(updated);
    return updated;
  }, []);

  const resetAll = useCallback(() => {
    store.resetDefaults();
    setSettings(store.getSettings());
    setCategories(store.getCategories());
    setProducts(store.getProducts());
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isHydratedRemote,
        updateSettings,
        categories,
        refreshCategories,
        products,
        refreshProducts,
        refreshAllFromSupabase: hydrateFromSupabase,
        resetAll
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
