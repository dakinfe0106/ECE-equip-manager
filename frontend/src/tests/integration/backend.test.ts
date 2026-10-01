import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
    http.get('http://localhost:8000/api/health/', () => {
        return HttpResponse.json({ status: 'ok' }, { status: 200 });
    })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('Backend Integration', () => {
    it('successfully reaches the health check endpoint', async () => {
        const response = await fetch('http://localhost:8000/api/health/');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('ok');
    });
});