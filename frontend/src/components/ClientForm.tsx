/**
 * Client form component for creating and editing clients.
 * 
 * Provides form validation, submission handling, and role-based field access
 * for client management operations.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Client, ClientCreate, ClientStatus, ClientType, ClientUpdate } from '../types/client';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: ClientCreate | ClientUpdate) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    client_type: client?.client_type || ClientType.CUSTOMER,
    status: client?.status || ClientStatus.ACTIVE,
    relation_type: client?.relation_type || '',
    project_mgmt_tool: client?.project_mgmt_tool || '',
    comments: client?.comments || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        client_type: client.client_type,
        status: client.status,
        relation_type: client.relation_type,
        project_mgmt_tool: client.project_mgmt_tool || '',
        comments: client.comments || ''
      });
    }
  }, [client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Client name cannot exceed 255 characters';
    }

    if (!formData.relation_type.trim()) {
      newErrors.relation_type = 'Relation type is required';
    } else if (formData.relation_type.length > 100) {
      newErrors.relation_type = 'Relation type cannot exceed 100 characters';
    }

    if (!formData.client_type) {
      newErrors.client_type = 'Client type is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    // Optional field validation
    if (formData.project_mgmt_tool && formData.project_mgmt_tool.length > 100) {
      newErrors.project_mgmt_tool = 'Project management tool cannot exceed 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        name: formData.name.trim(),
        relation_type: formData.relation_type.trim(),
        project_mgmt_tool: formData.project_mgmt_tool.trim() || undefined,
        comments: formData.comments.trim() || undefined
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Client' : 'Create New Client'}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {isEditing 
            ? 'Update the client information below.'
            : 'Fill in the information for the new client.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter client name"
            maxLength={255}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Client Type and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="client_type" className="block text-sm font-medium text-gray-700 mb-1">
              Client Type <span className="text-red-500">*</span>
            </label>
            <select
              id="client_type"
              name="client_type"
              value={formData.client_type}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.client_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value={ClientType.CUSTOMER}>Customer</option>
              <option value={ClientType.PARTNER}>Partner</option>
              <option value={ClientType.INTERNAL}>Internal</option>
            </select>
            {errors.client_type && <p className="mt-1 text-sm text-red-600">{errors.client_type}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value={ClientStatus.ACTIVE}>Active</option>
              <option value={ClientStatus.INACTIVE}>Inactive</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
          </div>
        </div>

        {/* Relation Type */}
        <div>
          <label htmlFor="relation_type" className="block text-sm font-medium text-gray-700 mb-1">
            Relation Type <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="relation_type"
            name="relation_type"
            value={formData.relation_type}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.relation_type ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Direct Customer, Strategic Partner, Internal Department"
            maxLength={100}
          />
          {errors.relation_type && <p className="mt-1 text-sm text-red-600">{errors.relation_type}</p>}
        </div>

        {/* Project Management Tool */}
        <div>
          <label htmlFor="project_mgmt_tool" className="block text-sm font-medium text-gray-700 mb-1">
            Project Management Tool
          </label>
          <input
            type="text"
            id="project_mgmt_tool"
            name="project_mgmt_tool"
            value={formData.project_mgmt_tool}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.project_mgmt_tool ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Jira, Trello, Asana, Monday.com"
            maxLength={100}
          />
          {errors.project_mgmt_tool && <p className="mt-1 text-sm text-red-600">{errors.project_mgmt_tool}</p>}
        </div>

        {/* Comments */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about this client..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Client' : 'Create Client')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;