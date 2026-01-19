/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountSettingsSheet } from '../AccountSettingsSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock BottomSheet (must be inline due to vi.mock hoisting)
vi.mock('@/components/mobile/primitives', () => ({
  BottomSheet: ({
    children,
    opened,
    title,
  }: {
    children: React.ReactNode;
    opened: boolean;
    title: string;
  }) =>
    opened ? (
      <div data-testid="bottom-sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

describe('AccountSettingsSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnRevealMnemonic = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    userId: 'user-12345678-abcd-efgh-ijkl',
    deviceId: 'device-12345678-abcd-efgh',
    deviceFingerprint: 'ABCD1234',
    onRevealMnemonic: mockOnRevealMnemonic,
    isEncrypted: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRevealMnemonic.mockResolvedValue([
      'word1',
      'word2',
      'word3',
      'word4',
      'word5',
      'word6',
      'word7',
      'word8',
      'word9',
      'word10',
      'word11',
      'word12',
      'word13',
      'word14',
      'word15',
      'word16',
      'word17',
      'word18',
      'word19',
      'word20',
      'word21',
      'word22',
      'word23',
      'word24',
    ]);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <AccountSettingsSheet {...defaultProps} opened={false} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
  });

  it('should show encrypted badge when encrypted', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Encrypted')).toBeDefined();
  });

  it('should show not encrypted badge when not encrypted', () => {
    renderWithProvider(
      <AccountSettingsSheet {...defaultProps} isEncrypted={false} />
    );

    expect(screen.getByText('Not Encrypted')).toBeDefined();
  });

  it('should show skeleton key section', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Skeleton Key')).toBeDefined();
    expect(screen.getByText(/Your 24-word recovery phrase/)).toBeDefined();
  });

  it('should show reveal skeleton key button', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Reveal Skeleton Key' })
    ).toBeDefined();
  });

  it('should show identifiers section', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Identifiers')).toBeDefined();
    expect(screen.getByText('User ID')).toBeDefined();
    expect(screen.getByText('Device ID')).toBeDefined();
    expect(screen.getByText('Device Fingerprint')).toBeDefined();
  });

  it('should show device fingerprint', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByText('ABCD1234')).toBeDefined();
  });

  it('should show backup warning', () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    expect(screen.getByText('Backup Required')).toBeDefined();
  });

  it('should call onRevealMnemonic when reveal button is clicked', async () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Reveal Skeleton Key' })
    );

    await waitFor(() => {
      expect(mockOnRevealMnemonic).toHaveBeenCalledTimes(1);
    });
  });

  it('should show mnemonic words after reveal', async () => {
    renderWithProvider(<AccountSettingsSheet {...defaultProps} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Reveal Skeleton Key' })
    );

    await waitFor(() => {
      expect(screen.getByText('1. word1')).toBeDefined();
      expect(screen.getByText('24. word24')).toBeDefined();
    });
  });
});
