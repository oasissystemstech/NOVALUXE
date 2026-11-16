import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const AnnouncementBar: React.FC = () => {
  const { settings } = useSettings();

  if (!settings.announcementEnabled || !settings.announcementText) {
    return null;
  }

  return (
    <div className="bg-[#F2EBDD] dark:bg-[#140E20] border-b border-[#E2D9C8] dark:border-[#3B2D54]/40 py-2 px-4 text-center text-xs tracking-wider text-[#211B25] dark:text-[#E2D4B7] flex items-center justify-center gap-2 transition-colors duration-200">
      <Sparkles className="w-3.5 h-3.5 text-[#8B42C9] dark:text-[#F5D061] shrink-0" />
      <span className="font-medium truncate max-w-3xl">{settings.announcementText}</span>
    </div>
  );
};
