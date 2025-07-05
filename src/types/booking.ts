// =============================================
// BOOKING SYSTEM TYPES
// Integreras med befintlig handbook/member-struktur
// =============================================

import { Database } from './supabase'

// =============================================
// FLEXIBLA RESURSKONFIGURATIONER
// =============================================

export type ResourceType = 
  | 'general'
  | 'laundry' 
  | 'party_room'
  | 'guest_apartment'
  | 'sauna'
  | 'hobby_room'
  | 'gym'
  | 'parking'
  | 'storage'
  | 'bike_storage'

export interface PricingConfig {
  base_fee?: number           // Grundavgift per bokning
  hourly_rate?: number        // Kr per timme
  daily_rate?: number         // Kr per dag (för gästlägenheter)
  cleaning_fee?: number       // Städavgift
  deposit?: number            // Deposition som återbetalas
  late_cancellation_fee?: number  // Avgift för sen avbokning
  damage_fee?: number         // Avgift vid skador
  member_discount?: number    // Rabatt för medlemmar (%)
}

export interface TimeRestrictions {
  start_time?: string         // "06:00" - Tidigaste tid
  end_time?: string           // "23:00" - Senaste tid  
  allowed_days?: number[]     // [1,2,3,4,5] = Mån-Fre
  blocked_dates?: string[]    // ["2025-12-24", "2025-12-25"]
  advance_booking_hours?: number  // Min 2h i förväg
  max_advance_days?: number   // Max 30 dagar i förväg
}

export interface BookingLimits {
  max_duration_hours?: number     // Max 3h per bokning
  max_bookings_per_week?: number  // Max 2 bokningar/vecka
  max_bookings_per_month?: number // Max 4 bokningar/månad
  max_total_hours_per_month?: number // Max 8h/månad
  cooldown_hours?: number         // 24h mellan bokningar
  concurrent_bookings?: number    // Max 1 samtidig bokning
}

export interface BookingRulesConfig {
  requires_approval?: boolean
  auto_approval_for_roles?: string[]  // ["admin", "board"]
  cancellation_deadline_hours?: number  // 24h före start
  no_show_penalty?: number       // Avgift vid uteblivande
  requires_phone?: boolean       // Telefonnummer obligatoriskt
  requires_purpose?: boolean     // Syfte obligatoriskt
  min_age?: number              // Minimiålder 18
  max_attendees?: number        // Max antal deltagare
  special_instructions?: string  // Särskilda instruktioner
}

// =============================================
// GRUNDLÄGGANDE DATABAS-TYPER
// =============================================

// Bokningsresurs från databasen
export interface BookingResource {
  id: string
  handbook_id: string
  name: string
  description: string | null
  capacity: number
  advance_booking_days: number
  max_duration_hours: number
  requires_approval: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  time_restrictions?: TimeRestrictions // Lägg till som optional för bakåtkompatibilitet
}

export interface BookingResourceInsert {
  id?: string
  handbook_id: string
  name: string
  description?: string | null
  capacity?: number
  advance_booking_days?: number
  max_duration_hours?: number
  requires_approval?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  time_restrictions?: TimeRestrictions
}

export interface BookingResourceUpdate {
  id?: string
  handbook_id?: string
  name?: string
  description?: string | null
  capacity?: number
  advance_booking_days?: number
  max_duration_hours?: number
  requires_approval?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  time_restrictions?: TimeRestrictions
}

// Bokning från databasen
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
  id?: string
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
  created_at?: string
  updated_at?: string
}

export interface BookingUpdate {
  id?: string
  resource_id?: string
  user_id?: string
  handbook_id?: string
  start_time?: string
  end_time?: string
  purpose?: string
  attendees?: number
  contact_phone?: string | null
  status?: 'active' | 'cancelled' | 'pending'
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// Bokningsregel från databasen
export interface BookingRule {
  id: string
  resource_id: string
  rule_type: string
  rule_value: any // JSONB
  is_active: boolean
  created_at: string
}

export interface BookingRuleInsert {
  id?: string
  resource_id: string
  rule_type: string
  rule_value: any
  is_active?: boolean
  created_at?: string
}

// Bokningskommentar från databasen (future feature)
export interface BookingComment {
  id: string
  booking_id: string
  user_id: string
  comment: string
  created_at: string
}

export interface BookingCommentInsert {
  id?: string
  booking_id: string
  user_id: string
  comment: string
  created_at?: string
}

// =============================================
// API RESPONSE TYPER - Matchar vad API:et faktiskt returnerar
// =============================================

// Detta är vad GET /api/bookings faktiskt returnerar
export interface BookingWithDetails extends Booking {
  resource: {
    id: string
    name: string
    description: string | null
  }
}

// =============================================
// EXTENDED TYPES med joins och beräkningar
// =============================================

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
  capacity: number
  max_duration_hours: number
  requires_approval: boolean
  is_active: boolean
  handbook_id: string
  
  // Nya flexibla fält
  resource_type: ResourceType
  pricing_config: PricingConfig
  time_restrictions: TimeRestrictions
  booking_limits: BookingLimits
  booking_rules: BookingRulesConfig
}

// Utökad resursdefinition med flexibla regler
export interface FlexibleBookingResource extends BookingResource {
  resource_type: ResourceType
  pricing_config: PricingConfig
  time_restrictions: TimeRestrictions
  booking_limits: BookingLimits
  booking_rules: BookingRulesConfig
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

// Template för snabb setup av vanliga resurstyper
export interface ResourceTemplate {
  name: string
  resource_type: ResourceType
  description: string
  default_pricing: PricingConfig
  default_time_restrictions: TimeRestrictions
  default_booking_limits: BookingLimits
  default_booking_rules: BookingRulesConfig
} 