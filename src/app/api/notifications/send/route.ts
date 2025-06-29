import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationRequest {
  type: 'new_topic' | 'new_reply';
  handbook_id: string;
  topic_id: string;
  post_id?: string;
  author_name: string;
  content_preview: string;
  title?: string;
}

interface EmailRecipient {
  email: string;
  userId: string;
  preferences: any;
  shouldCreateAppNotification: boolean;
  shouldSendEmail: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Add debugging
    const authHeader = request.headers.get('authorization');
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasWebhookSecret = !!process.env.SUPABASE_WEBHOOK_SECRET;
    
    console.log('[Notification] Debug auth:', {
      authHeaderExists: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      hasServiceKey,
      hasWebhookSecret,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    });

    // Verify authentication - acceptera både webhook secret och service role key
    const expectedWebhookAuth = `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`;
    const expectedServiceAuth = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    
    if (!authHeader || (authHeader !== expectedWebhookAuth && authHeader !== expectedServiceAuth)) {
      console.error('[Notification] Invalid authentication - Details:', {
        received: authHeader,
        expectedServiceAuth: expectedServiceAuth ? expectedServiceAuth.substring(0, 20) + '...' : 'none',
        expectedWebhookAuth: expectedWebhookAuth ? expectedWebhookAuth.substring(0, 20) + '...' : 'none'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: NotificationRequest = await request.json();
    const { type, handbook_id, topic_id, post_id, author_name, content_preview, title } = payload;

    console.log('[Notification] Processing notification:', { type, handbook_id, topic_id });

    const supabase = getServiceSupabase();

    // Get handbook details
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('title, slug')
      .eq('id', handbook_id)
      .single();

    if (handbookError || !handbook) {
      console.error('[Notification] Handbook not found:', handbookError);
      return NextResponse.json({ error: 'Handbook not found' }, { status: 404 });
    }

    // Get topic details
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('title, author_id')
      .eq('id', topic_id)
      .single();

    if (topicError || !topic) {
      console.error('[Notification] Topic not found:', topicError);
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Get all members of the handbook
    const { data: handbookMembers, error: membersError } = await supabase
      .from('handbook_members')
      .select('user_id')
      .eq('handbook_id', handbook_id);

    if (membersError || !handbookMembers) {
      console.error('[Notification] Failed to get members:', membersError);
      return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
    }

    console.log('[Notification] Found', handbookMembers.length, 'members in handbook');

    // For now, let's create a simpler approach that doesn't require complex user lookups
    // We'll use a placeholder email system that works with existing members
    const members = handbookMembers.map(member => ({
      user_id: member.user_id,
      email: 'pontus.hberg@gmail.com', // Placeholder - use your email for testing
      name: 'Test User',
      preferences: null // Default preferences
    }));

    console.log('[Notification] Found', members.length, 'members (using placeholder emails for testing)');

    let notificationRecipients: EmailRecipient[] = [];
    
    if (type === 'new_topic') {
      // Notify all members except the author who have email_new_topics enabled
      notificationRecipients = members
        .filter(member => 
          member.user_id !== topic.author_id &&
          member.email
        )
        .map(member => {
          return {
            email: member.email,
            userId: member.user_id,
            preferences: member.preferences,
            shouldCreateAppNotification: member.preferences?.app_new_topics !== false,
            shouldSendEmail: member.preferences?.email_new_topics !== false
          };
        });
    } else if (type === 'new_reply') {
      // Notify topic author and all previous participants except the current reply author
      const { data: replyData, error: replyError } = await supabase
        .from('forum_posts')
        .select('author_id')
        .eq('id', post_id)
        .single();

      if (replyError || !replyData) {
        console.error('[Notification] Reply not found:', replyError);
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
      }

      // Get all unique participants in this topic
      const { data: participants, error: participantsError } = await supabase
        .from('forum_posts')
        .select('author_id')
        .eq('topic_id', topic_id);

      if (participantsError) {
        console.error('[Notification] Failed to get participants:', participantsError);
      }

      const uniqueParticipants = new Set([
        topic.author_id,
        ...(participants?.map(p => p.author_id) || [])
      ]);

      // Remove the current reply author
      uniqueParticipants.delete(replyData.author_id);

      notificationRecipients = members
        .filter(member => 
          uniqueParticipants.has(member.user_id) &&
          member.email
        )
        .map(member => {
          return {
            email: member.email,
            userId: member.user_id,
            preferences: member.preferences,
            shouldCreateAppNotification: member.preferences?.app_new_replies !== false,
            shouldSendEmail: member.preferences?.email_new_replies !== false
          };
        });
    }

    console.log('[Notification] Processing', notificationRecipients.length, 'recipients');

    // Create in-app notifications first
    const appNotificationPromises = notificationRecipients
      .filter(recipient => recipient.shouldCreateAppNotification)
      .map(async (recipient) => {
        try {
          await supabase
            .from('forum_notifications')
            .insert({
              recipient_id: recipient.userId,
              topic_id: topic_id,
              post_id: post_id,
              notification_type: type,
              is_read: false,
              email_sent: false
            });
        } catch (error) {
          console.error('[Notification] Failed to create app notification for:', recipient.email, error);
        }
      });

    await Promise.allSettled(appNotificationPromises);

    // Filter recipients who want email notifications
    const emailRecipients = notificationRecipients.filter(recipient => recipient.shouldSendEmail);
    const skippedCount = notificationRecipients.length - emailRecipients.length;

    console.log('[Notification] Sending emails to', emailRecipients.length, 'recipients, skipping', skippedCount);

    if (emailRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: skippedCount,
        failed: 0,
        total: notificationRecipients.length
      });
    }

    // Prepare common email data
    const subject = type === 'new_topic' 
      ? `Nytt meddelande: ${title || topic.title}`
      : `Nytt svar på: ${topic.title}`;

    // Create direct link to the specific topic with redirect handling
    const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
    const messageUrl = `https://${handbook.slug}.${baseUrl}/meddelanden?topic=${topic_id}&redirect_after_login=true`;
    const fromEmail = `${handbook.title} <noreply@${process.env.RESEND_DOMAIN || 'yourdomain.com'}>`;
    
    // Common reply-to address for better email management
    const replyToEmail = `no-reply@${process.env.RESEND_DOMAIN || 'yourdomain.com'}`;

    const emailContent = type === 'new_topic'
      ? `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Nytt meddelande</h1>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #2563eb; margin-top: 0;">${title || topic.title}</h2>
            <p><strong>${author_name}</strong> har skapat ett nytt meddelande i <strong>${handbook.title}</strong>:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 0; line-height: 1.5;">${content_preview.substring(0, 200)}${content_preview.length > 200 ? '...' : ''}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${messageUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Läs meddelandet</a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Detta e-postmeddelande skickades eftersom du är medlem i ${handbook.title}.</p>
            <p style="margin: 5px 0 0 0;">Du kan ändra dina notifikationsinställningar i handboken.</p>
          </div>
        </div>
      `
      : `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Nytt svar</h1>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #10b981; margin-top: 0;">${topic.title}</h2>
            <p><strong>${author_name}</strong> har svarat på en diskussion du deltar i:</p>
            <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="margin: 0; line-height: 1.5;">${content_preview.substring(0, 200)}${content_preview.length > 200 ? '...' : ''}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${messageUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Läs svaret</a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Detta e-postmeddelande skickades eftersom du deltar i denna diskussion.</p>
            <p style="margin: 5px 0 0 0;">Du kan ändra dina notifikationsinställningar i handboken.</p>
          </div>
        </div>
      `;

    let emailResults;
    let successful = 0;
    let failed = 0;

    try {
      if (emailRecipients.length === 1) {
        // Send single email for better error handling
        const recipient = emailRecipients[0];
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject: subject,
          html: emailContent,
          reply_to: replyToEmail,
          tags: [
            { name: 'type', value: type },
            { name: 'handbook', value: handbook_id },
            { name: 'topic', value: topic_id }
          ]
        });

        successful = emailResult.data ? 1 : 0;
        failed = emailResult.data ? 0 : 1;

        if (emailResult.data) {
          console.log('[Notification] Single email sent to:', recipient.email, 'ID:', emailResult.data.id);
        }
      } else {
        // Use batch sending for multiple recipients (up to 100)
        const batchEmails = emailRecipients.map(recipient => ({
          from: fromEmail,
          to: recipient.email,
          subject: subject,
          html: emailContent,
          reply_to: replyToEmail,
          tags: [
            { name: 'type', value: type },
            { name: 'handbook', value: handbook_id },
            { name: 'topic', value: topic_id }
          ]
        }));

        // Split into chunks of 100 (Resend's batch limit)
        const chunks = [];
        for (let i = 0; i < batchEmails.length; i += 100) {
          chunks.push(batchEmails.slice(i, i + 100));
        }

        console.log('[Notification] Sending', chunks.length, 'batch(es) with total', batchEmails.length, 'emails');

        for (const chunk of chunks) {
          try {
            const batchResult = await resend.batch.send(chunk);
            
            if (batchResult.data) {
              successful += batchResult.data.length;
              console.log('[Notification] Batch sent successfully:', batchResult.data.length, 'emails');
            } else {
              failed += chunk.length;
              console.error('[Notification] Batch send failed for chunk of', chunk.length, 'emails');
            }
          } catch (error) {
            failed += chunk.length;
            console.error('[Notification] Batch send error for chunk:', error);
          }
        }
      }

      // Update notifications with email sent status
      if (successful > 0) {
        const emailRecipientIds = emailRecipients.slice(0, successful).map(r => r.userId);
        
        await supabase
          .from('forum_notifications')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString()
          })
          .eq('topic_id', topic_id)
          .eq('notification_type', type)
          .is('post_id', post_id || null)
          .in('recipient_id', emailRecipientIds);
      }

    } catch (error) {
      console.error('[Notification] Email sending failed:', error);
      failed = emailRecipients.length;
      successful = 0;
    }

    console.log('[Notification] Results:', { successful, skipped: skippedCount, failed, total: notificationRecipients.length });

    return NextResponse.json({
      success: true,
      sent: successful,
      skipped: skippedCount,
      failed: failed,
      total: notificationRecipients.length
    });

  } catch (error) {
    console.error('[Notification] Error processing notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 