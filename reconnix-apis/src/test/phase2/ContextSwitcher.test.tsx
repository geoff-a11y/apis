import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSwitcher, ContextBadge, type Context } from '@/components/ui/ContextSwitcher';

describe('ContextSwitcher', () => {
  describe('component rendering', () => {
    it('should render all three context options by default', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      expect(screen.getByText('All Data')).toBeInTheDocument();
      expect(screen.getByText('B2C')).toBeInTheDocument();
      expect(screen.getByText('B2B')).toBeInTheDocument();
    });

    it('should render B2C and B2B options when showPooled is false', () => {
      const mockOnChange = vi.fn();
      render(
        <ContextSwitcher
          value="b2c"
          onChange={mockOnChange}
          showPooled={false}
        />
      );

      expect(screen.queryByText('All Data')).not.toBeInTheDocument();
      expect(screen.getByText('B2C')).toBeInTheDocument();
      expect(screen.getByText('B2B')).toBeInTheDocument();
    });

    it('should highlight the active context', () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <ContextSwitcher value="pooled" onChange={mockOnChange} />
      );

      const pooledButton = screen.getByText('All Data');
      expect(pooledButton).toHaveClass('bg-navy');
      expect(pooledButton).toHaveClass('text-white');

      rerender(<ContextSwitcher value="b2c" onChange={mockOnChange} />);
      const b2cButton = screen.getByText('B2C');
      expect(b2cButton).toHaveClass('bg-navy');
      expect(b2cButton).toHaveClass('text-white');

      rerender(<ContextSwitcher value="b2b" onChange={mockOnChange} />);
      const b2bButton = screen.getByText('B2B');
      expect(b2bButton).toHaveClass('bg-navy');
      expect(b2bButton).toHaveClass('text-white');
    });

    it('should apply custom className', () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <ContextSwitcher
          value="pooled"
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have correct title attributes for accessibility', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const pooledButton = screen.getByText('All Data');
      const b2cButton = screen.getByText('B2C');
      const b2bButton = screen.getByText('B2B');

      expect(pooledButton).toHaveAttribute('title', 'Combined B2C and B2B data');
      expect(b2cButton).toHaveAttribute('title', 'Consumer purchase context');
      expect(b2bButton).toHaveAttribute('title', 'Business purchase context');
    });
  });

  describe('clicking toggles context', () => {
    it('should call onChange with b2c when B2C button is clicked', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const b2cButton = screen.getByText('B2C');
      fireEvent.click(b2cButton);

      expect(mockOnChange).toHaveBeenCalledWith('b2c');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with b2b when B2B button is clicked', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const b2bButton = screen.getByText('B2B');
      fireEvent.click(b2bButton);

      expect(mockOnChange).toHaveBeenCalledWith('b2b');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with pooled when All Data button is clicked', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="b2c" onChange={mockOnChange} />);

      const pooledButton = screen.getByText('All Data');
      fireEvent.click(pooledButton);

      expect(mockOnChange).toHaveBeenCalledWith('pooled');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange when clicking the currently active context', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="b2c" onChange={mockOnChange} />);

      const b2cButton = screen.getByText('B2C');
      fireEvent.click(b2cButton);

      expect(mockOnChange).toHaveBeenCalledWith('b2c');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid context switching', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const b2cButton = screen.getByText('B2C');
      const b2bButton = screen.getByText('B2B');
      const pooledButton = screen.getByText('All Data');

      fireEvent.click(b2cButton);
      fireEvent.click(b2bButton);
      fireEvent.click(pooledButton);
      fireEvent.click(b2cButton);

      expect(mockOnChange).toHaveBeenCalledTimes(4);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'b2c');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'b2b');
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'pooled');
      expect(mockOnChange).toHaveBeenNthCalledWith(4, 'b2c');
    });
  });

  describe('callback is called with new context', () => {
    it('should pass correct context type to callback', () => {
      let capturedContext: Context | null = null;
      const mockOnChange = (context: Context) => {
        capturedContext = context;
      };

      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('B2C'));
      expect(capturedContext).toBe('b2c');

      fireEvent.click(screen.getByText('B2B'));
      expect(capturedContext).toBe('b2b');

      fireEvent.click(screen.getByText('All Data'));
      expect(capturedContext).toBe('pooled');
    });

    it('should not call onChange multiple times for single click', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const b2cButton = screen.getByText('B2C');
      fireEvent.click(b2cButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should work with async onChange handlers', async () => {
      const asyncHandler = vi.fn(async (context: Context) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return context;
      });

      render(<ContextSwitcher value="pooled" onChange={asyncHandler} />);

      fireEvent.click(screen.getByText('B2C'));

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(asyncHandler).toHaveBeenCalledWith('b2c');
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation', () => {
    it('should be keyboard accessible', () => {
      const mockOnChange = vi.fn();
      render(<ContextSwitcher value="pooled" onChange={mockOnChange} />);

      const b2cButton = screen.getByText('B2C');
      b2cButton.focus();

      expect(b2cButton).toHaveFocus();
    });
  });
});

describe('ContextBadge', () => {
  it('should render badge for pooled context', () => {
    render(<ContextBadge context="pooled" />);
    expect(screen.getByText('Pooled Data')).toBeInTheDocument();
  });

  it('should render badge for b2c context', () => {
    render(<ContextBadge context="b2c" />);
    expect(screen.getByText('B2C Context')).toBeInTheDocument();
  });

  it('should render badge for b2b context', () => {
    render(<ContextBadge context="b2b" />);
    expect(screen.getByText('B2B Context')).toBeInTheDocument();
  });

  it('should apply correct color classes', () => {
    const { container: pooledContainer } = render(<ContextBadge context="pooled" />);
    expect(pooledContainer.firstChild).toHaveClass('badge-blue');

    const { container: b2cContainer } = render(<ContextBadge context="b2c" />);
    expect(b2cContainer.firstChild).toHaveClass('badge-green');

    const { container: b2bContainer } = render(<ContextBadge context="b2b" />);
    expect(b2bContainer.firstChild).toHaveClass('badge-amber');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ContextBadge context="pooled" className="custom-badge" />
    );
    expect(container.firstChild).toHaveClass('custom-badge');
  });
});
