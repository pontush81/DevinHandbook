// =============================================
// API ENDPOINT: PRESTANDASTATISTIK FÖR ADMIN
// =============================================

import { NextApiRequest, NextApiResponse } from 'next'
import { getAdminClient } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getAdminClient()
    const { handbook_id, days = '7' } = req.query

    if (!handbook_id || typeof handbook_id !== 'string') {
      return res.status(400).json({ error: 'handbook_id is required' })
    }

    // Get user from auth header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split('Bearer ')[1]
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Verify user has access to this handbook
    const { data: membership } = await supabase
      .from('handbook_members')
      .select('handbook_id')
      .eq('user_id', user.id)
      .eq('handbook_id', handbook_id)
      .single()

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this handbook' })
    }

    // Convert days to number
    const daysNum = parseInt(days as string, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)

    // Get performance logs for this handbook
    const { data: logs, error: logsError } = await supabase
      .from('performance_logs')
      .select('*')
      .eq('handbook_id', handbook_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Handle missing table gracefully
    if (logsError) {
      console.error('Error fetching performance logs:', logsError)
      
      // If table doesn't exist, return empty data instead of error
      if (logsError.code === '42P01') {
        console.log('Performance logs table does not exist, returning empty data')
        const emptyData = {
          handbook_id,
          period: `${days} days`,
          stats: {
            totalRequests: 0,
            averageResponseTime: 0,
            slowRequests: 0,
            errorRequests: 0,
            slowRequestPercentage: 0,
            errorPercentage: 0
          },
          health: {
            status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
            responseTime: 0,
            timestamp: new Date().toISOString(),
            details: {
              database: 'ok' as 'ok' | 'error',
              memory: 'ok' as 'ok' | 'warning' | 'error',
              cpu: 'ok' as 'ok' | 'warning' | 'error'
            }
          },
          recentLogs: [],
          endpointBreakdown: {},
          hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
            hour: i.toString().padStart(2, '0') + ':00',
            requests: 0,
            averageTime: 0,
            errorRate: 0
          })),
          generatedAt: new Date().toISOString(),
          note: 'Performance logging table not yet created. Run database migrations to enable performance monitoring.'
        }
        return res.status(200).json(emptyData)
      }
      
      return res.status(500).json({ error: 'Failed to fetch performance data' })
    }

    // Calculate statistics
    const totalRequests = logs.length
    const responseTimesMs = logs.map(log => log.response_time_ms).filter(Boolean)
    const averageResponseTime = responseTimesMs.length > 0 
      ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length 
      : 0

    const slowRequests = logs.filter(log => log.response_time_ms > 1000).length
    const errorRequests = logs.filter(log => log.status_code >= 400).length

    const slowRequestPercentage = totalRequests > 0 
      ? (slowRequests / totalRequests) * 100 
      : 0
    const errorPercentage = totalRequests > 0 
      ? (errorRequests / totalRequests) * 100 
      : 0

    // Create health check
    const health = {
      status: (
        errorPercentage > 10 ? 'unhealthy' :
        errorPercentage > 5 || slowRequestPercentage > 20 ? 'degraded' : 
        'healthy'
      ) as 'healthy' | 'degraded' | 'unhealthy',
      responseTime: averageResponseTime,
      timestamp: new Date().toISOString(),
      details: {
        database: logs.length > 0 ? 'ok' : 'error' as 'ok' | 'error',
        memory: 'ok' as 'ok' | 'warning' | 'error',
        cpu: 'ok' as 'ok' | 'warning' | 'error'
      }
    }

    // Group by endpoint
    const endpointBreakdown: { [key: string]: any } = {}
    logs.forEach(log => {
      const key = `${log.http_method} ${log.endpoint_path}`
      if (!endpointBreakdown[key]) {
        endpointBreakdown[key] = {
          requests: 0,
          averageTime: 0,
          slowRequests: 0,
          errorRequests: 0,
          totalTime: 0
        }
      }
      endpointBreakdown[key].requests++
      endpointBreakdown[key].totalTime += log.response_time_ms
      if (log.response_time_ms > 1000) endpointBreakdown[key].slowRequests++
      if (log.status_code >= 400) endpointBreakdown[key].errorRequests++
    })

    // Calculate averages
    Object.keys(endpointBreakdown).forEach(key => {
      const endpoint = endpointBreakdown[key]
      endpoint.averageTime = endpoint.totalTime / endpoint.requests
      delete endpoint.totalTime
    })

    // Create hourly trends
    const hourlyTrends = []
    for (let i = 0; i < 24; i++) {
      const hour = new Date()
      hour.setHours(i, 0, 0, 0)
      const nextHour = new Date(hour)
      nextHour.setHours(i + 1)

      const hourLogs = logs.filter(log => {
        const logTime = new Date(log.created_at)
        return logTime >= hour && logTime < nextHour
      })

      const hourlyResponseTimes = hourLogs.map(log => log.response_time_ms).filter(Boolean)
      const hourlyAverage = hourlyResponseTimes.length > 0 
        ? hourlyResponseTimes.reduce((a, b) => a + b, 0) / hourlyResponseTimes.length 
        : 0

      const hourlyErrors = hourLogs.filter(log => log.status_code >= 400).length
      const hourlyErrorRate = hourLogs.length > 0 ? (hourlyErrors / hourLogs.length) * 100 : 0

      hourlyTrends.push({
        hour: hour.getHours().toString().padStart(2, '0') + ':00',
        requests: hourLogs.length,
        averageTime: hourlyAverage,
        errorRate: hourlyErrorRate
      })
    }

    // Get recent logs (last 10)
    const recentLogs = logs.slice(0, 10).map(log => ({
      id: log.id,
      endpoint_path: log.endpoint_path,
      method: log.http_method,
      response_time_ms: log.response_time_ms,
      status_code: log.status_code,
      user_agent: log.user_agent || 'Unknown',
      created_at: log.created_at,
      error_message: log.error_message
    }))

    const performanceData = {
      handbook_id,
      period: `${days} days`,
      stats: {
        totalRequests,
        averageResponseTime,
        slowRequests,
        errorRequests,
        slowRequestPercentage,
        errorPercentage
      },
      health,
      recentLogs,
      endpointBreakdown,
      hourlyTrends,
      generatedAt: new Date().toISOString()
    }

    res.status(200).json(performanceData)
  } catch (error) {
    console.error('Error in performance stats API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 