import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, AlertCircle } from 'lucide-react';
import { searchPlaces } from '../services/geocoding.js';

export const LocationSearchBar = ({
  onSelectLocation,
  placeholder = 'Search hospital, locality, area, or complete address...',
  initialValue = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Sync when initialValue prop changes (e.g. from reverse geocode or GPS)
  useEffect(() => {
    if (initialValue && !query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const performSearch = async (searchTerm) => {
    const term = (searchTerm || '').trim();
    if (!term || term.length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      setError('');
      return;
    }

    // Cancel any older pending request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const places = await searchPlaces(term, { signal: controller.signal, limit: 6 });
      setResults(places);
      setIsOpen(true);
      if (places.length === 0) {
        setError('No matching locations found. Try entering a city or prominent landmark.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[LocationSearch] Error searching:', err.message);
      setError('Unable to resolve location. Please check connection or click the map directly.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, 500);
    } else {
      setResults([]);
      setIsOpen(false);
      setError('');
    }
  };

  const handleManualSearch = (e) => {
    if (e) e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(query);
  };

  const handleSelectResult = (place) => {
    setQuery(place.displayName);
    setIsOpen(false);
    setResults([]);
    setError('');

    if (onSelectLocation) {
      onSelectLocation({
        address: place.displayName,
        shortName: place.shortName,
        coordinates: place.coordinates, // [lng, lat]
        lat: place.lat,
        lng: place.lng,
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
      <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {loading ? (
              <Loader2 size={18} className="pulse-glow" style={{ color: '#ef4444' }} />
            ) : (
              <Search size={18} />
            )}
          </div>

          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '42px',
              paddingRight: query ? '38px' : '14px',
              width: '100%',
              height: '46px',
              fontSize: '0.9rem',
              borderColor: isOpen ? '#ef4444' : undefined,
            }}
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn btn-secondary"
          style={{
            height: '46px',
            padding: '0 18px',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Finding...' : 'Locate'}
        </button>
      </form>

      {/* Dropdown Results list */}
      {isOpen && (results.length > 0 || error) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {error && (
            <div
              style={{
                padding: '12px 14px',
                fontSize: '0.8rem',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {results.map((place) => (
            <div
              key={place.id}
              onClick={() => handleSelectResult(place)}
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={16} style={{ color: '#ef4444', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                  {place.shortName}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {place.displayName}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  flexShrink: 0,
                  alignSelf: 'center',
                }}
              >
                [{place.lat.toFixed(3)}, {place.lng.toFixed(3)}]
              </span>
            </div>
          ))}

          <div
            style={{
              padding: '6px 12px',
              fontSize: '0.675rem',
              color: '#64748b',
              textAlign: 'right',
              background: 'rgba(15, 23, 42, 0.6)',
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            Geocoding &copy; OpenStreetMap Nominatim
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearchBar;
