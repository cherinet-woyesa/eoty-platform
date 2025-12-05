import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';

interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

interface LocationInputProps {
  onLocationSelect: (location: LocationData) => void;
  className?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({ onLocationSelect, className }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = async (searchText: string) => {
    if (searchText.length < 3) return;
    
    setIsLoading(true);
    try {
      // Using OpenStreetMap Nominatim API (Free, no key required for low usage)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'EOTY-Platform-Registration'
          }
        }
      );
      const data = await response.json();
      setSuggestions(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Error fetching location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    const address = item.address;
    const locationData: LocationData = {
      address: item.display_name,
      city: address.city || address.town || address.village || '',
      state: address.state || address.region || '',
      country: address.country || '',
      zipCode: address.postcode || '',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    };

    setQuery(item.display_name);
    setSuggestions([]);
    setIsOpen(false);
    onLocationSelect(locationData);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchLocation(e.target.value);
          }}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
          placeholder="Search for your address..."
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900"
            >
              <span className="block truncate">{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationInput;
