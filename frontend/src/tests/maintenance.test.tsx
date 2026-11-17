import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { hasPermission } from '../features/auth/api'
import AppRoutes from '../AppRoutes'
import MaintenanceHistory from '../features/maintenance/components/MaintenanceHistory'
import MaintenanceRecordDialog from '../features/maintenance/components/MaintenanceRecordDialog'
import MaintenancePage from '../pages/MaintenancePage'
import { technicianAuth, withAuth } from './authTestUtils'

describe('Maintenance permissions', () => {
  it('allows technicians and administrators but not faculty', () => {
    const technician = technicianAuth.user
    const administrator = { ...technician!, role: 'ADMINISTRATOR' as const }
    const faculty = { ...technician!, role: 'FACULTY' as const }

    expect(hasPermission(technician, 'maintenance.view_maintenancerecord')).toBe(true)
    expect(hasPermission(administrator, 'maintenance.add_maintenancerecord')).toBe(true)
    expect(hasPermission(faculty, 'maintenance.view_maintenancerecord')).toBe(false)
  })
})

describe('Maintenance page', () => {
  it('renders the maintenance list controls and loading state', () => {
    const html = renderToString(
      <MemoryRouter>
        {withAuth(<MaintenancePage />)}
      </MemoryRouter>,
    )

    expect(html).toContain('Maintenance')
    expect(html).toContain('New Maintenance')
    expect(html).toContain('Search Asset ID')
    expect(html).toContain('All statuses')
    expect(html).toContain('Maintenance Type')
    expect(html).toContain('All priorities')
    expect(html).toContain('Loading maintenance records')
  })

  it('renders the create form with maintenance fields', () => {
    const html = renderToString(
      <MaintenanceRecordDialog
        mode="create"
        onClose={() => {}}
        onCreated={() => {}}
      />,
    )

    expect(html).toContain('Search available equipment by Asset ID')
    expect(html).toContain('Maintenance Type')
    expect(html).toContain('Preventative Care')
    expect(html).toContain('Responsible Technician')
    expect(html).toContain('Start Date')
    expect(html).toContain('Save Maintenance')
  })

  it('shows loading history for an asset', () => {
    const html = renderToString(<MaintenanceHistory assetId={12} />)

    expect(html).toContain('Maintenance History')
    expect(html).toContain('Loading maintenance history')
  })

  it('allows technicians to open the route and denies faculty', () => {
    const technicianHtml = renderToString(
      <MemoryRouter initialEntries={['/maintenance']}>
        {withAuth(<AppRoutes />)}
      </MemoryRouter>,
    )
    const faculty = {
      ...technicianAuth,
      user: {
        ...technicianAuth.user!,
        role: 'FACULTY' as const,
        role_label: 'Faculty',
      },
    }
    const facultyHtml = renderToString(
      <MemoryRouter initialEntries={['/maintenance']}>
        {withAuth(<AppRoutes />, faculty)}
      </MemoryRouter>,
    )

    expect(technicianHtml).toContain('Search Asset ID')
    expect(facultyHtml).toContain('Access denied')
    expect(facultyHtml).not.toContain('Search Asset ID')
  })
})
