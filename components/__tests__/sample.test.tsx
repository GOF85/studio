import React from 'react'
import { render, screen } from '@testing-library/react'

test('sample renders', () => {
  render(<div>sample component</div>)
  expect(screen.getByText('sample component')).toBeInTheDocument()
})
