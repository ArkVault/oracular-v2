import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('shadcn Button integration', () => {
  it('should preserve Oracular V2 classes and native button behavior', () => {
    // ARRANGE + ACT
    render(
      <Button
        variant="ghost"
        size="icon"
        className="oracular-icon-button is-active"
        aria-label="Map action"
        disabled
      />,
    );

    // ASSERT
    const button = screen.getByRole('button', { name: 'Map action' });
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveClass('oracular-icon-button', 'is-active');
    expect(button).toBeDisabled();
  });
});
