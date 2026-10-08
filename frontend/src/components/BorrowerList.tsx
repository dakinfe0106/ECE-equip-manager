// ==========================================
// FILE: BorrowerList.tsx
// ==========================================

// 1. Import the value (mockBorrowers) and the type (Borrower) separately
import { mockBorrowers, type Borrower } from '../data/mockBorrowers';

const BorrowerList = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Borrower List</h2>
      
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">ID</th>
            <th className="border p-2 text-left">First Name</th>
            <th className="border p-2 text-left">Last Name</th>
            <th className="border p-2 text-left">UNB ID</th>
            <th className="border p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockBorrowers.map((borrower: Borrower) => (
            <tr key={borrower.id} className="hover:bg-gray-50">
              <td className="border p-2">{borrower.id}</td>
              <td className="border p-2">{borrower.firstName}</td>
              <td className="border p-2">{borrower.lastName}</td>
              <td className="border p-2">{borrower.unbId}</td>
              <td className="border p-2">
                <span className={borrower.status === 'Overdue' ? 'text-red-600 font-bold' : 'text-green-600'}>
                  {borrower.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BorrowerList;