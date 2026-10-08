// ================================================================================================================
// FILE: mockBorrowers.ts
// PURPOSE: Provides fake data for the frontend 
// until the Django backend is ready. Throwaway feature for Discovery Phase.
// ===========================================================================

//Define the "Shape" of a Borrower using TypeScript.
export interface Borrower {
  id: number;
  firstName: string;
  lastName: string;
  unbId: string;
  status: 'Good Standing' | 'Overdue' | 'Blocked'; // Restricts status to these 3 options
}

//Create an array of fake borrowers. Exporting it so other files can import and use it.
export const mockBorrowers: Borrower[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    unbId: "12345678",
    status: "Good Standing"
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    unbId: "87654321",
    status: "Overdue"
  },
  {
    id: 3,
    firstName: "Alex",
    lastName: "Johnson",
    unbId: "11223344",
    status: "Good Standing"
  }
];