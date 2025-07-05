// =============================================
// ENKEL PRESTANDALOGGNING (utan middleware)
// =============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service client för performance logging
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

export interface PerformanceLog {
  endpoint_path: string
  http_method: string
  response_time_ms: number
  status_code: number
  handbook_id?: string
  user_id?: string
  error_message?: string
  metadata?: any
}

// Enkel funktion för att logga API-prestanda
export async function logPerformance(log: PerformanceLog) {
  try {
    await supabaseService
      .from('performance_metrics')
      .insert({
        timestamp: new Date().toISOString(),
        handbook_id: log.handbook_id,
        endpoint_path: log.endpoint_path,
        http_method: log.http_method,
        response_time_ms: log.response_time_ms,
        status_code: log.status_code,
        user_id: log.user_id,
        error_message: log.error_message,
        metadata: log.metadata || {}
      })
  } catch (error) {
    // Tyst fel - vi vill inte att performance logging ska krascha appen
    console.error('Performance logging failed:', error)
  }
}

// Wrapper för att mäta prestanda på befintliga funktioner
export function measurePerformance<T>(
  fn: () => Promise<T>,
  config: {
    endpoint_path: string
    http_method: string
    handbook_id?: string
    user_id?: string
  }
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Logga endast om det tar mer än 100ms (för att undvika spam)
      if (duration > 100) {
        await logPerformance({
          ...config,
          response_time_ms: duration,
          status_code: 200
        })
      }
      
      resolve(result)
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      await logPerformance({
        ...config,
        response_time_ms: duration,
        status_code: 500,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      reject(error)
    }
  })
}

// Hälsokontroll för kritiska endpoints
export async function healthCheck(): Promise<{
  database: boolean
  api: boolean
  timestamp: string
}> {
  const startTime = Date.now()
  
  try {
    // Testa databas-anslutning
    const { data } = await supabaseService
      .from('handbooks')
      .select('count')
      .limit(1)
      .single()
    
    const dbTime = Date.now() - startTime
    
    return {
      database: dbTime < 1000, // OK om < 1 sekund
      api: true,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      database: false,
      api: false,
      timestamp: new Date().toISOString()
    }
  }
}

// Hämta prestandastatistik för admin
export async function getPerformanceStats(handbook_id: string, days: number = 7) {
  try {
    const { data } = await supabaseService
      .from('performance_metrics')
      .select('*')
      .eq('handbook_id', handbook_id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (!data) return null
    
    // Grundläggande statistik
    const totalRequests = data.length
    const averageResponseTime = data.reduce((sum, log) => sum + log.response_time_ms, 0) / totalRequests
    const slowRequests = data.filter(log => log.response_time_ms > 1000).length
    const errorRequests = data.filter(log => log.status_code >= 400).length
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRequests,
      slowRequestPercentage: Math.round((slowRequests / totalRequests) * 100),
      errorPercentage: Math.round((errorRequests / totalRequests) * 100),
      period: `${days} days`
    }
  } catch (error) {
    console.error('Failed to get performance stats:', error)
    return null
  }
} 