import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiBaseUrl, fetchHealthCheck } from '../../api';

const server = setupServer(
    http.get(`${apiBaseUrl}/health/`, () => {
        return HttpResponse.json({ status: 'ok' }, { status: 200 });
    })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Health check API client with mocked HTTP', () => {
    it('returns the health response', async () => {
        const data = await fetchHealthCheck();
        expect(data.status).toBe('ok');
    });

    it('rejects an unsuccessful health response', async () => {
        server.use(http.get(`${apiBaseUrl}/health/`, () => new HttpResponse(null, { status: 503 })));
        await expect(fetchHealthCheck()).rejects.toThrow('Health check failed (503)');
    });
});
