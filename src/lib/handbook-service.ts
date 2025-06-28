import { getServiceSupabase, getAdminClient, supabase } from '@/lib/supabase';
import { HandbookTemplate } from '@/lib/templates/complete-brf-handbook';
import { Handbook } from '@/types/handbook';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

// Cache for handbooks (could be enhanced with Redis in production)
const handbookCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get admin client for database operations
const supabaseAdmin = getAdminClient();

// Helper function to generate unique slug
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('handbooks')
      .select('id')
      .eq('slug', slug)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // No existing handbook found, slug is available
      return slug;
    }
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Database error when checking slug: ${checkError.message}`);
    }
    
    // Slug exists, try with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 100) {
      throw new Error('Unable to generate unique slug after 100 attempts');
    }
  }
}

export async function createHandbook(
  name: string,
  slug: string,
  userId?: string,
  isTrialHandbook: boolean = true,
  customTemplate?: any
) {
  // console.log('[Handbook] Creating handbook with owner_id:', { name, slug, userId: userId || 'guest', isTrialHandbook });

  // Validate input
  if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string') {
    console.error('[Handbook] Saknar obligatoriskt fält (name eller slug) vid skapande av handbok:', { name, slug });
    throw new Error('Name and slug are required');
  }

  // Generate unique slug
  // console.log('[Handbook] Generating unique slug from base:', slug);
  const uniqueSlug = await generateUniqueSlug(slug);
  // console.log('[Handbook] Using unique slug:', uniqueSlug);

  // Calculate trial end date - 30 days from now
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 30);

  // Create the handbook
  const handbookData = {
    title: name,
    slug: uniqueSlug,
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

  // console.log('[Handbook] Creating handbook with data:', handbookData);

  const { data: handbook, error: createError } = await supabaseAdmin
    .from('handbooks')
    .insert([handbookData])
    .select('*')
    .single();

  if (createError) {
    console.error('[Handbook] Error creating handbook:', createError);
    throw new Error(`Failed to create handbook: ${createError.message}`);
  }

  // console.log('[Handbook] Handbook created successfully:', handbook.id);

  // Create forum categories if forum is enabled (future use)
  if (handbook.forum_enabled) {
    // console.log('[Handbook] Creating forum categories for handbook:', handbook.id);
    await createDefaultForumCategories(handbook.id);
  }

  // Create sections - use custom template if provided, otherwise use default
  // console.log('[Handbook] Creating sections for handbook:', handbook.id);
  if (customTemplate && customTemplate.sections && customTemplate.sections.length > 0) {
    // console.log('[Handbook] Using custom template with', customTemplate.sections.length, 'sections');
    await createSectionsFromTemplate(handbook.id, customTemplate.sections);
  } else {
    // console.log('[Handbook] Using default template');
    await createDefaultSections(handbook.id);
  }

  // If user is provided, add them as admin
  if (userId) {
    // console.log('[Handbook] Adding user as admin member:', { handbookId: handbook.id, userId });
    await addHandbookMember(handbook.id, userId, 'admin');
  }

  // console.log('[Handbook] ✅ Handbook creation completed successfully');
  return handbook;
}

export async function getHandbookBySlug(slug: string): Promise<Handbook | null> {
  console.log('[Handbook Service] ===== getHandbookBySlug START =====');
  console.log('[Handbook Service] Requested slug:', slug);
  
  try {
    if (!slug || slug.trim() === '') {
      console.log('[Handbook Service] ❌ Empty slug provided');
      return null;
    }

    const supabase = getServiceSupabase();
    
    // First, let's search for ANY handbooks with this slug (published or unpublished)
    console.log('[Handbook Service] Step 1: Searching for ALL handbooks with slug...');
    const debugQuery = supabase
      .from('handbooks')
      .select('id, title, slug, subdomain, published')
      .or(`slug.eq.${slug},subdomain.eq.${slug}`);
    
    const { data: debugData, error: debugError } = await debugQuery;
    
    if (debugError) {
      console.error('[Handbook Service] ❌ Debug query error:', debugError);
      throw new Error(`Database error during debug search: ${debugError.message}`);
    }
    
    console.log(`[Handbook Service] Debug: Found ${debugData?.length || 0} handbooks with slug "${slug}":`, debugData);
    
    // Now search only for published handbooks
    console.log('[Handbook Service] Step 2: Searching for PUBLISHED handbooks...');
    const { data: publishedData, error: publishedError } = await supabase
      .from('handbooks')
      .select('id, title, slug, subdomain, published')
      .or(`slug.eq.${slug},subdomain.eq.${slug}`)
      .eq('published', true);
    
    if (publishedError) {
      console.error('[Handbook Service] ❌ Published query error:', publishedError);
      throw new Error(`Database error during published search: ${publishedError.message}`);
    }
    
    console.log(`[Handbook Service] Published query result: Found ${publishedData?.length || 0} published handbooks with slug "${slug}":`, publishedData);
    
    if (!publishedData || publishedData.length === 0) {
      console.log('[Handbook Service] ❌ No published handbook found with slug:', slug);
      if (debugData && debugData.length > 0) {
        console.log('[Handbook Service] 💡 Found unpublished handbooks - they need to be published first:', 
          debugData.map(h => ({ id: h.id, title: h.title, published: h.published }))
        );
      }
      return null;
    }
    
    const handbook = publishedData[0];
    console.log(`[Handbook Service] ✅ Using handbook: ${handbook.title} (id: ${handbook.id})`);
    
    // Get the full handbook with sections
    console.log('[Handbook Service] Step 3: Fetching full handbook data...');
    const { data: fullData, error: fullError } = await supabase
      .from('handbooks')
      .select(`
        *,
        sections!inner(
          id,
          title,
          content,
          order_index,
          created_at,
          updated_at
        )
      `)
      .eq('id', handbook.id)
      .eq('published', true)
      .single();
    
    if (fullError) {
      console.error('[Handbook Service] ❌ Full data error:', fullError);
      if (fullError.code === 'PGRST116') {
        console.log('[Handbook Service] 💡 Handbook exists but has no sections or other join issue');
        // Try to get handbook without sections
        const { data: noSectionsData, error: noSectionsError } = await supabase
          .from('handbooks')
          .select('*')
          .eq('id', handbook.id)
          .eq('published', true)
          .single();
        
        if (noSectionsError) {
          console.error('[Handbook Service] ❌ Even simple query failed:', noSectionsError);
          throw new Error(`Database error: ${noSectionsError.message}`);
        }
        
        console.log('[Handbook Service] ✅ Handbook found without sections');
        return { ...noSectionsData, sections: [] };
      }
      throw new Error(`Database error: ${fullError.message}`);
    }
    
    console.log('[Handbook Service] ✅ Full handbook data retrieved successfully');
    console.log('[Handbook Service] ===== getHandbookBySlug END =====');
    return fullData;
    
  } catch (error) {
    console.error('[Handbook Service] 💥 Critical error in getHandbookBySlug:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      slug
    });
    console.log('[Handbook Service] ===== getHandbookBySlug ERROR END =====');
    throw error;
  }
}

export async function getHandbookById(id: string) {
  // console.log('[getHandbookById] id:', id);

  const cacheKey = `handbook_id_${id}`;
  const cached = handbookCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // console.log('[getHandbookById] Returning cached data for:', id);
    return cached.data;
  }

  const { data: handbookDataArray, error: handbookError } = await supabase
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
    .eq('id', id);

  if (handbookError) {
    console.error('[getHandbookById] Error fetching handbook:', handbookError);
    return null;
  }

  if (!handbookDataArray || handbookDataArray.length === 0) {
    console.error('[getHandbookById] No handbook found for id:', id);
    return null;
  }

  const handbookData = handbookDataArray[0];

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

  // console.log('[getHandbookById] Successfully fetched handbook:', handbookObj.id);

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

// Helper function to convert text to well-structured EditorJS format
function convertTextToEditorJS(text: string): any {
  const blocks: any[] = [];
  const lines = text.split('\n');
  let currentParagraph = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines but finish current paragraph if exists
    if (!line) {
      if (currentParagraph) {
        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          data: { text: currentParagraph.trim() }
        });
        currentParagraph = '';
      }
      continue;
    }
    
    // Detect main headers (common BRF section names)
    const isMainHeader = (
      line.match(/^(Skötselplan|Ellagården|Soprum|Lägenheter|Korridor|Källare|Tvättstuga|Fasad|Bilparkering|Brandskydd|Styrelse|Gästlägenhet|Aktivitetsrum|Grillregler|Sophantering)/i) ||
      (line.length < 50 && line.length > 3 && line === line.charAt(0).toUpperCase() + line.slice(1) && !line.includes('(') && !line.includes('-'))
    );
    
    // Detect sub-headers (shorter descriptive lines)
    const isSubHeader = (
      !isMainHeader &&
      line.length < 60 && 
      line.length > 5 &&
      !line.includes('(B)') &&
      !line.includes('(BRF)') &&
      !line.match(/^[•\-\*]/) &&
      !line.match(/^\d+\./) &&
      line.charAt(0) === line.charAt(0).toUpperCase() &&
      i < lines.length - 1 &&
      lines[i + 1].trim().length > 0
    );
    
    // Detect list items (including BRF-specific patterns)
    const isListItem = (
      line.match(/^[•\-\*]\s/) ||
      line.match(/^\d+\.\s/) ||
      line.match(/^[a-zA-Z]\)\s/) ||
      line.startsWith('- ') ||
      line.startsWith('• ') ||
      line.includes('(B)') ||
      line.includes('(BRF)') ||
      (line.length > 10 && (line.includes(' - ') || line.includes(' – ')))
    );
    
    if (isMainHeader) {
      // Finish current paragraph
      if (currentParagraph) {
        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          data: { text: currentParagraph.trim() }
        });
        currentParagraph = '';
      }
      
      // Add main header
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'header',
        data: { text: line, level: 1 }
      });
    } else if (isSubHeader) {
      // Finish current paragraph
      if (currentParagraph) {
        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          data: { text: currentParagraph.trim() }
        });
        currentParagraph = '';
      }
      
      // Add sub header
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'header',
        data: { text: line, level: 2 }
      });
    } else if (isListItem) {
      // Finish current paragraph
      if (currentParagraph) {
        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          data: { text: currentParagraph.trim() }
        });
        currentParagraph = '';
      }
      
      // Collect consecutive list items
      const listItems = [];
      let j = i;
      
      while (j < lines.length) {
        const listLine = lines[j].trim();
        if (!listLine) {
          j++;
          continue;
        }
        
        const isCurrentListItem = (
          listLine.match(/^[•\-\*]\s/) ||
          listLine.match(/^\d+\.\s/) ||
          listLine.match(/^[a-zA-Z]\)\s/) ||
          listLine.startsWith('- ') ||
          listLine.startsWith('• ') ||
          listLine.includes('(B)') ||
          listLine.includes('(BRF)') ||
          (listLine.length > 10 && (listLine.includes(' - ') || listLine.includes(' – ')))
        );
        
        if (isCurrentListItem) {
          // Clean the list item text but preserve responsibility codes
          let itemText = listLine.replace(/^[•\-\*]\s/, '')
                                .replace(/^\d+\.\s/, '')
                                .replace(/^[a-zA-Z]\)\s/, '')
                                .replace(/^-\s/, '')
                                .replace(/^•\s/, '');
          
          // If the line doesn't start with a bullet but contains responsibility codes, keep it as is
          if (!listLine.match(/^[•\-\*\d]/) && (listLine.includes('(B)') || listLine.includes('(BRF)'))) {
            itemText = listLine;
          }
          
          listItems.push(itemText);
          j++;
        } else {
          break;
        }
      }
      
      if (listItems.length > 0) {
        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'list',
          data: {
            style: 'unordered',
            items: listItems
          }
        });
      }
      
      // Skip the lines we've processed
      i = j - 1;
    } else {
      // Regular text - add to current paragraph
      currentParagraph += (currentParagraph ? ' ' : '') + line;
    }
  }
  
  // Add final paragraph if exists
  if (currentParagraph) {
    blocks.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'paragraph',
      data: { text: currentParagraph.trim() }
    });
  }
  
  // If no blocks were created, create a single paragraph with all text
  if (blocks.length === 0) {
    blocks.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'paragraph',
      data: { text: text.trim() }
    });
  }
  
  return {
    time: Date.now(),
    blocks: blocks,
    version: '2.28.2'
  };
}

/**
 * Converts AI-generated content to EditorJS format
 * This function is specifically designed for AI-generated content and always creates paragraph blocks
 * to avoid the header detection logic that can cause entire sections to appear in bold
 */
function convertAIContentToEditorJS(text: string): any {
  if (!text || text.trim() === '') {
    return {
      time: Date.now(),
      blocks: [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'paragraph',
        data: { text: 'Innehåll kommer snart...' }
      }],
      version: '2.28.2'
    };
  }

  // Split text into paragraphs (by double newlines or single newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If no double newlines found, treat as single paragraph
  const finalParagraphs = paragraphs.length === 1 ? [text.trim()] : paragraphs;

  const blocks: any[] = [];

  finalParagraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) return;

    // Check for bullet lists (lines with • or -)
    const lines = trimmedParagraph.split('\n');
    const listItems = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/);
    });

    if (listItems.length > 0 && listItems.length === lines.length) {
      // This paragraph is entirely a list
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'list',
        data: {
          style: listItems[0].trim().match(/^\d+\./) ? 'ordered' : 'unordered',
          items: listItems.map(item => 
            item.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '').trim()
          )
        }
      });
    } else {
      // Always create paragraph blocks for AI content to avoid bold headers
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'paragraph',
        data: { text: trimmedParagraph }
      });
    }
  });

  // If no blocks were created, create a single paragraph
  if (blocks.length === 0) {
    blocks.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'paragraph',
      data: { text: text.trim() }
    });
  }

  return {
    time: Date.now(),
    blocks: blocks,
    version: '2.28.2'
  };
}

// Helper function to create sections from custom template (AI-imported data)
async function createSectionsFromTemplate(handbookId: string, templateSections: any[]) {
  // console.log('[createSectionsFromTemplate] Creating sections from custom template for handbook:', handbookId);
  // console.log('[createSectionsFromTemplate] Template sections:', templateSections.length);
  
  for (const templateSection of templateSections) {
    // console.log('[createSectionsFromTemplate] Creating section:', templateSection.title);
    
    // Create the section
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .insert({
        title: templateSection.title,
        description: templateSection.description || templateSection.title,
        order_index: templateSection.order || 1,
        handbook_id: handbookId,
        is_public: true,
        is_published: true,
        icon: 'BookOpen' // Default icon
      })
      .select()
      .single();

    if (sectionError) {
      console.error('[createSectionsFromTemplate] Error creating section:', sectionError);
      continue;
    }

    // Create pages for this section
    if (templateSection.pages && templateSection.pages.length > 0) {
      for (const templatePage of templateSection.pages) {
        // console.log('[createSectionsFromTemplate] Creating page:', templatePage.title, 'in section:', section.id);
        
        // Use AI-specific conversion function to avoid header detection issues
        const editorJSContent = convertAIContentToEditorJS(templatePage.content || '');
        
        const { error: pageError } = await supabaseAdmin
          .from('pages')
          .insert({
            title: templatePage.title,
            content: JSON.stringify(editorJSContent),
            slug: templatePage.slug,
            order_index: templatePage.order || 1,
            section_id: section.id,
            is_published: true
          });

        if (pageError) {
          console.error('[createSectionsFromTemplate] Error creating page:', pageError);
        }
      }
    } else {
      // If no pages provided, create a single page with the section content
      // console.log('[createSectionsFromTemplate] Creating single page for section:', section.id);
      
      // Use AI-specific conversion function to avoid header detection issues
      const editorJSContent = convertAIContentToEditorJS(templateSection.content || 'Innehåll kommer snart...');
      
      const { error: pageError } = await supabaseAdmin
        .from('pages')
        .insert({
          title: templateSection.title,
          content: JSON.stringify(editorJSContent),
          slug: templateSection.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          order_index: 1,
          section_id: section.id,
          is_published: true
        });

      if (pageError) {
        console.error('[createSectionsFromTemplate] Error creating single page:', pageError);
      }
    }
  }
  
  // console.log('[createSectionsFromTemplate] ✅ Custom template sections created successfully');
}

// Helper function to create default sections
async function createDefaultSections(handbookId: string) {
  // console.log('[createDefaultSections] Creating sections from rich template for handbook:', handbookId);
  
  // Use the rich template instead of simple sections
  for (const templateSection of completeBRFHandbook.sections) {
    // console.log('[createDefaultSections] Creating section:', templateSection.title);
    
    // Create the section
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .insert({
        title: templateSection.title,
        description: templateSection.description,
        order_index: templateSection.order,
        handbook_id: handbookId,
        is_public: true,
        is_published: true,
        icon: 'BookOpen' // Default icon
      })
      .select()
      .single();

    if (sectionError) {
      console.error('[createDefaultSections] Error creating section:', sectionError);
      continue;
    }

    // Create pages for this section
    for (const templatePage of templateSection.pages) {
      // console.log('[createDefaultSections] Creating page:', templatePage.title, 'in section:', section.id);
      
      const { error: pageError } = await supabaseAdmin
        .from('pages')
        .insert({
          title: templatePage.title,
          content: templatePage.content,
          slug: templatePage.slug,
          order_index: templatePage.order,
          section_id: section.id,
          is_published: true
        });

      if (pageError) {
        console.error('[createDefaultSections] Error creating page:', pageError);
      }
    }
  }
  
  // console.log('[createDefaultSections] ✅ Rich template sections created successfully');
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
    // If it's a duplicate key error, that's fine - user is already a member
    if (error.code === '23505') {
      // console.log('[addHandbookMember] User is already a member of this handbook:', { handbookId, userId });
      return; // Exit gracefully
    }
    
    console.error('[addHandbookMember] Error:', error);
    throw error;
  }
  
  // console.log('[addHandbookMember] Successfully added member:', { handbookId, userId, role });
}

// Backward compatibility alias for API routes
export const createHandbookWithSectionsAndPages = createHandbook;

