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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { BookingResource, Booking, BookingWithDetails, BookingInsert } from '@/types/booking';
import { SuggestedTimeSlots, ResourceTemplates, ResourceType } from '@/lib/booking-standards';
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
    location: '',
    description: '',
    max_duration_hours: 4,
    booking_advance_days: 30
  });
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
      const response = await fetch(`/api/booking-resources?handbook_id=${handbookId}`, {
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
      const response = await fetch(`/api/bookings?handbook_id=${handbookId}`, {
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

  const createBooking = async (bookingData: Omit<BookingInsert, 'handbook_id' | 'member_id'>) => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      const payload = {
        resource_id: bookingData.resource_id,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        title: bookingData.purpose,
        attendees: bookingData.attendees || 1,
        contact_phone: bookingData.contact_phone || null,
        notes: bookingData.notes || null
      };

      const response = await fetch('/api/bookings', {
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
      const response = await fetch('/api/booking-resources', {
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
        setNewResource({ name: '', location: '', description: '', max_duration_hours: 4, booking_advance_days: 30 });
        toast.success('Resurs skapad!');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        toast.error(err.message || 'Kunde inte skapa resurs');
      }
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/bookings?id=${bookingId}`, {
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
      const bookingDate = new Date(booking.start_time);
      const sameDay = bookingDate.toDateString() === date.toDateString();
      const sameResource = !resourceId || booking.resource_id === resourceId;
      return sameDay && sameResource;
    });
  };

  const formatTimeSlot = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ✅ ENHANCED: Smart booking med resursspecifika standarder
  const handleDateClick = (date: Date, resourceId?: string) => {
    if (!resourceId && !selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    const workingResourceId = resourceId || selectedResource?.id;
    const resource = resources.find(r => r.id === workingResourceId);
    const resourceType = (resource?.type || 'other') as ResourceType;
    const rules = ResourceTemplates[resourceType];

    // Smart default times baserat på resurstyp och operationstider
    const defaultStartTime = new Date(date);
    const defaultEndTime = new Date(date);
    
    // Parse operating hours
    const [startHour, startMin] = rules.operatingHours.start.split(':').map(Number);
    const [endHour, endMin] = rules.operatingHours.end.split(':').map(Number);
    
    // Set smart default start time
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
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
    const maxEndTime = new Date(date);
    maxEndTime.setHours(endHour, endMin, 0, 0);
    if (defaultEndTime > maxEndTime) {
      defaultEndTime.setTime(maxEndTime.getTime());
      defaultStartTime.setTime(defaultEndTime.getTime() - defaultDurationMs);
    }

    setSelectedDate(date);
    setNewBooking({
      resource_id: workingResourceId!,
      start_time: defaultStartTime.toISOString().slice(0, 16),
      end_time: defaultEndTime.toISOString().slice(0, 16),
      purpose: '',
      attendees: 1,
      contact_phone: '',
      notes: ''
    });
    
    setBookingDialogOpen(true);
  };

  // Quick time slot selection
  const handleQuickTimeSlot = (slot: { label: string; start: string; duration: number }) => {
    if (!selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    const today = new Date();
    const [hour, minute] = slot.start.split(':').map(Number);
    
    const startTime = new Date(today);
    startTime.setHours(hour, minute, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + slot.duration);

    setNewBooking({
      resource_id: selectedResource.id,
      start_time: startTime.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16),
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

    const now = new Date();
    const defaultStartTime = new Date(now);
    defaultStartTime.setHours(10, 0, 0, 0); // Default 10:00 idag
    
    const defaultEndTime = new Date(now);
    defaultEndTime.setHours(12, 0, 0, 0); // Default 12:00 (2 timmar)

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
                <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
                  <DialogTrigger asChild>
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
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Skapa ny resurs</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="resource-name">Namn</Label>
                        <Input
                          id="resource-name"
                          placeholder="T.ex. Föreningslokal"
                          value={newResource.name}
                          onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="resource-location">Plats</Label>
                        <Input
                          id="resource-location"
                          placeholder="T.ex. Källarvåning"
                          value={newResource.location}
                          onChange={(e) => setNewResource({...newResource, location: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="resource-description">Beskrivning</Label>
                        <Textarea
                          id="resource-description"
                          placeholder="Beskriv resursen..."
                          value={newResource.description}
                          onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max-duration">Max bokningsperiod (timmar)</Label>
                          <Input
                            id="max-duration"
                            type="number"
                            min="1"
                            max="24"
                            value={newResource.max_duration_hours}
                            onChange={(e) => setNewResource({...newResource, max_duration_hours: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="advance-days">Boka i förväg (dagar)</Label>
                          <Input
                            id="advance-days"
                            type="number"
                            min="1"
                            max="365"
                            value={newResource.booking_advance_days}
                            onChange={(e) => setNewResource({...newResource, booking_advance_days: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={createResource} 
                          disabled={!newResource.name || !newResource.location}
                        >
                          Skapa resurs
                        </Button>
                        <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Skapa ny bokning</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="resource">Resurs</Label>
                          <Select value={newBooking.resource_id} onValueChange={(value) => 
                            setNewBooking({...newBooking, resource_id: value})
                          }>
                            <SelectTrigger>
                              <SelectValue placeholder="Välj resurs" />
                            </SelectTrigger>
                            <SelectContent>
                              {resources.map(resource => (
                                <SelectItem key={resource.id} value={resource.id}>
                                  {resource.name} - {resource.location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start_time">Starttid</Label>
                            <Input
                              id="start_time"
                              type="datetime-local"
                              value={newBooking.start_time}
                              onChange={(e) => setNewBooking({...newBooking, start_time: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="end_time">Sluttid</Label>
                            <Input
                              id="end_time"
                              type="datetime-local"
                              value={newBooking.end_time}
                              onChange={(e) => setNewBooking({...newBooking, end_time: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="purpose">Titel</Label>
                          <Input
                            id="purpose"
                            placeholder="T.ex. Barnkalas"
                            value={newBooking.purpose}
                            onChange={(e) => setNewBooking({...newBooking, purpose: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="attendees">Antal deltagare</Label>
                            <Input
                              id="attendees"
                              type="number"
                              min="1"
                              max="50"
                              placeholder="1"
                              value={newBooking.attendees}
                              onChange={(e) => setNewBooking({...newBooking, attendees: parseInt(e.target.value) || 1})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="contact_phone">Telefon (valfritt)</Label>
                            <Input
                              id="contact_phone"
                              type="tel"
                              placeholder="070-123 45 67"
                              value={newBooking.contact_phone}
                              onChange={(e) => setNewBooking({...newBooking, contact_phone: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="notes">Beskrivning (valfritt)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Tilläggsinformation..."
                            value={newBooking.notes}
                            onChange={(e) => setNewBooking({...newBooking, notes: e.target.value})}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => createBooking(newBooking)} 
                            disabled={isLoading || !newBooking.resource_id || !newBooking.start_time || !newBooking.end_time || !newBooking.purpose}
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
                      <p className="text-gray-600">{selectedResource.location}</p>
                      {selectedResource.type && (
                        <p className="text-sm text-gray-500 mt-1">
                          Typ: {selectedResource.type} • Max {ResourceTemplates[selectedResource.type as ResourceType]?.maxBookingDurationHours || 4}h
                        </p>
                      )}
                    </div>
                    <Button 
                      className="flex items-center gap-2"
                      onClick={handleNewBookingClick}
                    >
                      <Plus className="h-4 w-4" />
                      Ny bokning
                    </Button>
                  </div>

                  {/* Förbättrade quick booking-shortcuts */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                    <h5 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Snabbbokning
                    </h5>
                    
                    {/* Idag - Quick slots */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-blue-800 mb-2">Idag ({new Date().toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })})</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {SuggestedTimeSlots.map((slot) => {
                          const resourceType = (selectedResource.type || 'other') as ResourceType;
                          const rules = ResourceTemplates[resourceType];
                          const [slotHour] = slot.start.split(':').map(Number);
                          const [opStartHour] = rules.operatingHours.start.split(':').map(Number);
                          const [opEndHour] = rules.operatingHours.end.split(':').map(Number);
                          
                          // Check if slot is within operating hours and not conflicting
                          const isWithinHours = slotHour >= opStartHour && (slotHour + slot.duration) <= opEndHour;
                          const today = new Date();
                          const slotStart = new Date(today);
                          slotStart.setHours(slotHour, 0, 0, 0);
                          const hasConflict = bookings.some(booking => 
                            booking.resource_id === selectedResource.id &&
                            new Date(booking.start_time).toDateString() === today.toDateString() &&
                            new Date(booking.start_time).getHours() === slotHour
                          );
                          
                          const isAvailable = isWithinHours && !hasConflict;
                          
                          return (
                            <Button
                              key={slot.label}
                              variant={isAvailable ? "outline" : "ghost"}
                              size="sm"
                              disabled={!isAvailable}
                              onClick={() => handleQuickTimeSlot(slot)}
                              className={`text-xs transition-all duration-200 ${
                                isAvailable 
                                  ? 'hover:bg-blue-100 hover:border-blue-300 hover:shadow-md border-2' 
                                  : hasConflict 
                                    ? 'text-red-400 border-red-200 bg-red-50' 
                                    : 'text-gray-400'
                              }`}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              <div className="text-center">
                                <div className="font-medium">{slot.label}</div>
                                <div className="text-xs opacity-75">{slot.start}</div>
                                {hasConflict && <div className="text-xs text-red-600 font-medium">Upptagen</div>}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Imorgon - Quick slots */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Imorgon ({new Date(Date.now() + 24*60*60*1000).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })})
                      </h6>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {['09:00', '13:00', '18:00'].map((time) => {
                          const tomorrow = new Date(Date.now() + 24*60*60*1000);
                          const [hour] = time.split(':').map(Number);
                          const hasConflict = bookings.some(booking => 
                            booking.resource_id === selectedResource.id &&
                            new Date(booking.start_time).toDateString() === tomorrow.toDateString() &&
                            new Date(booking.start_time).getHours() === hour
                          );
                          
                          return (
                            <Button
                              key={time}
                              variant={hasConflict ? "ghost" : "outline"}
                              size="sm"
                              disabled={hasConflict}
                              onClick={() => {
                                const startTime = new Date(tomorrow);
                                startTime.setHours(hour, 0, 0, 0);
                                const endTime = new Date(startTime);
                                endTime.setHours(hour + 2, 0, 0, 0);
                                
                                setNewBooking({
                                  resource_id: selectedResource.id,
                                  start_time: startTime.toISOString().slice(0, 16),
                                  end_time: endTime.toISOString().slice(0, 16),
                                  purpose: '', attendees: 1, contact_phone: '', notes: ''
                                });
                                setBookingDialogOpen(true);
                              }}
                              className={`text-xs transition-all duration-200 ${
                                hasConflict 
                                  ? 'text-red-400 bg-red-50 border-red-200' 
                                  : 'hover:bg-green-100 hover:border-green-300 border-2'
                              }`}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              <div className="text-center">
                                <div className="font-medium">{time}</div>
                                {hasConflict && <div className="text-xs text-red-600 font-medium">Upptagen</div>}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-blue-700">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Öppettider: {ResourceTemplates[selectedResource.type as ResourceType]?.operatingHours.start || '08:00'} - {ResourceTemplates[selectedResource.type as ResourceType]?.operatingHours.end || '22:00'}
                      </span>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={handleNewBookingClick}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
                      >
                        + Anpassad tid
                      </Button>
                    </div>
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
                                const isOwn = booking.member_id === handbookId; // Simplified check for now
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
                                const isOwn = booking.member_id === handbookId; // Simplified check for now
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
                          <div>
                            <h3 className="font-semibold">{resource.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {resource.location}
                            </p>
                            {resource.description && (
                              <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant={resource.is_active ? 'default' : 'secondary'}>
                              {resource.is_active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                            <div className="text-sm text-gray-600 mt-1">
                              Max {resource.max_duration_hours}h per bokning
                            </div>
                            <div className="text-sm text-gray-600">
                              Boka {resource.booking_advance_days} dagar i förväg
                            </div>
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
                                  isPast ? 'secondary' : 
                                  isActive ? 'default' : 
                                  isUpcoming && hoursUntil <= 24 ? 'outline' : 'secondary'
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
                <AdminDashboard handbookId={handbookId} />
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
    </div>
  );
};

export default BookingCalendar; 