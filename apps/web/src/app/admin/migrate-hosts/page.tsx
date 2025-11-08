'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function MigrateHostsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState('');
  const [allUsers, setAllUsers] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  const handleMigrate = async () => {
    if (!allUsers && !emails.trim()) {
      toast.error('Please provide email addresses or select "All Users"');
      return;
    }

    setMigrating(true);
    setResult(null);

    try {
      const emailArray = emails
        .split('\n')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const response = await fetch('/api/migrate-hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: allUsers ? undefined : emailArray,
          allUsers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
      toast.success(`Successfully migrated ${data.updatedCount} user(s) to host role`);
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Failed to migrate users');
      setResult({ error: error.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to Admin Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Migrate Users to Host</h1>
          <p className="text-gray-400">
            Update existing user accounts to have the 'host' role in their metadata
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <div className="space-y-6">
            {/* Warning */}
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                <strong>Warning:</strong> This will update user metadata in Supabase. Make sure you have the
                SUPABASE_SERVICE_ROLE_KEY environment variable set in your Vercel project settings.
              </p>
            </div>

            {/* Option: All Users */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allUsers"
                checked={allUsers}
                onChange={(e) => setAllUsers(e.target.checked)}
                className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-700 rounded bg-gray-800"
                disabled={migrating}
              />
              <label htmlFor="allUsers" className="text-white font-medium">
                Migrate all users (use with caution)
              </label>
            </div>

            {/* Email Input */}
            {!allUsers && (
              <div>
                <label htmlFor="emails" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Addresses (one per line)
                </label>
                <textarea
                  id="emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500 font-mono text-sm"
                  disabled={migrating}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter one email address per line. Users will be updated to have the 'host' role.
                </p>
              </div>
            )}

            {/* Migrate Button */}
            <button
              onClick={handleMigrate}
              disabled={migrating || (!allUsers && !emails.trim())}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrating ? 'Migrating...' : 'Migrate Users to Host'}
            </button>

            {/* Results */}
            {result && (
              <div className="mt-6">
                {result.error ? (
                  <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
                    <h3 className="text-red-300 font-semibold mb-2">Error</h3>
                    <p className="text-red-200 text-sm">{result.error}</p>
                  </div>
                ) : (
                  <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4">
                    <h3 className="text-emerald-300 font-semibold mb-2">Migration Complete</h3>
                    <p className="text-emerald-200 text-sm mb-2">
                      Successfully migrated <strong>{result.updatedCount}</strong> user(s) to host role.
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-yellow-300 text-sm font-semibold mb-1">Errors:</p>
                        <ul className="list-disc list-inside text-yellow-200 text-xs space-y-1">
                          {result.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 border-t border-gray-800 pt-6">
              <h3 className="text-white font-semibold mb-3">Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
                <li>
                  <strong>Option 1 (Recommended):</strong> Enter specific email addresses, one per line, and click
                  "Migrate Users to Host"
                </li>
                <li>
                  <strong>Option 2:</strong> Check "Migrate all users" to update all users in the system (use with
                  caution)
                </li>
                <li>
                  The migration will update the user's metadata in Supabase to set <code className="bg-gray-800 px-1 rounded">role: 'host'</code>
                </li>
                <li>
                  Users will need to log out and log back in to see the changes take effect
                </li>
                <li>
                  Make sure <code className="bg-gray-800 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is set in your
                  Vercel environment variables
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

