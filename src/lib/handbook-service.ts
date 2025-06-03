import { getServiceSupabase } from '@/lib/supabase';
import { HandbookTemplate } from '@/lib/templates/complete-brf-handbook';

export async function createHandbookWithSectionsAndPages(
  name: string,
  subdomain: string,
  template: HandbookTemplate,
  userId: string | null,
  isTrialHandbook: boolean = false
) {
  const supabase = getServiceSupabase();
  
  console.log('[Handbook] Creating handbook with owner_id:', { name, subdomain, userId: userId || 'guest', isTrialHandbook });
  
  // Kontrollera obligatoriska fält för handbooks
  if (!name || typeof name !== 'string' || !subdomain || typeof subdomain !== 'string') {
    console.error('[Handbook] Saknar obligatoriskt fält (name eller subdomain) vid skapande av handbok:', { name, subdomain });
    throw new Error('Obligatoriskt fält saknas vid skapande av handbok.');
  }

  // Check if subdomain already exists
  console.log('[Handbook] Checking if subdomain already exists:', subdomain);
  const { data: existing, error: checkError } = await supabase
    .from('handbooks')
    .select('id, title, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle();
  
  if (checkError) {
    console.error('[Handbook] Error checking existing subdomain:', checkError);
    throw new Error(`Database error when checking subdomain: ${checkError.message}`);
  }
  
  if (existing) {
    console.error('[Handbook] Subdomain already exists:', existing);
    throw new Error(`Subdomain "${subdomain}" already exists with handbook ID: ${existing.id}`);
  }
  
  console.log('[Handbook] Subdomain is available, proceeding with handbook creation');

  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .insert({
      title: name,
      subtitle: template.metadata.subtitle,
      version: template.metadata.version,
      organization_name: template.metadata.organization.name,
      organization_address: template.metadata.organization.address,
      organization_org_number: template.metadata.organization.orgNumber,
      organization_phone: template.metadata.organization.phone,
      organization_email: template.metadata.organization.email,
      subdomain,
      published: true,
      owner_id: userId, // Can be null for guest handbooks
      is_trial_handbook: isTrialHandbook,
      created_during_trial: isTrialHandbook,
    })
    .select()
    .single();

  if (handbookError) {
    console.error('[Handbook] Database error creating handbook:', handbookError);
    console.error('[Handbook] Error details:', { 
      code: handbookError.code, 
      message: handbookError.message, 
      details: handbookError.details,
      hint: handbookError.hint 
    });
    throw new Error(`Failed to create handbook: ${handbookError.message} (Code: ${handbookError.code})`);
  }

  let handbookObj = Array.isArray(handbook) ? handbook[0] : handbook;
  if (!handbookObj || !handbookObj.id) {
    console.error('[Handbook] Misslyckades med att skapa handbok eller saknar id:', handbook);
    throw new Error('Misslyckades med att skapa handbok eller saknar id. Avbryter.');
  }

  console.log('[Handbook] Handbok skapad med ID:', handbookObj.id, 'och owner_id:', userId);

  // Lägg till skaparen som admin i handbook_members
  if (userId) {
    const { error: permError } = await supabase
      .from('handbook_members')
      .insert({
        handbook_id: handbookObj.id,
        user_id: userId,
        role: 'admin',
      });
    if (permError) {
      console.error('[Handbook] Kunde inte lägga till skaparen i handbook_members:', permError);
      // Fortsätt ändå - detta är inte kritiskt för handbokens funktion
    } else {
      console.log('[Handbook] Skapare tillagd som admin i handbook_members');
    }
  }

  const activeSections = template.sections
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order);

  for (const section of activeSections) {
    // Kontrollera obligatoriska fält för sections
    if (!section.title || typeof section.title !== 'string') {
      console.error('[Handbook] Sektion saknar obligatoriskt fält (title):', section);
      continue;
    }
    let sectionOrder = typeof section.order === 'number' && !isNaN(section.order) ? section.order : 0;
    if (sectionOrder === 0 && (typeof section.order !== 'number' || isNaN(section.order))) {
      console.warn(`[Handbook] Sektion '${section.title}' saknar giltigt order-värde, defaultar till 0.`);
    }
    if (!handbookObj.id) {
      console.error('[Handbook] Saknar handbook_id vid skapande av sektion:', section);
      continue;
    }
    console.log('[Handbook] Skickar sektion till Supabase:', {
      title: section.title,
      description: section.description,
      order_index: sectionOrder,
      handbook_id: handbookObj.id,
    });
    const { data: createdSectionRaw, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: section.title,
        description: section.description,
        order_index: sectionOrder,
        handbook_id: handbookObj.id,
        completion_status: section.completionStatus || 100,
        is_active: section.isActive !== false,
        is_public: section.is_public !== false,
      })
      .select()
      .single();

    // Hantera både array och objekt från Supabase
    const createdSection = Array.isArray(createdSectionRaw) ? createdSectionRaw[0] : createdSectionRaw;

    if (sectionError) {
      console.error('Error creating section:', sectionError);
      console.error('Section insert payload:', {
        title: section.title,
        description: section.description,
        order_index: sectionOrder,
        handbook_id: handbookObj.id,
      });
      console.error('Handbook context:', {
        handbook_id: handbookObj.id,
        handbook_title: handbookObj.title,
      });
      // Extra loggning och skydd: skapa aldrig sidor om sektionen inte skapades
      console.error('[Handbook] Skapar INTE sidor för denna sektion eftersom sektionen inte kunde skapas:', section);
      continue;
    }
    if (!createdSection || !createdSection.id) {
      // Extra skydd: skapa aldrig sidor om sektionen saknar id
      console.error('[Handbook] Kunde inte skapa sektion, hoppar över sidor:', { createdSection, section });
      continue;
    }
    else {
      console.log('[Handbook] Sektion skapad med id:', createdSection?.id, 'för handbok:', handbookObj.id);
    }

    for (const page of section.pages) {
      // Kontrollera obligatoriska fält för pages
      if (!page.title || typeof page.title !== 'string') {
        console.error('[Handbook] Sida saknar obligatoriskt fält (title):', page);
        continue;
      }
      let pageOrder = typeof page.order === 'number' && !isNaN(page.order) ? page.order : 0;
      if (pageOrder === 0 && (typeof page.order !== 'number' || isNaN(page.order))) {
        console.warn(`[Handbook] Sida '${page.title}' saknar giltigt order-värde, defaultar till 0.`);
      }
      let slug = page.slug;
      if (!slug && page.title) {
        slug = page.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      }
      if (!slug) {
        console.error('[Handbook] Sida saknar obligatoriskt fält (slug):', page);
        continue;
      }
      if (!createdSection.id) {
        console.error('[Handbook] Saknar section_id vid skapande av sida:', page);
        continue;
      }
      console.log('[Handbook] Skickar sida till Supabase:', {
        title: page.title,
        content: page.content,
        order_index: pageOrder,
        section_id: createdSection.id,
        slug,
      });
      const { error: pageError } = await supabase
        .from('pages')
        .insert({
          title: page.title,
          content: page.content,
          order_index: pageOrder,
          section_id: createdSection.id,
          slug,
          table_of_contents: page.tableOfContents !== false,
        });

      if (pageError) {
        console.error('Error creating page:', pageError);
        console.error('Page insert payload:', {
          title: page.title,
          content: page.content,
          order_index: pageOrder,
          section_id: createdSection.id,
          slug,
        });
      }
    }
  }

  return handbookObj.id;
}

// Simple cache for handbook data to prevent repeated requests
const handbookCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

export async function getHandbookBySubdomain(subdomain: string) {
  console.log('[getHandbookBySubdomain] subdomain:', subdomain);
  
  // Clear cache for debugging
  const cacheKey = `handbook_${subdomain}`;
  handbookCache.delete(cacheKey);
  
  const supabase = getServiceSupabase();
  
  try {
    // First, try a simple query to see if the handbook exists
    console.log('[getHandbookBySubdomain] Testing simple query first...');
    const { data: simpleCheck, error: simpleError } = await supabase
      .from('handbooks')
      .select('id, title, subdomain, published')
      .eq('subdomain', subdomain)
      .single();

    if (simpleError) {
      console.error('[getHandbookBySubdomain] Simple query failed:', simpleError);
      return null;
    }

    console.log('[getHandbookBySubdomain] Simple query successful, handbook exists:', simpleCheck);

    // Now try the complex query with sections and pages
    console.log('[getHandbookBySubdomain] Attempting complex query with sections and pages...');
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select(`
        *,
        sections (
          id,
          title,
          description,
          order_index,
          handbook_id,
          completion_status,
          is_active,
          is_public,
          created_at,
          updated_at,
          pages (
            id,
            title,
            content,
            order_index,
            section_id,
            table_of_contents,
            updated_at
          )
        )
      `)
      .eq('subdomain', subdomain)
      .single();

    if (handbookError) {
      console.error('[getHandbookBySubdomain] Complex query failed:', handbookError);
      console.log('[getHandbookBySubdomain] Falling back to simple handbook structure...');
      
      // Fallback: return handbook without sections if the join fails
      return {
        ...simpleCheck,
        sections: []
      };
    }

    if (!handbook) {
      console.error('[getHandbookBySubdomain] No handbook data returned from complex query');
      return null;
    }

    // Transform the data to match expected structure
    const handbookObj = {
      ...handbook,
      sections: (handbook.sections || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((section: any) => ({
          ...section,
          pages: (section.pages || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }))
    };

    console.log('[getHandbookBySubdomain] Successfully fetched handbook with sections and pages:', handbookObj.id);
    console.log('[getHandbookBySubdomain] Sections count:', handbookObj.sections?.length || 0);
    
    // Cache the result
    handbookCache.set(cacheKey, { data: handbookObj, timestamp: Date.now() });
    
    return handbookObj;
  } catch (error) {
    console.error('[getHandbookBySubdomain] Unexpected error:', error);
    return null;
  }
}

export async function getHandbookById(id: string) {
  console.log('[getHandbookById] id:', id);
  
  // Check cache first
  const cacheKey = `handbook_id_${id}`;
  const cached = handbookCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[getHandbookById] Returning cached data for:', id);
    return cached.data;
  }
  
  const supabase = getServiceSupabase();
  
  try {
    // Use a single query with joins to reduce the number of API calls
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select(`
        *,
        sections (
          id,
          title,
          description,
          order_index,
          handbook_id,
          completion_status,
          is_active,
          is_public,
          created_at,
          updated_at,
          pages (
            id,
            title,
            content,
            order_index,
            section_id,
            table_of_contents,
            updated_at
          )
        )
      `)
      .eq('id', id)
      .single();

    if (handbookError || !handbook) {
      console.error('[getHandbookById] Error fetching handbook:', handbookError);
      return null;
    }

    // Transform the data to match expected structure
    const handbookObj = {
      ...handbook,
      sections: (handbook.sections || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((section: any) => ({
          ...section,
          pages: (section.pages || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }))
    };

    console.log('[getHandbookById] Successfully fetched handbook with sections and pages:', handbookObj.id);
    
    // Cache the result
    handbookCache.set(cacheKey, { data: handbookObj, timestamp: Date.now() });
    
    return handbookObj;
  } catch (error) {
    console.error('[getHandbookById] Unexpected error:', error);
    return null;
  }
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

