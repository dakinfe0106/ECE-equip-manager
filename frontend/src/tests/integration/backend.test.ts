import { describe, it, expect } from 'vitest';

describe('Backend Integration', () => {
  it('successfully reaches the health check endpoint', async () => {
    const response = await fetch('http://localhost:8000/api/health/');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});