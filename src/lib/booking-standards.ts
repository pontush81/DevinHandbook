// =============================================
// STANDARDIZED BOOKING SYSTEM RULES
// Based on industry best practices for BRF
// =============================================

// =============================================
// TIMEZONE UTILITIES - SVENSK TID
// =============================================

/**
 * Konverterar datum till svensk tid (Europe/Stockholm)
 * Hanterar automatiskt sommartid/vintertid
 */
export const toSwedishTime = (date: Date): Date => {
  return new Date(date.toLocaleString('en-US', { 
    timeZone: 'Europe/Stockholm' 
  }));
};

/**
 * Konverterar från svensk tid till UTC för databas-lagring
 */
export const fromSwedishTime = (date: Date): Date => {
  // Skapa ett datum som representerar svensk tid
  const swedishString = date.toLocaleString('sv-SE', { 
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Parsa som lokal tid och konvertera till UTC
  const [datePart, timePart] = swedishString.split(' ');
  const [year, month, day] = datePart.split('-');
  const [hour, minute, second] = timePart.split(':');
  
  const localDate = new Date(
    parseInt(year), 
    parseInt(month) - 1, 
    parseInt(day), 
    parseInt(hour), 
    parseInt(minute), 
    parseInt(second)
  );
  
  return new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
};

/**
 * Kontrollerar om ett datum är i framtiden (svensk tid)
 */
export const isInFuture = (date: Date): boolean => {
  const now = toSwedishTime(new Date());
  const target = toSwedishTime(date);
  return target > now;
};

/**
 * Formaterar datum för visning i svensk tid
 */
export const formatSwedishDateTime = (date: Date): string => {
  return toSwedishTime(date).toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export interface StandardBookingRules {
  // Time Management
  maxAdvanceBookingDays: number;        // How far ahead can users book
  minAdvanceBookingHours: number;       // Minimum notice required
  maxBookingDurationHours: number;      // Maximum booking length
  minBookingDurationMinutes: number;    // Minimum booking length
  
  // Cancellation Policies
  cancellationGracePeriodHours: number; // How early can users cancel
  noShowPenaltyHours: number;           // Mark as no-show after X hours
  
  // Usage Limits
  maxBookingsPerUserPerWeek: number;    // Weekly limit per user
  maxBookingsPerUserPerMonth: number;   // Monthly limit per user
  
  // Operational
  operatingHours: {
    start: string;  // "06:00"
    end: string;    // "23:00"
  };
  cleaningBufferMinutes: number;        // Buffer between bookings
  setupBufferMinutes: number;           // Setup time before booking
  requiresApproval: boolean;            // Board approval needed
  cleaningFee: number | null;           // Additional cleaning fee
}

export type ResourceType = 'laundry' | 'guest_apartment' | 'sauna' | 'hobby_room' | 'party_room' | 'gym' | 'parking' | 'storage' | 'other';

export const ResourceTemplates: Record<ResourceType, StandardBookingRules> = {
  laundry: {
    maxAdvanceBookingDays: 14,
    minAdvanceBookingHours: 2,
    maxBookingDurationHours: 3,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 4,
    noShowPenaltyHours: 2,
    maxBookingsPerUserPerWeek: 3,
    maxBookingsPerUserPerMonth: 12,
    operatingHours: { start: "06:00", end: "23:00" },
    cleaningBufferMinutes: 15,
    setupBufferMinutes: 15,
    requiresApproval: false,
    cleaningFee: null
  },

  guest_apartment: {
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 72,
    maxBookingDurationHours: 168, // 7 days
    minBookingDurationMinutes: 1440, // 24 hours
    cancellationGracePeriodHours: 72,
    noShowPenaltyHours: 4,
    maxBookingsPerUserPerWeek: 1,
    maxBookingsPerUserPerMonth: 2,
    operatingHours: { start: "00:00", end: "23:59" },
    cleaningBufferMinutes: 120, // 2 hours cleaning
    setupBufferMinutes: 60,
    requiresApproval: false,
    cleaningFee: 500 // SEK
  },

  party_room: {
    maxAdvanceBookingDays: 60,
    minAdvanceBookingHours: 48,
    maxBookingDurationHours: 6,
    minBookingDurationMinutes: 120,
    cancellationGracePeriodHours: 48,
    noShowPenaltyHours: 2,
    maxBookingsPerUserPerWeek: 1,
    maxBookingsPerUserPerMonth: 2,
    operatingHours: { start: "10:00", end: "23:00" },
    cleaningBufferMinutes: 60,
    setupBufferMinutes: 30,
    requiresApproval: false,
    cleaningFee: 300
  },

  sauna: {
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 4,
    maxBookingDurationHours: 2,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 24,
    noShowPenaltyHours: 1,
    maxBookingsPerUserPerWeek: 2,
    maxBookingsPerUserPerMonth: 8,
    operatingHours: { start: "16:00", end: "22:00" },
    cleaningBufferMinutes: 30,
    setupBufferMinutes: 15,
    requiresApproval: false,
    cleaningFee: null
  },

  hobby_room: {
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 4,
    maxBookingDurationHours: 4,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 12,
    noShowPenaltyHours: 1,
    maxBookingsPerUserPerWeek: 3,
    maxBookingsPerUserPerMonth: 10,
    operatingHours: { start: "08:00", end: "22:00" },
    cleaningBufferMinutes: 15,
    setupBufferMinutes: 15,
    requiresApproval: false,
    cleaningFee: null
  },

  gym: {
    maxAdvanceBookingDays: 14,
    minAdvanceBookingHours: 1,
    maxBookingDurationHours: 2,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 2,
    noShowPenaltyHours: 1,
    maxBookingsPerUserPerWeek: 5,
    maxBookingsPerUserPerMonth: 20,
    operatingHours: { start: "06:00", end: "22:00" },
    cleaningBufferMinutes: 15,
    setupBufferMinutes: 10,
    requiresApproval: false,
    cleaningFee: null
  },

  parking: {
    maxAdvanceBookingDays: 7,
    minAdvanceBookingHours: 1,
    maxBookingDurationHours: 24,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 1,
    noShowPenaltyHours: 1,
    maxBookingsPerUserPerWeek: 7,
    maxBookingsPerUserPerMonth: 30,
    operatingHours: { start: "00:00", end: "23:59" },
    cleaningBufferMinutes: 0,
    setupBufferMinutes: 0,
    requiresApproval: false,
    cleaningFee: null
  },

  storage: {
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 4,
    maxBookingDurationHours: 4,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 12,
    noShowPenaltyHours: 2,
    maxBookingsPerUserPerWeek: 3,
    maxBookingsPerUserPerMonth: 10,
    operatingHours: { start: "08:00", end: "18:00" },
    cleaningBufferMinutes: 15,
    setupBufferMinutes: 10,
    requiresApproval: false,
    cleaningFee: null
  },

  other: {
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 24,
    maxBookingDurationHours: 4,
    minBookingDurationMinutes: 60,
    cancellationGracePeriodHours: 24,
    noShowPenaltyHours: 2,
    maxBookingsPerUserPerWeek: 2,
    maxBookingsPerUserPerMonth: 6,
    operatingHours: { start: "08:00", end: "22:00" },
    cleaningBufferMinutes: 30,
    setupBufferMinutes: 15,
    requiresApproval: false,
    cleaningFee: null
  }
};

// Quick booking time slots
export const SuggestedTimeSlots = [
  { label: "08:00", start: "08:00", duration: 2 },
  { label: "10:00", start: "10:00", duration: 2 },
  { label: "14:00", start: "14:00", duration: 2 },
  { label: "18:00", start: "18:00", duration: 2 }
];

// Fair usage patterns
export const FairUsageRules = {
  // Prevent abuse
  maxBookingsPerHour: 3,
  cooldownBetweenBookingsMinutes: 5,
  maxBookingPercentagePerUser: 30, // Max 30% of available slots
  
  // Priority systems
  enablePriorityQueue: true,
  enableRandomSelection: true, // For high-demand periods
  
  // Monitoring
  trackNoShowRate: true,
  noShowThreshold: 3, // Suspend after 3 no-shows
  noShowSuspensionDays: 14
};

// Validation helpers - FIXED: Använder svensk tid och bättre validering
export const validateBookingRules = (
  resourceType: ResourceType,
  startTime: Date,
  endTime: Date,
  userId: string,
  existingBookings: { start_time: string; end_time: string; id?: string; user_id?: string }[] = []
): { valid: boolean; errors: string[] } => {
  const rules = ResourceTemplates[resourceType];
  const errors: string[] = [];
  
  // FIXED: Använd svensk tid för alla beräkningar
  const swedishNow = toSwedishTime(new Date());
  const swedishStart = toSwedishTime(startTime);
  const swedishEnd = toSwedishTime(endTime);
  
  // Check that start is before end
  if (swedishStart >= swedishEnd) {
    errors.push('Starttid måste vara innan sluttid');
    return { valid: false, errors };
  }
  
  // Check that booking is not in the past
  if (swedishStart <= swedishNow) {
    errors.push('Du kan inte boka datum som redan passerat');
  }
  
  // Check advance booking window
  const advanceHours = (swedishStart.getTime() - swedishNow.getTime()) / (1000 * 60 * 60);
  if (advanceHours < rules.minAdvanceBookingHours) {
    errors.push(`Måste bokas minst ${rules.minAdvanceBookingHours} timmar i förväg`);
  }
  
  const advanceDays = advanceHours / 24;
  if (advanceDays > rules.maxAdvanceBookingDays) {
    errors.push(`Kan inte bokas mer än ${rules.maxAdvanceBookingDays} dagar i förväg`);
  }
  
  // Check duration
  const durationHours = (swedishEnd.getTime() - swedishStart.getTime()) / (1000 * 60 * 60);
  if (durationHours > rules.maxBookingDurationHours) {
    errors.push(`Maximal bokningstid är ${rules.maxBookingDurationHours} timmar`);
  }
  
  const durationMinutes = (swedishEnd.getTime() - swedishStart.getTime()) / (1000 * 60);
  if (durationMinutes < rules.minBookingDurationMinutes) {
    errors.push(`Minimal bokningstid är ${rules.minBookingDurationMinutes} minuter`);
  }
  
  // Check operating hours - FIXED: Korrekt hantering av midnatt-övergångar
  const startHour = swedishStart.getHours() + swedishStart.getMinutes() / 60;
  const endHour = swedishEnd.getHours() + swedishEnd.getMinutes() / 60;
  
  // Parse operating hours properly
  const [opStartHours, opStartMinutes] = rules.operatingHours.start.split(':').map(Number);
  const [opEndHours, opEndMinutes] = rules.operatingHours.end.split(':').map(Number);
  const opStart = opStartHours + opStartMinutes / 60;
  const opEnd = opEndHours + opEndMinutes / 60;
  
  // Handle midnight crossover (like 22:00 to 02:00)
  if (opEnd < opStart) {
    // Overnight hours (e.g., 22:00-02:00)
    const isValidStart = startHour >= opStart || startHour <= opEnd;
    const isValidEnd = endHour >= opStart || endHour <= opEnd;
    
    if (!isValidStart || !isValidEnd) {
      errors.push(`Resursen är endast tillgänglig mellan ${rules.operatingHours.start} och ${rules.operatingHours.end}. Välj en tid inom dessa öppettider.`);
    }
  } else {
    // Normal hours (e.g., 08:00-22:00)
    if (startHour < opStart || endHour > opEnd) {
      errors.push(`Resursen är endast tillgänglig mellan ${rules.operatingHours.start} och ${rules.operatingHours.end}. Välj en tid inom dessa öppettider.`);
    }
  }
  
  // Check weekly limits - FIXED: Korrekt veckoräkning
  const weekStart = new Date(swedishNow);
  weekStart.setDate(swedishNow.getDate() - swedishNow.getDay() + 1); // Måndag
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const thisWeekBookings = existingBookings.filter(booking => {
    const bookingDate = toSwedishTime(new Date(booking.start_time));
    return booking.user_id === userId && 
           bookingDate >= weekStart && 
           bookingDate < weekEnd;
  });
  
  if (thisWeekBookings.length >= rules.maxBookingsPerUserPerWeek) {
    errors.push(`Maximal antal bokningar per vecka (${rules.maxBookingsPerUserPerWeek}) överskridet`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Collision detection with buffers - FIXED: Använder svensk tid och bättre race condition-hantering
export const detectCollisions = (
  newStart: Date,
  newEnd: Date,
  existingBookings: { start_time: string; end_time: string; id?: string; user_id?: string }[],
  bufferMinutes: number = 0,
  excludeBookingId?: string
): { hasCollision: boolean; conflictingBookings: string[]; details: string[] } => {
  const buffer = bufferMinutes * 60 * 1000; // Convert to milliseconds
  
  // FIXED: Använd svensk tid för alla jämförelser
  const swedishNewStart = toSwedishTime(newStart);
  const swedishNewEnd = toSwedishTime(newEnd);
  
  // Validate dates
  if (swedishNewStart >= swedishNewEnd) {
    return { 
      hasCollision: true, 
      conflictingBookings: ['Invalid time range: start must be before end'],
      details: ['Starttid måste vara innan sluttid'] 
    };
  }
  
  const adjustedStart = new Date(swedishNewStart.getTime() - buffer);
  const adjustedEnd = new Date(swedishNewEnd.getTime() + buffer);
  
  const conflictingBookings: string[] = [];
  const details: string[] = [];
  
  existingBookings.forEach(booking => {
    // Skip if this is the same booking (for updates)
    if (excludeBookingId && booking.id === excludeBookingId) {
      return;
    }
    
    // FIXED: Konvertera befintliga bokningar till svensk tid
    const bookingStart = toSwedishTime(new Date(booking.start_time));
    const bookingEnd = toSwedishTime(new Date(booking.end_time));
    
    // Validate existing booking dates
    if (isNaN(bookingStart.getTime()) || isNaN(bookingEnd.getTime())) {
      console.warn('Invalid booking date detected:', booking);
      return;
    }
    
    // Check for overlap (handles all edge cases)
    const hasOverlap = adjustedStart < bookingEnd && adjustedEnd > bookingStart;
    
    if (hasOverlap) {
      conflictingBookings.push(booking.id || 'unknown');
      details.push(`Konflikt: ${formatSwedishDateTime(bookingStart)} - ${formatSwedishDateTime(bookingEnd)}`);
    }
  });
  
  return {
    hasCollision: conflictingBookings.length > 0,
    conflictingBookings,
    details
  };
};

export default {
  ResourceTemplates,
  SuggestedTimeSlots,
  FairUsageRules,
  validateBookingRules,
  detectCollisions
};