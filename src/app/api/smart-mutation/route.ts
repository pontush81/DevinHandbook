import { NextRequest, NextResponse } from 'next/server';
import { getSmartClient } from '@/lib/smart-supabase-client';

export async function POST(request: NextRequest) {
  try {
    // Hämta förfrågningsdata
    const requestData = await request.json();
    const { type, table, data, updates, match } = requestData;
    
    if (!type || !table) {
      return NextResponse.json({
        success: false,
        error: 'Saknar obligatoriska fält: type, table'
      }, { status: 400 });
    }
    
    // Skapa en instans av SmartClient
    const smartClient = getSmartClient();
    
    // Utför olika operationer baserat på typ
    let result;
    
    switch (type) {
      case 'insert':
        if (!data) {
          return NextResponse.json({
            success: false,
            error: 'Saknar obligatoriskt fält: data'
          }, { status: 400 });
        }
        
        console.log(`Utför INSERT på ${table} med smart client`);
        result = await smartClient.insert(table, data);
        break;
        
      case 'update':
        if (!updates || !match) {
          return NextResponse.json({
            success: false,
            error: 'Saknar obligatoriska fält: updates, match'
          }, { status: 400 });
        }
        
        console.log(`Utför UPDATE på ${table} med smart client`);
        result = await smartClient.update(table, updates, match);
        break;
        
      case 'delete':
        if (!match) {
          return NextResponse.json({
            success: false,
            error: 'Saknar obligatoriskt fält: match'
          }, { status: 400 });
        }
        
        console.log(`Utför DELETE på ${table} med smart client`);
        result = await smartClient.delete(table, match);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Ogiltig operationstyp: ${type}`,
          validTypes: ['insert', 'update', 'delete']
        }, { status: 400 });
    }
    
    // Returnera resultat med information om vilken anslutningsmetod som användes
    return NextResponse.json({
      success: !result.error,
      data: result.data,
      error: result.error,
      source: result.source,
      operation: type,
      table,
      timestamp: new Date().toISOString()
    }, {
      status: result.error ? 500 : 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Smart mutation fel:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett okänt fel inträffade',
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
} 