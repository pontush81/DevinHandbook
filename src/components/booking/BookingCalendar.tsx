"use client"

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Users,
  Phone,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { BookingResource, Booking, BookingWithDetails, BookingInsert } from '@/types/booking';
import { 
  SIMPLIFIED_RESOURCE_TYPES, 
  SIMPLIFIED_RESOURCE_TEMPLATES, 
  SimplifiedBookingRules,
  validateSimplifiedBooking,
  convertToSwedishTime, 
  convertFromSwedishTime, 
  formatSwedishDateTime,
  detectSimplifiedCollisions
} from '@/lib/booking-standards';
import { fetchWithAuth } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BookingCalendarProps {
  handbookId: string;
  userRole: 'owner' | 'admin' | 'member' | 'moderator';
  isTrialExpired?: boolean;
}

// FÖRENKLAD RESURS-TYP
interface SimplifiedResource {
  id: string;
  name: string;
  description: string;
  resource_type: keyof typeof SIMPLIFIED_RESOURCE_TYPES;
  capacity: number;
  is_active: boolean;
  handbook_id: string;
  created_at: string;
  updated_at: string;
}

// FÖRENKLAD BOKNING-TYP
interface SimplifiedBookingInsert {
  resource_id: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: number;
  contact_phone: string;
  notes: string;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  handbookId,
  userRole,
  isTrialExpired = false
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<SimplifiedResource[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [selectedResource, setSelectedResource] = useState<SimplifiedResource | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState<SimplifiedBookingInsert>({
    resource_id: '',
    start_time: '',
    end_time: '',
    purpose: '',
    attendees: 1,
    contact_phone: '',
    notes: ''
  });
  const [newResource, setNewResource] = useState({
    name: '',
    description: '',
    type: 'other' as keyof typeof SIMPLIFIED_RESOURCE_TYPES,
    capacity: 1,
    is_active: true
  });
  const [editingResource, setEditingResource] = useState<SimplifiedResource | null>(null);
  const [editResourceDialogOpen, setEditResourceDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    const abortController = new AbortController();
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        await Promise.all([
          fetchResources(abortController.signal),
          fetchBookings(abortController.signal)
        ]);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
          console.error('Fetch error:', err);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
      abortController.abort();
    };
  }, [handbookId]);

  const fetchResources = async (signal?: AbortSignal) => {
    try {
      const response = await fetchWithAuth(`/api/booking-resources?handbook_id=${handbookId}`, {
        signal
      });
      
      if (!response.ok) throw new Error('Kunde inte hämta resurser');
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        setResources(data.data);
        // Ingen automatisk val av första resursen - användaren måste välja själv
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setError('Kunde inte hämta resurser');
        toast.error('Kunde inte hämta resurser');
      }
    }
  };

  const fetchBookings = async (signal?: AbortSignal) => {
    try {
      const response = await fetchWithAuth(`/api/bookings?handbook_id=${handbookId}`, {
        signal
      });
      
      if (!response.ok) throw new Error('Kunde inte hämta bokningar');
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        setBookings(data.data.data || data.data || []);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setError('Kunde inte hämta bokningar');
        toast.error('Kunde inte hämta bokningar');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createBooking = async (bookingData: SimplifiedBookingInsert) => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      // Hitta resursnamn för auto-genererad titel
      const selectedResourceObj = resources.find(r => r.id === bookingData.resource_id);
      const title = selectedResourceObj ? `Bokning av ${selectedResourceObj.name}` : 'Bokning';

      // FÖRENKLAD: Använd förenklad validering
      if (selectedResourceObj) {
        const existingBookings = bookings
          .filter(b => b.resource_id === bookingData.resource_id)
          .map(b => ({
            start_time: b.start_time,
            end_time: b.end_time,
            user_id: b.user_id || ''
          }));

        const validation = validateSimplifiedBooking({
          ...bookingData,
          user_id: user?.id || ''
        }, { type: selectedResourceObj.resource_type }, existingBookings);

        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error));
          return;
        }

        // Visa varningar om det finns
        validation.warnings.forEach(warning => toast.warning(warning));
      }

      // Konvertera från datetime-local (svensk tid) till UTC
      const swedishStartTime = new Date(bookingData.start_time);
      const swedishEndTime = new Date(bookingData.end_time);
      const utcStartTime = convertFromSwedishTime(swedishStartTime);
      const utcEndTime = convertFromSwedishTime(swedishEndTime);
      
      // Validate that start time is not in the past
      const nowSwedish = convertToSwedishTime(new Date());
      if (swedishStartTime < nowSwedish) {
        toast.error('Starttid kan inte vara i det förflutna');
        return;
      }

      // Check for conflicts with race condition protection
      const hasConflict = await detectSimplifiedCollisions(
        bookingData.resource_id,
        utcStartTime.toISOString(),
        utcEndTime.toISOString()
      );

      if (hasConflict) {
        toast.error('Tidskonflik upptäckt - någon annan kan ha bokat denna tid');
        return;
      }

      const response = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handbook_id: handbookId,
          resource_id: bookingData.resource_id,
          start_time: utcStartTime.toISOString(),
          end_time: utcEndTime.toISOString(),
          title,
          purpose: bookingData.purpose,
          attendees: bookingData.attendees,
          contact_phone: bookingData.contact_phone,
          notes: bookingData.notes,
          status: 'confirmed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte skapa bokning');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Bokning skapad!');
        setBookingDialogOpen(false);
        setNewBooking({
          resource_id: '',
          start_time: '',
          end_time: '',
          purpose: '',
          attendees: 1,
          contact_phone: '',
          notes: ''
        });
        await fetchBookings();
      } else {
        throw new Error(result.error || 'Kunde inte skapa bokning');
      }
    } catch (err) {
      console.error('Booking error:', err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Ett oväntat fel inträffade');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createResource = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth('/api/booking-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handbook_id: handbookId,
          name: newResource.name,
          description: newResource.description,
          resource_type: newResource.type,
          capacity: newResource.capacity,
          is_active: newResource.is_active
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte skapa resurs');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Resurs skapad!');
        setResourceDialogOpen(false);
        setNewResource({
          name: '',
          description: '',
          type: 'other',
          capacity: 1,
          is_active: true
        });
        await fetchResources();
      } else {
        throw new Error(result.error || 'Kunde inte skapa resurs');
      }
    } catch (err) {
      console.error('Resource creation error:', err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Ett oväntat fel inträffade');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna resurs?')) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`/api/booking-resources/${resourceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte ta bort resurs');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Resurs borttagen!');
        await fetchResources();
        if (selectedResource?.id === resourceId) {
          setSelectedResource(null);
        }
      } else {
        throw new Error(result.error || 'Kunde inte ta bort resurs');
      }
    } catch (err) {
      console.error('Resource deletion error:', err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Ett oväntat fel inträffade');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna bokning?')) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte ta bort bokning');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Bokning borttagen!');
        await fetchBookings();
      } else {
        throw new Error(result.error || 'Kunde inte ta bort bokning');
      }
    } catch (err) {
      console.error('Booking deletion error:', err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Ett oväntat fel inträffade');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // FÖRENKLAD: Endast grundläggande kalender-funktioner
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Måndag
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Ny funktion för månadsvy
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Första dagen i månaden
    const firstDay = new Date(year, month, 1);
    // Sista dagen i månaden
    const lastDay = new Date(year, month + 1, 0);
    
    // Hitta första måndag att visa (kan vara från föregående månad)
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay() + 1);
    if (startDate > firstDay) {
      startDate.setDate(startDate.getDate() - 7);
    }
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Hämta 6 veckor (42 dagar) för att täcka hela månaden
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Funktion för att få korrekt veckonummer
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  // Funktion för att navigera till idag
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getBookingsForDate = (date: Date, resourceId?: string) => {
    const targetDate = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const bookingDate = convertToSwedishTime(new Date(booking.start_time)).toISOString().split('T')[0];
      return bookingDate === targetDate && (!resourceId || booking.resource_id === resourceId);
    });
  };

  const formatTimeSlot = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('sv-SE', options).format(date);
  };

  const handleDateClick = (date: Date, resourceId?: string) => {
    setSelectedDate(date);
    if (resourceId) {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        setSelectedResource(resource);
      }
    }
    
    // Öppna bokningsdialogen om en resurs är vald
    if (selectedResource || resourceId) {
      const targetResource = selectedResource || resources.find(r => r.id === resourceId);
      if (targetResource) {
        // Sätt standardtid till klickad dag kl 9:00
        const defaultStart = new Date(date);
        defaultStart.setHours(9, 0, 0, 0);
        const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000); // 2 timmar senare

        // Konvertera till lokal tid för datetime-local input
        const startTimeLocal = new Date(defaultStart.getTime() - defaultStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const endTimeLocal = new Date(defaultEnd.getTime() - defaultEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

        setNewBooking({
          resource_id: targetResource.id,
          start_time: startTimeLocal,
          end_time: endTimeLocal,
          purpose: '',
          attendees: 1,
          contact_phone: '',
          notes: ''
        });
        setBookingDialogOpen(true);
      }
    }
  };

  const handleNewBookingClick = () => {
    if (!selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 timme från nu
    const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000); // 2 timmar senare

    // Konvertera till lokal tid för datetime-local input
    const startTimeLocal = new Date(defaultStart.getTime() - defaultStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endTimeLocal = new Date(defaultEnd.getTime() - defaultEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setNewBooking({
      resource_id: selectedResource.id,
      start_time: startTimeLocal,
      end_time: endTimeLocal,
      purpose: '',
      attendees: 1,
      contact_phone: '',
      notes: ''
    });
    setBookingDialogOpen(true);
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setNewBooking(prev => {
      const start = new Date(newStartTime);
      const currentEnd = new Date(prev.end_time);
      const currentDuration = currentEnd.getTime() - new Date(prev.start_time).getTime();
      const newEnd = new Date(start.getTime() + currentDuration);
      
      return {
        ...prev,
        start_time: newStartTime,
        end_time: new Date(newEnd.getTime() - newEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bokningssystem</h1>
        <p className="text-gray-600">Förenklade bokningsregler - endast 5 kärnregler per resurs</p>
      </div>

      {/* Resursväljare */}
      <div className="mb-6">
        {/* Desktop layout */}
        <div className="hidden md:flex items-center gap-4 mb-4">
          <Select value={selectedResource?.id || ''} onValueChange={(value) => {
            const resource = resources.find(r => r.id === value);
            setSelectedResource(resource || null);
          }}>
            <SelectTrigger className="w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="Välj resurs" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {resources.map(resource => (
                <SelectItem key={resource.id} value={resource.id} className="text-gray-900 dark:text-gray-100">
                  {resource.name} ({SIMPLIFIED_RESOURCE_TYPES[resource.resource_type]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleNewBookingClick} disabled={!selectedResource}>
            <Plus className="w-4 h-4 mr-2" />
            Ny bokning
          </Button>

          {(userRole === 'admin' || userRole === 'owner') && (
            <Button variant="outline" onClick={() => setResourceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ny resurs
            </Button>
          )}
        </div>

        {/* Mobile layout - stacked */}
        <div className="md:hidden space-y-3 mb-4">
          <Select value={selectedResource?.id || ''} onValueChange={(value) => {
            const resource = resources.find(r => r.id === value);
            setSelectedResource(resource || null);
          }}>
            <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="Välj resurs" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {resources.map(resource => (
                <SelectItem key={resource.id} value={resource.id} className="text-gray-900 dark:text-gray-100">
                  {resource.name} ({SIMPLIFIED_RESOURCE_TYPES[resource.resource_type]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button 
              onClick={handleNewBookingClick} 
              disabled={!selectedResource}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny bokning
            </Button>

            {(userRole === 'admin' || userRole === 'owner') && (
              <Button 
                variant="outline" 
                onClick={() => setResourceDialogOpen(true)}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ny resurs
              </Button>
            )}
          </div>
        </div>

        {/* Visa resursregler */}
        {selectedResource && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {selectedResource.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  // Säkerhetskontroll för selectedResource
                  if (!selectedResource) {
                    return (
                      <div className="text-sm text-gray-500 col-span-full">
                        Välj en resurs för att se bokningsregler
                      </div>
                    );
                  }
                  
                  // Debug: logga resurstyp och tillgängliga templates
                  console.log('Selected resource type:', selectedResource.resource_type);
                  console.log('Available templates:', Object.keys(SIMPLIFIED_RESOURCE_TEMPLATES));
                  console.log('Selected resource:', selectedResource);
                  
                  const rules = SIMPLIFIED_RESOURCE_TEMPLATES[selectedResource.resource_type];
                  
                  // Säkerhetskontroll för rules
                  if (!rules) {
                    return (
                      <div className="text-sm text-red-500 col-span-full">
                        Bokningsregler saknas för resurstyp: "{selectedResource.resource_type}"
                        <br />
                        <span className="text-xs">Tillgängliga: {Object.keys(SIMPLIFIED_RESOURCE_TEMPLATES).join(', ')}</span>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Max {rules.maxAdvanceBookingDays} dagar i förväg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Max {rules.maxBookingDurationHours} timmar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Max {rules.maxBookingsPerUserPerWeek} bokningar/vecka</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Öppet {rules.operatingHours.start}-{rules.operatingHours.end}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        <span className="text-sm">{rules.cleaningBufferMinutes} min städbuffer</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Kalender */}
      <Card className="shadow-lg rounded-xl border-0">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <Calendar className="w-6 h-6 text-blue-600" />
                {viewMode === 'week' ? 'Veckokalender' : 'Månadskalender'}
              </CardTitle>
              
              {/* Vyväljare */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 shadow-sm">
                <Button 
                  variant={viewMode === 'week' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('week')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'week' 
                      ? 'bg-white shadow-md text-gray-900 border-0' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Vecka
                </Button>
                <Button 
                  variant={viewMode === 'month' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'month' 
                      ? 'bg-white shadow-md text-gray-900 border-0' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Månad
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className="rounded-lg border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 shadow-sm transition-all duration-200"
              >
                Idag
              </Button>
              
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (viewMode === 'week') {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
                    } else {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate()));
                    }
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm font-semibold min-w-[140px] text-center text-gray-900 dark:text-gray-100">
                  {viewMode === 'week' 
                    ? `Vecka ${getWeekNumber(currentDate)} - ${currentDate.getFullYear()}`
                    : `${currentDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' })}`
                  }
                </span>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (viewMode === 'week') {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
                    } else {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                    }
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Header - Ultra kompakt */}
          <div className="md:hidden space-y-2 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {viewMode === 'week' 
                    ? `Vecka ${getWeekNumber(currentDate)}`
                    : `${currentDate.toLocaleString('sv-SE', { month: 'short', year: 'numeric' })}`
                  }
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className="rounded text-xs px-2 py-1 h-6"
              >
                Idag
              </Button>
            </div>
            
            {/* Mobile Navigation - Ultra kompakt */}
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                <Button 
                  variant={viewMode === 'week' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('week')}
                  className={`rounded px-2 py-1 text-xs h-6 transition-all duration-200 ${
                    viewMode === 'week' 
                      ? 'bg-white shadow-sm text-gray-900 border-0' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  V
                </Button>
                <Button 
                  variant={viewMode === 'month' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className={`rounded px-2 py-1 text-xs h-6 transition-all duration-200 ${
                    viewMode === 'month' 
                      ? 'bg-white shadow-sm text-gray-900 border-0' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  M
                </Button>
              </div>
              
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded px-1 py-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (viewMode === 'week') {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
                    } else {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate()));
                    }
                  }}
                  className="p-1 rounded h-6 w-6"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (viewMode === 'week') {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
                    } else {
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
                    }
                  }}
                  className="p-1 rounded h-6 w-6"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 md:p-6">
          {viewMode === 'week' ? (
            // Veckokalender - Extra responsiv
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-4">
              {/* Veckodagsrubriker */}
              {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day, index) => (
                <div key={day} className="text-center font-semibold text-xs md:text-sm text-gray-700 dark:text-gray-300 py-1 sm:py-2 md:py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden text-xs">{['M', 'T', 'O', 'T', 'F', 'L', 'S'][index]}</span>
                </div>
              ))}
              
              {/* Veckodagar */}
              {getWeekDays(currentDate).map(day => {
                const dayBookings = getBookingsForDate(day, selectedResource?.id);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-1 sm:p-2 md:p-4 rounded sm:rounded-lg md:rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md min-h-[60px] sm:min-h-[80px] md:min-h-[120px] ${
                      isToday 
                        ? 'bg-blue-50 border border-blue-300 shadow-sm dark:bg-blue-900 dark:border-blue-600' 
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${selectedDate?.toDateString() === day.toDateString() ? 'bg-blue-100 border border-blue-400 shadow-sm dark:bg-blue-800 dark:border-blue-500' : ''}`}
                    onClick={() => handleDateClick(day, selectedResource?.id)}
                  >
                    <div className={`text-xs sm:text-sm md:text-lg font-semibold mb-1 md:mb-2 ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Bokningar */}
                    <div className="space-y-0.5 sm:space-y-1 md:space-y-2">
                      {dayBookings.slice(0, 2).map(booking => (
                        <div key={booking.id} className="text-xs px-1 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-800 rounded truncate font-medium text-blue-900 dark:text-blue-100">
                          <span className="hidden lg:inline">{formatTimeSlot(convertToSwedishTime(new Date(booking.start_time)))} - </span>
                          <span className="truncate">{booking.purpose}</span>
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          +{dayBookings.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Månadskalender - Extra responsiv för mobil
            <div className="grid grid-cols-7 md:grid-cols-8 gap-0.5 sm:gap-1 md:gap-3">
              {/* Tom cell för veckonummer-kolumnen (endast desktop) */}
              <div className="hidden md:block text-center font-semibold text-sm text-gray-700 dark:text-gray-300 py-3 border-b-2 border-gray-100 dark:border-gray-700">
                V
              </div>
              {/* Veckodagsrubriker */}
              {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day, index) => (
                <div key={day} className="text-center font-semibold text-xs md:text-sm text-gray-700 dark:text-gray-300 py-1 sm:py-2 md:py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden text-xs">{['M', 'T', 'O', 'T', 'F', 'L', 'S'][index]}</span>
                </div>
              ))}
              
              {/* Månadsinnehåll med veckonummer */}
              {(() => {
                const monthDays = getMonthDays(currentDate);
                const weeks = [];
                
                // Gruppera dagar i veckor (7 dagar per vecka)
                for (let i = 0; i < monthDays.length; i += 7) {
                  weeks.push(monthDays.slice(i, i + 7));
                }
                
                return weeks.map((week, weekIndex) => (
                  <React.Fragment key={weekIndex}>
                    {/* Veckonummer (endast desktop) */}
                    <div className="hidden md:flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg min-h-[60px] md:min-h-[100px]">
                      {getWeekNumber(week[0])}
                    </div>
                    
                    {/* Dagar i veckan */}
                    {week.map(day => {
                      const dayBookings = getBookingsForDate(day, selectedResource?.id);
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={`p-0.5 sm:p-1 md:p-3 rounded sm:rounded-lg md:rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md min-h-[30px] xs:min-h-[40px] sm:min-h-[60px] md:min-h-[100px] ${
                            isToday 
                              ? 'bg-blue-50 border border-blue-300 shadow-sm dark:bg-blue-900 dark:border-blue-600' 
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          } ${selectedDate?.toDateString() === day.toDateString() ? 'bg-blue-100 border border-blue-400 shadow-sm dark:bg-blue-800 dark:border-blue-500' : ''} ${
                            !isCurrentMonth ? 'opacity-50' : ''
                          }`}
                          onClick={() => handleDateClick(day, selectedResource?.id)}
                        >
                          <div className={`text-xs sm:text-sm md:text-base font-semibold mb-0.5 sm:mb-1 md:mb-2 ${
                            isToday 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : isCurrentMonth 
                                ? 'text-gray-900 dark:text-gray-100' 
                                : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {day.getDate()}
                          </div>
                          
                          {/* Bokningar - Färre på mobil */}
                          <div className="space-y-0.5 sm:space-y-1">
                            {dayBookings.slice(0, 1).map(booking => (
                              <div key={booking.id} className="text-xs p-0.5 sm:p-1 bg-blue-100 dark:bg-blue-800 rounded truncate font-medium text-blue-900 dark:text-blue-100">
                                <span className="hidden sm:inline">{booking.purpose}</span>
                                <span className="sm:hidden">•</span>
                              </div>
                            ))}
                            {dayBookings.length > 1 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <span className="hidden sm:inline">+{dayBookings.length - 1} mer</span>
                                <span className="sm:hidden">+{dayBookings.length - 1}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bokningsdialog - FÖRENKLAD OCH KOMPAKT */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Ny bokning</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Skapa en ny bokning för {selectedResource?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-1 sm:px-0">
            {/* Tid - Kompakt layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-time" className="text-sm text-gray-900 dark:text-gray-100">Starttid</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={newBooking.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-time" className="text-sm text-gray-900 dark:text-gray-100">Sluttid</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={newBooking.end_time}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, end_time: e.target.value }))}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>

            {/* Syfte - Viktigaste fältet */}
            <div className="space-y-1">
              <Label htmlFor="purpose" className="text-sm text-gray-900 dark:text-gray-100">Syfte</Label>
              <Input
                id="purpose"
                placeholder="Vad ska resursen användas till?"
                value={newBooking.purpose}
                onChange={(e) => setNewBooking(prev => ({ ...prev, purpose: e.target.value }))}
                className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Antal deltagare och telefon - Kompakt */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="attendees" className="text-sm text-gray-900 dark:text-gray-100">Deltagare</Label>
                <Input
                  id="attendees"
                  type="number"
                  min="1"
                  max={selectedResource?.capacity || 1}
                  value={newBooking.attendees}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, attendees: parseInt(e.target.value) || 1 }))}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact-phone" className="text-sm text-gray-900 dark:text-gray-100">Telefon</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="070-123 45 67"
                  value={newBooking.contact_phone}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>

            {/* Knappar */}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => createBooking(newBooking)} disabled={isLoading} className="flex-1">
                {isLoading ? 'Skapar...' : 'Skapa bokning'}
              </Button>
              <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resursdialog - FÖRENKLAD OCH KOMPAKT */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Ny resurs</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Skapa en ny bokningsbar resurs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-1 sm:px-0">
            {/* Namn och typ - Viktigaste fälten */}
            <div className="space-y-1">
              <Label htmlFor="resource-name" className="text-sm text-gray-900 dark:text-gray-100">Namn</Label>
              <Input
                id="resource-name"
                placeholder="t.ex. Tvättstuga 1"
                value={newResource.name}
                onChange={(e) => setNewResource(prev => ({ ...prev, name: e.target.value }))}
                className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="resource-type" className="text-sm text-gray-900 dark:text-gray-100">Typ</Label>
              <Select value={newResource.type} onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value as keyof typeof SIMPLIFIED_RESOURCE_TYPES }))}>
                <SelectTrigger className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {Object.entries(SIMPLIFIED_RESOURCE_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-gray-900 dark:text-gray-100">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Beskrivning och kapacitet - Kompakt layout */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="resource-description" className="text-sm text-gray-900 dark:text-gray-100">Beskrivning</Label>
                <Input
                  id="resource-description"
                  placeholder="Kort beskrivning..."
                  value={newResource.description}
                  onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resource-capacity" className="text-sm text-gray-900 dark:text-gray-100">Kapacitet</Label>
                <Input
                  id="resource-capacity"
                  type="number"
                  min="1"
                  value={newResource.capacity}
                  onChange={(e) => setNewResource(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>

            {/* Knappar */}
            <div className="flex gap-2 pt-2">
              <Button onClick={createResource} disabled={isLoading} className="flex-1">
                {isLoading ? 'Skapar...' : 'Skapa resurs'}
              </Button>
              <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendar; 