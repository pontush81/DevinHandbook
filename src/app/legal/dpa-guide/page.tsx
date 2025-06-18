import React from "react";
import { Shield, CheckCircle, ExternalLink, FileText } from 'lucide-react';

export default function DPAGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-8">
            <Shield className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Personuppgiftsbiträdesavtal (DPA)
            </h1>
          </div>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              Denna guide förklarar hur vi säkerställer att dina personuppgifter behandlas 
              säkert och i enlighet med GDPR genom våra personuppgiftsbiträdesavtal.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    ✅ Alla DPA:er är aktiva
                  </h3>
                  <p className="text-green-800 text-sm">
                    Vi har personuppgiftsbiträdesavtal med samtliga leverantörer som 
                    behandlar personuppgifter för vår räkning. Alla avtal aktiveras 
                    automatiskt och kräver ingen manuell hantering.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Våra leverantörer och DPA:er</h2>
            
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Supabase</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Aktiv</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Databas och autentisering</p>
                <p className="text-xs text-gray-500 mb-2">DPA aktivt via Terms of Service</p>
                <a 
                  href="https://supabase.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Dokumentation <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Stripe</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Aktiv</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Betalningar</p>
                <p className="text-xs text-gray-500 mb-2">DPA aktivt via Terms of Service</p>
                <a 
                  href="https://stripe.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Dokumentation <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Resend</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Aktiv</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">E-postkommunikation</p>
                <p className="text-xs text-gray-500 mb-2">DPA aktivt via Terms of Service</p>
                <a 
                  href="https://resend.com/legal/dpa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Dokumentation <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Vercel</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Aktiv</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Hosting och infrastruktur</p>
                <p className="text-xs text-gray-500 mb-2">DPA aktivt via Terms of Service</p>
                <a 
                  href="https://vercel.com/legal/dpa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Dokumentation <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Säkerhetsåtgärder</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Tekniska säkerhetsåtgärder</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Kryptering:</strong> AES-256 för data i vila, TLS 1.2+ för överföring</li>
                <li>• <strong>Åtkomstkontroll:</strong> Rollbaserad autentisering</li>
                <li>• <strong>Backuper:</strong> Automatiska med geografisk redundans</li>
                <li>• <strong>Övervakning:</strong> 24/7 säkerhetsövervakning</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-purple-900 mb-3">Organisatoriska säkerhetsåtgärder</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• <strong>Personalutbildning:</strong> Obligatorisk säkerhets- och integritetsskydd</li>
                <li>• <strong>Åtkomstkontroll:</strong> Principen om minsta privilegium</li>
                <li>• <strong>Incidenthantering:</strong> Strukturerade processer</li>
                <li>• <strong>Revisioner:</strong> SOC 2, ISO 27001, PCI DSS</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold mb-4">GDPR-compliance</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-3">Dataöverföringar utanför EU</h3>
              <p className="text-sm text-gray-700 mb-3">
                Alla våra leverantörer använder godkända metoder för säker dataöverföring:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Standard Contractual Clauses (SCCs)</strong> för EU-överföringar</li>
                <li>• <strong>UK IDTA</strong> för UK-överföringar</li>
                <li>• <strong>Swiss DPA</strong> för Schweiz-överföringar</li>
                <li>• <strong>Adequacy decisions</strong> där tillämpligt</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold mb-3">Dina rättigheter</h3>
              <p className="text-sm text-gray-700 mb-3">
                Alla DPA:er stöder dina rättigheter enligt GDPR:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Rätt till tillgång till dina personuppgifter</li>
                <li>• Rätt till rättelse av felaktiga uppgifter</li>
                <li>• Rätt till radering (rätten att bli glömd)</li>
                <li>• Rätt till dataportabilitet</li>
                <li>• Rätt att invända mot behandling</li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
              <p className="text-sm text-gray-700 mb-4">
                Om du har frågor om våra personuppgiftsbiträdesavtal eller dataskydd, 
                kontakta oss gärna:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>E-post:</strong> privacy@handbok.org<br />
                  <strong>Adress:</strong> [FÖRETAGSADRESS]<br />
                  <strong>Telefon:</strong> [TELEFONNUMMER]
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 