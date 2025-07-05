// =============================================
// STANDARDIZED BOOKING SYSTEM RULES
// Based on industry best practices for BRF
// =============================================

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

export type ResourceType = 'laundry' | 'guest_apartment' | 'sauna' | 'hobby_room' | 'party_room' | 'other';

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
    requiresApproval: true,
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
    requiresApproval: true,
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

// Validation helpers
export const validateBookingRules = (
  resourceType: ResourceType,
  startTime: Date,
  endTime: Date,
  userId: string,
  existingBookings: any[]
): { valid: boolean; errors: string[] } => {
  const rules = ResourceTemplates[resourceType];
  const errors: string[] = [];
  const now = new Date();
  
  // Check advance booking window
  const advanceHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (advanceHours < rules.minAdvanceBookingHours) {
    errors.push(`Måste bokas minst ${rules.minAdvanceBookingHours} timmar i förväg`);
  }
  
  const advanceDays = advanceHours / 24;
  if (advanceDays > rules.maxAdvanceBookingDays) {
    errors.push(`Kan inte bokas mer än ${rules.maxAdvanceBookingDays} dagar i förväg`);
  }
  
  // Check duration
  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours > rules.maxBookingDurationHours) {
    errors.push(`Maximal bokningstid är ${rules.maxBookingDurationHours} timmar`);
  }
  
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (durationMinutes < rules.minBookingDurationMinutes) {
    errors.push(`Minimal bokningstid är ${rules.minBookingDurationMinutes} minuter`);
  }
  
  // Check operating hours
  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;
  const opStart = parseFloat(rules.operatingHours.start.replace(':', '.'));
  const opEnd = parseFloat(rules.operatingHours.end.replace(':', '.'));
  
  if (startHour < opStart || endHour > opEnd) {
    errors.push(`Öppettider: ${rules.operatingHours.start}-${rules.operatingHours.end}`);
  }
  
  // Check user limits (would need database query for full validation)
  // This is a simplified check - full implementation would query existing bookings
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Collision detection with buffers
export const detectCollisions = (
  newStart: Date,
  newEnd: Date,
  existingBookings: { start_time: string; end_time: string }[],
  bufferMinutes: number = 0
): boolean => {
  const buffer = bufferMinutes * 60 * 1000; // Convert to milliseconds
  const adjustedStart = new Date(newStart.getTime() - buffer);
  const adjustedEnd = new Date(newEnd.getTime() + buffer);
  
  return existingBookings.some(booking => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    // Check if there's any overlap
    return adjustedStart < bookingEnd && adjustedEnd > bookingStart;
  });
};

export default {
  ResourceTemplates,
  SuggestedTimeSlots,
  FairUsageRules,
  validateBookingRules,
  detectCollisions
};