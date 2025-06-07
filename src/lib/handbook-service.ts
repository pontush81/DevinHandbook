import { getServiceSupabase, supabaseAdmin } from '@/lib/supabase';
import { supabase } from '@/lib/supabase-client';
import { HandbookTemplate } from '@/lib/templates/complete-brf-handbook';

// Cache for handbooks (could be enhanced with Redis in production)
const handbookCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function createHandbook(
  name: string,
  slug: string,
  userId?: string,
  isTrialHandbook: boolean = true
) {
  console.log('[Handbook] Creating handbook with owner_id:', { name, slug, userId: userId || 'guest', isTrialHandbook });

  // Validate input
  if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string') {
    console.error('[Handbook] Saknar obligatoriskt fält (name eller slug) vid skapande av handbok:', { name, slug });
    throw new Error('Name and slug are required');
  }

  // Check if slug already exists
  console.log('[Handbook] Checking if slug already exists:', slug);
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('handbooks')
    .select('id, title, slug')
    .eq('slug', slug)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[Handbook] Error checking existing slug:', checkError);
    throw new Error(`Database error when checking slug: ${checkError.message}`);
  }

  if (existing) {
    console.error('[Handbook] Slug already exists:', existing);
    throw new Error(`Slug "${slug}" already exists with handbook ID: ${existing.id}`);
  }

  console.log('[Handbook] Slug is available, proceeding with handbook creation');

  // Calculate trial end date - 30 days from now
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 30);

  // Create the handbook
  const handbookData = {
    title: name,
    slug,
    description: `Handbok för ${name}`,
    published: true,
    owner_id: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    theme: {
      primary_color: '#3498db',
      secondary_color: '#2c3e50',
      logo_url: null
    },
    subtitle: '',
    version: '1.0',
    organization_name: '',
    organization_address: '',
    organization_org_number: null,
    organization_phone: '',
    organization_email: '',
    is_trial_handbook: isTrialHandbook,
    created_during_trial: isTrialHandbook,
    trial_end_date: isTrialHandbook ? trialEndDate.toISOString() : null,
    forum_enabled: false // Start with forum disabled
  };

  console.log('[Handbook] Creating handbook with data:', handbookData);

  const { data: handbook, error: createError } = await supabaseAdmin
    .from('handbooks')
    .insert([handbookData])
    .select('*')
    .single();

  if (createError) {
    console.error('[Handbook] Error creating handbook:', createError);
    throw new Error(`Failed to create handbook: ${createError.message}`);
  }

  console.log('[Handbook] Handbook created successfully:', handbook.id);

  // Create forum categories if forum is enabled (future use)
  if (handbook.forum_enabled) {
    console.log('[Handbook] Creating forum categories for handbook:', handbook.id);
    await createDefaultForumCategories(handbook.id);
  }

  // Create default sections
  console.log('[Handbook] Creating default sections for handbook:', handbook.id);
  await createDefaultSections(handbook.id);

  // If user is provided, add them as admin
  if (userId) {
    console.log('[Handbook] Adding user as admin member:', { handbookId: handbook.id, userId });
    await addHandbookMember(handbook.id, userId, 'admin');
  }

  console.log('[Handbook] ✅ Handbook creation completed successfully');
  return handbook;
}

export async function getHandbookBySlug(slug: string) {
  console.log('[getHandbookBySlug] slug:', slug);

  // Cache key for this handbook
  const cacheKey = `handbook_${slug}`;

  // Try to get from cache first
  // Note: Caching disabled for development to ensure fresh data
  // if (handbookCache[cacheKey] && (Date.now() - handbookCache[cacheKey].timestamp) < CACHE_DURATION) {
  //   console.log('[getHandbookBySlug] Returning cached data for:', slug);
  //   return handbookCache[cacheKey].data;
  // }

  console.log('[getHandbookBySlug] Testing simple query first...');
  const { data: simpleCheck, error: simpleError } = await supabase
    .from('handbooks')
    .select('id, title, slug, published')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (simpleError) {
    console.error('[getHandbookBySlug] Simple query failed:', simpleError);
    return null;
  }

  console.log('[getHandbookBySlug] Simple query successful, handbook exists:', simpleCheck);

  // If simple query works, try the complex query
  console.log('[getHandbookBySlug] Attempting complex query with sections and pages...');
  try {
    const { data: handbookData, error: handbookError } = await supabase
      .from('handbooks')
      .select(`
        id,
        title,
        description,
        subtitle,
        slug,
        published,
        theme,
        forum_enabled,
        sections (
          id,
          title,
          description,
          order_index,
          handbook_id,
          is_public,
          is_published,
          icon,
          pages (
            id,
            title,
            content,
            slug,
            order_index,
            section_id,
            is_published,
            created_at,
            updated_at
          )
        )
      `)
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (handbookError) {
      console.error('[getHandbookBySlug] Complex query failed:', handbookError);
      console.log('[getHandbookBySlug] Falling back to simple handbook structure...');
      
      // Return simple structure without sections
      return {
        ...simpleCheck,
        sections: []
      };
    }

    if (!handbookData) {
      console.error('[getHandbookBySlug] No handbook data returned from complex query');
      return null;
    }

    // Create the handbook object with proper structure
    const handbookObj = {
      id: handbookData.id,
      title: handbookData.title,
      description: handbookData.description,
      subtitle: handbookData.subtitle,
      slug: handbookData.slug,
      published: handbookData.published,
      theme: handbookData.theme,
      forum_enabled: handbookData.forum_enabled,
      sections: handbookData.sections || []
    };

    console.log('[getHandbookBySlug] Successfully fetched handbook with sections and pages:', handbookObj.id);
    console.log('[getHandbookBySlug] Sections count:', handbookObj.sections?.length || 0);

    // Cache the result
    // handbookCache[cacheKey] = { data: handbookObj, timestamp: Date.now() };

    return handbookObj;
  } catch (error) {
    console.error('[getHandbookBySlug] Unexpected error:', error);
    return null;
  }
}

export async function getHandbookById(id: string) {
  console.log('[getHandbookById] id:', id);

  const cacheKey = `handbook_id_${id}`;
  const cached = handbookCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[getHandbookById] Returning cached data for:', id);
    return cached.data;
  }

  const { data: handbookData, error: handbookError } = await supabase
    .from('handbooks')
    .select(`
      id,
      title,
      description,
      subtitle,
      slug,
      published,
      theme,
      forum_enabled,
      sections (
        id,
        title,
        description,
        order_index,
        handbook_id,
        is_public,
        is_published,
        icon,
        pages (
          id,
          title,
          content,
          slug,
          order_index,
          section_id,
          is_published,
          created_at,
          updated_at
        )
      )
    `)
    .eq('id', id)
    .single();

  if (handbookError) {
    console.error('[getHandbookById] Error fetching handbook:', handbookError);
    return null;
  }

  if (!handbookData) {
    console.error('[getHandbookById] No handbook found for id:', id);
    return null;
  }

  // Create the handbook object with proper structure
  const handbookObj = {
    id: handbookData.id,
    title: handbookData.title,
    description: handbookData.description,
    subtitle: handbookData.subtitle,
    slug: handbookData.slug,
    published: handbookData.published,
    theme: handbookData.theme,
    forum_enabled: handbookData.forum_enabled,
    sections: handbookData.sections || []
  };

  console.log('[getHandbookById] Successfully fetched handbook:', handbookObj.id);

  // Cache the result
  handbookCache[cacheKey] = { data: handbookObj, timestamp: Date.now() };

  return handbookObj;
}

export async function toggleHandbookPublished(id: string, published: boolean) {
  const supabase = getServiceSupabase();
  
  try {
    const { data, error } = await supabase
      .from('handbooks')
      .update({ published })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (data.subdomain) {
      // await revalidateHandbook(data.subdomain);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error toggling handbook published status:', error);
    return { success: false, error };
  }
}

// Helper function to create default sections
async function createDefaultSections(handbookId: string) {
  const defaultSections = [
    {
      title: 'Allmänt',
      description: 'Allmän information om föreningen',
      order_index: 1,
      is_public: true,
      is_published: true
    },
    {
      title: 'Stadgar',
      description: 'Föreningens stadgar och regler',
      order_index: 2,
      is_public: true,
      is_published: true
    },
    {
      title: 'Ekonomi',
      description: 'Ekonomisk information och budgetar',
      order_index: 3,
      is_public: false,
      is_published: true
    }
  ];

  for (const section of defaultSections) {
    await supabaseAdmin
      .from('sections')
      .insert({
        ...section,
        handbook_id: handbookId
      });
  }
}

// Helper function to create default forum categories
async function createDefaultForumCategories(handbookId: string) {
  const defaultCategories = [
    {
      name: 'Allmänt',
      description: 'Allmänna diskussioner',
      color: '#3498db',
      order_index: 1
    },
    {
      name: 'Meddelanden',
      description: 'Viktiga meddelanden från styrelsen',
      color: '#e74c3c',
      order_index: 2
    }
  ];

  for (const category of defaultCategories) {
    await supabaseAdmin
      .from('forum_categories')
      .insert({
        ...category,
        handbook_id: handbookId
      });
  }
}

// Helper function to add handbook member
async function addHandbookMember(handbookId: string, userId: string, role: 'admin' | 'member' = 'member') {
  const { error } = await supabaseAdmin
    .from('handbook_members')
    .insert({
      handbook_id: handbookId,
      user_id: userId,
      role
    });

  if (error) {
    console.error('[addHandbookMember] Error:', error);
    throw error;
  }
}

