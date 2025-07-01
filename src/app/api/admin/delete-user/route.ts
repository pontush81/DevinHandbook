import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("🔥 DELETE USER REQUEST RECEIVED");
    
    // Använd service role för admin-operationer
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Använd vanlig klient för vanliga operationer
    const supabase = createRouteHandlerClient({ cookies });
    
    // Läs request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      console.error("❌ Inget email angivet");
      return NextResponse.json({ error: 'Email krävs' }, { status: 400 });
    }

    console.log("📧 Attempting to delete user:", { email });

    // Hämta användaren från auth med admin-klient
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error("Fel vid hämtning av användare:", listUsersError);
      return NextResponse.json({ 
        error: 'Kunde inte hämta användarlista från auth' 
      }, { status: 500 });
    }

    const targetUser = users.find(user => user.email === email);
    
    if (!targetUser) {
      console.error("❌ Användare hittades inte:", email);
      return NextResponse.json({ 
        error: 'Användare hittades inte' 
      }, { status: 404 });
    }

    console.log("✅ User found:", { userId: targetUser.id, email: targetUser.email });

    // STEP 1: Check if user exists in key tables before cleanup
    console.log("🔍 Checking which tables contain references to this user...");
    
    const checkTable = async (tableName: string, columnName: string) => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .eq(columnName, targetUser.id)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`📋 Found ${data.length} references in ${tableName}.${columnName}`);
          return true;
        }
        return false;
      } catch (exception) {
        console.log(`⚠️ Could not check ${tableName}: ${exception}`);
        return false;
      }
    };

    // Quick check of main tables
    const tableChecks = [
      { table: 'profiles', column: 'id' },
      { table: 'handbook_members', column: 'user_id' },
      { table: 'handbooks', column: 'owner_id' },
      { table: 'subscriptions', column: 'user_id' },
      { table: 'user_profiles', column: 'user_id' }
    ];

    for (const { table, column } of tableChecks) {
      await checkTable(table, column);
    }

    // SIMPLIFIED APPROACH: Batch delete med bättre error handling
    console.log("🧹 Starting comprehensive cleanup...");

    const cleanupResults = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Helper function för säker borttagning med SQL (kringgår RLS policies)
    const safeDeleteSQL = async (tableName: string, condition: { field: string, value: any }) => {
      try {
        console.log(`🗑️ SQL Deleting from ${tableName} where ${condition.field} = ${condition.value}`);
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `DELETE FROM ${tableName} WHERE ${condition.field} = $1`,
          params: [condition.value]
        });
        
        if (error) {
          console.warn(`⚠️ Could not delete from ${tableName}:`, error.message);
          cleanupResults.failed.push({ table: tableName, error: error.message });
        } else {
          console.log(`✅ Successfully deleted from ${tableName}`);
          cleanupResults.successful.push(tableName);
        }
      } catch (exception) {
        console.warn(`⚠️ Exception deleting from ${tableName}:`, exception);
        cleanupResults.failed.push({ table: tableName, error: String(exception) });
      }
    };

    // Helper function för säker uppdatering med SQL (kringgår RLS policies)
    const safeUpdateSQL = async (tableName: string, setClause: string, condition: { field: string, value: any }) => {
      try {
        console.log(`📝 SQL Updating ${tableName} set ${setClause} where ${condition.field} = ${condition.value}`);
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `UPDATE ${tableName} SET ${setClause} WHERE ${condition.field} = $1`,
          params: [condition.value]
        });
        
        if (error) {
          console.warn(`⚠️ Could not update ${tableName}:`, error.message);
          cleanupResults.failed.push({ table: `${tableName} (update)`, error: error.message });
        } else {
          console.log(`✅ Successfully updated ${tableName}`);
          cleanupResults.successful.push(`${tableName} (updated)`);
        }
      } catch (exception) {
        console.warn(`⚠️ Exception updating ${tableName}:`, exception);
        cleanupResults.failed.push({ table: `${tableName} (update)`, error: String(exception) });
      }
    };

    // Helper function för säker borttagning
    const safeDelete = async (tableName: string, condition: { field: string, value: any }) => {
      try {
        console.log(`🗑️ Deleting from ${tableName} where ${condition.field} = ${condition.value}`);
        const { error } = await supabaseAdmin
          .from(tableName)
          .delete()
          .eq(condition.field, condition.value);
        
        if (error) {
          console.warn(`⚠️ Could not delete from ${tableName}:`, error.message);
          cleanupResults.failed.push({ table: tableName, error: error.message });
        } else {
          console.log(`✅ Successfully deleted from ${tableName}`);
          cleanupResults.successful.push(tableName);
        }
      } catch (exception) {
        console.warn(`⚠️ Exception deleting from ${tableName}:`, exception);
        cleanupResults.failed.push({ table: tableName, error: String(exception) });
      }
    };

    // Helper function för säker uppdatering
    const safeUpdate = async (tableName: string, updateData: any, condition: { field: string, value: any }) => {
      try {
        console.log(`📝 Updating ${tableName} set ${JSON.stringify(updateData)} where ${condition.field} = ${condition.value}`);
        const { error } = await supabaseAdmin
          .from(tableName)
          .update(updateData)
          .eq(condition.field, condition.value);
        
        if (error) {
          console.warn(`⚠️ Could not update ${tableName}:`, error.message);
          cleanupResults.failed.push({ table: `${tableName} (update)`, error: error.message });
        } else {
          console.log(`✅ Successfully updated ${tableName}`);
          cleanupResults.successful.push(`${tableName} (update)`);
        }
      } catch (exception) {
        console.warn(`⚠️ Exception updating ${tableName}:`, exception);
        cleanupResults.failed.push({ table: `${tableName} (update)`, error: String(exception) });
      }
    };

    // DELETE tabeller (där vi tar bort hela poster)
    const tablesToDelete = [
      'handbook_members',
      'user_notification_preferences', 
      'profiles',
      'subscriptions',
      'user_profiles',
      'customer_lifecycle_actions',
      'customer_lifecycle_checks',
      'gdpr_deletion_requests',
      // MISSING TABLES THAT WERE CAUSING FOREIGN KEY CONSTRAINT ERRORS
      'account_status',
      'automated_actions_queue',
      'customer_lifecycle_events',
      'forum_notifications',
      'gdpr_exports',
      'trial_activities',
      'user_consents'
    ];

    // DELETE tabeller med korrekt kolumnnamn
    for (const table of tablesToDelete) {
      // Speciella kolumnnamn för olika tabeller
      let field = 'user_id'; // default
      if (table === 'profiles') {
        field = 'id';
      } else if (table === 'automated_actions_queue') {
        field = 'target_user_id';
      } else if (table === 'forum_notifications') {
        field = 'recipient_id';
      }
      
      await safeDelete(table, { field, value: targetUser.id });
    }

    // UPDATE tabeller (där vi sätter foreign keys till null)
    const tablesToUpdate = [
      { table: 'audit_logs', field: 'user_id' },
      { table: 'handbooks', field: 'owner_id' },
      { table: 'pages', field: 'author_id' },
      { table: 'forum_posts', field: 'last_reply_by' },
      { table: 'forum_posts', field: 'moderated_by' },
      { table: 'forum_replies', field: 'moderated_by' },
      { table: 'forum_topics', field: 'last_reply_by' },
      { table: 'forum_topics', field: 'moderated_by' },
      { table: 'gdpr_automated_deletion_requests', field: 'requested_by' },
      { table: 'gdpr_automated_deletion_requests', field: 'completed_by' },
      { table: 'gdpr_requests', field: 'processed_by' },
      { table: 'gdpr_data_processing_records', field: 'assigned_to' },
      { table: 'account_deletions', field: 'requested_by' },
      { table: 'account_deletions', field: 'completed_by' },
      { table: 'security_incidents', field: 'assigned_to' },
      { table: 'backup_history', field: 'created_by' }
    ];

    for (const { table, field } of tablesToUpdate) {
      await safeUpdate(table, { [field]: null }, { field, value: targetUser.id });
    }

    console.log("📊 Cleanup results:", cleanupResults);

    // STEP 3: Test auth deletion first to see exact constraint error
    console.log("🧪 Testing auth deletion to identify blocking constraints...");
    const { data: testAuthData, error: testAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
    
    if (testAuthError) {
      console.error("🚫 Auth deletion blocked - this tells us exactly what constraints exist:", {
        message: testAuthError.message,
        status: testAuthError.status,
        code: testAuthError.code
      });
      
      // Log the exact error to understand what's blocking
      if (testAuthError.message.includes('foreign key constraint')) {
        console.log("🔍 This is a foreign key constraint issue - proceeding with cleanup...");
      }
    } else {
      console.log("✅ Surprise! Auth deletion worked without cleanup!");
      return NextResponse.json({ 
        success: true, 
        message: 'User deleted successfully',
        data: testAuthData 
      });
    }

    // STEP 4: Since auth deletion failed, try systematic cleanup with service role admin
    console.log("🚀 Starting systematic cleanup with service role admin (should bypass RLS)...");
    
    try {
      // Helper function för service role admin operations (bypass RLS)
      const adminDelete = async (tableName: string, condition: { field: string, value: any }) => {
        try {
          console.log(`🗑️ Admin deleting from ${tableName} where ${condition.field} = ${condition.value}`);
          const { error } = await supabaseAdmin
            .from(tableName)
            .delete()
            .eq(condition.field, condition.value);
          
          if (error) {
            console.warn(`⚠️ Admin delete failed for ${tableName}:`, error.message);
          } else {
            console.log(`✅ Admin delete successful for ${tableName}`);
          }
        } catch (exception) {
          console.warn(`⚠️ Admin delete exception for ${tableName}:`, exception);
        }
      };

      const adminUpdate = async (tableName: string, updateData: any, condition: { field: string, value: any }) => {
        try {
          console.log(`📝 Admin updating ${tableName} set ${JSON.stringify(updateData)} where ${condition.field} = ${condition.value}`);
          const { error } = await supabaseAdmin
            .from(tableName)
            .update(updateData)
            .eq(condition.field, condition.value);
          
          if (error) {
            console.warn(`⚠️ Admin update failed for ${tableName}:`, error.message);
          } else {
            console.log(`✅ Admin update successful for ${tableName}`);
          }
        } catch (exception) {
          console.warn(`⚠️ Admin update exception for ${tableName}:`, exception);
        }
      };
      
      // Steg för steg rensning med service role admin
      console.log("🧹 Starting comprehensive cleanup with admin privileges...");
      
      // DELETE tabeller (där vi tar bort hela poster)
      await adminDelete('handbook_members', { field: 'user_id', value: targetUser.id });
      await adminDelete('user_notification_preferences', { field: 'user_id', value: targetUser.id });
      await adminDelete('subscriptions', { field: 'user_id', value: targetUser.id });
      await adminDelete('user_profiles', { field: 'user_id', value: targetUser.id });
      await adminDelete('customer_lifecycle_actions', { field: 'target_user_id', value: targetUser.id });
      await adminDelete('customer_lifecycle_checks', { field: 'user_id', value: targetUser.id });
      await adminDelete('gdpr_deletion_requests', { field: 'user_id', value: targetUser.id });
      await adminDelete('account_status', { field: 'user_id', value: targetUser.id });
      await adminDelete('automated_actions_queue', { field: 'target_user_id', value: targetUser.id });
      await adminDelete('customer_lifecycle_events', { field: 'user_id', value: targetUser.id });
      await adminDelete('forum_notifications', { field: 'recipient_id', value: targetUser.id });
      await adminDelete('gdpr_exports', { field: 'user_id', value: targetUser.id });
      await adminDelete('trial_activities', { field: 'user_id', value: targetUser.id });
      await adminDelete('user_consents', { field: 'user_id', value: targetUser.id });
      await adminDelete('profiles', { field: 'id', value: targetUser.id }); // Special case
      
      // CRITICAL DELETIONS THAT WERE BLOCKING AUTH DELETION
      await adminDelete('account_deletions', { field: 'user_id', value: targetUser.id });
      await adminDelete('gdpr_requests', { field: 'user_id', value: targetUser.id });
      
      // ANONYMIZE FORUM CONTENT (preserving discussions while removing personal connection)
      console.log("🕶️ Anonymizing forum content to preserve discussions...");
      await adminUpdate('forum_posts', 
        { author_id: null, author_name: '[Borttagen Användare]', author_email: null }, 
        { field: 'author_id', value: targetUser.id }
      );
      await adminUpdate('forum_topics', 
        { author_id: null, author_name: '[Borttagen Användare]', author_email: null }, 
        { field: 'author_id', value: targetUser.id }
      );
      
      // UPDATE tabeller (sätt foreign keys till null)
      await adminUpdate('audit_logs', { user_id: null }, { field: 'user_id', value: targetUser.id });
      await adminUpdate('handbooks', { owner_id: null }, { field: 'owner_id', value: targetUser.id });
      await adminUpdate('pages', { author_id: null }, { field: 'author_id', value: targetUser.id });
      await adminUpdate('forum_posts', { last_reply_by: null }, { field: 'last_reply_by', value: targetUser.id });
      await adminUpdate('forum_posts', { moderated_by: null }, { field: 'moderated_by', value: targetUser.id });
      await adminUpdate('forum_topics', { last_reply_by: null }, { field: 'last_reply_by', value: targetUser.id });
      await adminUpdate('forum_topics', { moderated_by: null }, { field: 'moderated_by', value: targetUser.id });
      // NOTE: account_deletions and gdpr_requests are now DELETED entirely above, so no updates needed
      await adminUpdate('security_incidents', { assigned_to: null }, { field: 'assigned_to', value: targetUser.id });
      await adminUpdate('backup_history', { created_by: null }, { field: 'created_by', value: targetUser.id });
      await adminUpdate('gdpr_automated_deletion_requests', { requested_by: null }, { field: 'requested_by', value: targetUser.id });
      await adminUpdate('gdpr_automated_deletion_requests', { completed_by: null }, { field: 'completed_by', value: targetUser.id });
      await adminUpdate('gdpr_data_processing_records', { assigned_to: null }, { field: 'assigned_to', value: targetUser.id });
      
      // Nu försök auth deletion igen efter fullständig cleanup
      console.log("🔐 Attempting auth deletion AFTER comprehensive cleanup...");
      const { data: authDeleteData, error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      
      if (authDeleteError) {
        console.error("❌ AUTH DELETE STILL FAILED after comprehensive cleanup:", authDeleteError);
        return NextResponse.json({ 
          error: 'Auth deletion failed even after complete cleanup',
          details: authDeleteError.message,
          userStillExists: true
        }, { status: 500 });
      }
      
      console.log("🎉 User deletion completed successfully after comprehensive cleanup!");
      return NextResponse.json({ 
        message: 'Användare raderad framgångsrikt efter fullständig rensning',
        email,
        method: 'auth_after_comprehensive_cleanup'
      });
      
    } catch (error) {
      console.error("💥 EXCEPTION during comprehensive cleanup:", error);
      return NextResponse.json({ 
        error: 'Exception during comprehensive user deletion',
        details: String(error)
      }, { status: 500 });
    }

  } catch (error) {
    console.error("💥 DELETION ERROR:", error);
    return NextResponse.json({ 
      error: 'Oväntat fel vid radering av användare',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 