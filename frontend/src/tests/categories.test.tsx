import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import type { Category, EquipmentType } from '../features/categories/api'
import CategoryTable from '../features/categories/components/CategoryTable'
import CategoryTypesDialog from '../features/categories/components/CategoryTypesDialog'
import EquipmentTypeTable from '../features/categories/components/EquipmentTypeTable'
import { technicianAuth, withAuth } from './authTestUtils'

function renderAt(path: string, auth = technicianAuth): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      {withAuth(<AppRoutes />, auth)}
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

describe('CategoryTable', () => {
  const categories: Category[] = [
    { category_id: 1, name: 'Tools', is_deleted: false, equipment_type_count: 2 },
    { category_id: 12, name: 'Old Stock', is_deleted: true, equipment_type_count: 1 },
    { category_id: 3, name: 'Power', is_deleted: false, equipment_type_count: 0 },
  ]
  const render = (list: Category[], errorMessage = '') =>
    renderToString(
      <CategoryTable
        categories={list}
        canChange
        canDelete
        emptyMessage="There are no categories yet."
        errorMessage={errorMessage}
        isLoading={false}
        onSelectCategory={() => {}}
      />,
    )
  const html = render(categories)

  it('has the mockup columns', () => {
    for (const heading of ['ID', 'Category Name', 'is_deleted', 'Actions']) {
      expect(html).toContain(`>${heading}</th>`)
    }
  })

  it('shows one row per category with a two-digit ID', () => {
    expect(html.match(/<tr/g)).toHaveLength(4) // header row + 3 categories
    expect(html).toContain('>01</td>')
    expect(html).toContain('>12</td>')
  })

  it('shows each category name as a button that opens its equipment types popup', () => {
    const nameButtons = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>[^<]*<\/button>/g) ?? []

    expect(nameButtons).toHaveLength(3)
    expect(nameButtons.join('')).toContain('>Old Stock</button>')
    expect(html).not.toContain('href="/categories/')
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
    const actionButtons = html.match(/<button[^>]*aria-label="(?:Edit|Delete) [^>]*>/g) ?? []
    for (const button of actionButtons) {
      expect(button).toContain('disabled')
    }
  })

  it('does not show mutation actions to a view-only user', () => {
    const html = renderToString(
      <CategoryTable
        categories={categories}
        canChange={false}
        canDelete={false}
        emptyMessage="There are no categories yet."
        errorMessage=""
        isLoading={false}
        onSelectCategory={() => {}}
      />,
    )
    expect(html).not.toContain('aria-label="Edit Tools (coming soon)"')
    expect(html).not.toContain('aria-label="Delete Tools (coming soon)"')
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

describe('EquipmentTypeTable', () => {
  const category = { category_id: 2, name: 'Lab Gear' }
  const types: EquipmentType[] = [
    { type_id: 3, name: 'Oscilloscope', description: 'Bench scope', category },
    { type_id: 14, name: 'Multimeter', description: '', category },
  ]

  it('lists each type with a two-digit ID, its name and description', () => {
    const html = renderToString(<EquipmentTypeTable equipmentTypes={types} />)

    for (const heading of ['ID', 'Name', 'Description']) {
      expect(html).toContain(`>${heading}</th>`)
    }
    expect(html.match(/<tr/g)).toHaveLength(3) // header row + 2 types
    expect(html).toContain('>03</td>')
    expect(html).toContain('>14</td>')
    expect(html).toContain('Oscilloscope')
    expect(html).toContain('Bench scope')
  })

  it('shows a dash when a type has no description', () => {
    const html = renderToString(<EquipmentTypeTable equipmentTypes={[types[1]]} />)

    expect(html).toContain('>—</td>')
  })

  it('says so when the category has no equipment types', () => {
    const html = renderToString(<EquipmentTypeTable equipmentTypes={[]} />)

    expect(html).toContain('This category has no equipment types yet.')
  })
})

describe('CategoryTypesDialog', () => {
  const tools: Category = { category_id: 1, name: 'Tools', is_deleted: false, equipment_type_count: 2 }
  const render = (category: Category) =>
    renderToString(<CategoryTypesDialog category={category} onClose={() => {}} />)

  it('is a modal dialog named after the category', () => {
    const html = render(tools)

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="category-types-title"')
    expect(html).toContain('id="category-types-title">Tools</h2>')
    expect(html).toContain('Equipment types in this category')
  })

})
