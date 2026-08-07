import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ParameterLoader } from './ParameterLoader';

describe('ParameterLoader', () => {
  it('should expose an accessible progress state only while analysis is loading', () => {
    // ARRANGE
    const { rerender } = render(<ParameterLoader isVisible={false} />);

    // ACT + ASSERT
    expect(screen.queryByRole('status')).toBeNull();

    rerender(<ParameterLoader isVisible />);

    expect(screen.getByRole('status', { name: 'Analyzing satellite data' })).not.toBeNull();
  });
});
