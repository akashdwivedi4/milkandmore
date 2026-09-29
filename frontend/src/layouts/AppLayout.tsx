import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { OnboardingModal } from '../components/OnboardingModal';
import { VoiceAssistant } from '../components/VoiceAssistant';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Onboarding Wizard Modal when business setup is pending */}
      <OnboardingModal />

      {/* Top Header */}
      <Navbar />

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto">
        {/* Desktop Left Navigation */}
        <DesktopSidebar />

        {/* Main Content Area: Responsive with 360px+ support, no overflow */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Voice Assistant floating control */}
      <VoiceAssistant />

      {/* Mobile Fixed Navigation */}
      <MobileBottomNav />
    </div>
  );
};
