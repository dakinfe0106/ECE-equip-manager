import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiBaseUrl } from '../../api';
import { fetchAllAssets, fetchAssets } from '../../features/assets/api';

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

    it('keeps the message from a DRF error response', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, () =>
            HttpResponse.json({ detail: 'A server error occurred.' }, { status: 500 }),
        ));

        await expect(fetchAssets()).rejects.toMatchObject({
            status: 500,
            message: 'A server error occurred.',
        });
    });

    it('falls back to the HTTP status when the error has no JSON body', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, () => new HttpResponse('Bad gateway', { status: 502 })));

        await expect(fetchAssets()).rejects.toMatchObject({
            status: 502,
            message: 'Asset lookup failed (502)',
        });
    });

    it('rejects without a status when the server cannot be reached', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, () => HttpResponse.error()));

        await expect(fetchAssets()).rejects.toBeInstanceOf(TypeError);
    });
});

describe('fetchAllAssets with mocked HTTP', () => {
    const assets = Array.from({ length: 45 }, (_, index) => ({
        ...asset,
        asset_id: index + 1,
        asset_identifier: `SHOP-${index + 1}`,
    }));

    it('requests every page with the same search and returns all assets in order', async () => {
        const requested: URLSearchParams[] = [];
        server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
            const params = new URL(request.url).searchParams;
            requested.push(params);
            const page = Number(params.get('page'));
            return HttpResponse.json({
                count: assets.length,
                next: null,
                previous: null,
                results: assets.slice((page - 1) * 20, page * 20),
            });
        }));

        const results = await fetchAllAssets('SHOP');

        expect(requested.map((params) => params.get('page')).sort()).toEqual(['1', '2', '3']);
        expect(requested.every((params) => params.get('search') === 'SHOP')).toBe(true);
        expect(results.map((result) => result.asset_id)).toEqual(assets.map((item) => item.asset_id));
    });

    it('makes one request when everything fits on the first page', async () => {
        let requests = 0;
        server.use(http.get(`${apiBaseUrl}/assets/`, () => {
            requests += 1;
            return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] });
        }));

        expect(await fetchAllAssets()).toEqual([asset]);
        expect(requests).toBe(1);
    });

    it('fails if any page fails', async () => {
        server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
            const page = new URL(request.url).searchParams.get('page');
            return page === '2'
                ? HttpResponse.json({ detail: 'Page failed.' }, { status: 500 })
                : HttpResponse.json({ count: 45, next: null, previous: null, results: assets.slice(0, 20) });
        }));

        await expect(fetchAllAssets()).rejects.toMatchObject({ status: 500, message: 'Page failed.' });
    });
});
