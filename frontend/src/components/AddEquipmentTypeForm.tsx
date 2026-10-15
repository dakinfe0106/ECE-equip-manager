import React, { useState, useEffect } from 'react';

// Updated to match the team's database schema (category_id instead of id)
type Category = {
  category_id: number;
  name: string;
};

interface AddEquipmentTypeFormProps {
  onSuccess?: () => void;
}

/**
 * AddEquipmentTypeForm
 * Allows Shop Techs to create a new equipment type within a selected category.
 * Handles API submission and displays validation errors (like duplicates).
 */
export default function AddEquipmentTypeForm({ onSuccess }: AddEquipmentTypeFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on load to populate the dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/categories/', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error(err);
        setError('Could not load categories. Please ensure the backend is running.');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8000/api/equipment-types/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          name, 
          description: description || '', 
          category_id: categoryId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Extract the specific validation error message from our Django backend
        throw new Error(errorData.name?.[0] || errorData.detail || 'Failed to add equipment type.');
      }

      setSuccess('Equipment type added successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setCategoryId('');
      
      // Trigger the parent component to close the form and refresh the table
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unknown error occurred while adding the equipment type.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Add New Equipment Type</h2>
      
      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✅ {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')} 
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Type Name <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required
            placeholder="e.g., Standard Laptop"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description (Optional)
          </label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="e.g., Dell Optiplex machines"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Equipment Type'}
        </button>
      </form>
    </div>
  );
}