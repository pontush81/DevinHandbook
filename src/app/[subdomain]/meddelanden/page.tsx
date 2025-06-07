'use client';

/**
 * Enkel Meddelanden-sektion som integreras naturligt i handboken
 * Använder path-baserad routing: /[subdomain]/meddelanden
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageCircle, Plus, Clock, User, Send, X, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Message {
  id: string;
  title: string;
  content: string;
  author_name: string;
  category_name: string;
  created_at: string;
  reply_count: number;
}

interface Reply {
  id: string;
  content: string;
  author_name: string;
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
  
  const [handbook, setHandbook] = useState<Handbook | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  
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

      if (!handbookData.forum_enabled) {
        console.log('Forum not enabled for this handbook');
        return;
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('handbook_id', handbookData.id)
        .order('name');

      console.log('Categories loaded:', categoriesData);
      console.log('Categories error:', categoriesError);
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
          reply_count,
          forum_categories!inner(name)
        `)
        .eq('handbook_id', handbookData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const formattedMessages = messagesData?.map(msg => ({
        id: msg.id,
        title: msg.title,
        content: msg.content,
        author_name: msg.author_name || 'Anonym',
        category_name: msg.forum_categories?.name || 'Allmänt',
        created_at: msg.created_at,
        reply_count: msg.reply_count || 0
      })) || [];

      console.log('Messages loaded:', formattedMessages);
      setMessages(formattedMessages);
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
    console.log('Submitting message with form data:', formData);
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.author_name.trim()) {
      alert('Vänligen fyll i alla fält');
      return;
    }

    if (!formData.category_id) {
      alert('Vänligen välj en kategori');
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
      
      // Reload messages
      loadData();
      
      alert('Meddelandet har skapats!');
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

      // Reset reply form
      setReplyData({ content: '', author_name: '' });
      setShowReplyForm(null);
      
      // Reload replies for this message
      loadReplies(messageId);
      
      // Update reply count in messages
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reply_count: msg.reply_count + 1 }
          : msg
      ));

      alert('Svaret har skickats!');
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setSubmittingReply(false);
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

  if (loading) {
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

  return (
    <div className="min-h-screen bg-white">
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Meddelanden</h2>
              <p className="text-gray-600">Ställ frågor, dela tips och håll dig uppdaterad</p>
            </div>
            <Button onClick={() => openNewMessageForm()} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-5 w-5 mr-2" />
              Nytt meddelande
            </Button>
          </div>

          {/* Kategorier som information med blå bakgrund och vit text */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-blue-200 bg-blue-600">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-white" />
                  <h3 className="font-medium text-white">Frågor & Svar</h3>
                </div>
                <p className="text-sm text-blue-100">
                  {messages.filter(m => 
                    m.category_name.toLowerCase().includes('allmänt') || 
                    m.category_name.toLowerCase().includes('frågor')
                  ).length} meddelanden
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-600">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-white" />
                  <h3 className="font-medium text-white">Info från styrelsen</h3>
                </div>
                <p className="text-sm text-blue-100">
                  {messages.filter(m => 
                    m.category_name.toLowerCase().includes('styrelse') || 
                    m.category_name.toLowerCase().includes('meddelanden')
                  ).length} meddelanden
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-600">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-white" />
                  <h3 className="font-medium text-white">Tips & Råd</h3>
                </div>
                <p className="text-sm text-blue-100">
                  {messages.filter(m => 
                    m.category_name.toLowerCase().includes('tips') || 
                    m.category_name.toLowerCase().includes('granntips')
                  ).length} meddelanden
                </p>
              </CardContent>
            </Card>
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
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600 text-white border-blue-600">
                        {message.category_name}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        <span>{message.author_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(message.created_at).toLocaleDateString('sv-SE')}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {message.title}
                  </h3>
                  
                  <p className="text-gray-600 line-clamp-3 mb-3">
                    {message.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => toggleMessageExpanded(message.id)}
                      >
                        {expandedMessage === message.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Dölj detaljer
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Läs mer
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => toggleReplyForm(message.id)}
                      >
                        <Reply className="h-4 w-4 mr-1" />
                        Svara
                      </Button>
                    </div>
                    <span className="text-sm text-gray-500">
                      {message.reply_count} svar
                    </span>
                  </div>

                  {/* Expanded content */}
                  {expandedMessage === message.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

                      {/* Replies section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            Svar ({message.reply_count})
                          </h4>
                          {replyInfo[message.id] && replyInfo[message.id].showing_recent && !showingAllReplies[message.id] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadReplies(message.id, true)}
                              className="text-blue-600 hover:text-blue-700 text-xs"
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
                                Visar de {replies[message.id].length} senaste av {replyInfo[message.id].total_count} svar
                              </div>
                            )}
                            {replies[message.id].map((reply, index) => (
                              <div key={reply.id} className="bg-blue-50 rounded-lg p-3 ml-4 border-l-2 border-blue-600">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">{reply.author_name}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(reply.created_at).toLocaleDateString('sv-SE')} {new Date(reply.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            Inga svar än. Bli första att svara!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reply form */}
                  {showReplyForm === message.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Skriv ett svar</h4>
                        <div className="space-y-3">
                          <Input
                            type="text"
                            value={replyData.author_name}
                            onChange={(e) => setReplyData(prev => ({ ...prev, author_name: e.target.value }))}
                            placeholder="Ditt namn"
                            className="w-full"
                          />
                          <Textarea
                            value={replyData.content}
                            onChange={(e) => setReplyData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Skriv ditt svar här..."
                            rows={3}
                            className="w-full resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(message.id)}
                              disabled={!replyData.content.trim() || !replyData.author_name.trim() || submittingReply}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {submittingReply ? 'Skickar...' : 'Skicka svar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleReplyForm(message.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-white shadow-2xl border border-gray-200 rounded-lg z-50">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Skapa nytt meddelande
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Skriv ditt meddelande nedan. Det kommer att synas för alla som har tillgång till handboken.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
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
                rows={5}
                className="w-full resize-none !bg-white border-gray-300"
              />
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-200 mt-6">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 space-y-reverse">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewMessageForm(false)}
                className="!bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={handleSubmitMessage}
                disabled={!formData.title || !formData.content || !formData.author_name || !formData.category_id || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
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