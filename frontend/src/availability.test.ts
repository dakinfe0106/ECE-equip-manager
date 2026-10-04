import { describe, expect, it } from 'vitest';
import { countByType } from './availability';

describe('countByType', () => {
  it('counts assets per type and status', () => {
    const counts = countByType([
      { id: '1', type: 'Laptop', status: 'Available' },
      { id: '2', type: 'Laptop', status: 'On_Loan' },
      { id: '3', type: 'Laptop', status: 'Available' },
    ]);
    expect(counts.Laptop).toEqual({ Available: 2, On_Loan: 1, Under_Maintenance: 0, Retired: 0 });
  });
});