// =============================================
// BOKNINGS-NOTIFIKATIONER MED RESEND
// =============================================

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { BookingWithDetails } from '@/types/booking'

// Conditional Resend initialization to prevent build failures
let resend: Resend | null = null
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.warn('[Booking Notifications] Resend initialization failed:', error)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// FÖRENKLAD: Endast 2 typer av notifikationer
export type BookingNotificationType = 'booking_confirmation' | 'reminder_24h'

export interface BookingNotificationData {
  type: BookingNotificationType
  booking: BookingWithDetails
  userEmail: string
  handbookName: string
  resourceName: string
}

// =============================================
// SKICKA BOKNINGS-BEKRÄFTELSE
// =============================================

export async function sendBookingConfirmation({
  booking,
  userEmail,
  handbookName,
  resourceName,
  handbookSlug
}: {
  booking: BookingWithDetails
  userEmail: string
  handbookName: string
  resourceName: string
  handbookSlug: string
}) {
  if (!resend) {
    console.warn('[Booking Notifications] Resend not available, skipping booking confirmation')
    return
  }

  console.log('[Booking Notifications] Sending booking confirmation to:', userEmail)

  const startTime = new Date(booking.start_time).toLocaleString('sv-SE')
  const endTime = new Date(booking.end_time).toLocaleString('sv-SE')
  const bookingDate = new Date(booking.start_time).toLocaleDateString('sv-SE')
  
  // Use same email domain pattern as existing code
  const fromDomain = process.env.NODE_ENV === 'production' 
    ? process.env.RESEND_DOMAIN || 'handbok.org'
    : 'onboarding@resend.dev'
  
  const fromEmail = process.env.NODE_ENV === 'production'
    ? `${handbookName} <noreply@${fromDomain}>`
    : `${handbookName} <${fromDomain}>`

  const replyToEmail = process.env.NODE_ENV === 'production' 
    ? `no-reply@${fromDomain}`
    : fromDomain

  // Create booking management URL
  const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const bookingUrl = `${protocol}://${handbookSlug}.${baseUrl}/bookings`

  const emailContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Bokningsbekräftelse</h1>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #10b981; margin-top: 0;">Din bokning är bekräftad!</h2>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #065f46;">Bokningsinformation:</h3>
          <p><strong>Resurs:</strong> ${resourceName}</p>
          <p><strong>Datum:</strong> ${bookingDate}</p>
          <p><strong>Tid:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Handbok:</strong> ${handbookName}</p>
          ${booking.notes ? `<p><strong>Anteckningar:</strong> ${booking.notes}</p>` : ''}
        </div>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <p style="margin: 0;"><strong>Viktigt att komma ihåg:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Kom i tid till din bokning</li>
            <li>Kontakta administratören om du behöver ändra eller avboka</li>
            <li>Följ handbokens regler för resursanvändning</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${bookingUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Se alla dina bokningar</a>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">Detta e-postmeddelande skickades automatiskt från ${handbookName}.</p>
        <p style="margin: 5px 0 0 0;">Har du frågor? Kontakta handbokens administratör.</p>
      </div>
    </div>
  `

  try {
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Bokningsbekräftelse - ${resourceName} (${bookingDate})`,
      html: emailContent,
      reply_to: replyToEmail,
      tags: [
        { name: 'type', value: 'booking_confirmation' },
        { name: 'handbook', value: handbookSlug },
        { name: 'resource', value: booking.resource_id }
      ]
    })

    console.log('[Booking Notifications] Confirmation email sent successfully:', {
      emailId: emailResult?.data?.id || 'no-id',
      recipient: userEmail,
      hasError: !!emailResult?.error
    })

    if (emailResult?.error) {
      console.error('[Booking Notifications] Email error:', emailResult.error)
    }

    return emailResult
  } catch (error) {
    console.error('[Booking Notifications] Failed to send booking confirmation:', error)
    throw error
  }
}

// =============================================
// SKICKA PÅMINNELSE 24H INNAN
// =============================================

export async function sendBookingReminder({
  booking,
  userEmail,
  handbookName,
  resourceName,
  handbookSlug
}: {
  booking: BookingWithDetails
  userEmail: string
  handbookName: string
  resourceName: string
  handbookSlug: string
}) {
  if (!resend) {
    console.warn('[Booking Notifications] Resend not available, skipping booking reminder')
    return
  }

  console.log('[Booking Notifications] Sending booking reminder to:', userEmail)

  const startTime = new Date(booking.start_time).toLocaleString('sv-SE')
  const endTime = new Date(booking.end_time).toLocaleString('sv-SE')
  const bookingDate = new Date(booking.start_time).toLocaleDateString('sv-SE')
  
  // Use same email domain pattern as existing code
  const fromDomain = process.env.NODE_ENV === 'production' 
    ? process.env.RESEND_DOMAIN || 'handbok.org'
    : 'onboarding@resend.dev'
  
  const fromEmail = process.env.NODE_ENV === 'production'
    ? `${handbookName} <noreply@${fromDomain}>`
    : `${handbookName} <${fromDomain}>`

  const replyToEmail = process.env.NODE_ENV === 'production' 
    ? `no-reply@${fromDomain}`
    : fromDomain

  // Create booking management URL
  const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const bookingUrl = `${protocol}://${handbookSlug}.${baseUrl}/bookings`

  const emailContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Påminnelse om bokning</h1>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #f59e0b; margin-top: 0;">Din bokning är imorgon!</h2>
        
        <p>Glöm inte att du har en bokning imorgon.</p>
        
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Bokningsinformation:</h3>
          <p><strong>Resurs:</strong> ${resourceName}</p>
          <p><strong>Datum:</strong> ${bookingDate}</p>
          <p><strong>Tid:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Handbok:</strong> ${handbookName}</p>
          ${booking.notes ? `<p><strong>Anteckningar:</strong> ${booking.notes}</p>` : ''}
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0;"><strong>Påminnelse:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Kom i tid till din bokning</li>
            <li>Kontakta administratören om du behöver ändra eller avboka</li>
            <li>Ta med dig allt du behöver för aktiviteten</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${bookingUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Hantera dina bokningar</a>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">Detta är en automatisk påminnelse från ${handbookName}.</p>
        <p style="margin: 5px 0 0 0;">Har du frågor? Kontakta handbokens administratör.</p>
      </div>
    </div>
  `

  try {
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Påminnelse: ${resourceName} imorgon (${bookingDate})`,
      html: emailContent,
      reply_to: replyToEmail,
      tags: [
        { name: 'type', value: 'booking_reminder' },
        { name: 'handbook', value: handbookSlug },
        { name: 'resource', value: booking.resource_id }
      ]
    })

    console.log('[Booking Notifications] Reminder email sent successfully:', {
      emailId: emailResult?.data?.id || 'no-id',
      recipient: userEmail,
      hasError: !!emailResult?.error
    })

    if (emailResult?.error) {
      console.error('[Booking Notifications] Email error:', emailResult.error)
    }

    return emailResult
  } catch (error) {
    console.error('[Booking Notifications] Failed to send booking reminder:', error)
    throw error
  }
}

// =============================================
// HJÄLPFUNKTIONER
// =============================================

export async function getUserEmailFromBooking(bookingId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseService
      .from('bookings')
      .select(`
        user_id,
        auth_users:user_id (
          email
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error) {
      console.error('[Booking Notifications] Error fetching user email:', error)
      return null
    }

    return data?.auth_users?.email || null
  } catch (error) {
    console.error('[Booking Notifications] Error in getUserEmailFromBooking:', error)
    return null
  }
}

export async function getHandbookDetailsFromBooking(bookingId: string): Promise<{
  handbookName: string
  handbookSlug: string
  resourceName: string
} | null> {
  try {
    const { data, error } = await supabaseService
      .from('bookings')
      .select(`
        resource_id,
        handbook_id,
        handbooks:handbook_id (
          title,
          slug
        ),
        booking_resources:resource_id (
          name
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error) {
      console.error('[Booking Notifications] Error fetching handbook details:', error)
      return null
    }

    return {
      handbookName: data?.handbooks?.title || 'Handbok',
      handbookSlug: data?.handbooks?.slug || 'unknown',
      resourceName: data?.booking_resources?.name || 'Resurs'
    }
  } catch (error) {
    console.error('[Booking Notifications] Error in getHandbookDetailsFromBooking:', error)
    return null
  }
}

// =============================================
// CRON JOB FUNKTIONER
// =============================================

export async function sendDailyReminders() {
  console.log('[Booking Notifications] Starting daily reminder job...')
  
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
  
  try {
    const { data: bookings, error } = await supabaseService
      .from('bookings')
      .select(`
        *,
        handbooks:handbook_id (
          title,
          slug
        ),
        booking_resources:resource_id (
          name
        ),
        auth_users:user_id (
          email
        )
      `)
      .gte('start_time', tomorrow.toISOString())
      .lt('start_time', dayAfterTomorrow.toISOString())
      .eq('status', 'confirmed')
    
    if (error) {
      console.error('[Booking Notifications] Error fetching bookings for reminders:', error)
      return
    }
    
    console.log(`[Booking Notifications] Found ${bookings?.length || 0} bookings for tomorrow`)
    
    if (bookings && bookings.length > 0) {
      for (const booking of bookings) {
        if (booking.auth_users?.email) {
          await sendBookingReminder({
            booking,
            userEmail: booking.auth_users.email,
            handbookName: booking.handbooks?.title || 'Handbok',
            resourceName: booking.booking_resources?.name || 'Resurs',
            handbookSlug: booking.handbooks?.slug || 'unknown'
          })
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
    
    console.log('[Booking Notifications] Daily reminder job completed')
  } catch (error) {
    console.error('[Booking Notifications] Error in sendDailyReminders:', error)
  }
}