import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const AnnouncementBar: React.FC = () => {
  const { settings } = useSettings();

  if (!settings.announcementEnabled || !settings.announcementText) {
    return null;
  }

  return (
    <div className="bg-[#140E20] border-b border-[#3B2D54]/40 py-2 px-4 text-center text-xs tracking-wider text-[#E2D4B7] flex items-center justify-center gap-2">
      <Sparkles className="w-3.5 h-3.5 text-[#F5D061] shrink-0" />
      <span className="font-medium truncate max-w-3xl">{settings.announcementText}</span>
    </div>
  );
};
