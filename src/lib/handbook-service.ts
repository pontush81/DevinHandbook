import { getServiceSupabase, getAdminClient, supabase } from '@/lib/supabase';
import { HandbookTemplate } from '@/lib/templates/complete-brf-handbook';

// Cache for handbooks (could be enhanced with Redis in production)
const handbookCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get admin client for database operations
const supabaseAdmin = getAdminClient();

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

export async function getHandbookBySlug(slug: string): Promise<Handbook | null> {
  try {
    console.log(`[Handbook Service] Getting handbook by slug: ${slug}`);

    const { data: handbook, error } = await (supabase as any)
      .from('handbooks')
      .select(`
        id,
        title,
        slug,
        description,
        owner_id,
        published,
        created_at,
        updated_at,
        handbook_sections (
          id,
          title,
          description,
          order_index,
          is_active,
          handbook_pages (
            id,
            title,
            content,
            slug,
            order_index
          )
        )
      `)
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error) {
      console.error('[Handbook Service] Error getting handbook:', error);
      return null;
    }

    if (!handbook) {
      console.log('[Handbook Service] No handbook found');
      return null;
    }

    console.log(`[Handbook Service] Found handbook: ${handbook.title}`);
    
    return {
      id: handbook.id,
      title: handbook.title,
      slug: handbook.slug,
      description: handbook.description,
      owner_id: handbook.owner_id,
      published: handbook.published,
      created_at: handbook.created_at,
      updated_at: handbook.updated_at,
      sections: handbook.handbook_sections?.map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order_index,
        isActive: section.is_active,
        pages: section.handbook_pages?.map((page: any) => ({
          id: page.id,
          title: page.title,
          content: page.content,
          slug: page.slug,
          order: page.order_index
        })) || []
      })) || []
    };
  } catch (error) {
    console.error('[Handbook Service] Unexpected error:', error);
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

// Backward compatibility alias for API routes
export const createHandbookWithSectionsAndPages = createHandbook;

