
 // @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LoanSearch from '../features/lending/components/LoanSearch'

afterEach(() => {
  cleanup()
})

describe('LoanSearch', () => {
  it('renders the search input', () => {
    render(<LoanSearch value="" onChange={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Search loans' })).toBeTruthy()
  })

  it('displays the value passed through props', () => {
    render(<LoanSearch value="ThinkPad" onChange={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Search loans' })).toHaveProperty(
      'value',
      'ThinkPad'
    )
  })

  it('displays the correct placeholder', () => {
    render(<LoanSearch value="" onChange={vi.fn()} />)

    expect(
      screen.getByPlaceholderText('Search asset, borrower, or ID...')
    ).toBeTruthy()
  })

  it('calls onChange with the entered search text', () => {
    const onChange = vi.fn()

    render(<LoanSearch value="" onChange={onChange} />)

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search loans' }),
      { target: { value: 'Thermal Camera' } }
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('Thermal Camera')
  })

  it('supports an empty search value', () => {
    render(<LoanSearch value="" onChange={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Search loans' })).toHaveProperty(
      'value',
      ''
    )
  })
})
