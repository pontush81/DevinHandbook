'use client';

import { useState, useEffect } from 'react';
import styles from './test.module.css';

export default function ResourceTestPage() {
  const [tests, setTests] = useState({
    css: { status: 'pending', message: 'Testing CSS loading...' },
    js: { status: 'pending', message: 'Testing JS resources...' },
    image: { status: 'pending', message: 'Testing image loading...' },
    api: { status: 'pending', message: 'Testing API connectivity...' },
    cors: { status: 'pending', message: 'Testing CORS configuration...' }
  });
  
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [host, setHost] = useState('');
  
  useEffect(() => {
    setHost(window.location.host);
    runTests();
  }, []);
  
  async function runTests() {
    // Test CSS
    try {
      const div = document.createElement('div');
      div.id = 'css-test-element';
      document.body.appendChild(div);
      
      // Apply style and check if it worked
      div.className = styles.testElement;
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const computedStyle = window.getComputedStyle(div);
      const hasBgColor = computedStyle.backgroundColor === 'rgb(240, 240, 240)';
      
      setTests(prev => ({
        ...prev,
        css: {
          status: hasBgColor ? 'success' : 'failed',
          message: hasBgColor ? 'CSS loaded successfully' : 'CSS failed to load properly'
        }
      }));
      
      document.body.removeChild(div);
    } catch (error) {
      setTests(prev => ({
        ...prev,
        css: { status: 'failed', message: `CSS test error: ${error.message}` }
      }));
    }
    
    // Test JS (this is already running, so JS works if we got here)
    setTests(prev => ({
      ...prev,
      js: { status: 'success', message: 'JavaScript is working correctly' }
    }));
    
    // Test image loading
    try {
      const imgUrl = '/logo.png';  // Antag att denna bild existerar i public-mappen
      const img = new Image();
      
      const imagePromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imgUrl;
      });
      
      await imagePromise;
      
      setTests(prev => ({
        ...prev,
        image: { status: 'success', message: 'Images load correctly' }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        image: { status: 'failed', message: `Image loading failed: ${error.message}` }
      }));
    }
    
    // Test API connectivity
    try {
      const response = await fetch('/api/diagnosis');
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      setDiagnosticData(data);
      
      setTests(prev => ({
        ...prev,
        api: { status: 'success', message: 'API connectivity works' }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        api: { status: 'failed', message: `API test failed: ${error.message}` }
      }));
    }
    
    // Test CORS with resource proxy
    try {
      const cssPath = '/_next/static/css/bb2534fb94d47e9a.css';
      const response = await fetch(`/api/resources?path=${encodeURIComponent(cssPath)}`);
      
      if (response.ok) {
        setTests(prev => ({
          ...prev,
          cors: { status: 'success', message: 'Resource proxy is working' }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          cors: { 
            status: 'failed', 
            message: `Resource proxy returned status ${response.status}` 
          }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        cors: { status: 'failed', message: `CORS test failed: ${error.message}` }
      }));
    }
  }
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'green';
      case 'failed': return 'red';
      default: return 'orange';
    }
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Resource Loading Test</h1>
      <p>Current host: <strong>{host}</strong></p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test Results</h2>
        {Object.entries(tests).map(([testName, { status, message }]) => (
          <div 
            key={testName}
            style={{ 
              margin: '10px 0', 
              padding: '10px', 
              border: `1px solid ${getStatusColor(status)}`,
              borderRadius: '4px'
            }}
          >
            <h3 style={{ margin: '0 0 5px 0', color: getStatusColor(status) }}>
              {testName.toUpperCase()}: {status.toUpperCase()}
            </h3>
            <p style={{ margin: 0 }}>{message}</p>
          </div>
        ))}
      </div>
      
      {diagnosticData && (
        <div style={{ marginTop: '20px' }}>
          <h2>Diagnostic Data</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '500px'
          }}>
            {JSON.stringify(diagnosticData, null, 2)}
          </pre>
        </div>
      )}
      
      <button 
        onClick={runTests}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Run Tests Again
      </button>
    </div>
  );
} 