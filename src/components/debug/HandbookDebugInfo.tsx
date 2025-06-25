'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getHandbookTrialStatus } from '@/lib/trial-service';

interface DebugInfo {
  userStatus: string;
  isAuthenticated: boolean;
  isOwner: boolean | null;
  trialStatus: any;
  shouldShowPaywall: boolean;
  sections: Array<{
    title: string;
    isPublic: boolean;
    isPublished: boolean;
    visible: boolean;
  }>;
  handbookDbData: any;
}

interface HandbookDebugInfoProps {
  handbookId: string;
  sections: any[];
}

export function HandbookDebugInfo({ handbookId, sections }: HandbookDebugInfoProps) {
  const { user, authLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    async function gatherDebugInfo() {
      try {
        // Check ownership
        let ownershipStatus = null;
        if (user) {
          const response = await fetch(`/api/handbook/${handbookId}/ownership?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            ownershipStatus = data.isOwner;
            setIsOwner(data.isOwner);
          }
        }

        // Get trial status (handbook-specific)
        let trialStatus = null;
        let handbookDbData = null;
        if (user && ownershipStatus) {
          // First check what's in the database
          const response = await fetch(`/api/debug/handbook-data?handbookId=${handbookId}&userId=${user.id}`);
          if (response.ok) {
            handbookDbData = await response.json();
          }
          
          trialStatus = await getHandbookTrialStatus(user.id, handbookId);
        }

        // Determine if paywall should show
        const shouldShowPaywall = ownershipStatus && trialStatus && 
          !trialStatus.isInTrial && 
          trialStatus.subscriptionStatus !== 'active' &&
          trialStatus.trialEndsAt;

        console.log('🐛 Debug Info Details:', {
          user: user ? { id: user.id, email: user.email } : null,
          authLoading,
          ownershipStatus,
          trialStatus,
          shouldShowPaywall,
          handbookId
        });

        const info: DebugInfo = {
          userStatus: user ? 'logged_in' : 'anonymous',
          isAuthenticated: !!user,
          isOwner: ownershipStatus,
          trialStatus,
          shouldShowPaywall,
          sections: sections.map(section => ({
            title: section.title,
            isPublic: section.is_public ?? true,
            isPublished: section.is_published ?? true,
            visible: true
          })),
          handbookDbData
        };

        setDebugInfo(info);
      } catch (error) {
        console.error('Error gathering debug info:', error);
      }
    }

    if (!authLoading) {
      gatherDebugInfo();
    }
  }, [user, authLoading, handbookId, sections]);

  const fixHandbookTrial = async () => {
    if (!user || !debugInfo?.isOwner) return;
    
    setIsFixing(true);
    try {
      const response = await fetch('/api/debug/fix-handbook-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handbookId,
          userId: user.id
        })
      });
      
      if (response.ok) {
        // Refresh debug info
        window.location.reload();
      } else {
        console.error('Failed to fix handbook trial');
      }
    } catch (error) {
      console.error('Error fixing handbook trial:', error);
    } finally {
      setIsFixing(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!debugInfo) {
    return (
      <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm">
        <div className="font-bold mb-2">🔍 Debug Info</div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">🔍 Handbook Debug Info</div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-300">Handbook ID:</span> {handbookId}
        </div>
        
        <div>
          <span className="text-gray-300">User:</span> {debugInfo.userStatus}
        </div>
        
        <div>
          <span className="text-gray-300">Is Owner:</span> {debugInfo.isOwner ? 'Yes' : 'No'}
        </div>
        
        <div>
          <span className="text-gray-300">Paywall:</span> {debugInfo.shouldShowPaywall ? '🔒 Shown' : '✅ Hidden'}
        </div>
        
        {debugInfo.trialStatus && (
          <>
            <div>
              <span className="text-gray-300">Trial:</span> {
                debugInfo.trialStatus.isInTrial ? 
                  `🟢 Active (${debugInfo.trialStatus.trialDaysRemaining} days)` : 
                  '🔴 Expired'
              }
            </div>
            <div>
              <span className="text-gray-300">Subscription:</span> {debugInfo.trialStatus.subscriptionStatus}
            </div>
            <div>
              <span className="text-gray-300">Trial End:</span> {
                debugInfo.trialStatus.trialEndsAt ? 
                  new Date(debugInfo.trialStatus.trialEndsAt).toLocaleDateString('sv-SE') : 
                  'None'
              }
            </div>
            <div>
              <span className="text-gray-300">Days Remaining:</span> {debugInfo.trialStatus.trialDaysRemaining}
            </div>
            <div>
              <span className="text-gray-300">Has Used Trial:</span> {debugInfo.trialStatus.hasUsedTrial ? 'Yes' : 'No'}
            </div>
          </>
        )}
        
        {debugInfo.handbookDbData && (
          <>
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="text-yellow-300 font-bold">📊 Database Data:</div>
            </div>
            <div>
              <span className="text-gray-300">Created:</span> {
                debugInfo.handbookDbData.created_at ? 
                  new Date(debugInfo.handbookDbData.created_at).toLocaleDateString('sv-SE') : 
                  'Unknown'
              }
            </div>
            <div>
              <span className="text-gray-300">Trial End DB:</span> {
                debugInfo.handbookDbData.trial_end_date ? 
                  new Date(debugInfo.handbookDbData.trial_end_date).toLocaleDateString('sv-SE') : 
                  'NULL'
              }
            </div>
            <div>
              <span className="text-gray-300">Created During Trial:</span> {debugInfo.handbookDbData.created_during_trial ? 'Yes' : 'No'}
            </div>
            
            {/* Show fix button if trial data is missing */}
            {debugInfo.handbookDbData.trial_end_date === null && debugInfo.isOwner && (
              <div className="mt-2">
                <button 
                  onClick={fixHandbookTrial}
                  disabled={isFixing}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs"
                >
                  {isFixing ? 'Fixing...' : '🔧 Fix Trial Data'}
                </button>
              </div>
            )}
          </>
        )}
        
        <div>
          <span className="text-gray-300">Sections:</span> {debugInfo.sections.filter(s => s.visible).length}/{debugInfo.sections.length} visible
        </div>
        
        <div className="text-gray-400 text-xs mt-2">
          {debugInfo.sections.map((section, idx) => (
            <div key={idx} className="truncate">
              {section.visible ? '✅' : '❌'} {section.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 