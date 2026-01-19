/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureFlag } from '../FeatureFlag';

// Mock useFeatureFlagEnabled from posthog-js/react
const mockUseFeatureFlagEnabled = vi.fn();
vi.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: (flag: string) => mockUseFeatureFlagEnabled(flag),
}));

// Mock useAnalyticsSafe
const mockAnalyticsContext = {
  isEnabled: true,
  enable: vi.fn(),
  disable: vi.fn(),
  track: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlagVariant: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useAnalyticsSafe: () => mockAnalyticsContext,
}));

describe('FeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsContext.isEnabled = true;
  });

  it('should render children when feature flag is enabled', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(true);

    render(
      <FeatureFlag flag="test-feature">
        <div data-testid="feature-content">Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.getByTestId('feature-content')).toBeDefined();
    expect(screen.getByText('Feature Content')).toBeDefined();
  });

  it('should render fallback when feature flag is disabled', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(false);

    render(
      <FeatureFlag
        flag="test-feature"
        fallback={<div data-testid="fallback">Fallback Content</div>}
      >
        <div data-testid="feature-content">Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.queryByTestId('feature-content')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeDefined();
    expect(screen.getByText('Fallback Content')).toBeDefined();
  });

  it('should render nothing when feature flag is disabled and no fallback provided', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(false);

    const { container } = render(
      <FeatureFlag flag="test-feature">
        <div data-testid="feature-content">Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.queryByTestId('feature-content')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('should render fallback when analytics is disabled', () => {
    mockAnalyticsContext.isEnabled = false;
    mockUseFeatureFlagEnabled.mockReturnValue(true);

    render(
      <FeatureFlag
        flag="test-feature"
        fallback={<div data-testid="fallback">Fallback Content</div>}
      >
        <div data-testid="feature-content">Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.queryByTestId('feature-content')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeDefined();
  });

  it('should render fallback when feature flag is loading (undefined)', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(undefined);

    render(
      <FeatureFlag
        flag="test-feature"
        fallback={<div data-testid="fallback">Loading...</div>}
      >
        <div data-testid="feature-content">Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.queryByTestId('feature-content')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('should call useFeatureFlagEnabled with the correct flag', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(false);

    render(
      <FeatureFlag flag="my-custom-flag">
        <div>Content</div>
      </FeatureFlag>
    );

    expect(mockUseFeatureFlagEnabled).toHaveBeenCalledWith('my-custom-flag');
  });

  it('should handle complex children', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(true);

    render(
      <FeatureFlag flag="test-feature">
        <div data-testid="parent">
          <span data-testid="child-1">Child 1</span>
          <span data-testid="child-2">Child 2</span>
        </div>
      </FeatureFlag>
    );

    expect(screen.getByTestId('parent')).toBeDefined();
    expect(screen.getByTestId('child-1')).toBeDefined();
    expect(screen.getByTestId('child-2')).toBeDefined();
  });

  it('should handle complex fallback', () => {
    mockUseFeatureFlagEnabled.mockReturnValue(false);

    render(
      <FeatureFlag
        flag="test-feature"
        fallback={
          <div data-testid="fallback-parent">
            <span data-testid="fallback-child">Fallback Child</span>
          </div>
        }
      >
        <div>Feature Content</div>
      </FeatureFlag>
    );

    expect(screen.getByTestId('fallback-parent')).toBeDefined();
    expect(screen.getByTestId('fallback-child')).toBeDefined();
  });
});
