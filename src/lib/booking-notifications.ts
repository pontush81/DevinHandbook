// =============================================
// FÖRENKLAT NOTIFIKATIONSSYSTEM
// Endast grundläggande email-notifikationer
// =============================================

import { getServiceSupabase } from '@/lib/supabase'
import { convertToSwedishTime } from './booking-standards'

// FÖRENKLAT: Endast 2 notifikationstyper istället för 5
export type SimplifiedNotificationType = 'booking_confirmation' | 'reminder_24h'

export interface SimplifiedNotificationData {
  memberEmail: string
  memberName: string
  resourceName: string
  startTime: Date
  endTime: Date
  purpose?: string
  handbookName: string
}

// FÖRENKLAT: Grundläggande email-templates
export const getNotificationContent = (
  type: SimplifiedNotificationType,
  data: SimplifiedNotificationData
): { subject: string; body: string } => {
  const swedishStartTime = convertToSwedishTime(data.startTime)
  const swedishEndTime = convertToSwedishTime(data.endTime)
  
  const dateStr = swedishStartTime.toLocaleDateString('sv-SE')
  const startTimeStr = swedishStartTime.toLocaleTimeString('sv-SE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  const endTimeStr = swedishEndTime.toLocaleTimeString('sv-SE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  switch (type) {
    case 'booking_confirmation':
      return {
        subject: `Bokningsbekräftelse - ${data.resourceName}`,
        body: `
Hej ${data.memberName}!

Din bokning är bekräftad:

📍 Resurs: ${data.resourceName}
📅 Datum: ${dateStr}
⏰ Tid: ${startTimeStr} - ${endTimeStr}
${data.purpose ? `📝 Syfte: ${data.purpose}` : ''}

För att avboka, logga in på handboken.

Med vänliga hälsningar,
${data.handbookName}
        `.trim()
      }
    
    case 'reminder_24h':
      return {
        subject: 'Påminnelse: Din bokning imorgon',
        body: `
Hej ${data.memberName}!

Påminnelse om din bokning imorgon:

📍 ${data.resourceName}
📅 ${dateStr}
⏰ ${startTimeStr} - ${endTimeStr}

Kom ihåg att avboka om du inte kan komma.

Med vänliga hälsningar,
${data.handbookName}
        `.trim()
      }
    
    default:
      throw new Error(`Unknown notification type: ${type}`)
  }
}

// FÖRENKLAT: Grundläggande email-sändning
export const sendEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<boolean> => {
  try {
    // Placeholder för email-service integration
    console.log('📧 Sending email:', { to, subject })
    
    // I produktion, integrera med email-service:
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to, subject, body })
    // });
    // return response.ok;
    
    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}

// FÖRENKLAT: Skicka bokningsnotifikation
export const sendBookingNotification = async (
  type: SimplifiedNotificationType,
  data: SimplifiedNotificationData
): Promise<boolean> => {
  try {
    const content = getNotificationContent(type, data)
    return await sendEmail(data.memberEmail, content.subject, content.body)
  } catch (error) {
    console.error('Notification sending failed:', error)
    return false
  }
}

// FÖRENKLAT: Schemalagd påminnelse (endast 24h)
export const scheduleBookingReminder = async (
  bookingId: string,
  notificationData: SimplifiedNotificationData
): Promise<void> => {
  try {
    const supabase = getServiceSupabase()
    
    // Beräkna när påminnelsen ska skickas (24h före start)
    const reminderTime = new Date(notificationData.startTime)
    reminderTime.setHours(reminderTime.getHours() - 24)
    
    // Spara påminnelse i databas (om tabellen finns)
    await supabase
      .from('booking_notifications')
      .insert({
        booking_id: bookingId,
        type: 'reminder_24h',
        scheduled_time: reminderTime.toISOString(),
        recipient_email: notificationData.memberEmail,
        status: 'pending'
      })
      .select()
      .single()
    
    console.log('📅 Scheduled reminder for booking:', bookingId)
  } catch (error) {
    console.error('Failed to schedule reminder:', error)
    // Misslyckad schemaläggning är inte kritisk
  }
}