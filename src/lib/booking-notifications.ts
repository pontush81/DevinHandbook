// =============================================
// BOOKING NOTIFICATIONS SYSTEM
// Automated email/SMS reminders and notifications
// =============================================

import { createClient } from '@supabase/supabase-js'
import { toSwedishTime, fromSwedishTime } from './booking-standards'

export interface NotificationTemplate {
  type: 'booking_confirmation' | 'reminder_24h' | 'reminder_2h' | 'cancellation' | 'no_show_warning';
  subject: string;
  emailBody: string;
  smsBody?: string;
}

export const NotificationTemplates: Record<string, NotificationTemplate> = {
  booking_confirmation: {
    type: 'booking_confirmation',
    subject: 'Bokningsbekräftelse - {{resourceName}}',
    emailBody: `
Hej {{memberName}}!

Din bokning är bekräftad:

📍 Resurs: {{resourceName}}
📅 Datum: {{date}}
⏰ Tid: {{startTime}} - {{endTime}}
{{#if location}}📍 Plats: {{location}}{{/if}}
{{#if purpose}}📝 Syfte: {{purpose}}{{/if}}
{{#if cleaningFee}}💰 Städavgift: {{cleaningFee}} kr{{/if}}

{{#if bookingRules}}
Viktiga regler:
{{bookingRules}}
{{/if}}

För att avboka, logga in på handboken senast {{cancellationDeadline}}.

Med vänliga hälsningar,
{{handbookName}}
    `,
    smsBody: 'Bokning bekräftad: {{resourceName}} {{date}} {{startTime}}-{{endTime}}. Avboka senast {{cancellationDeadline}} via handboken.'
  },

  reminder_24h: {
    type: 'reminder_24h',
    subject: 'Påminnelse: Din bokning imorgon',
    emailBody: `
Hej {{memberName}}!

Detta är en påminnelse om din bokning imorgon:

📍 {{resourceName}}
📅 {{date}}
⏰ {{startTime}} - {{endTime}}
{{#if location}}📍 {{location}}{{/if}}

{{#if preparationInstructions}}
Förberedelser:
{{preparationInstructions}}
{{/if}}

Kom ihåg att avboka senast {{cancellationDeadline}} om du inte kan komma.

Med vänliga hälsningar,
{{handbookName}}
    `,
    smsBody: 'Påminnelse: {{resourceName}} imorgon {{startTime}}-{{endTime}}. Avboka via handboken om du inte kan komma.'
  },

  reminder_2h: {
    type: 'reminder_2h',
    subject: 'Din bokning börjar snart',
    emailBody: `
Hej {{memberName}}!

Din bokning börjar om 2 timmar:

📍 {{resourceName}}
⏰ {{startTime}} - {{endTime}}
{{#if location}}📍 {{location}}{{/if}}

{{#if accessInstructions}}
Åtkomst:
{{accessInstructions}}
{{/if}}

Med vänliga hälsningar,
{{handbookName}}
    `,
    smsBody: 'Din bokning {{resourceName}} börjar om 2h ({{startTime}}). {{#if accessCode}}Kod: {{accessCode}}{{/if}}'
  },

  cancellation: {
    type: 'cancellation',
    subject: 'Avbokning bekräftad',
    emailBody: `
Hej {{memberName}}!

Din avbokning är bekräftad:

📍 {{resourceName}}
📅 {{date}}
⏰ {{startTime}} - {{endTime}}

{{#if refundAmount}}💰 Återbetalning: {{refundAmount}} kr{{/if}}

Med vänliga hälsningar,
{{handbookName}}
    `,
    smsBody: 'Avbokning bekräftad: {{resourceName}} {{date}} {{startTime}}-{{endTime}}'
  },

  no_show_warning: {
    type: 'no_show_warning',
    subject: 'Uteblivit från bokning',
    emailBody: `
Hej {{memberName}}!

Du har registrerats som uteblivit från följande bokning:

📍 {{resourceName}}
📅 {{date}}
⏰ {{startTime}} - {{endTime}}

{{noShowCount}} av 3 tillåtna utebliven registrerade.
{{#if suspended}}Din bokningsrätt är tillfälligt begränsad.{{/if}}

Kontakta styrelsen om detta är felaktigt.

Med vänliga hälsningar,
{{handbookName}}
    `
  }
};

// Template rendering with Handlebars-like syntax
export const renderTemplate = (template: string, data: Record<string, any>): string => {
  let rendered = template;
  
  // Simple variable substitution {{variable}}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value?.toString() || '');
  });
  
  // Simple conditional blocks {{#if condition}}...{{/if}}
  const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
  rendered = rendered.replace(conditionalRegex, (match, condition, content) => {
    return data[condition] ? content : '';
  });
  
  return rendered.trim();
};

// Email sending function (placeholder - implement with your email service)
export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  handbookId: string
): Promise<boolean> => {
  try {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', { to, subject, body });
    
    // For now, just log the email
    // In production, implement actual email sending:
    /*
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, handbookId })
    });
    return response.ok;
    */
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// SMS sending function (placeholder)
export const sendSMS = async (
  to: string,
  message: string,
  handbookId: string
): Promise<boolean> => {
  try {
    // This would integrate with SMS service (Twilio, etc.)
    console.log('Sending SMS:', { to, message });
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};

// ENHANCED: Main notification sending function med deduplication
export const sendBookingNotification = async (
  notificationType: keyof typeof NotificationTemplates,
  bookingData: {
    bookingId?: string;
    memberEmail: string;
    memberPhone?: string;
    memberName: string;
    resourceName: string;
    resourceLocation?: string;
    startTime: Date;
    endTime: Date;
    purpose?: string;
    cleaningFee?: number;
    handbookName: string;
    handbookId: string;
    accessCode?: string;
    noShowCount?: number;
    bookingRules?: string;
  }
): Promise<{ emailSent: boolean; smsSent: boolean }> => {
  const template = NotificationTemplates[notificationType];
  if (!template) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ENHANCED: Deduplication check via database function
  if (bookingData.bookingId) {
    try {
      const { data: shouldSend, error } = await supabase
        .rpc('should_send_notification', {
          p_booking_id: bookingData.bookingId,
          p_notification_type: notificationType,
          p_recipient_email: bookingData.memberEmail,
          p_recipient_phone: bookingData.memberPhone || null
        });

      if (error) {
        console.error('Deduplication check failed:', error);
        // Continue anyway, don't block notifications due to deduplication failures
      } else if (!shouldSend) {
        console.log(`Notification ${notificationType} already sent for booking ${bookingData.bookingId}`);
        return { emailSent: false, smsSent: false };
      }
    } catch (error) {
      console.error('Error checking notification deduplication:', error);
      // Continue anyway
    }
  }

  // ENHANCED: Prepare template data with Swedish timezone handling
  const startTimeSwedish = toSwedishTime(bookingData.startTime);
  const endTimeSwedish = toSwedishTime(bookingData.endTime);
  const cancellationDeadlineSwedish = toSwedishTime(new Date(bookingData.startTime.getTime() - 24 * 60 * 60 * 1000));

  const templateData = {
    memberName: bookingData.memberName,
    resourceName: bookingData.resourceName,
    location: bookingData.resourceLocation,
    date: startTimeSwedish.toLocaleDateString('sv-SE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    startTime: startTimeSwedish.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    endTime: endTimeSwedish.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    purpose: bookingData.purpose,
    cleaningFee: bookingData.cleaningFee,
    handbookName: bookingData.handbookName,
    accessCode: bookingData.accessCode,
    noShowCount: bookingData.noShowCount,
    bookingRules: bookingData.bookingRules,
    cancellationDeadline: cancellationDeadlineSwedish.toLocaleDateString('sv-SE', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    suspended: bookingData.noShowCount && bookingData.noShowCount >= 3
  };

  let emailSent = false;
  let smsSent = false;

  try {
    // Send email
    const emailSubject = renderTemplate(template.subject, templateData);
    const emailBody = renderTemplate(template.emailBody, templateData);
    emailSent = await sendEmail(
      bookingData.memberEmail,
      emailSubject,
      emailBody,
      bookingData.handbookId
    );

    // Send SMS if template and phone number available
    if (template.smsBody && bookingData.memberPhone) {
      const smsBody = renderTemplate(template.smsBody, templateData);
      smsSent = await sendSMS(
        bookingData.memberPhone,
        smsBody,
        bookingData.handbookId
      );
    }

    // ENHANCED: Update notification log with results
    if (bookingData.bookingId) {
      try {
        await supabase
          .from('notification_log')
          .update({
            status: (emailSent || smsSent) ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            last_error: (emailSent || smsSent) ? null : 'Both email and SMS failed'
          })
          .eq('booking_id', bookingData.bookingId)
          .eq('notification_type', notificationType);
      } catch (error) {
        console.error('Failed to update notification log:', error);
      }
    }

  } catch (error) {
    console.error('Error sending notification:', error);
    
    // ENHANCED: Log failure in notification_log
    if (bookingData.bookingId) {
      try {
        await supabase
          .from('notification_log')
          .update({
            status: 'failed',
            attempt_count: 1,
            last_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('booking_id', bookingData.bookingId)
          .eq('notification_type', notificationType);
      } catch (logError) {
        console.error('Failed to log notification failure:', logError);
      }
    }
  }

  return { emailSent, smsSent };
};

// ENHANCED: Scheduled notification checker med timezone-säkerhet
export const processScheduledNotifications = async (): Promise<void> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ENHANCED: Use Swedish timezone for all calculations
    const nowSwedish = new Date();
    const nowUTC = fromSwedishTime(nowSwedish);
    
    // 24h reminders - Check for bookings starting tomorrow
    const tomorrow = new Date(nowUTC.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowWindow = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000); // 2-hour window
    
    const { data: upcomingBookings, error: upcomingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_resources(name, location, booking_instructions),
        handbook_members(name, email, phone),
        handbooks(name)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', tomorrow.toISOString())
      .lte('start_time', tomorrowWindow.toISOString())
      .is('reminder_24h_sent', null);

    if (upcomingError) {
      console.error('Error fetching upcoming bookings:', upcomingError);
    } else {
      for (const booking of upcomingBookings || []) {
        try {
          await sendBookingNotification('reminder_24h', {
            bookingId: booking.id,
            memberEmail: booking.handbook_members.email,
            memberPhone: booking.handbook_members.phone,
            memberName: booking.handbook_members.name,
            resourceName: booking.booking_resources.name,
            resourceLocation: booking.booking_resources.location,
            startTime: new Date(booking.start_time),
            endTime: new Date(booking.end_time),
            purpose: booking.purpose,
            handbookName: booking.handbooks.name,
            handbookId: booking.handbook_id,
            bookingRules: booking.booking_resources.booking_instructions
          });

          // Mark as sent
          await supabase
            .from('bookings')
            .update({ reminder_24h_sent: nowUTC.toISOString() })
            .eq('id', booking.id);
        } catch (error) {
          console.error(`Failed to send 24h reminder for booking ${booking.id}:`, error);
        }
      }
    }

    // 2h reminders - Check for bookings starting in 2 hours
    const twoHoursFromNow = new Date(nowUTC.getTime() + 2 * 60 * 60 * 1000);
    const twoHourWindow = new Date(twoHoursFromNow.getTime() + 30 * 60 * 1000); // 30-min window
    
    const { data: soonBookings, error: soonError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_resources(name, location, access_instructions),
        handbook_members(name, email, phone),
        handbooks(name)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', twoHoursFromNow.toISOString())
      .lte('start_time', twoHourWindow.toISOString())
      .is('reminder_2h_sent', null);

    if (soonError) {
      console.error('Error fetching soon bookings:', soonError);
    } else {
      for (const booking of soonBookings || []) {
        try {
          await sendBookingNotification('reminder_2h', {
            bookingId: booking.id,
            memberEmail: booking.handbook_members.email,
            memberPhone: booking.handbook_members.phone,
            memberName: booking.handbook_members.name,
            resourceName: booking.booking_resources.name,
            resourceLocation: booking.booking_resources.location,
            startTime: new Date(booking.start_time),
            endTime: new Date(booking.end_time),
            handbookName: booking.handbooks.name,
            handbookId: booking.handbook_id,
            accessCode: booking.access_code
          });

          // Mark as sent
          await supabase
            .from('bookings')
            .update({ reminder_2h_sent: nowUTC.toISOString() })
            .eq('id', booking.id);
        } catch (error) {
          console.error(`Failed to send 2h reminder for booking ${booking.id}:`, error);
        }
      }
    }

    // ENHANCED: Cleanup old notifications
    try {
      await supabase.rpc('cleanup_old_notifications');
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }

    console.log(`Processed ${(upcomingBookings?.length || 0)} 24h reminders and ${(soonBookings?.length || 0)} 2h reminders`);

  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
  }
};

export default {
  NotificationTemplates,
  renderTemplate,
  sendBookingNotification,
  processScheduledNotifications
};