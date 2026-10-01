// ==========================================
// FILE: AddBorrowerForm.tsx
// ==========================================

import { useState, type FormEvent } from 'react';

const AddBorrowerForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [unbId, setUnbId] = useState('');

  // Fix 1: Use FormEvent<HTMLFormElement> to satisfy the linter
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    
    const newBorrower = {
      firstName,
      lastName,
      unbId
    };

    console.log("Submitting new borrower:", newBorrower);
    
    setFirstName('');
    setLastName('');
    setUnbId('');
    
    alert("Borrower data logged to console! (Backend not connected yet)");
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Borrower</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fix 2: Add 'htmlFor' to label and 'id' to input */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
          <input 
            id="firstName"
            type="text" 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            required
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
          <input 
            id="lastName"
            type="text" 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            required
          />
        </div>

        <div>
          <label htmlFor="unbId" className="block text-sm font-medium text-gray-700">UNB ID</label>
          <input 
            id="unbId"
            type="text" 
            value={unbId}
            onChange={(e) => setUnbId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            required
          />
        </div>

        <button 
          type="submit" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Borrower
        </button>
      </form>
    </div>
  );
};

export default AddBorrowerForm;