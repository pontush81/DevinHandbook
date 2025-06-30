'use client';

/**
 * Meddelanden-sektion med autentisering - endast för handbok-medlemmar
 * Använder path-baserad routing: /[handbookSlug]/meddelanden
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Plus, Clock, User, Send, X, ChevronDown, ChevronUp, Reply, Lock, Trash2, MoreHorizontal, Settings, ArrowLeft, ArrowUp, Bell } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { NavigationContext } from '@/lib/navigation-utils';
import NotificationSettings from '@/components/NotificationSettings';



interface Message {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_id: string;
  category_name: string;
  created_at: string;
  reply_count: number;
}

interface Reply {
  id: string;
  content: string;
  author_name: string;
  author_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface MessagesPageClientProps {
  handbookId: string;
  handbookTitle: string;
  handbookSlug: string;
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string | null;
  };
  navigationContext: NavigationContext | null;
  defaultBackLink: NavigationContext;
  initialTopicId?: string | null;
}

export function MessagesPageClient({ 
  handbookId, 
  handbookTitle, 
  handbookSlug,
  theme,
  navigationContext,
  defaultBackLink,
  initialTopicId
}: MessagesPageClientProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingReply, setDeletingReply] = useState<string | null>(null);
  
  // Expanded message and replies state
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [replies, setReplies] = useState<{ [messageId: string]: Reply[] }>({});
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState<{ [messageId: string]: boolean }>({});
  const [replyInfo, setReplyInfo] = useState<{ [messageId: string]: { total_count: number, showing_recent: boolean } }>({});
  const [showingAllReplies, setShowingAllReplies] = useState<{ [messageId: string]: boolean }>({});
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author_name: '',
    category_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Reply form state
  const [replyData, setReplyData] = useState({
    content: '',
    author_name: ''
  });
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // UI state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Separate effect for access checking when user changes
  useEffect(() => {
    async function checkAccess() {
      if (!handbookId || !user?.id) {
        setHasAccess(false);
        setUserRole(null);
        setAccessLoading(false);
        return;
      }

      try {
        console.log('Checking user access for handbook:', handbookId);
        
        // First check if user is a member of the handbook
        const { data: memberData, error: memberError } = await supabase
          .from('handbook_members')
          .select('id, role')
          .eq('handbook_id', handbookId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!memberError && memberData) {
          // User is a member - grant access
          console.log('User access granted via membership:', memberData.role);
          setHasAccess(true);
          setUserRole(memberData.role);
          setAccessLoading(false);
          return;
        }

        // If not a member, check if handbook is published/public
        const { data: handbookData, error: handbookError } = await supabase
          .from('handbooks')
          .select('published')
          .eq('id', handbookId)
          .single();

        if (!handbookError && handbookData?.published) {
          // Handbook is published - grant access to logged-in users
          console.log('User access granted via published handbook');
          setHasAccess(true);
          setUserRole('viewer'); // Default role for public access
          setAccessLoading(false);
          return;
        }

        // No access
        console.log('User access denied - not a member and handbook not public');
        setHasAccess(false);
        setUserRole(null);
      } catch (error) {
        console.error('Error checking handbook access:', error);
        setHasAccess(false);
        setUserRole(null);
      } finally {
        setAccessLoading(false);
      }
    }

    checkAccess();
  }, [user, handbookId]);

  // Load messages when user has access
  useEffect(() => {
    loadMessagesAndCategories();
  }, [handbookId, user?.id, hasAccess]);

  // Handle initial topic expansion when coming from email link
  useEffect(() => {
    if (initialTopicId && messages.length > 0 && !loading) {
      const topicExists = messages.some(message => message.id === initialTopicId);
      if (topicExists) {
        console.log('🎯 [MessagesPageClient] Auto-expanding topic from email link:', initialTopicId);
        setExpandedMessage(initialTopicId);
        loadReplies(initialTopicId);
        
        // Scroll to the topic after a brief delay to ensure DOM is updated
        setTimeout(() => {
          const element = document.getElementById(`message-${initialTopicId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [initialTopicId, messages, loading]);

  // Handle scroll for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save current URL for redirect after login when user is not authenticated
  useEffect(() => {
    if (!authLoading && !user && typeof window !== 'undefined' && initialTopicId) {
      const currentUrl = window.location.href;
      console.log('💾 [MessagesPageClient] Saving URL for post-login redirect:', currentUrl);
      sessionStorage.setItem('redirect_after_login', currentUrl);
    }
  }, [authLoading, user, initialTopicId]);

  async function loadMessagesAndCategories() {
    if (!handbookId || !user?.id || !hasAccess) {
      setLoading(false);
      return;
    }

    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('handbook_id', handbookId)
        .order('name');

      console.log('Categories loaded:', categoriesData);
      setCategories(categoriesData || []);

      // Load messages with actual reply count
      const { data: messagesData } = await supabase
        .from('forum_topics')
        .select(`
          id,
          title,
          content,
          created_at,
          author_name,
          author_id,
          reply_count,
          forum_categories!inner(name)
        `)
        .eq('handbook_id', handbookId)
        .order('created_at', { ascending: false })
        .limit(20);

      const formattedMessages = messagesData?.map(msg => ({
        id: msg.id,
        title: msg.title,
        content: msg.content,
        author_name: msg.author_name || 'Anonym',
        author_id: msg.author_id,
        category_name: msg.forum_categories?.name || 'Allmänt',
        created_at: msg.created_at,
        reply_count: msg.reply_count || 0
      })) || [];

      console.log('Messages loaded:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages and categories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReplies(messageId: string, showAll: boolean = false) {
    if (loadingReplies[messageId]) return;

    setLoadingReplies(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const url = `/api/messages/replies?topic_id=${messageId}&userId=${user?.id}${showAll ? '&show_all=true' : ''}`;
      console.log('Loading replies from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        console.log('Reply data received:', data);
        setReplies(prev => ({ ...prev, [messageId]: data.replies }));
        setReplyInfo(prev => ({ 
          ...prev, 
          [messageId]: { 
            total_count: data.total_count, 
            showing_recent: data.showing_recent 
          } 
        }));
        if (showAll) {
          setShowingAllReplies(prev => ({ ...prev, [messageId]: true }));
        }
      } else {
        console.error('Error loading replies:', data.error);
      }
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [messageId]: false }));
    }
  }

  async function handleSubmitMessage() {
    if (!formData.title.trim() || !formData.content.trim() || !formData.author_name.trim() || !formData.category_id) {
      alert('Vänligen fyll i alla fält');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        author_name: formData.author_name.trim(),
        category_id: formData.category_id,
        handbook_id: handbookId
      };
      
      console.log('Sending payload:', payload);

      const response = await fetch(`/api/messages?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('API response:', result);

      if (!response.ok) {
        console.error('Error creating message:', result);
        alert(result.error || 'Kunde inte skapa meddelandet. Försök igen.');
        return;
      }

      // Reset form and close modal
      setFormData({ title: '', content: '', author_name: '', category_id: '' });
      setShowNewMessageForm(false);
      
      // Success feedback without blocking
      const message = 'Meddelandet har skapats!';
      
      // Reload messages to show the new one
      await loadMessagesAndCategories();
      
      // Show success message with toast notification
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000); // Clear after 3 seconds
      
    } catch (error) {
      console.error('Error submitting message:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReply(messageId: string) {
    if (!replyData.content.trim() || !replyData.author_name.trim()) {
      alert('Vänligen fyll i alla fält');
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await fetch(`/api/messages/replies?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic_id: messageId,
          content: replyData.content.trim(),
          author_name: replyData.author_name.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Kunde inte skapa svaret. Försök igen.');
        return;
      }

      // Reset reply form but keep message expanded
      setReplyData({ content: '', author_name: '' });
      setShowReplyForm(null);
      
      // Make sure the message stays expanded
      setExpandedMessage(messageId);
      
      // Reload replies for this message - show all replies including the new one
      console.log('Reloading replies for message:', messageId);
      await loadReplies(messageId, true);
      
      // Update reply count in messages
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reply_count: msg.reply_count + 1 }
          : msg
      ));

      setSuccessMessage('Svaret har skickats!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleDeleteMessage(messageId: string, messageTitle: string) {
    if (!confirm(`Är du säker på att du vill radera meddelandet "${messageTitle}"? Detta kan inte ångras.`)) {
      return;
    }

    setDeletingMessage(messageId);
    try {
      const response = await fetch(`/api/messages?id=${messageId}&userId=${user?.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Kunde inte radera meddelandet. Försök igen.');
        return;
      }

      // Remove message from list
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Clear any expanded state for this message
      if (expandedMessage === messageId) {
        setExpandedMessage(null);
      }
      if (showReplyForm === messageId) {
        setShowReplyForm(null);
      }
      
      setSuccessMessage('Meddelandet har raderats!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setDeletingMessage(null);
    }
  }

  async function handleDeleteReply(replyId: string, messageId: string, replyAuthor: string) {
    if (!confirm(`Är du säker på att du vill radera svaret från ${replyAuthor}? Detta kan inte ångras.`)) {
      return;
    }

    setDeletingReply(replyId);
    try {
      const response = await fetch(`/api/messages/replies?reply_id=${replyId}&userId=${user?.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Kunde inte radera svaret. Försök igen.');
        return;
      }

      // Remove reply from replies list
      setReplies(prev => ({
        ...prev,
        [messageId]: prev[messageId]?.filter(reply => reply.id !== replyId) || []
      }));
      
      // Update reply count in messages
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reply_count: Math.max(0, msg.reply_count - 1) }
          : msg
      ));

      // Update reply info
      setReplyInfo(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          total_count: Math.max(0, (prev[messageId]?.total_count || 1) - 1)
        }
      }));
      
      setSuccessMessage('Svaret har raderats!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setDeletingReply(null);
    }
  }

  function openNewMessageForm() {
    // Reset form and open modal
    setFormData({ title: '', content: '', author_name: '', category_id: '' });
    setShowNewMessageForm(true);
  }

  function toggleMessageExpanded(messageId: string) {
    if (expandedMessage === messageId) {
      setExpandedMessage(null);
    } else {
      setExpandedMessage(messageId);
      // Smart loading based on reply count
      if (!replies[messageId]) {
        const message = messages.find(m => m.id === messageId);
        const replyCount = message?.reply_count || 0;
        
        // For threads with many replies, show recent ones first
        // For smaller threads, show all immediately
        const showAll = replyCount <= 15;
        loadReplies(messageId, showAll);
      }
      
      // Scroll to message after a short delay to allow for expansion
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 150);
    }
  }

  function toggleReplyForm(messageId: string) {
    if (showReplyForm === messageId) {
      setShowReplyForm(null);
      setReplyData({ content: '', author_name: '' });
    } else {
      // Ensure message is expanded first
      if (expandedMessage !== messageId) {
        setExpandedMessage(messageId);
        // Load replies if not already loaded
        if (!replies[messageId]) {
          const message = messages.find(m => m.id === messageId);
          const replyCount = message?.reply_count || 0;
          const showAll = replyCount <= 15;
          loadReplies(messageId, showAll);
        }
      }
      
      setShowReplyForm(messageId);
      
      // Scroll to reply form after a short delay to allow for DOM updates
      setTimeout(() => {
        // Try to find the reply form and scroll it into view
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          const replyForm = messageElement.querySelector('[data-reply-form]') as HTMLElement;
          if (replyForm) {
            replyForm.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          } else {
            // Fallback: scroll to bottom of message
            messageElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'end',
              inline: 'nearest'
            });
          }
          
          // Focus the first input in the reply form
          setTimeout(() => {
            const firstInput = messageElement.querySelector('input[type="text"]') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 300);
        }
      }, 200);
    }
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  if (loading || authLoading || accessLoading) {
    return (
      <div className="bg-white flex items-center justify-center py-16">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Laddar meddelanden...</p>
        </div>
      </div>
    );
  }

  // Authentication required - not logged in
  if (!user) {
    return (
      <div className="bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Inloggning krävs</h1>
            <p className="text-gray-600 mb-6">
              För att läsa och skriva meddelanden måste du vara medlem och inloggad.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/login">
                <Button>Logga in</Button>
              </Link>
              <Link href={`/${handbookSlug}`}>
                <Button variant="outline">Tillbaka till handboken</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is logged in but doesn't have access to this handbook
  if (!hasAccess) {
    return (
      <div className="bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Åtkomst krävs</h1>
            <p className="text-gray-600 mb-6">
              För att komma åt meddelandena behöver du antingen vara medlem i handboken 
              eller så måste handboken vara publicerad. Kontakta administratören för att få tillgång.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard">
                <Button>Mina handböcker</Button>
              </Link>
              <Link href={`/${handbookSlug}`}>
                <Button variant="outline">Tillbaka till handboken</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Success notification toast */}
      {successMessage && (
        <div className="success-toast">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
              <div className="h-2 w-2 bg-green-600 rounded-full"></div>
            </div>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Smart back navigation */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href={navigationContext?.href ?? defaultBackLink.href}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {navigationContext?.title ?? defaultBackLink.title}
          </Link>
        </div>

        {/* Header section */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Meddelanden</h1>
              <p className="text-sm sm:text-base text-gray-600">Ställ frågor, dela tips och håll dig uppdaterad</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button 
                variant="outline"
                onClick={() => setShowNotificationSettings(true)}
                className="h-10 sm:h-9 px-3 sm:px-4 text-sm font-medium touch-manipulation"
                title="Notifikationsinställningar"
              >
                <Bell className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Notifikationer</span>
              </Button>
              <Button 
                onClick={() => openNewMessageForm()} 
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-9 px-4 text-sm font-medium touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nytt meddelande</span>
                <span className="sm:hidden">Nytt</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Messages section */}
        <div className="space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <Card className="card border-dashed border-2 border-gray-200">
              <CardContent className="p-8 text-center card-content">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga meddelanden än</h3>
                <p className="text-gray-600 mb-4">
                  Bli den första att ställa en fråga eller dela ett tips!
                </p>
                <Button onClick={() => openNewMessageForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Skriva första meddelandet
                </Button>
              </CardContent>
            </Card>
          ) : (
            messages.map((message, index) => (
              <div key={message.id} id={`message-${message.id}`} className="group">
                {/* Main message card with improved styling */}
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 bg-white shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    {/* Header section with better spacing */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-3 mb-2">
                          {/* User avatar placeholder with initials */}
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {message.author_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                              {message.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="font-medium text-gray-700">{message.author_name}</span>
                              <span>•</span>
                              <time dateTime={message.created_at}>
                                {new Date(message.created_at).toLocaleDateString('sv-SE', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => toggleMessageExpanded(message.id)}
                            className="cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {expandedMessage === message.id ? 'Minimera' : 'Visa hela tråden'}
                          </DropdownMenuItem>
                          {(message.author_id === user?.id || userRole === 'admin') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteMessage(message.id, message.title)}
                                disabled={deletingMessage === message.id}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deletingMessage === message.id ? 'Raderar...' : 'Radera'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Content preview with better typography */}
                    <div className="mb-4 ml-13 sm:ml-13">
                      <p className="text-gray-600 text-base leading-relaxed line-clamp-3">
                        {message.content}
                      </p>
                    </div>
                    
                                         {/* Metadata bar with improved design and spacing */}
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between ml-13 sm:ml-13 mt-1 gap-2 sm:gap-0">
                       <div className="flex items-center gap-4">
                         <Badge 
                           variant="secondary" 
                           className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium px-2 py-1"
                         >
                           {message.category_name}
                         </Badge>
                       </div>
                       
                       {/* Interaction stats with responsive spacing */}
                       <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-500">
                         <div className="flex items-center gap-2">
                           <MessageCircle className="h-4 w-4" />
                           <span className="font-medium">{message.reply_count}</span>
                           <span className="hidden sm:inline">svar</span>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => toggleMessageExpanded(message.id)}
                           className="h-8 px-2 sm:px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
                         >
                           {expandedMessage === message.id ? (
                             <>
                               <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                               <span className="hidden sm:inline">Dölj</span>
                               <span className="sm:hidden">↑</span>
                             </>
                           ) : (
                             <>
                               <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                               <span className="hidden sm:inline">Visa tråd</span>
                               <span className="sm:hidden">Visa</span>
                             </>
                           )}
                         </Button>
                       </div>
                     </div>
                  </CardContent>
                </Card>

                {/* Expanded conversation view */}
                {expandedMessage === message.id && (
                  <div className="mt-4 ml-4 border-l-2 border-gray-200 pl-4">
                    {/* Full message content */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {/* Replies section with better structure */}
                    <div className="space-y-4">
                      {/* Replies header */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Reply className="h-4 w-4" />
                          Svar ({message.reply_count})
                        </h4>
                        {replyInfo[message.id] && 
                         replyInfo[message.id].showing_recent && 
                         !showingAllReplies[message.id] && 
                         message.reply_count > 15 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadReplies(message.id, true)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Visa alla {replyInfo[message.id].total_count} svar
                          </Button>
                        )}
                      </div>
                      
                      {/* Loading state */}
                      {loadingReplies[message.id] ? (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center gap-2 text-gray-500">
                            <MessageCircle className="h-4 w-4 animate-spin" />
                            <span>Laddar svar...</span>
                          </div>
                        </div>
                      ) : replies[message.id] && replies[message.id].length > 0 ? (
                        <div className="space-y-3">
                          {/* Partial loading indicator */}
                          {replyInfo[message.id] && 
                           replyInfo[message.id].showing_recent && 
                           !showingAllReplies[message.id] && 
                           message.reply_count > 15 && (
                            <div className="text-xs text-gray-500 italic border-l-2 border-blue-200 pl-3 py-2 bg-blue-50 rounded-r">
                              Visar de {replies[message.id]?.length || 0} senaste av {replyInfo[message.id].total_count} svar
                            </div>
                          )}
                          
                          {/* Reply threads */}
                          {replies[message.id].map((reply, replyIndex) => (
                            <div key={reply.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {/* Reply user avatar */}
                                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                    {reply.author_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-900 text-sm">{reply.author_name}</span>
                                    <span className="text-gray-500 text-xs ml-2">
                                      {new Date(reply.created_at).toLocaleDateString('sv-SE', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                {/* Reply delete button */}
                                {(reply.author_id === user?.id || userRole === 'admin') && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                    onClick={() => handleDeleteReply(reply.id, message.id, reply.author_name)}
                                    disabled={deletingReply === reply.id}
                                    title="Radera svar"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed ml-11 whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : message.reply_count > 0 ? null : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                          <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Inga svar än. Bli första att svara!</p>
                        </div>
                      )}
                      
                      {/* Sticky reply button at the bottom of conversation */}
                      <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 -mx-4 px-4 -mb-4 pb-4">
                        <Button
                          variant={showReplyForm === message.id ? "secondary" : "default"}
                          size="sm"
                          onClick={() => toggleReplyForm(message.id)}
                          className={`w-full justify-center ${
                            showReplyForm === message.id 
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          {showReplyForm === message.id ? 'Avbryt svar' : 'Skriv ett svar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                                 {/* Reply form - now appears immediately after the button */}
                 {showReplyForm === message.id && (
                   <div className="mt-4 ml-4 border-l-2 border-blue-300 pl-4" data-reply-form>
                     <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Send className="h-4 w-4 text-blue-600" />
                        Skriv ditt svar
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ditt namn
                          </label>
                          <Input
                            type="text"
                            value={replyData.author_name}
                            onChange={(e) => setReplyData(prev => ({ ...prev, author_name: e.target.value }))}
                            placeholder="Ditt namn"
                            className="w-full h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ditt svar
                          </label>
                          <Textarea
                            value={replyData.content}
                            onChange={(e) => setReplyData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Skriv ditt svar här..."
                            rows={4}
                            className="w-full resize-none bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReply(message.id)}
                            disabled={!replyData.content.trim() || !replyData.author_name.trim() || submittingReply}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 h-10"
                          >
                            {submittingReply ? (
                              <>
                                <MessageCircle className="h-4 w-4 mr-2 animate-spin" />
                                Skickar...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Skicka svar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleReplyForm(message.id)}
                            className="sm:w-auto h-10 border-gray-300"
                          >
                            Avbryt
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Note: Admin notification controls removed - users manage their own settings via Settings page */}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Scroll till toppen"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* New Message Dialog */}
      <Dialog open={showNewMessageForm} onOpenChange={setShowNewMessageForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden bg-white shadow-2xl border border-gray-200 rounded-lg z-50 mx-2 sm:mx-4 dialog-content flex flex-col" style={{backgroundColor: 'white'}}>
          <DialogHeader className="space-y-2 sm:space-y-3 pb-3 sm:pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">
              Skapa nytt meddelande
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-600">
              Skriv ditt meddelande nedan. Det kommer att synas för alla som har tillgång till handboken.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 px-0 sm:px-1 min-h-0">
            <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <Select 
                  value={formData.category_id || ""} 
                  onValueChange={(value) => {
                    console.log('Category selected:', value, 'Category name:', categories.find(cat => cat.id === value)?.name);
                    setFormData(prev => ({ ...prev, category_id: value }));
                  }}
                >
                  <SelectTrigger className="w-full h-10 sm:h-9 bg-white border-gray-300 text-sm sm:text-base" style={{backgroundColor: 'white'}}>
                    <SelectValue placeholder="Välj kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[60]" style={{backgroundColor: 'white'}}>
                    {categories.length === 0 ? (
                      <SelectItem value="" disabled>Inga kategorier tillgängliga</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="hover:bg-gray-50 text-sm sm:text-base">
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {categories.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {categories.length} kategorier laddade
                    {formData.category_id && (
                      <div className="mt-1 text-green-600 font-medium">
                        ✓ Vald: {categories.find(cat => cat.id === formData.category_id)?.name}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ditt namn
                </label>
                <Input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
                  placeholder="Ange ditt namn"
                  className="w-full h-10 sm:h-9 bg-white border-gray-300 text-sm sm:text-base"
                  style={{backgroundColor: 'white'}}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Rubrik
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Vad handlar ditt meddelande om?"
                  className="w-full h-10 sm:h-9 bg-white border-gray-300 text-sm sm:text-base"
                  style={{backgroundColor: 'white'}}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Meddelande
                </label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Skriv ditt meddelande här..."
                  rows={6}
                  className="w-full resize-none bg-white border-gray-300 text-sm sm:text-base"
                  style={{backgroundColor: 'white'}}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 sm:pt-4 border-t border-gray-100 mt-0 flex-shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 space-y-reverse w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewMessageForm(false)}
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto h-10 sm:h-9 text-sm font-medium"
                style={{backgroundColor: 'white'}}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={handleSubmitMessage}
                disabled={!formData.title || !formData.content || !formData.author_name || !formData.category_id || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto h-10 sm:h-9 text-sm font-medium"
              >
                {submitting ? 'Skickar...' : 'Skicka meddelande'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden bg-white shadow-2xl border border-gray-200 rounded-lg z-50">
          <DialogHeader className="space-y-2 pb-4 border-b border-gray-100">
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Notifikationsinställningar
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Hantera hur du vill få notifikationer för meddelanden i {handbookTitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <NotificationSettings 
              handbookId={handbookId}
              handbookName={handbookTitle}
              compact={true}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              onClick={() => setShowNotificationSettings(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
} 