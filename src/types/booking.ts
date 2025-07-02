// =============================================
// BOOKING SYSTEM TYPES
// Integreras med befintlig handbook/member-struktur
// =============================================

import { Database } from './supabase'

// Typer från Supabase schema
export type BookingResource = Database['public']['Tables']['booking_resources']['Row']
export type BookingResourceInsert = Database['public']['Tables']['booking_resources']['Insert']
export type BookingResourceUpdate = Database['public']['Tables']['booking_resources']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row'] 
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type BookingRule = Database['public']['Tables']['booking_rules']['Row']
export type BookingRuleInsert = Database['public']['Tables']['booking_rules']['Insert']

export type BookingComment = Database['public']['Tables']['booking_comments']['Row']
export type BookingCommentInsert = Database['public']['Tables']['booking_comments']['Insert']

// =============================================
// EXTENDED TYPES med joins och beräkningar
// =============================================

export interface BookingWithDetails extends Booking {
  resource: BookingResource
  member: {
    id: string
    name: string
    email: string
    role: string
  }
  comments?: BookingComment[]
}

export interface ResourceWithStats extends BookingResource {
  total_bookings: number
  this_month_bookings: number
  next_available_slot?: Date
  is_available_now: boolean
}

export interface MemberBookingSummary {
  member_id: string
  member_name: string
  total_bookings: number
  active_bookings: number
  can_book_more: boolean
  next_booking?: Date
}

// =============================================
// BOOKING STATUS & VALIDATION
// =============================================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface BookingValidation {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}

export interface BookingConflict {
  type: 'overlap' | 'rule_violation' | 'resource_unavailable'
  message: string
  conflicting_booking?: Booking
}

// =============================================
// CALENDAR & TIME SLOTS
// =============================================

export interface TimeSlot {
  start: Date
  end: Date
  is_available: boolean
  is_blocked: boolean
  existing_booking?: Booking
  reason?: string // Varför slotten inte är tillgänglig
}

export interface CalendarDay {
  date: Date
  time_slots: TimeSlot[]
  is_available: boolean
}

export interface CalendarWeek {
  week_number: number
  days: CalendarDay[]
}

// =============================================
// BOOKING FORMS & UI
// =============================================

export interface BookingFormData {
  resource_id: string
  start_time: Date
  end_time: Date
  purpose?: string
  attendees?: number
  contact_phone?: string
  notes?: string
}

export interface ResourceFormData {
  name: string
  description?: string
  location?: string
  max_duration_hours: number
  max_advance_days: number
  max_bookings_per_member: number
  available_from: string // HH:MM format
  available_to: string   // HH:MM format
  available_days: number[] // [1,2,3,4,5,6,7] för Mon-Sun
  requires_approval: boolean
  booking_instructions?: string
  rules?: string
  cost_per_hour?: number
  cleaning_fee?: number
}

// =============================================
// DASHBOARD & STATISTICS
// =============================================

export interface BookingStats {
  total_resources: number
  total_bookings_this_month: number
  total_bookings_last_month: number
  most_popular_resource: {
    name: string
    booking_count: number
  }
  upcoming_bookings: number
  pending_approvals: number
  utilization_rate: number // Procentandel av tillgänglig tid som är bokad
}

export interface ResourceUtilization {
  resource_id: string
  resource_name: string
  total_available_hours: number
  total_booked_hours: number
  utilization_percentage: number
  peak_hours: string[] // ["18:00-20:00", "19:00-21:00"]
}

// =============================================
// RULES & PERMISSIONS  
// =============================================

export type BookingRuleType = 
  | 'max_duration' 
  | 'max_advance_days' 
  | 'max_per_member'
  | 'blackout_dates' 
  | 'member_only' 
  | 'requires_approval'

export interface RuleValue {
  // För max_duration
  max_hours?: number
  
  // För max_advance_days
  advance_days?: number
  
  // För max_per_member
  max_bookings?: number
  
  // För blackout_dates
  blackout_start?: string // YYYY-MM-DD
  blackout_end?: string   // YYYY-MM-DD
  blackout_reason?: string
  
  // För member_only
  allowed_roles?: string[]
  
  // För requires_approval
  approval_required?: boolean
  auto_approval_roles?: string[]
}

export interface BookingPermissions {
  can_create_booking: boolean
  can_edit_own_booking: boolean
  can_cancel_own_booking: boolean
  can_view_all_bookings: boolean
  can_manage_resources: boolean
  can_approve_bookings: boolean
  can_view_admin_notes: boolean
  max_bookings_allowed: number
  max_advance_days: number
}

// =============================================
// NOTIFICATIONS & REMINDERS
// =============================================

export interface BookingNotification {
  id: string
  type: 'booking_confirmed' | 'booking_reminder' | 'booking_cancelled' | 'approval_needed'
  booking_id: string
  member_id: string
  message: string
  is_read: boolean
  created_at: string
}

export interface BookingReminder {
  booking_id: string
  remind_hours_before: number // T.ex. 24 för 24 timmar innan
  sent_at?: string
  reminder_type: 'email' | 'in_app' | 'sms'
}

// =============================================
// EXPORT/IMPORT & INTEGRATION
// =============================================

export interface BookingExport {
  resource_name: string
  member_name: string
  start_time: string
  end_time: string
  status: string
  purpose?: string
  attendees?: number
  total_cost?: number
}

export interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'ical'
  sync_enabled: boolean
  last_sync?: string
  sync_direction: 'import' | 'export' | 'both'
}

// =============================================
// API RESPONSES
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
// SEARCH & FILTERING
// =============================================

export interface BookingSearchParams {
  resource_id?: string
  member_id?: string
  status?: BookingStatus[]
  date_from?: string
  date_to?: string
  search_term?: string // Söker i purpose, notes, etc.
  page?: number
  per_page?: number
  order_by?: 'start_time' | 'created_at' | 'resource_name' | 'member_name'
  order_direction?: 'asc' | 'desc'
}

export interface ResourceSearchParams {
  handbook_id?: string
  is_active?: boolean
  search_term?: string
  available_on?: string // YYYY-MM-DD
  available_at?: string // HH:MM
  order_by?: 'name' | 'created_at' | 'total_bookings'
  order_direction?: 'asc' | 'desc'
} 