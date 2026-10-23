import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteSettings, Category, Product } from '../types';
import { store } from '../lib/store';

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
