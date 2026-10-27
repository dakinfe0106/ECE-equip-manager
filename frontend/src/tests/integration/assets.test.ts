import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiBaseUrl } from '../../api';
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
    http.get(`${apiBaseUrl}/assets/`, () => {
        return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] }, { status: 200 });
    })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Assets API client with mocked HTTP', () => {
    it('loads the first page of assets and returns category and type details', async () => {
        const data = await fetchAssets();

        expect(data).toEqual({ count: 1, next: null, previous: null, results: [asset] });
    });

    it('searches assets by text and requests the selected page', async () => {
        let requestedUrl = '';
        server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
            requestedUrl = request.url;
            return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] });
        }));

        const data = await fetchAssets(2, ' EMS-00 ');

        expect(new URL(requestedUrl).searchParams.get('page')).toBe('2');
        expect(new URL(requestedUrl).searchParams.get('search')).toBe('EMS-00');
        expect(data.results).toEqual([asset]);
    });

    it('sends category and equipment type filters with the asset query', async () => {
        let requestedUrl = '';
        server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
            requestedUrl = request.url;
            return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] });
        }));

        await fetchAssets(1, 'drill', { categoryId: 4, equipmentTypeId: 9 });

        const params = new URL(requestedUrl).searchParams;
        expect(params.get('search')).toBe('drill');
        expect(params.get('category_id')).toBe('4');
        expect(params.get('equipment_type_id')).toBe('9');
    });

    it('reports authorization failures from the backend', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, () => new HttpResponse(null, { status: 403 })));

        await expect(fetchAssets()).rejects.toMatchObject({ status: 403 });
    });
});
