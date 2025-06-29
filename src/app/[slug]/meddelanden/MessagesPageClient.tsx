'use client';

/**
 * Meddelanden-sektion med autentisering - endast för handbok-medlemmar
 * Använder path-baserad routing: /[handbookSlug]/meddelanden
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Plus, Clock, User, Send, X, ChevronDown, ChevronUp, Reply, Lock, Trash2, MoreHorizontal, Settings, ArrowLeft } from 'lucide-react';
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
}

export function MessagesPageClient({ 
  handbookId, 
  handbookTitle, 
  handbookSlug,
  theme,
  navigationContext,
  defaultBackLink
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
    }
  }

  function toggleReplyForm(messageId: string) {
    if (showReplyForm === messageId) {
      setShowReplyForm(null);
      setReplyData({ content: '', author_name: '' });
    } else {
      setShowReplyForm(messageId);
    }
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
        <div className="space-y-3 sm:space-y-4">
          {messages.length === 0 ? (
            <Card className="card">
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
            messages.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow card" data-ui="card">
                <CardContent className="p-3 sm:p-4 card-content" data-ui="card-content">
                  {/* Header with title and actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-tight sm:leading-6">
                        {message.title}
                      </h3>
                    </div>
                    
                    {/* Mobile-friendly actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 flex-shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => toggleMessageExpanded(message.id)}
                          className="cursor-pointer"
                        >
                          {expandedMessage === message.id ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Dölj detaljer
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Visa detaljer
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            toggleReplyForm(message.id);
                            if (expandedMessage !== message.id) {
                              setExpandedMessage(message.id);
                              // Smart loading when opening via Reply in dropdown
                              if (!replies[message.id]) {
                                const showAll = message.reply_count <= 15;
                                loadReplies(message.id, showAll);
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          Svara
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
                  
                  {/* Content preview */}
                  <p className="text-gray-600 text-sm sm:text-base line-clamp-2 mb-4">
                    {message.content}
                  </p>
                  
                  {/* Metadata and Actions - Mobile optimized stacked layout */}
                  <div className="space-y-3">
                    {/* Metadata row - responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          {message.category_name}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{message.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(message.created_at).toLocaleDateString('sv-SE')}</span>
                        </div>
                      </div>
                      
                      {/* Reply count - more prominent on mobile */}
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                        <MessageCircle className="h-3 w-3" />
                        <span>{message.reply_count} svar</span>
                      </div>
                    </div>
                    
                    {/* Action buttons row - mobile optimized */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleMessageExpanded(message.id)}
                        className="h-8 px-3 text-xs sm:text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${expandedMessage === message.id ? 'rotate-180' : ''}`} />
                        {expandedMessage === message.id ? 'Dölj' : 'Visa'}
                      </Button>
                      
                      {/* Only show reply button if message is NOT expanded */}
                      {expandedMessage !== message.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toggleReplyForm(message.id);
                            if (expandedMessage !== message.id) {
                              setExpandedMessage(message.id);
                              if (!replies[message.id]) {
                                const showAll = message.reply_count <= 15;
                                loadReplies(message.id, showAll);
                              }
                            }
                          }}
                          className="h-8 px-3 text-xs sm:text-sm text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Svara
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedMessage === message.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                          {message.content}
                        </p>
                      </div>

                      {/* Replies section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                            Svar ({message.reply_count})
                          </h4>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {/* Show "Load more" button for large threads that aren't fully loaded */}
                            {replyInfo[message.id] && 
                             replyInfo[message.id].showing_recent && 
                             !showingAllReplies[message.id] && 
                             message.reply_count > 15 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadReplies(message.id, true)}
                                className="text-blue-600 hover:text-blue-700 text-xs h-auto p-2"
                              >
                                Visa alla {replyInfo[message.id].total_count} svar
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {loadingReplies[message.id] ? (
                          <div className="text-center py-6">
                            <div className="text-sm text-gray-500">Laddar svar...</div>
                          </div>
                        ) : replies[message.id] && replies[message.id].length > 0 ? (
                          <div className="space-y-3">
                            {/* Show indicator for large threads with partial loading */}
                            {replyInfo[message.id] && 
                             replyInfo[message.id].showing_recent && 
                             !showingAllReplies[message.id] && 
                             message.reply_count > 15 && (
                              <div className="text-xs text-gray-500 italic mb-2 border-l-2 border-gray-300 pl-3 py-1">
                                Visar de {replies[message.id]?.length || 0} senaste av {replyInfo[message.id].total_count} svar
                              </div>
                            )}
                            {replies[message.id].map((reply, index) => (
                              <div key={reply.id} className="bg-blue-50 rounded-lg p-3 sm:p-4 border-l-3 sm:border-l-2 border-blue-600">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">{reply.author_name}</span>
                                    </div>
                                    <span className="text-gray-500">
                                      {new Date(reply.created_at).toLocaleDateString('sv-SE')} {new Date(reply.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {/* Delete button for replies */}
                                  {(reply.author_id === user?.id || userRole === 'admin') && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-700 h-8 w-8 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                      onClick={() => handleDeleteReply(reply.id, message.id, reply.author_name)}
                                      disabled={deletingReply === reply.id}
                                      title="Radera svar"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : message.reply_count > 0 ? null : (
                          <div className="text-sm text-gray-500 italic py-4 text-center">
                            Inga svar än. Bli första att svara!
                          </div>
                        )}
                        
                        {/* Reply button - placed after all replies */}
                        <div className="pt-3 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReplyForm(message.id)}
                            className="h-9 sm:h-8 px-4 text-sm sm:text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                          >
                            <Reply className="h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1" />
                            {showReplyForm === message.id ? 'Avbryt svar' : 'Svara på detta'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reply form */}
                  {showReplyForm === message.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-4 text-sm sm:text-base">Skriv ett svar</h4>
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
                              className="w-full text-sm h-10"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Svar
                            </label>
                            <Textarea
                              value={replyData.content}
                              onChange={(e) => setReplyData(prev => ({ ...prev, content: e.target.value }))}
                              placeholder="Skriv ditt svar här..."
                              rows={4}
                              className="w-full resize-none text-sm"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(message.id)}
                              disabled={!replyData.content.trim() || !replyData.author_name.trim() || submittingReply}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 sm:h-8"
                            >
                              {submittingReply ? 'Skickar...' : 'Skicka svar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleReplyForm(message.id)}
                              className="text-sm h-10 sm:h-8"
                            >
                              Avbryt
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        {/* Note: Admin notification controls removed - users manage their own settings via Settings page */}
      </div>

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


    </div>
  );
} 