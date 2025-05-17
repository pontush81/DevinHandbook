import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ingen export const runtime - detta blir en vanlig serverless-funktion, inte en edge-funktion

export async function POST(request: NextRequest) {
  try {
    // Hämta konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Saknar Supabase-konfiguration',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }
    
    // Skapa en Supabase-klient med service_role-nyckeln för admin-åtkomst
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Hämta förfrågningsdata
    const { table, method, params = {} } = await request.json();
    
    if (!table || !method) {
      return NextResponse.json({
        error: 'Ogiltiga parametrar',
        details: 'Både table och method måste anges'
      }, { status: 400 });
    }
    
    // Skapa en referens till tabellen
    const tableRef = supabase.from(table);
    
    // Utför förfrågan baserat på metod
    let result;
    
    switch (method) {
      case 'select':
        const { columns, filter, limit, single } = params;
        
        let query = tableRef.select(columns || '*');
        
        if (filter) {
          const { column, operator, value } = filter;
          query = query.filter(column, operator, value);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        if (single) {
          result = await query.single();
        } else {
          result = await query;
        }
        
        break;
        
      case 'insert':
        const { records } = params;
        result = await tableRef.insert(records);
        break;
        
      case 'update':
        const { updates, match } = params;
        result = await tableRef.update(updates).match(match);
        break;
        
      case 'delete':
        const { matchDelete } = params;
        result = await tableRef.delete().match(matchDelete);
        break;
        
      default:
        return NextResponse.json({
          error: 'Ogiltig metod',
          details: `Metoden '${method}' stöds inte`
        }, { status: 400 });
    }
    
    // Returnera resultatet
    return NextResponse.json({
      success: !result.error,
      data: result.data,
      error: result.error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Proxy-fel:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.cause ? String(error.cause) : undefined,
      stack: error.stack ? error.stack.split('\n')[0] : null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 