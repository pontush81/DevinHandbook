"use client"

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Settings, 
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { BookingResource, Booking, BookingWithDetails, BookingInsert, PricingConfig, TimeRestrictions, BookingLimits, BookingRulesConfig } from '@/types/booking';
import { ResourceTemplates, ResourceType, toSwedishTime, fromSwedishTime, formatSwedishDateTime, detectCollisions } from '@/lib/booking-standards';
import { fetchWithAuth } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';

interface BookingCalendarProps {
  handbookId: string;
  userRole: 'owner' | 'admin' | 'member' | 'moderator';
  isTrialExpired?: boolean;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  handbookId,
  userRole,
  isTrialExpired = false
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [selectedResource, setSelectedResource] = useState<BookingResource | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
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
    max_duration_hours: 4,
    capacity: 1,
    requires_approval: false,
    is_active: true,
    resource_type: 'other' as ResourceType,
    pricing_config: {
      base_fee: 0,
      hourly_rate: 0,
      cleaning_fee: 0
    },
    time_restrictions: {
      start_time: '06:00',
      end_time: '22:00',
      weekdays_only: false
    },
    booking_limits: {
      max_duration_hours: 24,
      max_bookings_per_user_per_month: 5,
      min_booking_duration_hours: 1
    },
    booking_rules: {
      cancellation_deadline_hours: 24,
      auto_approve: true,
      requires_approval_over_hours: null,
      special_instructions: '',
      deposit_required: false
    }
  });
  const [editingResource, setEditingResource] = useState<BookingResource | null>(null);
  const [editResourceDialogOpen, setEditResourceDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Ref för att spåra om komponenten är mounted
  const isMountedRef = useRef(true);

  // Hämta resurser och bokningar med proper cleanup
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

    // Cleanup function
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
        // Set first resource as selected if none selected
        if (data.data.length > 0 && !selectedResource) {
          setSelectedResource(data.data[0]);
        }
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
        // API returnerar paginerad data: { data: [...], count, page, etc }
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

  const createBooking = async (bookingData: Omit<BookingInsert, 'handbook_id' | 'member_id' | 'user_id'>) => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      // Hitta resursnamn för auto-genererad titel
      const selectedResourceObj = resources.find(r => r.id === bookingData.resource_id);
      const title = selectedResourceObj ? `Bokning av ${selectedResourceObj.name}` : 'Bokning';

      // FIXED: Konvertera från datetime-local (svensk tid) till UTC
      const swedishStartTime = new Date(bookingData.start_time);
      const swedishEndTime = new Date(bookingData.end_time);
      const utcStartTime = fromSwedishTime(swedishStartTime);
      const utcEndTime = fromSwedishTime(swedishEndTime);
      
      // Validate that start time is not in the past (använd svensk tid för jämförelse)
      const nowSwedish = toSwedishTime(new Date());
      if (swedishStartTime < nowSwedish) {
        throw new Error('Du kan inte boka datum som redan passerat');
      }
      
      // FIXED: Race condition protection - hämta senaste bokningar före skapande
      const resourceBookings = bookings.filter(b => b.resource_id === bookingData.resource_id);
      const collision = detectCollisions(
        utcStartTime, 
        utcEndTime, 
        resourceBookings.map(b => ({ 
          start_time: b.start_time, 
          end_time: b.end_time,
          id: b.id 
        }))
      );
      
      if (collision.hasCollision) {
        throw new Error(`Tiden är redan bokad. Konflikter: ${collision.conflictingBookings.join(', ')}`);
      }
      
      const payload = {
        resource_id: bookingData.resource_id,
        start_time: utcStartTime.toISOString(),
        end_time: utcEndTime.toISOString(),
        title: title,
        contact_phone: bookingData.contact_phone || null,
        notes: bookingData.notes || null,
        handbook_id: handbookId
      };

      const response = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kunde inte skapa bokningen');
      }

      if (!isMountedRef.current) return;

      toast.success('Bokning skapad!');
      await fetchBookings();
      await fetchResources();
      setSelectedDate(null);
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

    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Error creating booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Kunde inte skapa bokningen';
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const createResource = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await fetchWithAuth('/api/booking-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newResource,
          handbook_id: handbookId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte skapa resurs');
      }
      
      const data = await response.json();
      if (data.success && isMountedRef.current) {
        setResources(prev => [...prev, data.data]);
        setResourceDialogOpen(false);
        setNewResource({ 
          name: '', 
          description: '', 
          max_duration_hours: 4, 
          capacity: 1,
          requires_approval: false,
          is_active: true,
          resource_type: 'other' as ResourceType,
          pricing_config: {
            base_fee: 0,
            hourly_rate: 0,
            cleaning_fee: 0
          },
          time_restrictions: {
            start_time: '06:00',
            end_time: '22:00',
            weekdays_only: false
          },
          booking_limits: {
            max_duration_hours: 24,
            max_bookings_per_user_per_month: 5,
            min_booking_duration_hours: 1
          },
          booking_rules: {
            cancellation_deadline_hours: 24,
            auto_approve: true,
            requires_approval_over_hours: null,
            special_instructions: '',
            deposit_required: false
          }
        });
        toast.success('Resurs skapad!');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        toast.error(err.message || 'Kunde inte skapa resurs');
      }
    }
  };

  const updateResource = async () => {
    if (!editingResource || !isMountedRef.current) return;
    
    try {
      const response = await fetchWithAuth(`/api/booking-resources/${editingResource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingResource.name,
          description: editingResource.description,
          max_duration_hours: editingResource.max_duration_hours,
          capacity: editingResource.capacity,
          handbook_id: handbookId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte uppdatera resurs');
      }
      
      const data = await response.json();
      if (data.success && isMountedRef.current) {
        setResources(prev => prev.map(r => r.id === editingResource.id ? data.data : r));
        setEditResourceDialogOpen(false);
        setEditingResource(null);
        toast.success('Resurs uppdaterad!');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        toast.error(err.message || 'Kunde inte uppdatera resurs');
      }
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await fetchWithAuth(`/api/booking-resources/${resourceId}?handbook_id=${handbookId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte radera resurs');
      }
      
      const data = await response.json();
      if (data.success && isMountedRef.current) {
        setResources(prev => prev.filter(r => r.id !== resourceId));
        if (selectedResource?.id === resourceId) {
          setSelectedResource(resources.find(r => r.id !== resourceId) || null);
        }
        toast.success('Resurs raderad!');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        toast.error(err.message || 'Kunde inte radera resurs');
      }
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`/api/bookings?id=${bookingId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kunde inte ta bort bokningen');
      }

      if (!isMountedRef.current) return;

      toast.success('Bokning borttagen!');
      await fetchBookings();
      await fetchResources();

    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Error deleting booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Kunde inte ta bort bokningen';
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Kalender-hjälpfunktioner
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Måndag = 0
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Justerar för måndag
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const getBookingsForDate = (date: Date, resourceId?: string) => {
    return bookings.filter(booking => {
      // FIXED: Konvertera UTC-tid från databas till svensk tid för jämförelse
      const utcBookingDate = new Date(booking.start_time);
      const swedishBookingDate = toSwedishTime(utcBookingDate);
      const swedishCompareDate = toSwedishTime(date);
      
      const sameDay = swedishBookingDate.toDateString() === swedishCompareDate.toDateString();
      const sameResource = !resourceId || booking.resource_id === resourceId;
      return sameDay && sameResource;
    });
  };

  const formatTimeSlot = (date: Date) => {
    // FIXED: Konvertera UTC-tid från databas till svensk tid för visning
    const swedishTime = toSwedishTime(date);
    return swedishTime.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ✅ ENHANCED: Smart booking med resursspecifika standarder och svensk tid
  const handleDateClick = (date: Date, resourceId?: string) => {
    if (!resourceId && !selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    // FIXED: Använd svensk tid för datumjämförelse
    const nowSwedish = toSwedishTime(new Date());
    nowSwedish.setHours(0, 0, 0, 0);
    const selectedDateSwedish = toSwedishTime(date);
    selectedDateSwedish.setHours(0, 0, 0, 0);
    
    if (selectedDateSwedish < nowSwedish) {
      toast.error('Du kan inte boka datum som redan passerat');
      return;
    }

    const workingResourceId = resourceId || selectedResource?.id;
    const resource = resources.find(r => r.id === workingResourceId);
    const resourceType = 'other' as ResourceType; // Default to 'other' since BookingResource doesn't have resource_type
    const rules = ResourceTemplates[resourceType];

    // FIXED: Smart default times i svensk tid
    const swedishDate = toSwedishTime(date);
    const defaultStartTime = new Date(swedishDate);
    const defaultEndTime = new Date(swedishDate);
    
    // Parse operating hours
    const [startHour, startMin] = rules.operatingHours.start.split(':').map(Number);
    const [endHour, endMin] = rules.operatingHours.end.split(':').map(Number);
    
    // Set smart default start time
    const now = toSwedishTime(new Date());
    if (swedishDate.toDateString() === now.toDateString()) {
      // If booking for today, start from current time or operating hours, whichever is later
      const currentHour = now.getHours();
      const nextHour = Math.max(currentHour + 1, startHour);
      defaultStartTime.setHours(Math.min(nextHour, endHour - 1), 0, 0, 0);
    } else {
      // For future dates, use operating hours start
      defaultStartTime.setHours(startHour, startMin, 0, 0);
    }
    
    // Set end time based on resource default duration
    const defaultDurationMs = Math.min(rules.maxBookingDurationHours, 2) * 60 * 60 * 1000;
    defaultEndTime.setTime(defaultStartTime.getTime() + defaultDurationMs);
    
    // Ensure end time doesn't exceed operating hours
    const maxEndTime = new Date(swedishDate);
    maxEndTime.setHours(endHour, endMin, 0, 0);
    if (defaultEndTime > maxEndTime) {
      defaultEndTime.setTime(maxEndTime.getTime());
      defaultStartTime.setTime(defaultEndTime.getTime() - defaultDurationMs);
    }

    setSelectedDate(swedishDate);
    
    // FIXED: Konvertera till UTC för API men visa som lokalt datetime-input
    const utcStartTime = fromSwedishTime(defaultStartTime);
    const utcEndTime = fromSwedishTime(defaultEndTime);
    
    setNewBooking({
      resource_id: workingResourceId!,
      start_time: utcStartTime.toISOString().slice(0, 16),
      end_time: utcEndTime.toISOString().slice(0, 16),
      purpose: '',
      attendees: 1,
      contact_phone: '',
      notes: ''
    });
    
    setBookingDialogOpen(true);
  };



  // Hantera manuell "Ny bokning" knapp-klick
  const handleNewBookingClick = () => {
    if (!selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    // FIXED: Använd svensk tid för bokningslogik
    const nowSwedish = toSwedishTime(new Date());
    let defaultStartTime = new Date(nowSwedish);
    
    // Sätt en intelligent starttid baserat på nuvarande tid
    const currentHour = nowSwedish.getHours();
    if (currentHour < 8) {
      defaultStartTime.setHours(9, 0, 0, 0); // Börja 09:00 om det är tidigt
    } else if (currentHour >= 18) {
      // Om det är sent, boka för imorgon
      defaultStartTime = new Date(nowSwedish.getTime() + 24 * 60 * 60 * 1000);
      defaultStartTime.setHours(9, 0, 0, 0);
    } else {
      // Avrunda upp till nästa timme
      defaultStartTime.setHours(currentHour + 1, 0, 0, 0);
    }
    
    const defaultEndTime = new Date(defaultStartTime);
    defaultEndTime.setHours(defaultStartTime.getHours() + 2); // 2 timmar som standard

    // FIXED: Konvertera svensk tid till format som datetime-local-input förstår
    setNewBooking({
      resource_id: selectedResource.id,
      start_time: defaultStartTime.toISOString().slice(0, 16),
      end_time: defaultEndTime.toISOString().slice(0, 16),
      purpose: '',
      attendees: 1,
      contact_phone: '',
      notes: ''
    });
    
    setBookingDialogOpen(true);
  };

  // Trial-spärr
  if (isTrialExpired) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bokningssystem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Bokningssystemet är en premium-funktion. Uppgradera din prenumeration för att få tillgång till bokningar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bokningssystem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bokningssystem
            </div>
            <div className="flex gap-2">
              {(['owner', 'admin'].includes(userRole)) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('Ny resurs clicked');
                    setResourceDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ny resurs
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className={`grid w-full ${(userRole === 'owner' || userRole === 'admin') ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="calendar" className="text-xs md:text-sm">
                <Calendar className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Kalender</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="text-xs md:text-sm">
                <MapPin className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Resurser</span>
                <span className="md:hidden">({resources.length})</span>
                <span className="hidden md:inline">({resources.length})</span>
              </TabsTrigger>
              <TabsTrigger value="my-bookings" className="text-xs md:text-sm">
                <User className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Mina bokningar</span>
              </TabsTrigger>
              {(userRole === 'owner' || userRole === 'admin') && (
                <TabsTrigger value="dashboard" className="text-xs md:text-sm">
                  <Settings className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Dashboard</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              {/* Resursväljare och kontroller */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Select value={selectedResource?.id || ''} onValueChange={(value) => {
                  const resource = resources.find(r => r.id === value);
                  setSelectedResource(resource || null);
                }}>
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Välj resurs att boka" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map(resource => (
                      <SelectItem key={resource.id} value={resource.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {resource.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                  >
                    {viewMode === 'week' ? 'Månadsvy' : 'Veckovy'}
                  </Button>
                  
                  <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!selectedResource}
                        onClick={() => {
                          console.log('Ny bokning clicked', { selectedResource });
                          if (selectedResource) {
                            setBookingDialogOpen(true);
                          } else {
                            toast.error('Välj en resurs först');
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ny bokning
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-white border border-gray-200">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900">Skapa ny bokning</DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Fyll i informationen nedan för att skapa en ny bokning.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="resource" className="text-gray-700">Resurs</Label>
                          <Select value={newBooking.resource_id} onValueChange={(value) => 
                            setNewBooking({...newBooking, resource_id: value})
                          }>
                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                              <SelectValue placeholder="Välj resurs" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              {resources.map(resource => (
                                <SelectItem key={resource.id} value={resource.id} className="text-gray-900">
                                  {resource.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start_time" className="text-gray-700">Starttid</Label>
                            <Input
                              id="start_time"
                              type="datetime-local"
                              value={newBooking.start_time}
                              min={new Date().toISOString().slice(0, 16)}
                              onChange={(e) => setNewBooking({...newBooking, start_time: e.target.value})}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label htmlFor="end_time" className="text-gray-700">Sluttid</Label>
                            <Input
                              id="end_time"
                              type="datetime-local"
                              value={newBooking.end_time}
                              min={new Date().toISOString().slice(0, 16)}
                              onChange={(e) => setNewBooking({...newBooking, end_time: e.target.value})}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="contact_phone" className="text-gray-700">Telefon (valfritt)</Label>
                          <Input
                            id="contact_phone"
                            type="tel"
                            placeholder="070-123 45 67"
                            value={newBooking.contact_phone}
                            onChange={(e) => setNewBooking({...newBooking, contact_phone: e.target.value})}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes" className="text-gray-700">Beskrivning (valfritt)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Tilläggsinformation..."
                            value={newBooking.notes}
                            onChange={(e) => setNewBooking({...newBooking, notes: e.target.value})}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => createBooking(newBooking)} 
                            disabled={isLoading || !newBooking.resource_id || !newBooking.start_time || !newBooking.end_time}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isLoading ? 'Skapar...' : 'Skapa bokning'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setBookingDialogOpen(false);
                              setSelectedDate(null);
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Avbryt
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Navigering för datum */}
              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <h3 className="text-lg font-semibold min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('sv-SE', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Kalendervy */}
              {selectedResource ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="text-center flex-1">
                      <h4 className="font-semibold text-lg">{selectedResource.name}</h4>
                      <p className="text-gray-600">{selectedResource.description || 'Ingen beskrivning'}</p>
                      <div className="flex items-center justify-center gap-6 mt-2">
                        <p className="text-sm text-gray-500">
                          Max {selectedResource.max_duration_hours || 4}h per bokning
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Öppet 08:00-22:00
                        </p>
                      </div>
                    </div>
                    <Button 
                      className="flex items-center gap-2"
                      onClick={handleNewBookingClick}
                    >
                      <Plus className="h-4 w-4" />
                      Ny bokning
                    </Button>
                  </div>



                  {viewMode === 'week' ? (
                    // Veckovy
                    <div className="grid grid-cols-7 gap-2">
                      {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                        <div key={day} className="p-2 text-center font-semibold text-sm bg-gray-100 rounded">
                          {day}
                        </div>
                      ))}
                      {getWeekDays(currentDate).map(date => {
                        const dayBookings = getBookingsForDate(date, selectedResource.id);
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <div 
                            key={date.toISOString()} 
                            className={`p-2 min-h-[100px] border rounded-lg cursor-pointer hover:bg-gray-50 ${
                              isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                            }`}
                            onClick={() => handleDateClick(date, selectedResource.id)}
                          >
                            <div className={`text-center font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                              {date.getDate()}
                            </div>
                            <div className="space-y-1 mt-2">
                              {dayBookings.slice(0, 2).map(booking => {
                                const isOwn = booking.user_id === user?.id; // Check if booking belongs to current user
                                const startTime = new Date(booking.start_time);
                                const endTime = new Date(booking.end_time);
                                const now = new Date();
                                const isActive = startTime <= now && now <= endTime;
                                const isPast = endTime < now;
                                
                                return (
                                  <div 
                                    key={booking.id} 
                                    className={`text-xs p-1.5 rounded-md truncate transition-all duration-200 border-l-2 ${
                                      isPast 
                                        ? 'bg-gray-100 text-gray-600 border-gray-400 opacity-70'
                                        : isActive
                                          ? 'bg-green-100 text-green-800 border-green-500 shadow-sm animate-pulse'
                                          : isOwn
                                            ? 'bg-blue-100 text-blue-800 border-blue-500 shadow-sm'
                                            : 'bg-orange-100 text-orange-800 border-orange-500'
                                    }`}
                                    title={`${booking.purpose || 'Bokning'} (${formatTimeSlot(new Date(booking.start_time))}-${formatTimeSlot(new Date(booking.end_time))}) ${isOwn ? '(Din bokning)' : ''}`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isActive && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                                      {isPast && <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />}
                                      {!isPast && !isActive && <div className={`w-1.5 h-1.5 rounded-full ${isOwn ? 'bg-blue-500' : 'bg-orange-500'}`} />}
                                      <span className="font-medium">{formatTimeSlot(new Date(booking.start_time))}</span>
                                      <span className="truncate">{booking.purpose || 'Bokning'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {dayBookings.length > 2 && (
                                <div className="text-xs text-gray-500 text-center bg-gray-50 rounded-md p-1">
                                  +{dayBookings.length - 2} fler bokningar
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Månadsvy
                    <div className="grid grid-cols-7 gap-1">
                      {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                        <div key={day} className="p-2 text-center font-semibold text-sm bg-gray-100 rounded">
                          {day}
                        </div>
                      ))}
                      
                      {/* Tomma celler för månaden */}
                      {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, index) => (
                        <div key={`empty-${index}`} className="p-2 h-20"></div>
                      ))}
                      
                      {/* Månadsens dagar */}
                      {Array.from({ length: getDaysInMonth(currentDate) }).map((_, dayIndex) => {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayIndex + 1);
                        const dayBookings = getBookingsForDate(date, selectedResource.id);
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <div 
                            key={dayIndex} 
                            className={`p-1 h-20 border rounded cursor-pointer hover:bg-gray-50 ${
                              isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                            }`}
                            onClick={() => handleDateClick(date, selectedResource.id)}
                          >
                            <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                              {dayIndex + 1}
                            </div>
                            <div className="space-y-1">
                              {dayBookings.slice(0, 1).map(booking => {
                                const isOwn = booking.user_id === user?.id; // Check if booking belongs to current user  
                                const startTime = new Date(booking.start_time);
                                const endTime = new Date(booking.end_time);
                                const now = new Date();
                                const isActive = startTime <= now && now <= endTime;
                                const isPast = endTime < now;
                                
                                return (
                                  <div 
                                    key={booking.id} 
                                    className={`text-xs p-1 rounded border-l-2 truncate transition-all duration-200 ${
                                      isPast 
                                        ? 'bg-gray-50 text-gray-500 border-gray-300 opacity-70'
                                        : isActive
                                          ? 'bg-green-50 text-green-700 border-green-400 animate-pulse'
                                          : isOwn
                                            ? 'bg-blue-50 text-blue-700 border-blue-400'
                                            : 'bg-orange-50 text-orange-700 border-orange-400'
                                    }`}
                                    title={`${booking.purpose || 'Bokning'} (${formatTimeSlot(new Date(booking.start_time))}-${formatTimeSlot(new Date(booking.end_time))}) ${isOwn ? '(Din bokning)' : ''}`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isActive && <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />}
                                      {isPast && <div className="w-1 h-1 bg-gray-400 rounded-full" />}
                                      {!isPast && !isActive && <div className={`w-1 h-1 rounded-full ${isOwn ? 'bg-blue-500' : 'bg-orange-500'}`} />}
                                      <span className="font-medium text-xs">{formatTimeSlot(new Date(booking.start_time))}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {dayBookings.length > 1 && (
                                <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-1">
                                  +{dayBookings.length - 1}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Välj en resurs för att se kalender och skapa bokningar</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid gap-4">
                {resources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Inga resurser skapade ännu</p>
                    {(['owner', 'admin'].includes(userRole)) && (
                      <p className="text-sm mt-2">Skapa din första resurs för att komma igång med bokningar</p>
                    )}
                  </div>
                ) : (
                  resources.map(resource => (
                    <Card key={resource.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{resource.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Kapacitet: {resource.capacity} personer
                            </p>
                            {resource.description && (
                              <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge variant={resource.is_active ? 'default' : 'outline'}>
                                {resource.is_active ? 'Aktiv' : 'Inaktiv'}
                              </Badge>
                              <div className="text-sm text-gray-600 mt-1">
                                Max {resource.max_duration_hours}h per bokning
                              </div>
                              <div className="text-sm text-gray-600">
                                Kapacitet: {resource.capacity}
                              </div>
                            </div>
                            {(['owner', 'admin'].includes(userRole)) && (
                              <div className="flex flex-col gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingResource(resource);
                                    setEditResourceDialogOpen(true);
                                  }}
                                  className="hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteResource(resource.id)}
                                  className="hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="my-bookings" className="space-y-4">
              <div className="grid gap-4">
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Inga bokningar ännu</p>
                    <p className="text-sm mt-2">Skapa din första bokning i kalendern</p>
                  </div>
                ) : (
                  bookings.map(booking => {
                    const startTime = new Date(booking.start_time);
                    const endTime = new Date(booking.end_time);
                    const now = new Date();
                    const isActive = startTime <= now && now <= endTime;
                    const isPast = endTime < now;
                    const isUpcoming = startTime > now;
                    const hoursUntil = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
                    
                    return (
                      <Card key={booking.id} className={`transition-all duration-200 border-l-4 ${
                        isPast 
                          ? 'border-gray-300 bg-gray-50 opacity-80'
                          : isActive
                            ? 'border-green-500 bg-green-50 shadow-md animate-pulse'
                            : isUpcoming && hoursUntil <= 24
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-orange-300 bg-white hover:shadow-md'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  isPast 
                                    ? 'bg-gray-400'
                                    : isActive
                                      ? 'bg-green-500 animate-pulse'
                                      : isUpcoming && hoursUntil <= 24
                                        ? 'bg-blue-500'
                                        : 'bg-orange-400'
                                }`} />
                                <h3 className="font-semibold text-lg">{booking.purpose || 'Bokning'}</h3>
                                <Badge variant={
                                  isPast ? 'outline' : 
                                  isActive ? 'default' : 
                                  isUpcoming && hoursUntil <= 24 ? 'outline' : 'outline'
                                } className={
                                  isActive ? 'animate-pulse bg-green-100 text-green-800 border-green-300' : ''
                                }>
                                  {isPast ? 'Avslutad' : isActive ? 'Pågår nu' : isUpcoming && hoursUntil <= 24 ? `Om ${hoursUntil}h` : 'Kommande'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {booking.resource?.name || 'Okänd resurs'}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">
                                    {startTime.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  </span>
                                  <span>
                                    {formatTimeSlot(startTime)} - {formatTimeSlot(endTime)}
                                  </span>
                                </p>
                                {booking.attendees && booking.attendees > 1 && (
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {booking.attendees} deltagare
                                  </p>
                                )}
                                {booking.contact_phone && (
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    {booking.contact_phone}
                                  </p>
                                )}
                                {booking.notes && (
                                  <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2">{booking.notes}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 items-end ml-4">
                              <div className="flex gap-2">
                                {!isPast && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Edit booking functionality could be added here
                                      toast.info('Redigering kommer snart');
                                    }}
                                    className="hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteBooking(booking.id)}
                                  className="hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {/* Duration indicator */}
                              <div className="text-xs text-gray-500 text-right">
                                {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))}h {Math.round(((endTime.getTime() - startTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}min
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {(userRole === 'owner' || userRole === 'admin') && (
              <TabsContent value="dashboard" className="space-y-4">
                <AdminDashboard handbookId={handbookId} userRole={userRole} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Skapa ny resurs modal - på root-nivå för korrekt styling */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Skapa ny resurs</DialogTitle>
          </DialogHeader>
          
          {/* Enkelt formulär */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="resource-name" className="text-gray-700">Namn <span className="text-red-500">*</span></Label>
              <Input
                id="resource-name"
                placeholder="T.ex. Föreningslokal"
                value={newResource.name}
                onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="resource-description" className="text-gray-700">Beskrivning <span className="text-red-500">*</span></Label>
              <Textarea
                id="resource-description"
                placeholder="Beskriv resursen..."
                value={newResource.description}
                onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="resource-type" className="text-gray-700">Typ <span className="text-red-500">*</span></Label>
              <Select 
                value={newResource.resource_type} 
                onValueChange={(value) => {
                  const resourceType = value as ResourceType;
                  const template = ResourceTemplates[resourceType];
                  
                  // Säkerhetscheck - använd fallback-värden om template saknas
                  const fallbackValues = {
                    maxBookingDurationHours: 4,
                    operatingHours: { start: '08:00', end: '22:00' }
                  };
                  
                  setNewResource({
                    ...newResource, 
                    resource_type: resourceType,
                    max_duration_hours: template?.maxBookingDurationHours || fallbackValues.maxBookingDurationHours,
                    time_restrictions: {
                      ...newResource.time_restrictions,
                      start_time: template?.operatingHours.start || fallbackValues.operatingHours.start,
                      end_time: template?.operatingHours.end || fallbackValues.operatingHours.end
                    }
                  });
                }}
              >
                <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  <SelectItem value="laundry">Tvättstuga</SelectItem>
                  <SelectItem value="party_room">Festlokal</SelectItem>
                  <SelectItem value="guest_apartment">Gästlägenhet</SelectItem>
                  <SelectItem value="sauna">Bastu</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="parking">Parkering</SelectItem>
                  <SelectItem value="storage">Förråd</SelectItem>
                  <SelectItem value="other">Övrigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="standard-duration" className="text-gray-700">Standardlängd per bokning (timmar)</Label>
              <Input
                id="standard-duration"
                type="number"
                min="1"
                max="24"
                value={newResource.max_duration_hours}
                onChange={(e) => setNewResource({...newResource, max_duration_hours: parseInt(e.target.value)})}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>

            {/* Alltid öppen checkbox */}
            <div className="flex items-center space-x-2">
              <input
                id="always-open"
                type="checkbox"
                checked={newResource.time_restrictions.start_time === '00:00' && newResource.time_restrictions.end_time === '23:59'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setNewResource({
                      ...newResource,
                      time_restrictions: {
                        ...newResource.time_restrictions,
                        start_time: '00:00',
                        end_time: '23:59'
                      }
                    });
                  } else {
                    // Återställ till template-värden (med fallback)
                    const template = ResourceTemplates[newResource.resource_type];
                    const fallbackValues = {
                      operatingHours: { start: '08:00', end: '22:00' }
                    };
                    
                    setNewResource({
                      ...newResource,
                      time_restrictions: {
                        ...newResource.time_restrictions,
                        start_time: template?.operatingHours.start || fallbackValues.operatingHours.start,
                        end_time: template?.operatingHours.end || fallbackValues.operatingHours.end
                      }
                    });
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="always-open" className="text-gray-700">Alltid öppen (24/7)</Label>
            </div>

            {/* Öppettider (visas bara om inte alltid öppen) */}
            {!(newResource.time_restrictions.start_time === '00:00' && newResource.time_restrictions.end_time === '23:59') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time" className="text-gray-700">Öppnar <span className="text-red-500">*</span></Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newResource.time_restrictions.start_time}
                    onChange={(e) => setNewResource({
                      ...newResource,
                      time_restrictions: {
                        ...newResource.time_restrictions,
                        start_time: e.target.value
                      }
                    })}
                    className="mt-1 bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-gray-700">Stänger <span className="text-red-500">*</span></Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newResource.time_restrictions.end_time}
                    onChange={(e) => setNewResource({
                      ...newResource,
                      time_restrictions: {
                        ...newResource.time_restrictions,
                        end_time: e.target.value
                      }
                    })}
                    className="mt-1 bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Current Settings Preview */}
            {ResourceTemplates[newResource.resource_type] && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <h4 className="font-medium text-green-900">Dina inställningar</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-green-700">
                    <strong>Max tid:</strong> {newResource.max_duration_hours}h
                  </div>
                  <div className="text-green-700">
                    <strong>Öppettider:</strong> {newResource.time_restrictions.start_time}-{newResource.time_restrictions.end_time}
                  </div>
                </div>
                <div className="mt-2 text-xs text-green-600">
                  💡 Tidsgränsen och öppettider kan ändras ovan. Alla bokningar godkänns automatiskt.
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={createResource} 
              disabled={!newResource.name || !newResource.description || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Skapar...' : 'Skapa resurs'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setResourceDialogOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Avbryt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redigera resurs modal */}
      <Dialog open={editResourceDialogOpen} onOpenChange={setEditResourceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Redigera resurs</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-resource-name" className="text-gray-700">Namn</Label>
                <Input
                  id="edit-resource-name"
                  placeholder="T.ex. Föreningslokal"
                  value={editingResource.name}
                  onChange={(e) => setEditingResource({...editingResource, name: e.target.value})}
                  className="mt-1 bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="edit-resource-description" className="text-gray-700">Beskrivning</Label>
                <Textarea
                  id="edit-resource-description"
                  placeholder="Beskriv resursen..."
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({...editingResource, description: e.target.value})}
                  className="mt-1 bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-max-duration" className="text-gray-700 block text-sm">Max bokningstid (timmar)</Label>
                  <Input
                    id="edit-max-duration"
                    type="number"
                    min="1"
                    max="24"
                    value={editingResource.max_duration_hours}
                    onChange={(e) => setEditingResource({...editingResource, max_duration_hours: parseInt(e.target.value)})}
                    className="bg-white border-gray-300 text-gray-900 w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity" className="text-gray-700 block text-sm">Kapacitet</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="1"
                    max="100"
                    value={editingResource.capacity}
                    onChange={(e) => setEditingResource({...editingResource, capacity: parseInt(e.target.value) || 1})}
                    className="bg-white border-gray-300 text-gray-900 w-full"
                  />
                </div>
              </div>
              {/* Alltid öppen checkbox för redigering */}
              <div className="flex items-center space-x-2">
                <input
                  id="edit-always-open"
                  type="checkbox"
                  checked={editingResource.time_restrictions?.start_time === '00:00' && editingResource.time_restrictions?.end_time === '23:59'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditingResource({
                        ...editingResource,
                        time_restrictions: {
                          ...editingResource.time_restrictions,
                          start_time: '00:00',
                          end_time: '23:59'
                        }
                      });
                    } else {
                      setEditingResource({
                        ...editingResource,
                        time_restrictions: {
                          ...editingResource.time_restrictions,
                          start_time: '08:00',
                          end_time: '22:00'
                        }
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="edit-always-open" className="text-gray-700">Alltid öppen (24/7)</Label>
              </div>

              {/* Öppettider för redigering (visas bara om inte alltid öppen) */}
              {!(editingResource.time_restrictions?.start_time === '00:00' && editingResource.time_restrictions?.end_time === '23:59') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start-time" className="text-gray-700 block text-sm">Öppnar</Label>
                    <Input
                      id="edit-start-time"
                      type="time"
                      value={editingResource.time_restrictions?.start_time || '06:00'}
                      onChange={(e) => setEditingResource({
                        ...editingResource, 
                        time_restrictions: {
                          ...editingResource.time_restrictions,
                          start_time: e.target.value,
                          end_time: editingResource.time_restrictions?.end_time || '22:00'
                        }
                      })}
                      className="bg-white border-gray-300 text-gray-900 w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-end-time" className="text-gray-700 block text-sm">Stänger</Label>
                    <Input
                      id="edit-end-time"
                      type="time"
                      value={editingResource.time_restrictions?.end_time || '22:00'}
                      onChange={(e) => setEditingResource({
                        ...editingResource,
                        time_restrictions: {
                          ...editingResource.time_restrictions,
                          start_time: editingResource.time_restrictions?.start_time || '06:00',
                          end_time: e.target.value
                        }
                      })}
                      className="bg-white border-gray-300 text-gray-900 w-full"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  id="edit-is-active"
                  type="checkbox"
                  checked={editingResource.is_active}
                  onChange={(e) => setEditingResource({...editingResource, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="edit-is-active" className="text-gray-700">Aktiv resurs</Label>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={updateResource} 
                  disabled={!editingResource.name || !editingResource.description}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Uppdatera resurs
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditResourceDialogOpen(false);
                    setEditingResource(null);
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendar; 