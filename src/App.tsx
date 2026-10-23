import React, { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PolicyPages } from './pages/PolicyPages';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Product, Order } from './types';
import { store } from './lib/store';

const MainAppContent: React.FC = () => {
  const { isAdmin } = useAuth();

  // Route state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Selected product for detail view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Selected order for confirmation view
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Initial category slug for shop view
  const [shopCategorySlug, setShopCategorySlug] = useState<string | undefined>(undefined);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string, param?: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (path === '/shop') {
      setShopCategorySlug(param);
    }
    setCurrentPath(path);
    try {
      window.history.pushState({}, '', path);
    } catch {}
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    navigateTo(`/product/${product.slug}`);
  };

  const handleOrderPlaced = (order: Order) => {
    setConfirmedOrder(order);
    navigateTo(`/order-confirmation/${order.orderReference}`);
  };

  // Check if admin dashboard or login
  const isAdminRoute = currentPath.startsWith('/admin');

  // If visiting an admin route
  if (isAdminRoute) {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#0C0813] text-[#F3EFEA] flex flex-col justify-between">
          <AnnouncementBar />
          <AdminLoginPage
            onSuccess={() => navigateTo('/admin')}
            onBackToStore={() => navigateTo('/')}
          />
          <Footer onNavigate={navigateTo} />
        </div>
      );
    }
    return <AdminDashboardPage onBackToStore={() => navigateTo('/')} />;
  }

  // Render regular customer-facing storefront
  return (
    <div className="min-h-screen bg-[#0C0813] text-[#F3EFEA] flex flex-col justify-between selection:bg-[#7C3AED] selection:text-white">
      {/* Top Banner and Header */}
      <div>
        <AnnouncementBar />
        <Header
          currentPath={currentPath}
          onNavigate={navigateTo}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </div>

      {/* Main Page View */}
      <main className="flex-1">
        {currentPath === '/' && (
          <HomePage
            onNavigate={navigateTo}
            onViewProduct={handleViewProduct}
          />
        )}

        {currentPath === '/shop' && (
          <ShopPage
            initialCategorySlug={shopCategorySlug}
            onViewProduct={handleViewProduct}
          />
        )}

        {currentPath.startsWith('/product/') && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => navigateTo('/shop')}
            onViewProduct={handleViewProduct}
            onNavigateToCheckout={() => navigateTo('/checkout')}
          />
        )}

        {currentPath === '/cart' && (
          <CartPage
            onNavigateToShop={() => navigateTo('/shop')}
            onNavigateToCheckout={() => navigateTo('/checkout')}
          />
        )}

        {currentPath === '/checkout' && (
          <CheckoutPage
            onBackToCart={() => navigateTo('/cart')}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {currentPath.startsWith('/order-confirmation/') && confirmedOrder && (
          <OrderConfirmationPage
            order={confirmedOrder}
            onNavigateHome={() => navigateTo('/')}
            onNavigateToShop={() => navigateTo('/shop')}
          />
        )}

        {currentPath === '/about' && (
          <AboutPage onNavigateToShop={() => navigateTo('/shop')} />
        )}

        {currentPath === '/contact' && <ContactPage />}

        {currentPath === '/delivery-returns' && (
          <PolicyPages policyType="delivery-returns" onBack={() => navigateTo('/')} />
        )}

        {currentPath === '/terms' && (
          <PolicyPages policyType="terms" onBack={() => navigateTo('/')} />
        )}

        {currentPath === '/privacy' && (
          <PolicyPages policyType="privacy" onBack={() => navigateTo('/')} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        onNavigateToCart={() => navigateTo('/cart')}
        onNavigateToCheckout={() => navigateTo('/checkout')}
      />

      {/* Product Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={handleViewProduct}
      />

      {/* Floating Hover WhatsApp Contact Button */}
      <WhatsAppFloatingButton />
    </div>
  );
};

export function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <MainAppContent />
        </CartProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
