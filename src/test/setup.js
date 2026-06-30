// Vitest global setup — extends `expect` with jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, etc.) and clears the DOM
// between tests so component renders don't leak into each other.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
