import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  Check,
  ChevronDown
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';

interface ShopPageProps {
  initialCategorySlug?: string;
  onViewProduct: (product: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  initialCategorySlug,
  onViewProduct
}) => {
  const { products, categories, settings } = useSettings();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name-asc'>('newest');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyNewArrivals, setOnlyNewArrivals] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [priceMax, setPriceMax] = useState<number>(100);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = categories.find(c => c.slug === selectedCategory);
        if (cat && p.categoryId !== cat.id) {
          return false;
        }
      }

      // Stock filter
      if (onlyInStock && (!p.isAvailable || p.stockQuantity <= 0)) {
        return false;
      }

      // New arrivals filter
      if (onlyNewArrivals && !p.isNewArrival) {
        return false;
      }

      // Featured filter
      if (onlyFeatured && !p.isFeatured) {
        return false;
      }

      // Price filter
      if (p.price > priceMax) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catName = categories.find(c => c.id === p.categoryId)?.name.toLowerCase() || '';
        const match =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          catName.includes(q) ||
          p.sku.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    products,
    categories,
    selectedCategory,
    onlyInStock,
    onlyNewArrivals,
    onlyFeatured,
    priceMax,
    searchQuery,
    sortBy
  ]);

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setOnlyInStock(false);
    setOnlyNewArrivals(false);
    setOnlyFeatured(false);
    setPriceMax(100);
    setSortBy('newest');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery !== '' ||
    onlyInStock ||
    onlyNewArrivals ||
    onlyFeatured ||
    priceMax < 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="border-b border-[#261B36] pb-6">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F3EFEA]">
          Shop All Beauty & Essentials
        </h1>
        <p className="text-xs text-[#9C8EB2] mt-1.5">
          Carefully selected cosmetics, skincare, fragrances, and personal care in Monrovia, Liberia.
        </p>
      </div>

      {/* Category Pills (Functional Tab Bar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#F5D061] text-[#0A0710] font-semibold shadow-md'
              : 'bg-[#181124] text-[#C5B9D8] hover:bg-[#251A38] hover:text-[#FFFFFF] border border-[#2E2044]'
          }`}
        >
          All Items ({products.length})
        </button>
        {categories.filter(c => c.isActive).map(cat => {
          const count = products.filter(p => p.categoryId === cat.id).length;
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#F5D061] text-[#0A0710] font-semibold shadow-md'
                  : 'bg-[#181124] text-[#C5B9D8] hover:bg-[#251A38] hover:text-[#FFFFFF] border border-[#2E2044]'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search, Mobile Filter Toggle, Sort Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#120D1B] p-4 rounded-2xl border border-[#261B36]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C829B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product name, description or SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] placeholder-[#8C829B] focus:outline-none focus:border-[#A855F7]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C829B] hover:text-[#F3EFEA]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="lg:hidden px-3.5 py-2.5 rounded-xl bg-[#1A1227] border border-[#34244C] text-xs font-medium text-[#C5B9D8] flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-[#F5D061]" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#F5D061]" />
            )}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8C829B] hidden sm:inline whitespace-nowrap">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#1A1227] border border-[#34244C] text-xs text-[#E2D4B7] py-2.5 px-3 rounded-xl focus:outline-none focus:border-[#A855F7] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid with Sidebar Filter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <div className={`space-y-6 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-[#261B36] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#A855F7]" />
                <h3 className="text-sm font-semibold text-[#F3EFEA] uppercase tracking-wider">
                  Filters
                </h3>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#F5D061] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Availability & Highlights Checkboxes */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9C8EB2]">
                Availability & Tags
              </h4>
              <label className="flex items-center gap-2.5 text-xs text-[#C5B9D8] cursor-pointer hover:text-[#FFFFFF]">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={e => setOnlyInStock(e.target.checked)}
                  className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7] focus:ring-0"
                />
                <span>In Stock only</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#C5B9D8] cursor-pointer hover:text-[#FFFFFF]">
                <input
                  type="checkbox"
                  checked={onlyNewArrivals}
                  onChange={e => setOnlyNewArrivals(e.target.checked)}
                  className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7] focus:ring-0"
                />
                <span>New Arrivals only</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#C5B9D8] cursor-pointer hover:text-[#FFFFFF]">
                <input
                  type="checkbox"
                  checked={onlyFeatured}
                  onChange={e => setOnlyFeatured(e.target.checked)}
                  className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7] focus:ring-0"
                />
                <span>Featured items only</span>
              </label>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-3 pt-3 border-t border-[#261B36]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#9C8EB2]">
                  Max Price
                </span>
                <span className="font-semibold text-[#F5D061] tabular-nums">
                  {settings.currency}{priceMax}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={priceMax}
                onChange={e => setPriceMax(Number(e.target.value))}
                className="w-full accent-[#F5D061] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#8C829B]">
                <span>{settings.currency}10</span>
                <span>{settings.currency}100+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Catalogue Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-12 text-center space-y-4">
              <h3 className="text-lg font-serif font-semibold text-[#F3EFEA]">
                No matching products found
              </h3>
              <p className="text-xs text-[#9C8EB2] max-w-sm mx-auto">
                No items match your active filters or search terms. Try adjusting your query or clear filters to see the full catalogue.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-[#F5D061] text-[#0A0710] font-semibold text-xs tracking-wider uppercase transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-[#9C8EB2] px-1">
                <span>Showing {filteredProducts.length} items</span>
                {selectedCategory !== 'all' && (
                  <span className="text-[#F5D061] font-medium">
                    Category: {categories.find(c => c.slug === selectedCategory)?.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetails={onViewProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
