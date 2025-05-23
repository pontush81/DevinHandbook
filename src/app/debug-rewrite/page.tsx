"use client";

export default function DebugRewritePage() {
  return (
    <div className="min-h-screen bg-red-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-red-800">🚨 REWRITE DEBUG PAGE</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">This page should NOT appear on subdomains!</h2>
          
          <div className="space-y-4 text-sm">
            <div className="bg-yellow-100 p-4 rounded">
              <strong>If you see this page on a subdomain like bryr.handbok.org:</strong>
              <br />
              ❌ The rewrite rules are NOT working correctly
            </div>
            
            <div className="bg-green-100 p-4 rounded">
              <strong>If subdomains show the handbook instead:</strong>
              <br />
              ✅ The rewrite rules ARE working correctly
            </div>
            
            <div className="bg-blue-100 p-4 rounded">
              <strong>This page should only be visible at:</strong>
              <br />
              • https://www.handbok.org/debug-rewrite
              <br />
              • localhost:3000/debug-rewrite
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Test Links:</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://bryr.handbok.org" 
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  🔗 Test bryr.handbok.org (should show handbook)
                </a>
              </li>
              <li>
                <a 
                  href="https://www.handbok.org/handbook/bryr" 
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  🔗 Test direct handbook URL (should work)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 