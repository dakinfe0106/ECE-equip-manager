
 // @vitest-environment jsdom

import { renderToString } from 'react-dom/server'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssetRecord } from '../features/assets/api'
import AssetDetails from '../features/assets/components/AssetDetails'
import AssetTable from '../features/assets/components/AssetTable'
import { technicianAuth, withAuth } from './authTestUtils'

function makeAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    asset_id: 1,
    asset_identifier: 'ECE-OSC-001',
    name: 'Rigol DS1054Z',
    acquisition_date: '2022-09-01',
    status: 'On_Loan',
    equipment_type: {
      type_id: 3,
      name: 'Oscilloscope',
      description: 'Digital storage oscilloscope',
      category: { category_id: 2, name: 'Test & Measurement' },
    },
    ...overrides,
  }
}

const noop = () => {}

function renderAssetDetails(onClose = vi.fn()) {
  const user = userEvent.setup()

  render(
    withAuth(
      <AssetDetails
        asset={makeAsset()}
        onAssetUpdated={noop}
        onClose={onClose}
      />,
    ),
  )

  return { user, onClose }
}

// jsdom does not implement the native dialog methods.
// These mocks allow the component's dialog behavior to be tested.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '')
  }

  HTMLDialogElement.prototype.close = function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
})

describe('AssetDetails modal', () => {
  it('shows every field required by the acceptance criteria', () => {
    const html = renderToString(
      withAuth(
        <AssetDetails
          asset={makeAsset()}
          onAssetUpdated={noop}
          onClose={noop}
        />,
      ),
    )

    expect(html).toContain('<dialog')
    expect(html).toContain('aria-labelledby="details-title"')
    expect(html).toContain('ECE-OSC-001')
    expect(html).toContain('Rigol DS1054Z')

    // Verify read-only fields.
    expect(html).toContain('Category · Read only')
    expect(html).toContain('Test &amp; Measurement')
    expect(html).toContain('Equipment Type · Read only')
    expect(html).toContain('Oscilloscope')

    expect(html).toContain('Acquisition Date')
    expect(html).toContain('2022-09-01')

    // Verify status badge rendering.
    expect(html).toContain('bg-yellow-100')
    expect(html).toContain('On Loan')

    // Verify edit mode controls.
    expect(html).toContain('Asset Name *')
    expect(html).toContain('Save Changes')
    expect(html).toContain('Close asset details')

    // Serial Number should not be displayed.
    expect(html).not.toContain('Serial Number')

    // Verify history placeholders.
    expect(html).toContain('View Lending History')
    expect(html).toContain('View Maintenance History')
  })

  it('says when the acquisition date is missing', () => {
    const html = renderToString(
      withAuth(
        <AssetDetails
          asset={makeAsset({ acquisition_date: null })}
          onAssetUpdated={noop}
          onClose={noop}
        />,
      ),
    )

    expect(html).toContain('Acquisition Date')
    expect(html).toContain('type="date"')
  })

  it('displays certifications in the input field when present', () => {
    const asset = makeAsset()

    asset.equipment_type.required_certifications = [
      { certification_id: 1, name: 'Lab Safety' },
      { certification_id: 2, name: 'High Voltage' },
    ]

    const html = renderToString(
      withAuth(
        <AssetDetails
          asset={asset}
          onAssetUpdated={noop}
          onClose={noop}
        />,
      ),
    )

    expect(html).toContain('Required Certifications')
    expect(html).toContain('Lab Safety, High Voltage')
  })

  it('shows empty certifications input when none exist', () => {
    const asset = makeAsset()
    asset.equipment_type.required_certifications = []

    const html = renderToString(
      withAuth(
        <AssetDetails
          asset={asset}
          onAssetUpdated={noop}
          onClose={noop}
        />,
      ),
    )

    expect(html).toContain('Required Certifications')
    expect(html).toContain('value="None"')
    expect(html).toContain('readOnly=""')
  })

  it('keeps Save Changes disabled until something changes', async () => {
    const { user } = renderAssetDetails()

    const saveButton = screen.getByRole('button', {
      name: 'Save Changes',
    })

    expect(saveButton.hasAttribute('disabled')).toBe(true)

    const nameInput = screen.getByLabelText('Asset Name *')

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated oscilloscope')

    expect(saveButton.hasAttribute('disabled')).toBe(false)
  })

  it('shows a validation error when the asset name contains only spaces', async () => {
    const { user } = renderAssetDetails()

    const nameInput = screen.getByLabelText('Asset Name *')

    await user.clear(nameInput)
    await user.type(nameInput, '   ')

    await user.click(
      screen.getByRole('button', { name: 'Save Changes' }),
    )

    const alert = screen.getByRole('alert')

    expect(alert.textContent).toContain(
      'Asset Name cannot be empty or contain only spaces.',
    )
  })

  it('warns before closing after edits and supports keeping or discarding changes', async () => {
    const { user, onClose } = renderAssetDetails()

    const nameInput = screen.getByLabelText('Asset Name *')

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated oscilloscope')

    // Attempt to close using the × button.
    await user.click(
      screen.getByRole('button', { name: 'Close asset details' }),
    )

    expect(screen.getByRole('alertdialog') !== null).toBe(true)
    expect(screen.getByText('Unsaved changes') !== null).toBe(true)
    expect(onClose).not.toHaveBeenCalled()

    // Keeping the edits should return to the form.
    await user.click(
      screen.getByRole('button', { name: 'Keep editing' }),
    )

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect((nameInput as HTMLInputElement).value).toBe(
      'Updated oscilloscope',
    )
    expect(onClose).not.toHaveBeenCalled()

    // Attempt to close again, then discard.
    await user.click(
      screen.getByRole('button', { name: 'Close asset details' }),
    )

    expect(screen.getByRole('alertdialog') !== null).toBe(true)

    await user.click(
      screen.getByRole('button', { name: 'Discard changes' }),
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the unsaved changes warning when Cancel is clicked after editing', async () => {
    const { user, onClose } = renderAssetDetails()

    const nameInput = screen.getByLabelText('Asset Name *')

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated oscilloscope')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('alertdialog') !== null).toBe(true)
    expect(screen.getByText('Unsaved changes') !== null).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('AssetTable', () => {
  it('opens details in a dialog instead of expanding the row inline', () => {
    const html = renderToString(
      <AssetTable
        appliedSearch=""
        assets={[makeAsset()]}
        errorMessage=""
        isLoading={false}
        hasActiveFilters={false}
        onSelectAsset={noop}
        selectedAssetId={1}
      />,
    )

    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('row-selected')
    expect(html).not.toContain('EQUIPMENT RECORD')
  })

  it('hides asset editing from a view-only user', () => {
    const viewOnly = {
      ...technicianAuth,
      user: {
        ...technicianAuth.user!,
        role: 'FACULTY' as const,
        role_label: 'Faculty',
      },
    }

    const html = renderToString(
      withAuth(
        <AssetDetails
          asset={makeAsset()}
          onAssetUpdated={noop}
          onClose={noop}
        />,
        viewOnly,
      ),
    )

    expect(html).not.toContain('Edit information')
  })
})
