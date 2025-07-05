import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendBookingConfirmation, sendBookingReminder, getUserEmailFromBooking, getHandbookDetailsFromBooking } from '../../lib/booking-notifications'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, bookingId } = req.body

    if (!action || !bookingId) {
      return res.status(400).json({ error: 'Missing required fields: action, bookingId' })
    }

    // Hämta booking-data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
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

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Hämta användarens email
    const userEmail = await getUserEmailFromBooking(bookingId)
    if (!userEmail) {
      return res.status(404).json({ error: 'User email not found' })
    }

    const handbookName = booking.handbooks?.title || 'Handbok'
    const handbookSlug = booking.handbooks?.slug || 'unknown'
    const resourceName = booking.booking_resources?.name || 'Resurs'

    let result

    switch (action) {
      case 'send_confirmation':
        result = await sendBookingConfirmation({
          booking,
          userEmail,
          handbookName,
          resourceName,
          handbookSlug
        })
        break

      case 'send_reminder':
        result = await sendBookingReminder({
          booking,
          userEmail,
          handbookName,
          resourceName,
          handbookSlug
        })
        break

      default:
        return res.status(400).json({ error: 'Invalid action. Use: send_confirmation, send_reminder' })
    }

    return res.status(200).json({ 
      success: true, 
      message: `${action} sent successfully`,
      emailId: result?.data?.id || null
    })

  } catch (error) {
    console.error('[Booking Notifications API] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 