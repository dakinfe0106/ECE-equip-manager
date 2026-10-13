import React, { useState, useEffect } from 'react';

type Category = {
  id: number;
  name: string;
};

/**
 * AddEquipmentTypeForm
 * Allows Shop Techs to create a new equipment type within a selected category.
 * Handles API submission and displays validation errors (like duplicates).
 */
export const AddEquipmentTypeForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setError('Could not load categories. Please refresh the page.');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:8000/api/equipment-types/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Note: We use category_id to match the write_only field we added in the serializer
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
      setName('');
      setDescription('');
      setCategoryId('');
      
      // Reload the page after a short delay so the new item appears in table
      setTimeout(() => window.location.reload(), 1500);

    } catch (err: unknown) {
      // Safely check if the error is an Error object before accessing .message
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unknown error occurred while adding the equipment type.';
      
      setError(errorMessage);
    }
  };

  return (
    <div className="add-equipment-type-form" style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '15px' }}>Add New Equipment Type</h2>
      
      {error && <p style={{ color: '#dc2626', marginBottom: '10px', fontSize: '0.9rem' }}>⚠️ {error}</p>}
      {success && <p style={{ color: '#16a34a', marginBottom: '10px', fontSize: '0.9rem' }}>✅ {success}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Category *</label>
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(Number(e.target.value))} 
            required
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Type Name *</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required
            placeholder="e.g., Standard Laptop"
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description (Optional)</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="e.g., Dell Optiplex machines"
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <button 
          type="submit" 
          style={{ padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Add Equipment Type
        </button>
      </form>
    </div>
  );
};
