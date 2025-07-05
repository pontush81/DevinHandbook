// =============================================
// CRON JOB: AUTOMATISKA BOKNINGS-PÅMINNELSER
// =============================================

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendBookingReminder } from '@/lib/booking-notifications'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Säkerhetskontroll: Endast tillåt från rätt källor
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🕐 [Cron] Starting booking reminders check...')
    
    // Hitta bokningar som startar imorgon (24h från nu)
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: upcomingBookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_resources!inner(name),
        handbook_members!inner(
          name,
          auth_users:user_id(email),
          handbooks:handbook_id(name, slug)
        )
      `)
      .eq('status', 'active')
      .gte('start_time', in24Hours.toISOString())
      .lt('start_time', in25Hours.toISOString())

    if (error) {
      console.error('Error fetching upcoming bookings:', error)
      return res.status(500).json({ error: 'Database error' })
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      console.log('📧 [Cron] No bookings found that need reminders')
      return res.status(200).json({ 
        message: 'No reminders needed', 
        checked_at: now.toISOString() 
      })
    }

    console.log(`📧 [Cron] Found ${upcomingBookings.length} bookings needing reminders`)

    let sentCount = 0
    let errorCount = 0

    for (const booking of upcomingBookings) {
      try {
        const member = booking.handbook_members as any
        const resource = booking.booking_resources as any
        const handbook = member?.handbooks

        if (!member?.auth_users?.email) {
          console.warn(`⚠️ [Cron] No email found for booking ${booking.id}`)
          continue
        }

        await sendBookingReminder({
          booking: booking as any,
          userEmail: member.auth_users.email,
          handbookName: handbook?.name || 'Handbok',
          resourceName: resource?.name || 'Resurs',
          handbookSlug: handbook?.slug || 'handbok'
        })

        sentCount++
        console.log(`✅ [Cron] Reminder sent for booking ${booking.id}`)

      } catch (emailError) {
        errorCount++
        console.error(`❌ [Cron] Failed to send reminder for booking ${booking.id}:`, emailError)
      }
    }

    console.log(`📧 [Cron] Reminders complete: ${sentCount} sent, ${errorCount} failed`)

    return res.status(200).json({
      message: 'Reminders processed',
      processed_at: now.toISOString(),
      bookings_found: upcomingBookings.length,
      reminders_sent: sentCount,
      errors: errorCount
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 