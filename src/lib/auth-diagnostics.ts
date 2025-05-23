import { Session } from '@supabase/supabase-js';

// Diagnostiken har inaktiverats för att förhindra prestandaproblem och Chrome-hängningar
const DIAGNOSTICS_ENABLED = false;

// Enkel typ för att behålla API-kompatibilitet
type DiagnosticEvent = {
  timestamp: number;
  type: 'cookie' | 'session' | 'network' | 'auth' | 'error';
  message: string;
  data?: any;
};

// Tom array för kompatibilitet
let diagnosticEvents: DiagnosticEvent[] = [];

/**
 * Inaktiverad diagnostikloggning
 */
export function logDiagnostic(
  type: DiagnosticEvent['type'], 
  message: string, 
  data?: any
) {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad cookie-snapshot
 */
export function snapshotCookies() {
  // Inaktiverad - gör ingenting
  return {};
}

/**
 * Inaktiverad session-snapshot
 */
export function snapshotSession(session: Partial<Session> | null) {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad storage-access logging
 */
export function logStorageAccess() {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad diagnostik-polling
 */
export function startDiagnosticPolling() {
  // Inaktiverad - returnerar tom cleanup-funktion
  return () => {};
}

/**
 * Returnerar tom array
 */
export function getDiagnosticEvents() {
  return [];
}

/**
 * Gör ingenting
 */
export function clearDiagnosticEvents() {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Returnerar tom diagnostikdata
 */
export function exportDiagnosticData() {
  return JSON.stringify({
    message: 'Diagnostik har inaktiverats för prestandaskäl',
    timestamp: new Date().toISOString()
  }, null, 2);
}

// Backward compatibility aliases
export const getDiagnosticLogs = getDiagnosticEvents;
export const clearDiagnosticLogs = clearDiagnosticEvents; 