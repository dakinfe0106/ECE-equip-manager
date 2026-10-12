import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import type { Category } from '../features/categories/api'
import CategoryTable from '../features/categories/components/CategoryTable'

function renderAt(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('Categories page', () => {
  const html = renderAt('/categories')

  it('shows the screen from the mockup: heading, Show filter and search box', () => {
    expect(html).toContain('>Categories</h1>')
    expect(html).toContain('Show:')
    expect(html).toContain('Active Records')
    expect(html).toContain('Deleted Records')
    expect(html).toContain('All Records')
    expect(html).toContain('placeholder="Search categories..."')
  })

  it('shows a loading message until the list arrives', () => {
    expect(html).toContain('Loading categories')
  })

  it('shows the Add Category button but keeps it switched off', () => {
    expect(html).toMatch(/<button[^>]*disabled[^>]*title="Coming soon"[^>]*>.*Add Category/s)
  })

  it('renders inside the shared sidebar layout with Categories highlighted', () => {
    expect(html).toContain('ECE Equipment')
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/categories"/)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  })
})

describe('Assets page navigation', () => {
  it('highlights Assets, not Categories, at the root and links to Categories', () => {
    const html = renderAt('/')

    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/"/)
    expect(html).toContain('href="/categories"')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  })
})

describe('Category page', () => {
  it('shows a link back to the list, a loading message, and keeps Categories highlighted', () => {
    const html = renderAt('/categories/3')

    expect(html).toContain('Back to Categories')
    expect(html).toContain('Loading category')
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/categories"/)
  })
})

describe('CategoryTable', () => {
  const categories: Category[] = [
    { category_id: 1, name: 'Tools', is_deleted: false, equipment_type_count: 2 },
    { category_id: 12, name: 'Old Stock', is_deleted: true, equipment_type_count: 1 },
    { category_id: 3, name: 'Power', is_deleted: false, equipment_type_count: 0 },
  ]
  const render = (list: Category[], errorMessage = '') =>
    renderToString(
      <MemoryRouter>
        <CategoryTable
          categories={list}
          emptyMessage="There are no categories yet."
          errorMessage={errorMessage}
          isLoading={false}
        />
      </MemoryRouter>,
    )
  const html = render(categories)

  it('has the mockup columns', () => {
    for (const heading of ['ID', 'Category Name', 'is_deleted', 'Actions']) {
      expect(html).toContain(`>${heading}</th>`)
    }
  })

  it('shows one row per category with a two-digit ID and a link to its page', () => {
    expect(html.match(/<tr/g)).toHaveLength(4) // header row + 3 categories
    expect(html).toContain('>01</td>')
    expect(html).toContain('>12</td>')
    expect(html).toContain('href="/categories/1"')
    expect(html).toContain('href="/categories/12"')
    expect(html).toContain('>Old Stock</a>')
  })

  it('shows how many equipment types each category has', () => {
    expect(html).toContain('2 types')
    expect(html).toContain('1 type<')
    expect(html).toContain('No types')
  })

  it('marks deleted categories differently from active ones', () => {
    expect(html.match(/>Active<\/span>/g)).toHaveLength(2)
    expect(html.match(/>Deleted<\/span>/g)).toHaveLength(1)
  })

  it('shows Edit and Delete for every row but keeps them switched off', () => {
    expect(html.match(/aria-label="Edit [^"]* \(coming soon\)"/g)).toHaveLength(3)
    expect(html.match(/aria-label="Delete [^"]* \(coming soon\)"/g)).toHaveLength(3)
    for (const button of html.match(/<button[^>]*>/g) ?? []) {
      expect(button).toContain('disabled')
    }
  })

  it('shows the empty message when there are no categories', () => {
    expect(render([])).toContain('There are no categories yet.')
  })

  it('shows a load-failure message instead of the empty message after an error', () => {
    const failed = render([], 'x')

    expect(failed).toContain('The category list could not be loaded.')
    expect(failed).not.toContain('There are no categories yet.')
  })
})
