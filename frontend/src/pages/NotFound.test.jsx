import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from './NotFound'

describe('NotFound', () => {
  it('says the page is missing and links home', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Home' })).toHaveAttribute('href', '/')
  })
})
