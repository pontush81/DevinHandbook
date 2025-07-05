// =============================================
// FÖRENKLAT BOKNINGSSYSTEM - ENDAST 5 KÄRNREGLER
// =============================================

import { supabase } from '@/lib/supabase'

// FÖRENKLAT: Endast 5 kärnregler istället för 14
export interface SimplifiedBookingRules {
  maxAdvanceBookingDays: number;       // Hur långt i förväg man kan boka
  maxBookingDurationHours: number;     // Max tid per bokning
  maxBookingsPerUserPerWeek: number;   // Begränsning per användare
  operatingHours: { start: string; end: string }; // Öppettider
  cleaningBufferMinutes: number;       // Städbuffer mellan bokningar
}

// FÖRENKLAT: Endast 4 resurstyper istället för 9
export const SIMPLIFIED_RESOURCE_TYPES = {
  laundry: 'Tvättstuga',
  guest_apartment: 'Gästlägenhet', 
  common_room: 'Allmänna lokaler',
  other: 'Övrigt'
} as const;

// FÖRENKLAT: Endast 4 resurstemplates med rimliga standardvärden
export const SIMPLIFIED_RESOURCE_TEMPLATES: Record<keyof typeof SIMPLIFIED_RESOURCE_TYPES, SimplifiedBookingRules> = {
  laundry: {
    maxAdvanceBookingDays: 7,         // 1 vecka i förväg
    maxBookingDurationHours: 4,       // 4 timmar max
    maxBookingsPerUserPerWeek: 2,     // 2 tvätttider per vecka
    operatingHours: { start: '06:00', end: '22:00' },
    cleaningBufferMinutes: 15         // 15 min städ
  },
  guest_apartment: {
    maxAdvanceBookingDays: 30,        // 1 månad i förväg
    maxBookingDurationHours: 72,      // 3 dagar max
    maxBookingsPerUserPerWeek: 1,     // 1 bokning per vecka
    operatingHours: { start: '00:00', end: '23:59' },
    cleaningBufferMinutes: 120        // 2 timmar städ
  },
  common_room: {
    maxAdvanceBookingDays: 14,        // 2 veckor i förväg
    maxBookingDurationHours: 6,       // 6 timmar max
    maxBookingsPerUserPerWeek: 1,     // 1 bokning per vecka
    operatingHours: { start: '08:00', end: '22:00' },
    cleaningBufferMinutes: 30         // 30 min städ
  },
  other: {
    maxAdvanceBookingDays: 7,         // 1 vecka i förväg
    maxBookingDurationHours: 2,       // 2 timmar max
    maxBookingsPerUserPerWeek: 2,     // 2 bokningar per vecka
    operatingHours: { start: '08:00', end: '18:00' },
    cleaningBufferMinutes: 15         // 15 min städ
  }
};

// =============================================
// FÖRENKLAD VALIDERING - ENDAST 5 REGLER
// =============================================

export interface SimplifiedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSimplifiedBooking(
  booking: {
    resource_id: string;
    start_time: string;
    end_time: string;
    user_id: string;
  },
  resource: { resource_type: keyof typeof SIMPLIFIED_RESOURCE_TYPES },
  existingBookings: Array<{ start_time: string; end_time: string; user_id: string }>
): SimplifiedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const rules = SIMPLIFIED_RESOURCE_TEMPLATES[resource.resource_type];
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const now = new Date();
  
  // 1. Kontrollera maxAdvanceBookingDays
  const daysAhead = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAhead > rules.maxAdvanceBookingDays) {
    errors.push(`Kan inte boka mer än ${rules.maxAdvanceBookingDays} dagar i förväg`);
  }
  
  // 2. Kontrollera maxBookingDurationHours
  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours > rules.maxBookingDurationHours) {
    errors.push(`Bokningen kan inte vara längre än ${rules.maxBookingDurationHours} timmar`);
  }
  
  // 3. Kontrollera maxBookingsPerUserPerWeek
  const weekStart = new Date(startTime);
  weekStart.setDate(startTime.getDate() - startTime.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  const userBookingsThisWeek = existingBookings.filter(b => 
    b.user_id === booking.user_id &&
    new Date(b.start_time) >= weekStart &&
    new Date(b.start_time) < weekEnd
  ).length;
  
  if (userBookingsThisWeek >= rules.maxBookingsPerUserPerWeek) {
    errors.push(`Du kan bara boka ${rules.maxBookingsPerUserPerWeek} gång(er) per vecka`);
  }
  
  // 4. Kontrollera operatingHours
  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;
  const operatingStart = parseFloat(rules.operatingHours.start.replace(':', '.'));
  const operatingEnd = parseFloat(rules.operatingHours.end.replace(':', '.'));
  
  if (startHour < operatingStart || endHour > operatingEnd) {
    errors.push(`Bokningar endast tillåtna ${rules.operatingHours.start}-${rules.operatingHours.end}`);
  }
  
  // 5. Kontrollera cleaningBufferMinutes (endast varning)
  const hasConflictingBooking = existingBookings.some(b => {
    const existingStart = new Date(b.start_time);
    const existingEnd = new Date(b.end_time);
    const bufferMs = rules.cleaningBufferMinutes * 60 * 1000;
    
    return (
      (startTime.getTime() < existingEnd.getTime() + bufferMs && 
       endTime.getTime() > existingStart.getTime() - bufferMs)
    );
  });
  
  if (hasConflictingBooking) {
    warnings.push(`Rekommenderat: ${rules.cleaningBufferMinutes} min städtid mellan bokningar`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// =============================================
// TIMEZONE UTILITIES - SVENSK TID
// =============================================

/**
 * Konverterar datum till svensk tid (Europe/Stockholm)
 * Hanterar automatiskt sommartid/vintertid
 */
export const convertToSwedishTime = (date: Date): Date => {
  // Använd Intl.DateTimeFormat för korrekt timezone-hantering
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const swedishTimeString = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
  
  return new Date(swedishTimeString);
};

/**
 * Konverterar svensk tid till UTC för databas-lagring
 */
export const convertFromSwedishTime = (swedishDate: Date): Date => {
  // Skapa ett datum som representerar svensk tid
  const year = swedishDate.getFullYear();
  const month = swedishDate.getMonth();
  const day = swedishDate.getDate();
  const hours = swedishDate.getHours();
  const minutes = swedishDate.getMinutes();
  const seconds = swedishDate.getSeconds();
  
  // Använd explicit timezone-konvertering
  const timeString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Tolka som Europe/Stockholm tid och konvertera till UTC
  const tempDate = new Date(timeString);
  const utcDate = new Date(tempDate.toLocaleString('sv-SE', { timeZone: 'UTC' }));
  
  return utcDate;
};

/**
 * Formaterar datum för svensk visning
 */
export const formatSwedishDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  }).format(date);
};

// Legacy-kompatibilitet (behålls för befintlig kod)
export const toSwedishTime = convertToSwedishTime;
export const fromSwedishTime = convertFromSwedishTime;

// =============================================
// FÖRENKLAD KOLLISIONSKONTROLL
// =============================================

export async function detectSimplifiedCollisions(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('resource_id', resourceId)
      .neq('status', 'cancelled')
      .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);
    
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error detecting collisions:', error);
      return true; // Anta kollision vid fel för säkerhets skull
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error in detectSimplifiedCollisions:', error);
    return true;
  }
}

// =============================================
// EXPORT LEGACY FUNCTIONS (för kompatibilitet)
// =============================================

// Dessa funktioner behålls för att inte krasha befintlig kod
export const ResourceTemplates = SIMPLIFIED_RESOURCE_TEMPLATES;
export const validateBookingRules = validateSimplifiedBooking;
export const detectCollisions = detectSimplifiedCollisions;
export const FairUsageRules = SIMPLIFIED_RESOURCE_TEMPLATES;