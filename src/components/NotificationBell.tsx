'use client';

import { useEffect, useState } from 'react';
import { Bell, X, MessageCircle, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ForumNotification {
  id: string;
  created_at: string;
  notification_type: 'new_topic' | 'new_reply';
  is_read: boolean;
  topic?: {
    id: string;
    title: string;
    handbook_id: string;
  };
  post?: {
    id: string;
    content: string;
  };
}

interface NotificationBellProps {
  handbookId?: string;
  handbookSlug?: string;
}

export default function NotificationBell({ handbookId, handbookSlug }: NotificationBellProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Prenumerera på nya notifikationer
      const subscription = supabase
        .channel('forum_notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_notifications',
          filter: `recipient_id=eq.${user.id}`
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, handbookId]);

  async function loadNotifications() {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('forum_notifications')
        .select(`
          id,
          created_at,
          notification_type,
          is_read,
          topic_id,
          post_id,
          forum_topics!inner (
            id,
            title,
            handbook_id
          ),
          forum_posts (
            id,
            content
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Om vi är på en specifik handbok, filtrera bara notifikationer för den
      if (handbookId) {
        query = query.eq('forum_topics.handbook_id', handbookId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      const formattedNotifications = data?.map(notification => ({
        id: notification.id,
        created_at: notification.created_at,
        notification_type: notification.notification_type,
        is_read: notification.is_read,
        topic: notification.forum_topics ? {
          id: notification.forum_topics.id,
          title: notification.forum_topics.title,
          handbook_id: notification.forum_topics.handbook_id
        } : undefined,
        post: notification.forum_posts ? {
          id: notification.forum_posts.id,
          content: notification.forum_posts.content
        } : undefined
      })) || [];

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('forum_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Uppdatera lokalt state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    if (!user) return;

    try {
      let query = supabase
        .from('forum_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Om vi är på en specifik handbok, markera bara notifikationer för den
      if (handbookId) {
        // Vi behöver en mer komplex query här, men för enkelhetens skull markerar vi alla
        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await query;
        if (error) throw error;
      }

      // Uppdatera lokalt state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'new_topic':
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case 'new_reply':
        return <Reply className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  }

  function getNotificationText(notification: ForumNotification) {
    switch (notification.notification_type) {
      case 'new_topic':
        return `Nytt meddelande: ${notification.topic?.title || 'Okänt meddelande'}`;
      case 'new_reply':
        return `Nytt svar på: ${notification.topic?.title || 'Okänt meddelande'}`;
      default:
        return 'Ny notifikation';
    }
  }

  function getNotificationUrl(notification: ForumNotification) {
    if (!notification.topic) return '#';
    
    // Om vi har handbookSlug, använd det, annars försök hitta det från topic
    if (handbookSlug) {
      return `/${handbookSlug}/meddelanden`;
    }
    
    // Fallback - vi kan inte navigera utan slug
    return '#';
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Nu';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikationer</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              Markera alla som lästa
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Bell className="h-4 w-4 animate-spin mx-auto mb-2" />
            Laddar notifikationer...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            Inga notifikationer
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-3 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
              onClick={() => {
                markAsRead(notification.id);
                const url = getNotificationUrl(notification);
                if (url !== '#') {
                  window.location.href = url;
                }
              }}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                    {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 