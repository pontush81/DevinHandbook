'use client';

import { useState, useEffect } from 'react';
import { Settings, Bell, Mail, Smartphone, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface AdminNotificationControlsProps {
  handbookId: string;
  handbookName: string;
  userRole: 'admin' | 'editor' | 'viewer';
}

interface NotificationStats {
  totalMembers: number;
  emailEnabled: number;
  appEnabled: number;
  totalNotificationsSent: number;
}

export default function AdminNotificationControls({ 
  handbookId, 
  handbookName, 
  userRole 
}: AdminNotificationControlsProps) {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState({
    emailNotificationsEnabled: true,
    appNotificationsEnabled: true,
    defaultEmailPreference: true,
    defaultAppPreference: true
  });

  // Endast admin och editor kan se dessa kontroller
  if (userRole === 'viewer') {
    return null;
  }

  useEffect(() => {
    loadStats();
  }, [handbookId]);

  async function loadStats() {
    try {
      setLoading(true);
      
      // Hämta medlemsstatistik
      const { data: members, error: membersError } = await supabase
        .from('handbook_members')
        .select(`
          id,
          user_id,
          user_notification_preferences (
            email_new_topics,
            email_new_replies,
            app_new_topics,
            app_new_replies
          )
        `)
        .eq('handbook_id', handbookId);

      if (membersError) {
        console.error('Error loading members:', membersError);
        return;
      }

      // Räkna statistik
      const totalMembers = members?.length || 0;
      let emailEnabled = 0;
      let appEnabled = 0;

      members?.forEach(member => {
        const prefs = member.user_notification_preferences?.[0];
        if (prefs?.email_new_topics || prefs?.email_new_replies) {
          emailEnabled++;
        }
        if (prefs?.app_new_topics || prefs?.app_new_replies) {
          appEnabled++;
        }
      });

      // Hämta antal skickade notifikationer (senaste 30 dagarna)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: notifications, error: notificationsError } = await supabase
        .from('forum_notifications')
        .select('id')
        .eq('handbook_id', handbookId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalNotificationsSent = notifications?.length || 0;

      setStats({
        totalMembers,
        emailEnabled,
        appEnabled,
        totalNotificationsSent
      });

    } catch (error) {
      console.error('Error loading notification stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateGlobalSetting(setting: string, value: boolean) {
    setUpdating(setting);
    try {
      // Här skulle vi kunna implementera globala inställningar per handbok
      // För nu simulerar vi bara uppdateringen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGlobalSettings(prev => ({
        ...prev,
        [setting]: value
      }));
      
      console.log(`Updated ${setting} to ${value}`);
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setUpdating(null);
    }
  }

  async function bulkUpdateMemberPreferences(type: 'email' | 'app', enabled: boolean) {
    setUpdating(`bulk_${type}`);
    try {
      // Hämta alla medlemmar
      const { data: members, error: membersError } = await supabase
        .from('handbook_members')
        .select('user_id')
        .eq('handbook_id', handbookId);

      if (membersError) throw membersError;

      // Uppdatera preferences för alla medlemmar
      const updates = members?.map(member => ({
        user_id: member.user_id,
        handbook_id: handbookId,
        [`${type}_new_topics`]: enabled,
        [`${type}_new_replies`]: enabled
      })) || [];

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('user_notification_preferences')
          .upsert(updates, { 
            onConflict: 'user_id,handbook_id',
            ignoreDuplicates: false 
          });

        if (updateError) throw updateError;
        
        // Uppdatera statistik
        await loadStats();
      }

    } catch (error) {
      console.error('Error updating member preferences:', error);
      alert('Ett fel uppstod vid uppdatering av inställningar');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Bell className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Laddar notifikationsstatistik...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-orange-600" />
          Admin - Notifikationskontroller
          <Badge variant="outline" className="text-xs">
            {userRole === 'admin' ? 'Administratör' : 'Redaktör'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Hantera notifikationsinställningar för alla medlemmar i {handbookName}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Statistik */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-blue-900">{stats.totalMembers}</div>
              <div className="text-xs text-blue-600">Totalt medlemmar</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Mail className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-green-900">{stats.emailEnabled}</div>
              <div className="text-xs text-green-600">E-post aktivt</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Smartphone className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-purple-900">{stats.appEnabled}</div>
              <div className="text-xs text-purple-600">App aktivt</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Bell className="h-5 w-5 text-gray-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{stats.totalNotificationsSent}</div>
              <div className="text-xs text-gray-600">Skickade (30d)</div>
            </div>
          </div>
        )}

        {/* Massåtgärder för medlemmar */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Massåtgärder för medlemmar</h4>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={updating === 'bulk_email'}
              onClick={() => bulkUpdateMemberPreferences('email', true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              {updating === 'bulk_email' ? 'Uppdaterar...' : 'Aktivera e-post för alla'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={updating === 'bulk_app'}
              onClick={() => bulkUpdateMemberPreferences('app', true)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {updating === 'bulk_app' ? 'Uppdaterar...' : 'Aktivera app för alla'}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              disabled={updating === 'bulk_email'}
              onClick={() => bulkUpdateMemberPreferences('email', false)}
            >
              <Mail className="h-4 w-4 mr-2" />
              {updating === 'bulk_email' ? 'Uppdaterar...' : 'Stäng av e-post för alla'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              disabled={updating === 'bulk_app'}
              onClick={() => bulkUpdateMemberPreferences('app', false)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {updating === 'bulk_app' ? 'Uppdaterar...' : 'Stäng av app för alla'}
            </Button>
          </div>
        </div>

        {/* Informationsruta */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>Tips:</strong> Medlemmar kan alltid ändra sina egna inställningar via menyn uppe till höger. 
            Massåtgärderna ovan påverkar alla medlemmar samtidigt och kan vara användbara vid 
            större förändringar eller uppgraderingar.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 