import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Building2 } from 'lucide-react';
import { US_FREIGHT_HUBS } from '../services/hosSimulator';

// Extract unique clean hub names
const TOP_HUBS = Object.values(US_FREIGHT_HUBS).filter((v, i, a) => 
  a.findIndex(t => t.name.toLowerCase() === v.name.toLowerCase()) === i
);

export default function LocationAutocomplete({
  id,
  label,
  icon: Icon,
  iconColor,
  placeholder,
  value,
  onChange,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Filter local hubs + optional OSM lookup on query
  useEffect(() => {
    if (!value || value.trim().length < 1) {
      setSuggestions(TOP_HUBS.slice(0, 7));
      return;
    }

    const clean = value.trim().toLowerCase();
    const localMatches = TOP_HUBS.filter(h => 
      h.name.toLowerCase().includes(clean)
    );

    if (localMatches.length >= 3) {
      setSuggestions(localMatches.slice(0, 8));
    } else {
      // Set local matches first
      setSuggestions(localMatches);

      // Debounce Nominatim lookup for custom towns
      if (clean.length >= 3) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
          try {
            setIsSearching(true);
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(value)}`,
              { headers: { 'User-Agent': 'Spotter-HOS-App/1.0' } }
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.length > 0) {
                const fetched = data.map(item => ({
                  name: item.display_name.split(',').slice(0, 2).join(',').trim(),
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  type: 'city'
                }));
                // Merge unique
                const combined = [...localMatches];
                fetched.forEach(f => {
                  if (!combined.some(c => c.name.toLowerCase() === f.name.toLowerCase())) {
                    combined.push(f);
                  }
                });
                setSuggestions(combined.slice(0, 8));
              }
            }
          } catch (e) {
            // ignore
          } finally {
            setIsSearching(false);
          }
        }, 350);
      }
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cityName) => {
    onChange(cityName);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
  };

  return (
    <div className="input-group autocomplete-container" ref={containerRef}>
      <label htmlFor={id} className="input-label">
        {Icon && <Icon size={15} style={{ color: iconColor || 'var(--accent-primary)' }} />}
        <span>{label}</span>
      </label>

      <div className="autocomplete-input-wrapper">
        <input
          id={id}
          type="text"
          className="text-input autocomplete-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
          required={required}
        />
        {value && (
          <button
            type="button"
            className="btn-clear-input"
            onClick={handleClear}
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Neumorphic Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          <div className="dropdown-header">
            <span>{value ? 'Matching Locations' : 'Popular Freight Hubs'}</span>
            {isSearching && <span className="searching-indicator">Searching...</span>}
          </div>
          <ul className="dropdown-list">
            {suggestions.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="dropdown-item"
                onMouseDown={() => handleSelect(item.name)}
              >
                <div className="item-icon">
                  <MapPin size={14} />
                </div>
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-badge">
                    {TOP_HUBS.some(h => h.name === item.name) ? 'Freight Hub' : 'City / Location'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
