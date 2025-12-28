/**
 * Skeleton Key Setup Component
 *
 * First-run setup flow for creating or importing the Skeleton Key.
 * The Skeleton Key is a 24-word BIP39 mnemonic that serves as the
 * master encryption key for zero-knowledge sync.
 */

import { useState, useCallback, useMemo } from 'react';
import { useSkeletonKey } from '@/contexts/SkeletonKeyContext';
import './SkeletonKeySetup.css';

type SetupStep = 'choice' | 'generate' | 'confirm' | 'import' | 'complete';

export function SkeletonKeySetup() {
  const {
    generateNewKey,
    importFromMnemonic,
    getQRCode,
    validateMnemonicPhrase,
    isLoading,
    error,
    clearError,
  } = useSkeletonKey();

  const [step, setStep] = useState<SetupStep>('choice');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [importInput, setImportInput] = useState('');
  const [confirmInputs, setConfirmInputs] = useState<string[]>(['', '', '']);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Split mnemonic into words
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);

  // Generate 3 random word indices for verification
  const [verificationIndices] = useState(() => {
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 24));
    }
    return Array.from(indices).sort((a, b) => a - b);
  });

  // Handle creating a new Skeleton Key
  const handleCreate = useCallback(async () => {
    try {
      clearError();
      setLocalError(null);
      const newMnemonic = await generateNewKey();
      setMnemonic(newMnemonic);

      // Generate QR code
      const qr = await getQRCode(newMnemonic);
      setQrCode(qr);

      setStep('generate');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to generate key'
      );
    }
  }, [generateNewKey, getQRCode, clearError]);

  // Handle proceeding to confirmation
  const handleProceedToConfirm = useCallback(() => {
    setStep('confirm');
    setConfirmInputs(['', '', '']);
  }, []);

  // Handle copying mnemonic to clipboard
  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[SkeletonKeySetup] Failed to copy:', err);
      setLocalError('Failed to copy to clipboard');
    }
  }, [mnemonic]);

  // Handle confirmation input changes
  const handleConfirmInputChange = useCallback(
    (index: number, value: string) => {
      setConfirmInputs((prev) => {
        const newInputs = [...prev];
        newInputs[index] = value.toLowerCase().trim();
        return newInputs;
      });
    },
    []
  );

  // Verify confirmation words and complete setup
  const handleVerifyAndComplete = useCallback(async () => {
    setLocalError(null);

    // Check each verification word
    const isCorrect = verificationIndices.every(
      (wordIndex, inputIndex) =>
        confirmInputs[inputIndex].toLowerCase() ===
        words[wordIndex].toLowerCase()
    );

    if (!isCorrect) {
      setLocalError(
        "The words don't match. Please check your backup and try again."
      );
      return;
    }

    try {
      await importFromMnemonic(mnemonic);
      setStep('complete');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to save Skeleton Key'
      );
    }
  }, [verificationIndices, confirmInputs, words, mnemonic, importFromMnemonic]);

  // Handle importing an existing Skeleton Key
  const handleImport = useCallback(async () => {
    setLocalError(null);

    const normalizedInput = importInput.trim().toLowerCase();

    // Validate first
    const isValid = await validateMnemonicPhrase(normalizedInput);
    if (!isValid) {
      setLocalError(
        'Invalid Skeleton Key. Please enter all 24 words separated by spaces.'
      );
      return;
    }

    try {
      await importFromMnemonic(normalizedInput);
      setStep('complete');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to import Skeleton Key'
      );
    }
  }, [importInput, validateMnemonicPhrase, importFromMnemonic]);

  // Go back to choice step
  const handleBack = useCallback(() => {
    setStep('choice');
    setMnemonic('');
    setQrCode('');
    setImportInput('');
    setConfirmInputs(['', '', '']);
    setLocalError(null);
    setCopied(false);
    clearError();
  }, [clearError]);

  const displayError = localError || error;

  return (
    <div className="skeleton-key-setup">
      <div className="skeleton-key-setup__container">
        {/* Header */}
        <header className="skeleton-key-setup__header">
          <div className="skeleton-key-setup__icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <h1 className="skeleton-key-setup__title">Skeleton Key</h1>
          <p className="skeleton-key-setup__subtitle">
            Your encryption key for secure, zero-knowledge sync
          </p>
        </header>

        {/* Choice Step */}
        {step === 'choice' && (
          <div className="skeleton-key-setup__step">
            <p className="skeleton-key-setup__description">
              Your Skeleton Key is a 24-word phrase that encrypts all your data.
              The sync server never sees your notes - only you can read them.
            </p>

            <div className="skeleton-key-setup__warning">
              <strong>Important:</strong> If you lose your Skeleton Key, you
              lose access to synced data. There is no recovery option.
            </div>

            <div className="skeleton-key-setup__choices">
              <button
                type="button"
                className="skeleton-key-setup__choice-btn skeleton-key-setup__choice-btn--primary"
                onClick={handleCreate}
                disabled={isLoading}
              >
                <span className="skeleton-key-setup__choice-icon">+</span>
                <span className="skeleton-key-setup__choice-text">
                  <strong>Create New Skeleton Key</strong>
                  <small>Generate a new encryption key</small>
                </span>
              </button>

              <button
                type="button"
                className="skeleton-key-setup__choice-btn"
                onClick={() => setStep('import')}
                disabled={isLoading}
              >
                <span className="skeleton-key-setup__choice-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <span className="skeleton-key-setup__choice-text">
                  <strong>Import Existing Key</strong>
                  <small>Enter your 24-word phrase</small>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Generate Step - Display the mnemonic */}
        {step === 'generate' && (
          <div className="skeleton-key-setup__step">
            <p className="skeleton-key-setup__description">
              Write down these 24 words in order and store them somewhere safe.
              You will need them to sync on other devices.
            </p>

            <div className="skeleton-key-setup__mnemonic">
              {words.map((word, index) => (
                <div key={index} className="skeleton-key-setup__word">
                  <span className="skeleton-key-setup__word-num">
                    {index + 1}
                  </span>
                  <span className="skeleton-key-setup__word-text">{word}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="skeleton-key-setup__copy-btn"
              onClick={handleCopyMnemonic}
            >
              {copied ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>

            {qrCode && (
              <div className="skeleton-key-setup__qr-section">
                <p className="skeleton-key-setup__qr-label">
                  Or scan this QR code on another device:
                </p>
                <img
                  src={qrCode}
                  alt="Skeleton Key QR Code"
                  className="skeleton-key-setup__qr-code"
                />
              </div>
            )}

            <div className="skeleton-key-setup__actions">
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--secondary"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--primary"
                onClick={handleProceedToConfirm}
              >
                I've saved my Skeleton Key
              </button>
            </div>
          </div>
        )}

        {/* Confirm Step - Verify backup */}
        {step === 'confirm' && (
          <div className="skeleton-key-setup__step">
            <p className="skeleton-key-setup__description">
              Enter the following words from your Skeleton Key to confirm you've
              saved it:
            </p>

            <div className="skeleton-key-setup__confirm-fields">
              {verificationIndices.map((wordIndex, inputIndex) => (
                <div key={wordIndex} className="skeleton-key-setup__confirm-row">
                  <label className="skeleton-key-setup__confirm-label">
                    Word #{wordIndex + 1}
                  </label>
                  <input
                    type="text"
                    className="skeleton-key-setup__input"
                    value={confirmInputs[inputIndex]}
                    onChange={(e) =>
                      handleConfirmInputChange(inputIndex, e.target.value)
                    }
                    placeholder={`Enter word #${wordIndex + 1}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              ))}
            </div>

            {displayError && (
              <p className="skeleton-key-setup__error">{displayError}</p>
            )}

            <div className="skeleton-key-setup__actions">
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--secondary"
                onClick={() => setStep('generate')}
              >
                Back
              </button>
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--primary"
                onClick={handleVerifyAndComplete}
                disabled={
                  isLoading || confirmInputs.some((input) => !input.trim())
                }
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Import Step */}
        {step === 'import' && (
          <div className="skeleton-key-setup__step">
            <p className="skeleton-key-setup__description">
              Enter your 24-word Skeleton Key to sync with your existing data.
            </p>

            <textarea
              className="skeleton-key-setup__textarea"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Enter your 24 words separated by spaces..."
              rows={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />

            {displayError && (
              <p className="skeleton-key-setup__error">{displayError}</p>
            )}

            <div className="skeleton-key-setup__actions">
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--secondary"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="button"
                className="skeleton-key-setup__btn skeleton-key-setup__btn--primary"
                onClick={handleImport}
                disabled={isLoading || !importInput.trim()}
              >
                {isLoading ? 'Importing...' : 'Import Skeleton Key'}
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="skeleton-key-setup__step skeleton-key-setup__step--complete">
            <div className="skeleton-key-setup__success-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="skeleton-key-setup__success-title">
              Skeleton Key Ready
            </h2>
            <p className="skeleton-key-setup__description">
              Your encryption is set up. All synced data will be encrypted with
              your Skeleton Key.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
