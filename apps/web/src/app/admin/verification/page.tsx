'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FileText, Check, X, Plus, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
}

interface PropertyDocument {
  property_id: string;
  property_name: string;
  host_name: string;
  host_email: string;
  documents: Document[];
  property_details: any;
}

export default function DocumentVerificationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [propertyDocuments, setPropertyDocuments] = useState<PropertyDocument[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<string[]>(['ID', 'Business License', 'Property Ownership']);
  const [newDocType, setNewDocType] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<PropertyDocument | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load property documents
    loadPropertyDocuments();
  }, []);

  const loadPropertyDocuments = async () => {
    // In a real app, you'd fetch from database
    const mockData: PropertyDocument[] = [
      {
        property_id: 'prop1',
        property_name: 'Cozy Mountain Cabin',
        host_name: 'John Host',
        host_email: 'john@example.com',
        documents: [
          {
            id: 'doc1',
            type: 'ID',
            url: '/placeholder-doc.pdf',
            status: 'pending',
            uploaded_at: new Date().toISOString(),
          },
          {
            id: 'doc2',
            type: 'Business License',
            url: '/placeholder-doc.pdf',
            status: 'approved',
            uploaded_at: new Date().toISOString(),
          },
        ],
        property_details: {
          location: 'Mountain View, CA',
          bedrooms: 3,
          bathrooms: 2,
        },
      },
    ];
    setPropertyDocuments(mockData);
  };

  const handleApproveDocument = async (propertyId: string, docId: string) => {
    setPropertyDocuments(
      propertyDocuments.map((pd) =>
        pd.property_id === propertyId
          ? {
              ...pd,
              documents: pd.documents.map((d) =>
                d.id === docId ? { ...d, status: 'approved' as const } : d
              ),
            }
          : pd
      )
    );
    toast.success('Document approved');
  };

  const handleRejectDocument = async (propertyId: string, docId: string) => {
    setPropertyDocuments(
      propertyDocuments.map((pd) =>
        pd.property_id === propertyId
          ? {
              ...pd,
              documents: pd.documents.map((d) =>
                d.id === docId ? { ...d, status: 'rejected' as const } : d
              ),
            }
          : pd
      )
    );
    toast.success('Document rejected');
  };

  const handleAddRequiredDoc = () => {
    if (newDocType.trim() && !requiredDocs.includes(newDocType.trim())) {
      setRequiredDocs([...requiredDocs, newDocType.trim()]);
      setNewDocType('');
      toast.success('Required document added');
    }
  };

  const handleRemoveRequiredDoc = (docType: string) => {
    setRequiredDocs(requiredDocs.filter((d) => d !== docType));
    toast.success('Required document removed');
  };

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
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
          <p className="text-mist-500 mt-1">Review and verify property owner documents</p>
        </div>

        {/* Required Documents Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Required Documents</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {requiredDocs.map((doc) => (
              <span
                key={doc}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
              >
                {doc}
                <button
                  onClick={() => handleRemoveRequiredDoc(doc)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add new required document type"
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleAddRequiredDoc}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
        </div>

        {/* Property Documents List */}
        <div className="space-y-4">
          {propertyDocuments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-mist-400 mx-auto mb-4" />
              <p className="text-mist-500">No property documents pending verification</p>
            </div>
          ) : (
            propertyDocuments.map((property) => (
              <div
                key={property.property_id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.property_name}</h3>
                    <p className="text-sm text-mist-500">
                      Host: {property.host_name} ({property.host_email})
                    </p>
                    <p className="text-sm text-mist-500">
                      Location: {property.property_details.location}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProperty(property)}
                    className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>

                <div className="space-y-3">
                  {property.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-mist-400" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.type}</p>
                          <p className="text-xs text-mist-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            doc.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                        {doc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveDocument(property.property_id, doc.id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectDocument(property.property_id, doc.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Property Details Modal */}
        {selectedProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="text-mist-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Property Information</h3>
                    <p className="text-gray-600">{selectedProperty.property_name}</p>
                    <p className="text-gray-600">{selectedProperty.property_details.location}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Host Information</h3>
                    <p className="text-gray-600">{selectedProperty.host_name}</p>
                    <p className="text-gray-600">{selectedProperty.host_email}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Property Details</h3>
                    <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                      {JSON.stringify(selectedProperty.property_details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

