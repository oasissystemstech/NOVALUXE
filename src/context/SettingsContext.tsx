import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteSettings, Category, Product } from '../types';
import { store, INITIAL_PROMO_CAMPAIGN } from '../lib/store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
  categories: Category[];
  refreshCategories: () => void;
  products: Product[];
  refreshProducts: () => void;
  resetAll: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => store.getSettings());
  const [categories, setCategories] = useState<Category[]>(() => store.getCategories());
  const [products, setProducts] = useState<Product[]>(() => store.getProducts());

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    async function hydrateFromSupabase() {
      try {
        const [{ data, error }, catalog] = await Promise.all([
          supabase!
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'general_config')
            .maybeSingle(),
          store.syncCatalogFromSupabase()
        ]);

        if (!error && data?.setting_value && active) {
          const remote = data.setting_value as Partial<SiteSettings>;
          setSettings(prev => ({
            ...prev,
            ...remote,
            promoCampaign: {
              ...INITIAL_PROMO_CAMPAIGN,
              ...(prev.promoCampaign || {}),
              ...(remote.promoCampaign || {})
            }
          }));
        }

        if (active && catalog.categories && catalog.categories.length > 0) {
          setCategories(catalog.categories);
        }
        if (active && catalog.products && catalog.products.length > 0) {
          setProducts(catalog.products);
        }
      } catch {}
    }

    hydrateFromSupabase();
    return () => {
      active = false;
    };
  }, []);

  const refreshCategories = () => {
    setCategories(store.getCategories());
  };

  const refreshProducts = () => {
    setProducts(store.getProducts());
  };

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    const updated = store.updateSettings(newSettings);
    setSettings(updated);
  };

  const resetAll = () => {
    store.resetDefaults();
    setSettings(store.getSettings());
    setCategories(store.getCategories());
    setProducts(store.getProducts());
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        categories,
        refreshCategories,
        products,
        refreshProducts,
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
