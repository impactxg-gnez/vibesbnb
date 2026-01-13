'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Upload, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadHeroImagePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [preview, setPreview] = useState<string>('');

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    router.push('/');
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById('hero-image') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Pass user role for demo account support
      const userRole = user?.user_metadata?.role || 'admin';
      formData.append('userRole', userRole);

      const response = await fetch('/api/upload-hero-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setImageUrl(result.url);
      toast.success('Image uploaded successfully!');
      toast.success(`Image URL: ${result.url}`, { duration: 5000 });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Upload Hero Background Image</h1>
          <p className="text-gray-500 mt-1">Upload the peace sign background image to Supabase Storage</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl">
          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image File
              </label>
              <input
                id="hero-image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                required
              />
            </div>

            {preview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg border border-gray-300"
                />
              </div>
            )}

            {imageUrl && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Upload Successful!</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Image URL:</p>
                <code className="block p-2 bg-white rounded border border-green-200 text-xs break-all">
                  {imageUrl}
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  Copy this URL and update the Hero component with it.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload to Supabase
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Go to your Supabase dashboard</li>
            <li>Navigate to Storage</li>
            <li>Create a new bucket named <code className="bg-blue-100 px-1 rounded">hero-images</code></li>
            <li>Set the bucket to <strong>Public</strong> (so images can be accessed via URL)</li>
            <li>Upload your image using the form above</li>
            <li>Copy the generated URL and update the Hero component</li>
          </ol>
        </div>
      </div>
    </AdminLayout>
  );
}

