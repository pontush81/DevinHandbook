import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);



async function sendNotificationDirect(type: 'new_topic' | 'new_reply', data: any) {
  try {
    console.log('🔔 [sendNotificationDirect] START - Processing notification:', { 
      type, 
      handbook_id: data.handbook_id, 
      topic_id: data.topic_id,
      post_id: data.post_id,
      author_id: data.author_id 
    });

    const supabase = getServiceSupabase();
    const { handbook_id, topic_id, post_id, author_id, author_name, content_preview } = data;

    // Get handbook details with retry logic
    let handbook, topic;
    
    try {
      const { data: handbookData, error: handbookError } = await supabase
        .from('handbooks')
        .select('title, slug')
        .eq('id', handbook_id)
        .single();

      if (handbookError || !handbookData) {
        console.error('[Replies] Handbook not found:', handbookError);
        return;
      }
      handbook = handbookData;
    } catch (error) {
      console.error('[Replies] Database error fetching handbook:', error);
      return;
    }

    // Get topic details with retry logic
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select('title, author_id')
        .eq('id', topic_id)
        .single();

      if (topicError || !topicData) {
        console.error('[Replies] Topic not found:', topicError);
        // Try a brief retry in case of timing issues
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retryTopicData, error: retryTopicError } = await supabase
          .from('forum_topics')
          .select('title, author_id')
          .eq('id', topic_id)
          .single();
          
        if (retryTopicError || !retryTopicData) {
          console.error('[Replies] Topic still not found after retry:', retryTopicError);
          return;
        }
        topic = retryTopicData;
      } else {
        topic = topicData;
      }
    } catch (error) {
      console.error('[Replies] Database error fetching topic:', error);
      return;
    }

    // Get all members of the handbook with their notification preferences
    const { data: members, error: membersError } = await supabase
      .from('handbook_members')
      .select('user_id')
      .eq('handbook_id', handbook_id);

    if (membersError || !members) {
      console.error('[Replies] Failed to get members:', membersError);
      return;
    }

    // Get user details and preferences for each member
    let enrichedMembers: any[] = [];
    
    for (const member of members) {
      // Get user notification preferences first
      const { data: preferences } = await supabase
        .from('user_notification_preferences')
        .select('email_new_topics, email_new_replies, email_mentions, app_new_topics, app_new_replies, app_mentions')
        .eq('user_id', member.user_id)
        .eq('handbook_id', handbook_id)
        .single();

      // Try to get user email from handbook_members table if we have it there, or we'll skip email for now
      // Since we can't easily access auth.users from server functions, we'll work with what we have
      // For now, let's use the author_email from posts to identify users who participated
      
      enrichedMembers.push({
        user_id: member.user_id,
        preferences: preferences || {
          email_new_topics: true,
          email_new_replies: true, 
          email_mentions: true,
          app_new_topics: true,
          app_new_replies: true,
          app_mentions: true
        }
      });
    }

    let notificationRecipients: any[] = [];
    
    if (type === 'new_reply') {
      // Use provided author_id or fall back to database lookup
      let replyAuthorId = author_id;
      
      if (!replyAuthorId) {
        console.log('[Replies] No author_id provided, looking up in database...');
        // Get reply author ID with retry logic for timing issues
        let replyData;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          const { data, error } = await supabase
            .from('forum_posts')
            .select('author_id')
            .eq('id', post_id)
            .single();

          if (!error && data) {
            replyData = data;
            break;
          }
          
          retryCount++;
          console.log(`[Replies] Reply not found on attempt ${retryCount}, retrying...`, error);
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Exponential backoff
          }
        }

        if (!replyData) {
          console.error('[Replies] Reply not found after', maxRetries, 'attempts for post_id:', post_id);
          return;
        }
        
        replyAuthorId = replyData.author_id;
      } else {
        console.log('[Replies] Using provided author_id:', replyAuthorId);
      }

      // Get all unique participants in this topic
      const { data: participants, error: participantsError } = await supabase
        .from('forum_posts')
        .select('author_id')
        .eq('topic_id', topic_id);

      if (participantsError) {
        console.error('[Replies] Failed to get participants:', participantsError);
        return;
      }

      // Create set of unique participants - ALWAYS include the topic author
      const uniqueParticipants = new Set([topic.author_id]);
      
      // Add all other participants who have replied
      participants?.forEach(p => {
        uniqueParticipants.add(p.author_id);
      });

      // Remove the current reply author (they don't need notification of their own reply)
      uniqueParticipants.delete(replyAuthorId);

      console.log('[Replies] Participants to notify:', Array.from(uniqueParticipants));

      // Get email addresses for all participants from auth.users via RPC
      const { data: userEmails, error: emailError } = await supabase
        .rpc('get_user_emails_by_ids', { user_ids: Array.from(uniqueParticipants) });

      let userEmailMap = new Map();

      if (emailError) {
        console.error('[Replies] Failed to get user emails via RPC:', emailError);
        console.log('[Replies] Trying fallback method...');
        
        // Fallback: Use development email for testing
        console.log('🔔 [sendNotificationDirect] NODE_ENV check:', { 
          NODE_ENV: process.env.NODE_ENV, 
          isNotProduction: process.env.NODE_ENV !== 'production' 
        });
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔔 [sendNotificationDirect] Development mode: Using test email for all participants');
          console.log('🔔 [sendNotificationDirect] Participants before mapping:', Array.from(uniqueParticipants));
          Array.from(uniqueParticipants).forEach(userId => {
            userEmailMap.set(userId, 'pontus.hberg@gmail.com');
            console.log('🔔 [sendNotificationDirect] Mapped user', userId, 'to pontus.hberg@gmail.com');
          });
        } else {
          // Production fallback: try to get emails from forum_posts.author_email where available
          const { data: fallbackEmails } = await supabase
            .from('forum_posts')
            .select('author_id, author_email')
            .eq('topic_id', topic_id)
            .not('author_email', 'is', null);

          // Also try to get the topic author's email
          const { data: topicData } = await supabase
            .from('forum_topics')
            .select('author_id, author_email')
            .eq('id', topic_id)
            .single();

          // Build email map from fallback data
          if (topicData?.author_email) {
            userEmailMap.set(topicData.author_id, topicData.author_email);
          }
          
          fallbackEmails?.forEach((post: any) => {
            if (post.author_email) {
              userEmailMap.set(post.author_id, post.author_email);
            }
          });
        }

        console.log('[Replies] Fallback method found', userEmailMap.size, 'email addresses');
      } else {
        console.log('[Replies] User emails found via RPC:', userEmails?.length || 0);
        
        // Create email map from RPC results
        userEmails?.forEach((user: any) => {
          if (user.email) {
            userEmailMap.set(user.id, user.email);
          }
        });
      }

      notificationRecipients = enrichedMembers
        .filter(member => 
          uniqueParticipants.has(member.user_id) &&
          userEmailMap.has(member.user_id)
        )
        .map(member => ({
          email: userEmailMap.get(member.user_id),
          userId: member.user_id,
          preferences: member.preferences,
          shouldCreateAppNotification: member.preferences?.app_new_replies !== false,
          shouldSendEmail: member.preferences?.email_new_replies !== false
        }));
    }

    console.log('🔔 [sendNotificationDirect] Processing', notificationRecipients.length, 'recipients');
    console.log('🔔 [sendNotificationDirect] Recipients details:', notificationRecipients.map(r => ({ 
      email: r.email, 
      shouldSendEmail: r.shouldSendEmail,
      userId: r.userId
    })));

    // Create in-app notifications first
    for (const recipient of notificationRecipients.filter(r => r.shouldCreateAppNotification)) {
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
        console.error('[Replies] Failed to create app notification for:', recipient.email, error);
      }
    }

    // Send emails to those who want them
    const emailRecipients = notificationRecipients.filter(r => r.shouldSendEmail);
    
    console.log('📧 [sendNotificationDirect] Email recipients:', emailRecipients.length);
    console.log('📧 [sendNotificationDirect] Email recipients list:', emailRecipients.map(r => r.email));
    
    if (emailRecipients.length > 0) {
      const subject = `Nytt svar på: ${topic.title}`;
      const messageUrl = `https://${handbook.slug}.${process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000'}/meddelanden`;
      const fromEmail = `${handbook.title} <noreply@${process.env.RESEND_DOMAIN || 'yourdomain.com'}>`;

      console.log('[Replies] Sending emails from:', fromEmail);
      console.log('[Replies] Message URL:', messageUrl);
      console.log('[Replies] Subject:', subject);

      for (const recipient of emailRecipients) {
        try {
          console.log('📧 [sendNotificationDirect] Sending email to:', recipient.email);
          console.log('📧 [sendNotificationDirect] Email details:', { 
            from: fromEmail, 
            subject: subject,
            messageUrl: messageUrl 
          });
          
          const emailResult = await resend.emails.send({
            from: fromEmail,
            to: recipient.email,
            subject: subject,
            html: `
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
              </div>
            `
          });
          
          console.log('✅ [sendNotificationDirect] Email sent successfully:', {
            emailId: emailResult?.data?.id || 'no-id',
            recipient: recipient.email,
            hasError: !!emailResult?.error
          });
          
          if (emailResult?.error) {
            console.error('❌ [sendNotificationDirect] Resend API error:', emailResult.error);
          }
          
          // Mark as email sent
          await supabase
            .from('forum_notifications')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .eq('topic_id', topic_id)
            .eq('notification_type', type)
            .eq('recipient_id', recipient.userId)
            .is('post_id', post_id || null);
            
        } catch (error) {
          console.error('[Replies] Failed to send email to:', recipient.email, error);
        }
      }
    }

    console.log('🏁 [sendNotificationDirect] Notification processing complete successfully');
  } catch (error) {
    console.error('❌ [sendNotificationDirect] FATAL ERROR in notification processing:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
      data: { 
        handbook_id: data?.handbook_id, 
        topic_id: data?.topic_id, 
        post_id: data?.post_id,
        author_id: data?.author_id,
        type 
      }
    });
    
    // Don't let notification errors crash anything
    // The reply was already created successfully
  }
}

// GET /api/messages/replies?topic_id=xxx&show_all=true - Fetch replies for a topic
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    console.log('🔐 [Messages/Replies GET] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Messages/Replies GET] Authentication failed - no userId found');
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att läsa svar' },
        { status: 401 }
      );
    }

    console.log('✅ [Messages/Replies GET] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    const userId = authResult.userId;

    const url = new URL(request.url);
    const topicId = url.searchParams.get('topic_id');
    const showAll = url.searchParams.get('show_all') === 'true';

    if (!topicId) {
      return NextResponse.json(
        { error: 'topic_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 2. Verify user has access to the handbook containing this topic
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('handbook_id')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    // Check user access to the handbook
    // First check if user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', topic.handbook_id)
      .eq('user_id', userId)
      .maybeSingle();

    let hasAccess = false;
    if (!memberError && memberData) {
      // User is a member - grant access
      hasAccess = true;
    } else {
      // If not a member, check if handbook is published/public
      const { data: handbookData, error: handbookError } = await supabase
        .from('handbooks')
        .select('published')
        .eq('id', topic.handbook_id)
        .single();
        
      if (!handbookError && handbookData?.published) {
        // Handbook is published - grant access to logged-in users
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att läsa detta meddelande' },
        { status: 403 }
      );
    }

    // 3. Count total replies for this topic
    const { count } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topicId)
      .neq('id', topicId)
      .eq('is_published', true);

    const totalCount = count || 0;
    const REPLY_LIMIT = 15; // Show 15 most recent replies by default
    const showingRecent = totalCount > REPLY_LIMIT && !showAll;

    // 4. Fetch replies for the topic
    let query = supabase
      .from('forum_posts')
      .select(`
        id,
        content,
        author_name,
        author_id,
        created_at,
        reply_to_post_id
      `)
      .eq('topic_id', topicId)
      .neq('id', topicId) // Exclude the original topic post
      .eq('is_published', true)
      .order('created_at', { ascending: true }); // Chronological order

    // Limit to most recent if not showing all
    if (!showAll && totalCount > REPLY_LIMIT) {
      // Get the most recent by using a subquery approach
      const { data: recentIds } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('topic_id', topicId)
        .neq('id', topicId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(REPLY_LIMIT);

      if (recentIds && recentIds.length > 0) {
        const ids = recentIds.map(r => r.id);
        query = query.in('id', ids);
      }
    }

    const { data: replies, error } = await query;

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json(
        { error: 'Kunde inte hämta svar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      replies: replies || [],
      total_count: totalCount,
      showing_recent: showingRecent
    });
  } catch (error) {
    console.error('Error in GET /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

// POST /api/messages/replies - Create a new reply
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    console.log('🔐 [Messages/Replies POST] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Messages/Replies POST] Authentication failed - no userId found');
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att svara' },
        { status: 401 }
      );
    }

    console.log('✅ [Messages/Replies POST] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    const userId = authResult.userId;

    const body = await request.json();
    const { topic_id, content, author_name } = body;

    // 2. Validate required fields
    if (!topic_id || !content || !author_name) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 3. Verify user has access to the handbook containing this topic
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('handbook_id, is_locked, reply_count, title')
      .eq('id', topic_id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    if (topic.is_locked) {
      return NextResponse.json(
        { error: 'Detta meddelande är låst för nya svar' },
        { status: 403 }
      );
    }

    // Check user access to the handbook
    // First check if user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', topic.handbook_id)
      .eq('user_id', userId)
      .maybeSingle();

    let hasAccess = false;
    if (!memberError && memberData) {
      // User is a member - grant access
      hasAccess = true;
    } else {
      // If not a member, check if handbook is published/public
      const { data: handbookData, error: handbookError } = await supabase
        .from('handbooks')
        .select('published')
        .eq('id', topic.handbook_id)
        .single();
        
      if (!handbookError && handbookData?.published) {
        // Handbook is published - grant access to logged-in users
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att svara på detta meddelande' },
        { status: 403 }
      );
    }

    // 4. Create the reply
    const { data: reply, error: replyError } = await supabase
      .from('forum_posts')
      .insert({
        topic_id,
        handbook_id: topic.handbook_id,
        content: content.trim(),
        author_id: userId,
        author_name: author_name.trim(),
        author_email: authResult.userEmail || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error creating reply:', replyError);
      return NextResponse.json(
        { error: 'Kunde inte skapa svaret' },
        { status: 500 }
      );
    }

    // 5. Update topic reply count using direct calculation
    const newReplyCount = (topic.reply_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('forum_topics')
      .update({ 
        reply_count: newReplyCount,
        last_reply_at: new Date().toISOString()
      })
      .eq('id', topic_id);

    if (updateError) {
      console.error('Error updating topic reply count:', updateError);
      // Don't fail the whole operation for this
    }

    // 6. Send notification asynchronously (don't block the response)
    // Use setTimeout instead of setImmediate for better stability
    console.log('🔔 [Replies POST] About to schedule notification for reply:', reply.id);
    setTimeout(async () => {
      console.log('🔔 [Replies POST] Notification timeout fired, calling sendNotificationDirect...');
      try {
        await sendNotificationDirect('new_reply', {
          type: 'new_reply',
          handbook_id: topic.handbook_id,
          topic_id: topic_id,
          post_id: reply.id,
          author_id: userId, // Pass author_id directly to avoid database lookup
          author_name: author_name.trim(),
          content_preview: content.trim()
        });
        console.log('✅ [Replies POST] Notification completed successfully');
      } catch (error) {
        console.error('❌ [Replies POST] Notification failed but reply was created successfully:', error);
      }
    }, 1000); // 1 second delay to ensure database consistency

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        content: reply.content,
        author_name: reply.author_name,
        created_at: reply.created_at
      }
    });
  } catch (error) {
    console.error('Error in POST /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/replies?reply_id=xxx - Delete a specific reply
export async function DELETE(request: NextRequest) {
  try {
    // 1. Check authentication
    console.log('🔐 [Messages/Replies DELETE] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Messages/Replies DELETE] Authentication failed - no userId found');
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att radera svar' },
        { status: 401 }
      );
    }

    console.log('✅ [Messages/Replies DELETE] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    const userId = authResult.userId;

    const url = new URL(request.url);
    const replyId = url.searchParams.get('reply_id');

    if (!replyId) {
      return NextResponse.json(
        { error: 'reply_id krävs' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 2. Get the reply with its topic to check access and ownership
    const { data: replyData, error: replyError } = await supabase
      .from('forum_posts')
      .select(`
        id,
        author_id,
        topic_id,
        forum_topics!inner(handbook_id)
      `)
      .eq('id', replyId)
      .single();

    if (replyError || !replyData) {
      return NextResponse.json(
        { error: 'Svaret hittades inte' },
        { status: 404 }
      );
    }

    // 3. Check user has access to the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id, role')
      .eq('handbook_id', replyData.forum_topics.handbook_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att komma åt denna handbok' },
        { status: 403 }
      );
    }

    // 4. Check if user is author or admin
    const isAuthor = replyData.author_id === userId;
    const isAdmin = memberData.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Du kan bara radera dina egna svar eller vara admin' },
        { status: 403 }
      );
    }

    // 5. Delete the reply
    const { error: deleteError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', replyId);

    if (deleteError) {
      console.error('Error deleting reply:', deleteError);
      return NextResponse.json(
        { error: 'Kunde inte radera svaret' },
        { status: 500 }
      );
    }

    // 6. Update the reply count on the topic
    const { data: topicData, error: topicError } = await supabase
      .from('forum_topics')
      .select('reply_count')
      .eq('id', replyData.topic_id)
      .single();

    if (!topicError && topicData) {
      const newReplyCount = Math.max(0, (topicData.reply_count || 1) - 1);
      
      await supabase
        .from('forum_topics')
        .update({ reply_count: newReplyCount })
        .eq('id', replyData.topic_id);
    }

    return NextResponse.json({ 
      message: 'Svaret har raderats',
      topic_id: replyData.topic_id 
    });

  } catch (error) {
    console.error('Error in DELETE /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 