import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState.jsx'

describe('<EmptyState />', () => {
  it('renders the empty-state heading and disclaimer', () => {
    render(<EmptyState onCalculate={() => {}} />)
    expect(screen.getByRole('heading', { name: /your retirement scenarios/i })).toBeInTheDocument()
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument()
  })

  it('fires onCalculate when the run button is clicked', async () => {
    const user = userEvent.setup()
    const onCalculate = vi.fn()
    render(<EmptyState onCalculate={onCalculate} />)

    await user.click(screen.getByRole('button', { name: /run calculation/i }))
    expect(onCalculate).toHaveBeenCalledOnce()
  })

  it('only shows the mobile "enter details" button when onOpenInputs is provided', () => {
    const { rerender } = render(<EmptyState onCalculate={() => {}} />)
    expect(screen.queryByRole('button', { name: /enter your details/i })).not.toBeInTheDocument()

    rerender(<EmptyState onCalculate={() => {}} onOpenInputs={() => {}} />)
    expect(screen.getByRole('button', { name: /enter your details/i })).toBeInTheDocument()
  })
})
