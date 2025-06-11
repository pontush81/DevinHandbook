'use client';

import { useState } from 'react';
import { Settings, Users, Mail, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AdminNotificationControlsProps {
  handbookId: string;
  handbookName: string;
  userRole: string;
}

export default function AdminNotificationControls({ 
  handbookId, 
  handbookName, 
  userRole 
}: AdminNotificationControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    allowMemberNotifications: true,
    defaultNotificationsEnabled: true,
    adminOnlyNotifications: false,
    digestEnabled: true
  });

  const handleSettingChange = async (key: keyof typeof settings, value: boolean) => {
    setIsLoading(true);
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      // TODO: Implement API call to save settings
      console.log(`Updated ${key} to ${value} for handbook ${handbookId}`);
    } catch (error) {
      console.error('Error updating notification setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to send test notification
      console.log('Sending test notification for handbook:', handbookId);
      alert('Test-notifikation skickad!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Kunde inte skicka test-notifikation');
    } finally {
      setIsLoading(false);
    }
  };

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin-inställningar för notifikationer
        </CardTitle>
        <CardDescription>
          Hantera notifikationsinställningar för alla medlemmar i {handbookName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Global Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Globala inställningar
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-member-notifications">
                  Tillåt medlemsnotifikationer
                </Label>
                <div className="text-sm text-gray-500">
                  Låt medlemmar få notifikationer för denna handbok
                </div>
              </div>
              <Switch
                id="allow-member-notifications"
                checked={settings.allowMemberNotifications}
                onCheckedChange={(checked) => 
                  handleSettingChange('allowMemberNotifications', checked)
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="default-notifications">
                  Aktivera notifikationer som standard
                </Label>
                <div className="text-sm text-gray-500">
                  Nya medlemmar får notifikationer aktiverade automatiskt
                </div>
              </div>
              <Switch
                id="default-notifications"
                checked={settings.defaultNotificationsEnabled}
                onCheckedChange={(checked) => 
                  handleSettingChange('defaultNotificationsEnabled', checked)
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-only">
                  Endast admin-notifikationer
                </Label>
                <div className="text-sm text-gray-500">
                  Bara administratörer får notifikationer
                </div>
              </div>
              <Switch
                id="admin-only"
                checked={settings.adminOnlyNotifications}
                onCheckedChange={(checked) => 
                  handleSettingChange('adminOnlyNotifications', checked)
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="digest-enabled">
                  Aktivera sammandrag
                </Label>
                <div className="text-sm text-gray-500">
                  Skicka veckovisa sammandrag av aktivitet
                </div>
              </div>
              <Switch
                id="digest-enabled"
                checked={settings.digestEnabled}
                onCheckedChange={(checked) => 
                  handleSettingChange('digestEnabled', checked)
                }
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Test Notifications */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Test och underhåll
          </h3>
          
          <div className="flex gap-2">
            <Button 
              onClick={sendTestNotification}
              disabled={isLoading}
              variant="outline"
            >
              Skicka test-notifikation
            </Button>
          </div>
        </div>

        {/* Member Overview */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Medlemsöversikt
          </h3>
          
          <div className="text-sm text-gray-600">
            <p>För att hantera individuella medlemmars notifikationsinställningar, 
            gå till medlemshantering i handbokens huvudinställningar.</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
} 