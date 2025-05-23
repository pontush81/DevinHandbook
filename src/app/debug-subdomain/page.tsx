"use client";

import { useEffect, useState } from 'react';

export default function DebugSubdomainPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      hostname: window.location.hostname,
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      // Test if subdomain matches our regex
      isSubdomain: /(?!www|staging|api)[a-zA-Z0-9-]+\.handbok\.org/.test(window.location.hostname),
      extractedSubdomain: window.location.hostname.replace('.handbok.org', ''),
    };
    setDebugInfo(info);
  }, []);

  if (!debugInfo) return <div>Loading debug info...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subdomain Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Location</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
            <div><strong>Full URL:</strong> {debugInfo.href}</div>
            <div><strong>Pathname:</strong> {debugInfo.pathname}</div>
            <div><strong>Search:</strong> {debugInfo.search}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Subdomain Analysis</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>Is Subdomain:</strong> {debugInfo.isSubdomain ? '✅ YES' : '❌ NO'}</div>
            <div><strong>Extracted Subdomain:</strong> {debugInfo.extractedSubdomain}</div>
            <div><strong>Should Rewrite:</strong> {
              debugInfo.isSubdomain && !['www', 'staging', 'api'].includes(debugInfo.extractedSubdomain) 
                ? '✅ YES' : '❌ NO'
            }</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Expected Behavior</h2>
          <div className="space-y-2 text-sm">
            {debugInfo.isSubdomain && !['www', 'staging', 'api'].includes(debugInfo.extractedSubdomain) ? (
              <div className="text-green-600">
                ✅ This subdomain SHOULD be rewritten to: 
                <br />
                <code className="bg-gray-100 p-1 rounded">
                  https://www.handbok.org/handbook/{debugInfo.extractedSubdomain}/
                </code>
              </div>
            ) : (
              <div className="text-blue-600">
                ℹ️ This is not a regular subdomain or is excluded from rewriting.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Links</h2>
          <div className="space-y-2">
            <div>
              <a 
                href={`https://www.handbok.org/handbook/${debugInfo.extractedSubdomain}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Test Direct Handbook URL
              </a>
            </div>
            <div>
              <a 
                href="https://www.handbok.org/dashboard"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Test Dashboard (Should NOT rewrite)
              </a>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <details>
            <summary className="cursor-pointer font-medium">Raw Debug Data</summary>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
} 