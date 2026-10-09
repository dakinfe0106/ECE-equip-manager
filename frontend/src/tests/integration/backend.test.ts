import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiBaseUrl, fetchHealthCheck } from '../../api';
import { fetchAssets } from '../../features/assets/api';

const asset = {
    asset_id: 1,
    asset_identifier: 'SHOP-001',
    name: 'Cordless drill',
    acquisition_date: '2024-03-15',
    status: 'Available' as const,
    equipment_type: {
        type_id: 1,
        name: 'Power tools',
        description: 'Portable power tools',
        category: {
            category_id: 1,
            name: 'Tools',
        },
    },
};

const server = setupServer(
    http.get(`${apiBaseUrl}/health/`, () => {
        return HttpResponse.json({ status: 'ok' }, { status: 200 });
    }),
    http.get(`${apiBaseUrl}/assets/`, () => {
        return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] }, { status: 200 });
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

    it('loads the first page of assets and returns category and type details', async () => {
        const data = await fetchAssets();

        expect(data).toEqual({ count: 1, next: null, previous: null, results: [asset] });
    });

    it('filters assets by a partial Asset ID and requests the selected page', async () => {
        let requestedUrl = '';
        server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
            requestedUrl = request.url;
            return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] });
        }));

        const data = await fetchAssets(2, ' EMS-00 ');

        expect(new URL(requestedUrl).searchParams.get('page')).toBe('2');
        expect(new URL(requestedUrl).searchParams.get('asset_identifier')).toBe('EMS-00');
        expect(data.results).toEqual([asset]);
    });

    it('reports authorization failures from the backend', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, () => new HttpResponse(null, { status: 403 })));

        await expect(fetchAssets()).rejects.toMatchObject({ status: 403 });
    });
});
