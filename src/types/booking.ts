// =============================================
// FÖRENKLAT BOKNINGSSYSTEM - ENDAST ESSENTIELLA TYPER
// =============================================

// FÖRENKLAT: Endast 4 resurstyper istället för 10
export type SimplifiedResourceType = 
  | 'laundry'
  | 'guest_apartment' 
  | 'common_room'
  | 'other'

// FÖRENKLAT: Endast 5 kärnregler istället för 14
export interface SimplifiedBookingRules {
  maxAdvanceBookingDays: number;
  maxBookingDurationHours: number;
  maxBookingsPerUserPerWeek: number;
  operatingHours: { start: string; end: string };
  cleaningBufferMinutes: number;
}

// =============================================
// GRUNDLÄGGANDE DATABAS-TYPER
// =============================================

export interface BookingResource {
  id: string
  handbook_id: string
  name: string
  description: string | null
  resource_type: SimplifiedResourceType // FIXAT: Använd resource_type istället för type
  capacity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BookingResourceInsert {
  id?: string
  handbook_id: string
  name: string
  description?: string | null
  resource_type: SimplifiedResourceType // FIXAT: Använd resource_type istället för type
  capacity?: number
  is_active?: boolean
}

// =============================================
// FÖRENKLAD RESURS-INTERFACE (för UI)
// =============================================

export interface SimplifiedResource {
  id: string
  handbook_id: string
  name: string
  description: string | null
  resource_type: SimplifiedResourceType // FIXAT: Använd resource_type istället för type
  capacity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  resource_id: string
  user_id: string
  handbook_id: string
  start_time: string
  end_time: string
  purpose: string
  attendees: number
  contact_phone: string | null
  status: 'active' | 'cancelled' | 'pending'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BookingInsert {
  resource_id: string
  user_id: string
  handbook_id: string
  start_time: string
  end_time: string
  purpose: string
  attendees?: number
  contact_phone?: string | null
  status?: 'active' | 'cancelled' | 'pending'
  notes?: string | null
}

export interface BookingWithDetails extends Booking {
  resource: {
    id: string
    name: string
    description: string | null
  }
}

// =============================================
// FÖRENKLAD VALIDERING OCH KONFLIKTER
// =============================================

export interface BookingValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface BookingConflict {
  type: 'overlap' | 'rule_violation'
  message: string
  conflicting_booking?: Booking
}

// =============================================
// FÖRENKLAD STATISTIK
// =============================================

export interface BookingStats {
  totalResources: number
  totalBookingsThisMonth: number
  mostPopularResource: {
    name: string
    bookingCount: number
  }
  upcomingBookings: number
}

// =============================================
// API SVAR-TYPER
// =============================================

export interface BookingApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  validation_errors?: string[]
}

export interface PaginatedBookingResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

// =============================================
// FÖRENKLAD SÖKNING
// =============================================

export interface BookingSearchParams {
  resource_id?: string
  member_id?: string
  status?: ('active' | 'cancelled' | 'pending')[]
  date_from?: string
  date_to?: string
  search_term?: string
  page?: number
  per_page?: number
}

export interface ResourceSearchParams {
  handbook_id?: string
  is_active?: boolean
  search_term?: string
  available_on?: string
} 