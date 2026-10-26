import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Download, Share2, X, CheckCircle2, AlertCircle, RefreshCw, Eye } from 'lucide-react';

export const ScreenshotModal = ({
  targetRef,
  targetId = 'blood-connect-capture-area',
  title = 'Emergency Blood Request Card',
  fileName = 'BloodConnect-Emergency-Card.png',
  buttonLabel = 'Screenshot Card',
  buttonClassName = 'btn btn-secondary',
  buttonStyle = {},
}) => {
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blobData, setBlobData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    setError('');
    setDownloadSuccess(false);

    try {
      // Find element to capture: either ref, id, or main content container
      const element =
        (targetRef && targetRef.current) ||
        (targetId && document.getElementById(targetId)) ||
        document.querySelector('.capture-zone') ||
        document.getElementById('root');

      if (!element) {
        throw new Error('Capture target element could not be found.');
      }

      // Configure html2canvas to safely handle leaflet tiles, glassmorphism, and fonts
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 2, 2),
        backgroundColor: '#07090e',
        ignoreElements: (el) => el.classList.contains('no-screenshot'),
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Generate PNG Data URL and Blob
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          setBlobData(blob);
        }
      }, 'image/png');

      setIsOpen(true);
    } catch (err) {
      console.error('[ScreenshotCapture] Failed to generate screenshot:', err);
      setError(
        err.message ||
          'Failed to capture image. Cross-origin elements or browser restrictions may prevent screenshot generation.'
      );
      setIsOpen(true);
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    try {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      setError('Could not download image: ' + err.message);
    }
  };

  const handleShare = async () => {
    if (!blobData || typeof navigator.share === 'undefined') {
      handleDownload();
      return;
    }

    try {
      const file = new File([blobData], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Emergency Blood Request',
          text: 'Urgent blood request via Blood Connect Platform.',
        });
        setDownloadSuccess(true);
      } else {
        handleDownload();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[ScreenshotCapture] Share failed, falling back to download:', err);
        handleDownload();
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setDownloadSuccess(false);
    setError('');
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={capturing}
        className={`${buttonClassName} no-screenshot`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          ...buttonStyle,
        }}
        title="Capture high-resolution emergency card to share"
      >
        {capturing ? (
          <>
            <RefreshCw size={15} className="pulse-glow" />
            <span>Capturing...</span>
          </>
        ) : (
          <>
            <Camera size={15} />
            <span>{buttonLabel}</span>
          </>
        )}
      </button>

      {/* Screenshot Preview & Download Modal */}
      {isOpen && (
        <div
          className="no-screenshot"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={handleClose}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '720px',
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={20} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{title}</h3>
              </div>
              <button
                onClick={handleClose}
                className="btn btn-secondary"
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {error ? (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#fca5a5',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>Screenshot Capture Error</h4>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{error}</p>
                    <button
                      onClick={handleCapture}
                      className="btn btn-secondary"
                      style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px' }} />
                      Retry Capture
                    </button>
                  </div>
                </div>
              ) : previewUrl ? (
                <div>
                  <div
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#07090e',
                      textAlign: 'center',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Captured Emergency Card"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '480px',
                        display: 'block',
                        margin: '0 auto',
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  {downloadSuccess && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6ee7b7',
                        fontSize: '0.85rem',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Image downloaded successfully! Ready to share with donors and hospitals.</span>
                    </div>
                  )}

                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      marginTop: '10px',
                      textAlign: 'center',
                    }}
                  >
                    Format: High-Resolution PNG &bull; Captured from live view
                  </p>
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Close
              </button>

              {previewUrl && !error && (
                <>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <Share2 size={15} style={{ marginRight: '6px' }} />
                      Share
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.85rem',
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    }}
                  >
                    <Download size={15} style={{ marginRight: '6px' }} />
                    Download PNG
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotModal;
