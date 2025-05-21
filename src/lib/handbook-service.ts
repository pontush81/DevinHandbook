import { getServiceSupabase } from '@/lib/supabase';
import { HandbookTemplate } from '@/lib/templates/handbook-template';

export async function createHandbookWithSectionsAndPages(
  name: string,
  subdomain: string,
  template: HandbookTemplate,
  userId: string
) {
  const supabase = getServiceSupabase();
  
  // Kontrollera obligatoriska fält för handbooks
  if (!name || typeof name !== 'string' || !subdomain || typeof subdomain !== 'string') {
    console.error('[Handbook] Saknar obligatoriskt fält (name eller subdomain) vid skapande av handbok:', { name, subdomain });
    throw new Error('Obligatoriskt fält saknas vid skapande av handbok.');
  }

  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .insert({
      title: name,
      subdomain,
      published: true,
    })
    .select()
    .single();

  let handbookObj = Array.isArray(handbook) ? handbook[0] : handbook;
  if (!handbookObj || !handbookObj.id) {
    console.error('[Handbook] Misslyckades med att skapa handbok eller saknar id:', handbook);
    throw new Error('Misslyckades med att skapa handbok eller saknar id. Avbryter.');
  }

  // NYTT: Lägg till skaparen som admin i handbook_permissions
  if (userId) {
    const { error: permError } = await supabase
      .from('handbook_permissions')
      .insert({
        handbook_id: handbookObj.id,
        user_id: userId,
        role: 'admin',
      });
    if (permError) {
      console.error('[Handbook] Kunde inte lägga till skaparen i handbook_permissions:', permError);
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

export async function getHandbookBySubdomain(subdomain: string) {
  console.log('[getHandbookBySubdomain] subdomain:', subdomain);
  const supabase = getServiceSupabase();
  
  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .select('*')
    .eq('subdomain', subdomain)
    .single();

  const handbookObj = Array.isArray(handbook) ? handbook[0] : handbook;
  if (handbookError || !handbookObj || !handbookObj.id) {
    console.error('[getHandbookBySubdomain] Error fetching handbook:', handbookError);
    return null;
  }
  console.log('[getHandbookBySubdomain] handbook:', handbookObj);

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('*')
    .eq('handbook_id', handbookObj.id)
    .order('order_index');

  if (sectionsError) {
    console.error('[getHandbookBySubdomain] Error fetching sections:', sectionsError);
    return { ...handbookObj, sections: [] };
  }
  console.log('[getHandbookBySubdomain] sections:', sections);

  interface SectionWithPages {
    id: string;
    title: string;
    description: string;
    order_index: number;
    handbook_id: string;
    created_at: string;
    pages: {
      id: string;
      title: string;
      content: string;
      order_index: number;
      section_id: string;
    }[];
  }
  
  const sectionsWithPages: SectionWithPages[] = [];
  
  for (const section of sections) {
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('section_id', section.id)
      .order('order_index');

    if (pagesError) {
      console.error('[getHandbookBySubdomain] Error fetching pages:', pagesError);
      sectionsWithPages.push({ ...section, pages: [] });
    } else {
      console.log(`[getHandbookBySubdomain] pages for section ${section.id}:`, pages);
      sectionsWithPages.push({ ...section, pages: pages || [] });
    }
  }

  return { ...handbookObj, sections: sectionsWithPages };
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
