'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function DebugInfo() {
  const [debug, setDebug] = useState<any>({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    loading: true,
    error: null,
    data: null,
    testUrl: null,
  });

  useEffect(() => {
    const testAPI = async () => {
      try {
        // Test direct fetch
        const testUrl = `${process.env.NEXT_PUBLIC_API_URL}/listings`;
        setDebug(prev => ({ ...prev, testUrl }));
        
        const response = await fetch(testUrl);
        const data = await response.json();
        
        setDebug(prev => ({
          ...prev,
          loading: false,
          data: data,
          status: response.status,
          error: null,
        }));
      } catch (error: any) {
        setDebug(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    };

    testAPI();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-auto text-xs z-50">
      <h3 className="font-bold mb-2">🔍 Debug Info</h3>
      <div className="space-y-1">
        <p><strong>API URL:</strong> {debug.apiUrl || 'NOT SET ❌'}</p>
        <p><strong>Test URL:</strong> {debug.testUrl}</p>
        <p><strong>Status:</strong> {debug.loading ? 'Loading...' : debug.status}</p>
        {debug.error && (
          <p className="text-red-400"><strong>Error:</strong> {debug.error}</p>
        )}
        {debug.data && (
          <p className="text-green-400">
            <strong>Listings:</strong> {Array.isArray(debug.data) ? debug.data.length : 'Not an array'}
          </p>
        )}
      </div>
    </div>
  );
}

