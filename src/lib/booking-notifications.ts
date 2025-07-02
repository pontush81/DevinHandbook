// =============================================
// BOOKING NOTIFICATIONS SYSTEM
// Automated email/SMS reminders and notifications
// =============================================

import { createClient } from '@supabase/supabase-js'

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

// Main notification sending function
export const sendBookingNotification = async (
  notificationType: keyof typeof NotificationTemplates,
  bookingData: {
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

  // Prepare template data
  const templateData = {
    memberName: bookingData.memberName,
    resourceName: bookingData.resourceName,
    location: bookingData.resourceLocation,
    date: bookingData.startTime.toLocaleDateString('sv-SE'),
    startTime: bookingData.startTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    endTime: bookingData.endTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    purpose: bookingData.purpose,
    cleaningFee: bookingData.cleaningFee,
    handbookName: bookingData.handbookName,
    accessCode: bookingData.accessCode,
    noShowCount: bookingData.noShowCount,
    bookingRules: bookingData.bookingRules,
    cancellationDeadline: new Date(bookingData.startTime.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'),
    suspended: bookingData.noShowCount && bookingData.noShowCount >= 3
  };

  // Send email
  const emailSubject = renderTemplate(template.subject, templateData);
  const emailBody = renderTemplate(template.emailBody, templateData);
  const emailSent = await sendEmail(
    bookingData.memberEmail,
    emailSubject,
    emailBody,
    bookingData.handbookId
  );

  // Send SMS if template and phone number available
  let smsSent = false;
  if (template.smsBody && bookingData.memberPhone) {
    const smsBody = renderTemplate(template.smsBody, templateData);
    smsSent = await sendSMS(
      bookingData.memberPhone,
      smsBody,
      bookingData.handbookId
    );
  }

  return { emailSent, smsSent };
};

// Scheduled notification checker (run via cron job)
export const processScheduledNotifications = async (): Promise<void> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const now = new Date();
    
    // 24h reminders
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_resources(name, location, booking_instructions),
        handbook_members(name, email, phone),
        handbooks(name)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', tomorrow.toISOString())
      .lte('start_time', new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString()) // 1-hour window
      .is('reminder_24h_sent', null);

    for (const booking of upcomingBookings || []) {
      await sendBookingNotification('reminder_24h', {
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
        .update({ reminder_24h_sent: now.toISOString() })
        .eq('id', booking.id);
    }

    // 2h reminders
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const { data: soonBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_resources(name, location, access_instructions),
        handbook_members(name, email, phone),
        handbooks(name)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', twoHoursFromNow.toISOString())
      .lte('start_time', new Date(twoHoursFromNow.getTime() + 30 * 60 * 1000).toISOString()) // 30-min window
      .is('reminder_2h_sent', null);

    for (const booking of soonBookings || []) {
      await sendBookingNotification('reminder_2h', {
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
        .update({ reminder_2h_sent: now.toISOString() })
        .eq('id', booking.id);
    }

    console.log(`Processed ${(upcomingBookings?.length || 0) + (soonBookings?.length || 0)} notification(s)`);

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