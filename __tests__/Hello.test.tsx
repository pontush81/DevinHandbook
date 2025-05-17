import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hello from '../src/components/Hello';

test('renders greeting with name', () => {
  render(<Hello name="Pontus" />);
  expect(screen.getByText('Hello, Pontus!')).toBeInTheDocument();
}); 