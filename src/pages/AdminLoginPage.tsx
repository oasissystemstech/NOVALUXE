import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NovaluxeLogo } from '../components/NovaluxeLogo';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onBackToStore
}) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier, password);
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#120D1B] rounded-3xl border border-[#2B1D3E] p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Back Link */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs text-[#9C8EB2] hover:text-[#F5D061] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Store</span>
        </button>

        {/* Brand Lockup */}
        <div className="text-center space-y-3">
          <div className="inline-block">
            <NovaluxeLogo size="lg" variant="badge" />
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F142E] text-xs font-semibold text-[#A855F7] border border-[#3C2758]">
              <Shield className="w-3.5 h-3.5" />
              <span>Administrative Portal</span>
            </div>
            <h1 className="text-xl font-serif font-bold text-[#F3EFEA] mt-2">
              Management Access
            </h1>
            <p className="text-xs text-[#9C8EB2]">
              Secure login for NOVALUXE by Sennel administrators.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#C5B9D8]">
              Admin Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C829B]" />
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter your administrator username or email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] placeholder-[#6D5D82] focus:outline-none focus:border-[#A855F7] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#C5B9D8]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C829B]" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] placeholder-[#6D5D82] focus:outline-none focus:border-[#A855F7] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
