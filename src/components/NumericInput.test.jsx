import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericInput } from './NumericInput.jsx'

describe('<NumericInput />', () => {
  it('renders the value with a prefix and thousands separators', () => {
    render(<NumericInput value={1500} onChange={() => {}} prefix="$" />)
    expect(screen.getByText('$1,500')).toBeInTheDocument()
  })

  it('increments and decrements by the step via the +/- buttons', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={10} onChange={onChange} step={5} />)

    await user.click(screen.getByLabelText('Increase'))
    expect(onChange).toHaveBeenLastCalledWith(15)

    await user.click(screen.getByLabelText('Decrease'))
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('clamps the value to the configured minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumericInput value={0} onChange={onChange} min={0} step={5} />)

    await user.click(screen.getByLabelText('Decrease'))
    expect(onChange).toHaveBeenLastCalledWith(0) // not -5
  })
})
