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
  Trash2
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
      
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId })
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

  // ✅ FIXAD: Automatisk dialogöppning och formulärdata vid datumklick
  const handleDateClick = (date: Date, resourceId?: string) => {
    if (!resourceId && !selectedResource) {
      toast.error('Välj en resurs först');
      return;
    }

    const workingResourceId = resourceId || selectedResource?.id;
    const defaultStartTime = new Date(date);
    defaultStartTime.setHours(10, 0, 0, 0); // Default 10:00
    
    const defaultEndTime = new Date(date);
    defaultEndTime.setHours(12, 0, 0, 0); // Default 12:00 (2 timmar)

    setSelectedDate(date);
    setNewBooking({
      resource_id: workingResourceId!,
      start_time: defaultStartTime.toISOString().slice(0, 16), // Format för datetime-local
      end_time: defaultEndTime.toISOString().slice(0, 16),
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">Kalender</TabsTrigger>
              <TabsTrigger value="resources">Resurser ({resources.length})</TabsTrigger>
              <TabsTrigger value="my-bookings">Mina bokningar</TabsTrigger>
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
                              {dayBookings.slice(0, 2).map(booking => (
                                <div 
                                  key={booking.id} 
                                  className="text-xs p-1 bg-emerald-100 text-emerald-800 rounded truncate"
                                  title={`${booking.purpose || 'Bokning'} (${formatTimeSlot(new Date(booking.start_time))}-${formatTimeSlot(new Date(booking.end_time))})`}
                                >
                                  {formatTimeSlot(new Date(booking.start_time))} {booking.purpose || 'Bokning'}
                                </div>
                              ))}
                              {dayBookings.length > 2 && (
                                <div className="text-xs text-gray-500 text-center">
                                  +{dayBookings.length - 2} fler
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
                              {dayBookings.slice(0, 1).map(booking => (
                                <div 
                                  key={booking.id} 
                                  className="text-xs p-1 bg-emerald-100 text-emerald-800 rounded truncate"
                                  title={booking.purpose || 'Bokning'}
                                >
                                  {formatTimeSlot(new Date(booking.start_time))}
                                </div>
                              ))}
                              {dayBookings.length > 1 && (
                                <div className="text-xs text-gray-500 text-center">
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
                  bookings.map(booking => (
                    <Card key={booking.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{booking.purpose || 'Bokning'}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {booking.resource?.name || 'Okänd resurs'}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {new Date(booking.start_time).toLocaleString('sv-SE')} - 
                              {new Date(booking.end_time).toLocaleString('sv-SE')}
                            </p>
                            {booking.notes && (
                              <p className="text-sm text-gray-500 mt-1">{booking.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status === 'confirmed' ? 'Bekräftad' : 'Väntande'}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteBooking(booking.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
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