'use client';

import Image from "next/image";
import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setHealthStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend');
      } finally {
        setLoading(false);
      }
    };

    checkBackendHealth();
  }, []);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Backend Health Check</h2>
          {loading && <p>Checking backend connection...</p>}
          {error && (
            <div className="text-red-600 dark:text-red-400">
              <p>❌ Backend connection failed: {error}</p>
            </div>
          )}
          {healthStatus && (
            <div className="text-green-600 dark:text-green-400">
              <p>✅ Backend is {healthStatus.status}</p>
              <p>Service: {healthStatus.service}</p>
              <p>Timestamp: {new Date(healthStatus.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>

        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            ClientOps monorepo with Docker setup completed
          </li>
          <li className="tracking-[-.01em]">
            Frontend (Next.js) ↔ Backend (FastAPI) ↔ MySQL integration working
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
          >
            🔄 Refresh Health Check
          </button>
        </div>
      </main>
    </div>
  );
}
