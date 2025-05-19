import { getServiceSupabase } from '@/lib/supabase';
import { HandbookTemplate } from '@/lib/templates/handbook-template';
import { revalidatePath } from 'next/cache';

export async function createHandbookWithSectionsAndPages(
  name: string,
  subdomain: string,
  template: HandbookTemplate
) {
  const supabase = getServiceSupabase();
  
  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .insert({
      title: name,
      subdomain,
      published: true,
    })
    .select()
    .single();

  if (handbookError) {
    console.error('Error creating handbook:', handbookError);
    throw handbookError;
  }

  const activeSections = template.sections
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order);

  for (const section of activeSections) {
    let sectionOrder = typeof section.order === 'number' && !isNaN(section.order) ? section.order : 0;
    if (sectionOrder === 0 && (typeof section.order !== 'number' || isNaN(section.order))) {
      console.warn(`[Handbook] Sektion '${section.title}' saknar giltigt order-värde, defaultar till 0.`);
    }
    console.log('[Handbook] Skickar sektion till Supabase:', {
      title: section.title,
      description: section.description,
      order_index: sectionOrder,
      handbook_id: handbook.id,
    });
    const { data: createdSection, error: sectionError } = await supabase
      .from('sections')
      .insert({
        title: section.title,
        description: section.description,
        order_index: sectionOrder,
        handbook_id: handbook.id,
      })
      .select()
      .single();

    if (sectionError) {
      console.error('Error creating section:', sectionError);
      console.error('Section insert payload:', {
        title: section.title,
        description: section.description,
        order_index: sectionOrder,
        handbook_id: handbook.id,
      });
      continue;
    }

    for (const page of section.pages) {
      let pageOrder = typeof page.order === 'number' && !isNaN(page.order) ? page.order : 0;
      if (pageOrder === 0 && (typeof page.order !== 'number' || isNaN(page.order))) {
        console.warn(`[Handbook] Sida '${page.title}' saknar giltigt order-värde, defaultar till 0.`);
      }
      const { error: pageError } = await supabase
        .from('pages')
        .insert({
          title: page.title,
          content: page.content,
          order_index: pageOrder,
          section_id: createdSection.id,
        });

      if (pageError) {
        console.error('Error creating page:', pageError);
      }
    }
  }

  return handbook.id;
}

export async function getHandbookBySubdomain(subdomain: string) {
  const supabase = getServiceSupabase();
  
  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .select('*')
    .eq('subdomain', subdomain)
    .single();

  if (handbookError) {
    console.error('Error fetching handbook:', handbookError);
    return null;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('*')
    .eq('handbook_id', handbook.id)
    .order('order');

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
    return { ...handbook, sections: [] };
  }

  interface SectionWithPages {
    id: string;
    title: string;
    description: string;
    order: number;
    handbook_id: string;
    created_at: string;
    pages: {
      id: string;
      title: string;
      content: string;
      order: number;
      section_id: string;
    }[];
  }
  
  const sectionsWithPages: SectionWithPages[] = [];
  
  for (const section of sections) {
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('section_id', section.id)
      .order('order');

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      sectionsWithPages.push({ ...section, pages: [] });
    } else {
      sectionsWithPages.push({ ...section, pages: pages || [] });
    }
  }

  return { ...handbook, sections: sectionsWithPages };
}

export async function revalidateHandbook(subdomain: string) {
  try {
    revalidatePath(`/view`);
    return { success: true };
  } catch (error) {
    console.error('Error revalidating handbook:', error);
    return { success: false, error };
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
      await revalidateHandbook(data.subdomain);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error toggling handbook published status:', error);
    return { success: false, error };
  }
}
