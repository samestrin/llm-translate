import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Testing Library unmounts after each test only when Vitest globals are on; they are off here.
afterEach(cleanup)
