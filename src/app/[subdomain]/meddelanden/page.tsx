'use client';

/**
 * Meddelanden-sektion med autentisering - endast för handbok-medlemmar
 * Använder path-baserad routing: /[subdomain]/meddelanden
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageCircle, Plus, Clock, User, Send, X, ChevronDown, ChevronUp, Reply, Lock, Trash2, MoreHorizontal } from 'lucide-react';
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

interface Handbook {
  id: string;
  title: string;
  subdomain: string;
  forum_enabled: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params.subdomain as string;
  const { user, isLoading: authLoading } = useAuth();
  
  const [handbook, setHandbook] = useState<Handbook | null>(null);
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

  useEffect(() => {
    loadData();
  }, [subdomain]);

  // Separate effect for access checking when user changes
  useEffect(() => {
    async function checkAccess() {
      if (!handbook?.id || !user?.id) {
        setHasAccess(false);
        setUserRole(null);
        setAccessLoading(false);
        return;
      }

      try {
        console.log('Checking user access for handbook:', handbook.id);
        
        // Client-side access check using direct Supabase query
        const { data: memberData, error } = await supabase
          .from('handbook_members')
          .select('id, role')
          .eq('handbook_id', handbook.id)
          .eq('user_id', user.id)
          .single();

        const userHasAccess = !error && !!memberData;
        console.log('User access result:', userHasAccess);
        setHasAccess(userHasAccess);
        setUserRole(memberData?.role || null);
      } catch (error) {
        console.error('Error checking handbook access:', error);
        setHasAccess(false);
        setUserRole(null);
      } finally {
        setAccessLoading(false);
      }
    }

    checkAccess();
  }, [user, handbook?.id]);

  // Load messages when user has access
  useEffect(() => {
    loadMessagesAndCategories();
  }, [handbook?.id, user?.id, hasAccess]);

  async function loadMessagesAndCategories() {
    if (!handbook?.id || !user?.id || !hasAccess || !handbook.forum_enabled) {
      return;
    }

    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('handbook_id', handbook.id)
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
        .eq('handbook_id', handbook.id)
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
    }
  }

  async function loadData() {
    try {
      console.log('Loading data for subdomain:', subdomain);
      
      // Load handbook
      const { data: handbookData, error: handbookError } = await supabase
        .from('handbooks')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('published', true)
        .single();

      if (handbookError || !handbookData) {
        console.error('Handbook error:', handbookError);
        router.push('/404');
        return;
      }

      console.log('Handbook loaded:', handbookData);
      setHandbook(handbookData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReplies(messageId: string, showAll: boolean = false) {
    if (loadingReplies[messageId]) return;

    setLoadingReplies(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const url = `/api/messages/replies?topic_id=${messageId}${showAll ? '&show_all=true' : ''}`;
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
        handbook_id: handbook?.id
      };
      
      console.log('Sending payload:', payload);

      const response = await fetch('/api/messages', {
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
      const response = await fetch('/api/messages/replies', {
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
      
      // Reload replies for this message
      console.log('Reloading replies for message:', messageId);
      await loadReplies(messageId);
      
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
      const response = await fetch(`/api/messages?id=${messageId}`, {
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
      const response = await fetch(`/api/messages/replies?reply_id=${replyId}`, {
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
      // Load replies when expanding message
      if (!replies[messageId]) {
        loadReplies(messageId);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Laddar meddelanden...</p>
        </div>
      </div>
    );
  }

  if (!handbook) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Handbok hittades inte</h1>
          <Link href="/">
            <Button>Tillbaka till startsidan</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!handbook.forum_enabled) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Meddelanden inte aktiverat</h1>
            <p className="text-gray-600">Meddelanden är inte aktiverat för denna handbok.</p>
            <Link href={`/${subdomain}`}>
              <Button className="mt-4">Tillbaka till handboken</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authentication required - not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-white p-8">
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
              <Link href={`/${subdomain}`}>
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
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Åtkomst nekad</h1>
            <p className="text-gray-600 mb-6">
              Du har inte behörighet att komma åt meddelandena för denna handbok. 
              Kontakta en administratör för att få tillgång.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard">
                <Button>Mina handböcker</Button>
              </Link>
              <Link href={`/${subdomain}`}>
                <Button variant="outline">Tillbaka till handboken</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Success notification toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
              <div className="h-2 w-2 bg-green-600 rounded-full"></div>
            </div>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Header med vit text på blå bakgrund */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-8">
          <nav className="mb-4">
            <Link 
              href={`/${subdomain}`}
              className="text-blue-100 hover:text-white text-sm"
            >
              ← Tillbaka till {handbook.title}
            </Link>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Meddelanden</h1>
          </div>
          <p className="text-blue-100">
            Ställ frågor, dela tips och håll dig uppdaterad med dina grannar
          </p>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Förenklad meddelandeöversikt */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Meddelanden</h1>
              <p className="text-gray-600 text-sm sm:text-base">Ställ frågor, dela tips och håll dig uppdaterad</p>
            </div>
            <Button 
              onClick={() => openNewMessageForm()} 
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-10 px-4 text-sm font-medium self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nytt meddelande</span>
              <span className="sm:hidden">Nytt</span>
            </Button>
          </div>
        </div>

        {/* Senaste meddelanden */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Senaste meddelanden</h3>
          
          {messages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
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
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Header with title and actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg leading-6">
                        {message.title}
                      </h3>
                    </div>
                    
                    {/* Mobile-friendly actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
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
                          onClick={() => toggleReplyForm(message.id)}
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
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {message.content}
                  </p>
                  
                  {/* Metadata row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {message.category_name}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{message.author_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{message.reply_count}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(message.created_at).toLocaleDateString('sv-SE')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedMessage === message.id && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      </div>

                      {/* Replies section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 text-sm">
                            Svar ({message.reply_count})
                          </h4>
                          {replyInfo[message.id] && replyInfo[message.id].showing_recent && !showingAllReplies[message.id] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadReplies(message.id, true)}
                              className="text-blue-600 hover:text-blue-700 text-xs h-auto p-1"
                            >
                              Visa alla {replyInfo[message.id].total_count} svar
                            </Button>
                          )}
                        </div>
                        
                        {loadingReplies[message.id] ? (
                          <div className="text-center py-4">
                            <div className="text-sm text-gray-500">Laddar svar...</div>
                          </div>
                        ) : replies[message.id] && replies[message.id].length > 0 ? (
                          <div className="space-y-3">
                            {replyInfo[message.id] && replyInfo[message.id].showing_recent && !showingAllReplies[message.id] && (
                              <div className="text-xs text-gray-500 italic mb-2 border-l-2 border-gray-300 pl-2">
                                Visar de {replies[message.id]?.length || 0} senaste av {replyInfo[message.id].total_count} svar
                              </div>
                            )}
                            {replies[message.id].map((reply, index) => (
                              <div key={reply.id} className="bg-blue-50 rounded-lg p-3 border-l-2 border-blue-600">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <User className="h-3 w-3" />
                                    <span className="font-medium">{reply.author_name}</span>
                                    <span className="text-gray-500">
                                      {new Date(reply.created_at).toLocaleDateString('sv-SE')} {new Date(reply.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {/* Delete button for replies */}
                                  {(reply.author_id === user?.id || userRole === 'admin') && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                      onClick={() => handleDeleteReply(reply.id, message.id, reply.author_name)}
                                      disabled={deletingReply === reply.id}
                                      title="Radera svar"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : message.reply_count > 0 ? null : (
                          <div className="text-sm text-gray-500 italic">
                            Inga svar än. Bli första att svara!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reply form */}
                  {showReplyForm === message.id && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm">Skriv ett svar</h4>
                        <div className="space-y-3">
                          <Input
                            type="text"
                            value={replyData.author_name}
                            onChange={(e) => setReplyData(prev => ({ ...prev, author_name: e.target.value }))}
                            placeholder="Ditt namn"
                            className="w-full text-sm"
                          />
                          <Textarea
                            value={replyData.content}
                            onChange={(e) => setReplyData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Skriv ditt svar här..."
                            rows={3}
                            className="w-full resize-none text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(message.id)}
                              disabled={!replyData.content.trim() || !replyData.author_name.trim() || submittingReply}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              {submittingReply ? 'Skickar...' : 'Skicka svar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleReplyForm(message.id)}
                              className="text-xs"
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
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessageForm} onOpenChange={setShowNewMessageForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden !bg-white shadow-2xl border border-gray-200 rounded-lg z-50 mx-4 dialog-content">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Skapa nytt meddelande
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Skriv ditt meddelande nedan. Det kommer att synas för alla som har tillgång till handboken.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-1">
            <div className="space-y-6 py-4">
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
                  <SelectTrigger className="w-full !bg-white border-gray-300">
                    <SelectValue placeholder="Välj kategori" />
                  </SelectTrigger>
                  <SelectContent className="!bg-white border border-gray-200 shadow-lg z-[60]">
                    {categories.length === 0 ? (
                      <SelectItem value="" disabled>Inga kategorier tillgängliga</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="hover:bg-gray-50">
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
                  className="w-full !bg-white border-gray-300"
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
                  className="w-full !bg-white border-gray-300"
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
                  className="w-full resize-none !bg-white border-gray-300"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 mt-0">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 space-y-reverse w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewMessageForm(false)}
                className="!bg-white border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
              >
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={handleSubmitMessage}
                disabled={!formData.title || !formData.content || !formData.author_name || !formData.category_id || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto"
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