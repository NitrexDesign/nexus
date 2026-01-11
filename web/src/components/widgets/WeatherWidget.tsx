"use client";

import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, Zap, Eye, Droplets, Wind } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { WidgetProps } from '@/lib/widgets/types';
import { Card, CardContent } from '@/components/ui/card';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  forecast?: {
    date: string;
    temp: number;
    condition: string;
    icon: string;
  }[];
}

interface WeatherSettings {
  location: string;
  unit: 'celsius' | 'fahrenheit';
  showForecast: boolean;
  provider: 'openweathermap' | 'metoffice';
  apiKey?: string;
  metOfficeApiKey?: string;
}

interface OpenWeatherOneCall {
  lat: number;
  lon: number;
  timezone: string;
  current: {
    dt: number;
    temp: number;
    humidity: number;
    visibility: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
  daily: Array<{
    dt: number;
    temp: {
      day: number;
      min: number;
      max: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  }>;
}

interface GeocodingResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

// Met Office API interfaces
interface MetOfficeLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  continent: string;
  elevation: number;
}

interface MetOfficeCurrentWeather {
  Location: {
    i: string;
    lat: string;
    lon: string;
    name: string;
    country: string;
    continent: string;
    elevation: string;
  };
  Period: Array<{
    type: string;
    value: string;
    Rep: Array<{
      D: string; // Wind direction
      F: string; // Feels like temperature
      G: string; // Wind gust
      H: string; // Screen relative humidity
      Pp: string; // Precipitation probability
      S: string; // Wind speed
      T: string; // Temperature
      V: string; // Visibility
      W: string; // Weather type
      $: string; // Time period
    }>;
  }>;
}

interface MetOfficeForecast {
  Location: {
    i: string;
    lat: string;
    lon: string;
    name: string;
    country: string;
    continent: string;
    elevation: string;
  };
  Period: Array<{
    type: string;
    value: string;
    Rep: Array<{
      D: string; // Wind direction
      Dm: string; // Wind direction (text)
      FDm: string; // Feels like daytime max
      FNm: string; // Feels like nighttime min
      Gm: string; // Wind gust (mph)
      Hm: string; // Daytime relative humidity
      Hn: string; // Nighttime relative humidity
      Nm: string; // Nighttime cloud cover
      PPd: string; // Precipitation probability day
      PPn: string; // Precipitation probability night
      S: string; // Wind speed (mph)
      T: string; // Temperature (text description)
      V: string; // Visibility
      W: string; // Weather type
      U: string; // Max UV index
      $: string; // Time period
    }>;
  }>;
}

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  '01d': <Sun className="h-8 w-8 text-yellow-500" />, // clear sky day
  '01n': <Sun className="h-8 w-8 text-yellow-300" />, // clear sky night
  '02d': <Cloud className="h-8 w-8 text-gray-400" />, // few clouds day
  '02n': <Cloud className="h-8 w-8 text-gray-500" />, // few clouds night
  '03d': <Cloud className="h-8 w-8 text-gray-500" />, // scattered clouds
  '03n': <Cloud className="h-8 w-8 text-gray-600" />, // scattered clouds
  '04d': <Cloud className="h-8 w-8 text-gray-600" />, // broken clouds
  '04n': <Cloud className="h-8 w-8 text-gray-700" />, // broken clouds
  '09d': <CloudRain className="h-8 w-8 text-blue-500" />, // shower rain
  '09n': <CloudRain className="h-8 w-8 text-blue-600" />, // shower rain
  '10d': <CloudRain className="h-8 w-8 text-blue-500" />, // rain
  '10n': <CloudRain className="h-8 w-8 text-blue-600" />, // rain
  '11d': <Zap className="h-8 w-8 text-yellow-400" />, // thunderstorm
  '11n': <Zap className="h-8 w-8 text-yellow-500" />, // thunderstorm
  '13d': <Snowflake className="h-8 w-8 text-blue-200" />, // snow
  '13n': <Snowflake className="h-8 w-8 text-blue-300" />, // snow
  '50d': <Cloud className="h-8 w-8 text-gray-400" />, // mist
  '50n': <Cloud className="h-8 w-8 text-gray-500" />, // mist
};

// API utility functions

const getCurrentLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    // Check if we already have permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          reject(new Error('Location access denied. Please enable location permissions in your browser settings.'));
          return;
        }

        // Proceed with geolocation request
        requestLocation();
      }).catch(() => {
        // Fallback if permissions API is not supported
        requestLocation();
      });
    } else {
      // Fallback for browsers without permissions API
      requestLocation();
    }

    function requestLocation() {
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  });
};

const fetchCoordinates = async (location: string, apiKey: string): Promise<GeocodingResponse> => {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey.trim()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }
  const data: GeocodingResponse[] = await response.json();
  if (data.length === 0) {
    throw new Error('Location not found. Please check the location name.');
  }
  return data[0];
};

const reverseGeocode = async (lat: number, lon: number, apiKey: string): Promise<string> => {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey.trim()}`;
  const response = await fetch(url);
  if (!response.ok) return 'Current Location';
  const data: GeocodingResponse[] = await response.json();
  return data[0]?.name || 'Current Location';
};

const fetchOneCallData = async (
  lat: number,
  lon: number,
  apiKey: string
): Promise<OpenWeatherOneCall> => {
  // Always use metric internally, convert in UI
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey.trim()}&units=metric`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key or One Call 3.0 not activated. Please check your subscription.');
    } else {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
};

// Met Office API functions
const findNearestMetOfficeSite = async (lat: number, lon: number): Promise<string> => {
  // Met Office has predefined sites, we'll find the closest one
  // For simplicity, we'll use a basic distance calculation with known sites
  const sites = [
    { id: '310107', name: 'London', lat: 51.5074, lon: -0.1278 },
    { id: '310091', name: 'Manchester', lat: 53.4808, lon: -2.2426 },
    { id: '310023', name: 'Birmingham', lat: 52.4862, lon: -1.8904 },
    { id: '310162', name: 'Leeds', lat: 53.7960, lon: -1.5471 },
    { id: '310026', name: 'Glasgow', lat: 55.8642, lon: -4.2518 },
    { id: '310173', name: 'Cardiff', lat: 51.4816, lon: -3.1791 },
    { id: '310169', name: 'Belfast', lat: 54.5973, lon: -5.9301 },
    { id: '310011', name: 'Edinburgh', lat: 55.9533, lon: -3.1883 },
    { id: '310170', name: 'Aberdeen', lat: 57.1497, lon: -2.0943 },
    { id: '310054', name: 'Brighton', lat: 50.8225, lon: -0.1372 },
  ];

  let nearestSite = sites[0];
  let minDistance = Infinity;

  sites.forEach(site => {
    const distance = Math.sqrt(
      Math.pow(site.lat - lat, 2) + Math.pow(site.lon - lon, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestSite = site;
    }
  });

  return nearestSite.id;
};

const fetchMetOfficeWeather = async (
  location: string,
  apiKey: string
): Promise<{ current: MetOfficeCurrentWeather; forecast: MetOfficeForecast }> => {
  let siteId: string;

  if (location === 'auto') {
    const coords = await getCurrentLocation();
    siteId = await findNearestMetOfficeSite(coords.lat, coords.lon);
  } else {
    // For manual locations, we'll use London as default for now
    // In a full implementation, you'd want to geocode the location name
    siteId = '310107'; // London
  }

  const baseUrl = 'http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json';

  // Fetch 3-hourly forecast
  const forecastUrl = `${baseUrl}/${siteId}?res=3hourly&key=${apiKey}`;

  const forecastResponse = await fetch(forecastUrl);

  if (!forecastResponse.ok) {
    if (forecastResponse.status === 403) {
      throw new Error('Invalid Met Office API key. Please check your API key.');
    } else {
      throw new Error(`Met Office API error: ${forecastResponse.status}`);
    }
  }

  const forecastData: MetOfficeForecast = await forecastResponse.json();

          // For current weather, we'll use the most recent forecast data
          const currentData: MetOfficeCurrentWeather = {
            Location: forecastData.Location,
            Period: [{
              type: 'Day',
              value: forecastData.Period[0].value,
              Rep: [{
                D: forecastData.Period[0].Rep[0].D,
                F: forecastData.Period[0].Rep[0].FDm || forecastData.Period[0].Rep[0].T, // Use daytime max as current temp
                G: forecastData.Period[0].Rep[0].Gm,
                H: forecastData.Period[0].Rep[0].Hm,
                Pp: forecastData.Period[0].Rep[0].PPd,
                S: forecastData.Period[0].Rep[0].S,
                T: forecastData.Period[0].Rep[0].T,
                V: forecastData.Period[0].Rep[0].V,
                W: forecastData.Period[0].Rep[0].W,
                $: forecastData.Period[0].Rep[0].$,
              }]
            }],
          };

  return { current: currentData, forecast: forecastData };
};

// Weather condition mapping for Met Office codes
const metOfficeWeatherCodes: Record<string, { condition: string; icon: string }> = {
  '0': { condition: 'Clear', icon: '01d' },
  '1': { condition: 'Sunny', icon: '01d' },
  '2': { condition: 'Partly cloudy', icon: '02d' },
  '3': { condition: 'Partly cloudy', icon: '02d' },
  '5': { condition: 'Mist', icon: '50d' },
  '6': { condition: 'Fog', icon: '50d' },
  '7': { condition: 'Cloudy', icon: '03d' },
  '8': { condition: 'Overcast', icon: '04d' },
  '9': { condition: 'Light rain shower', icon: '09d' },
  '10': { condition: 'Light rain shower', icon: '09d' },
  '11': { condition: 'Drizzle', icon: '09d' },
  '12': { condition: 'Light rain', icon: '10d' },
  '13': { condition: 'Heavy rain shower', icon: '09d' },
  '14': { condition: 'Heavy rain', icon: '10d' },
  '15': { condition: 'Heavy rain', icon: '10d' },
  '16': { condition: 'Sleet shower', icon: '13d' },
  '17': { condition: 'Sleet', icon: '13d' },
  '18': { condition: 'Hail shower', icon: '13d' },
  '19': { condition: 'Hail', icon: '13d' },
  '20': { condition: 'Light snow shower', icon: '13d' },
  '21': { condition: 'Light snow', icon: '13d' },
  '22': { condition: 'Heavy snow shower', icon: '13d' },
  '23': { condition: 'Heavy snow', icon: '13d' },
  '24': { condition: 'Light snow shower', icon: '13d' },
  '25': { condition: 'Light snow', icon: '13d' },
  '26': { condition: 'Heavy snow shower', icon: '13d' },
  '27': { condition: 'Heavy snow', icon: '13d' },
  '28': { condition: 'Thunder shower', icon: '11d' },
  '29': { condition: 'Thunder', icon: '11d' },
  '30': { condition: 'Thunder shower', icon: '11d' },
};

export function WeatherWidget({ config, onUpdateConfig, isEditing }: WidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settings = config.settings as WeatherSettings;

  const getWeatherIcon = (iconCode: string) => {
    return WEATHER_ICONS[iconCode] || <Cloud className="h-8 w-8 text-gray-400" />;
  };

  const convertTemperature = (temp: number) => {
    if (settings.unit === 'fahrenheit') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  };

  const convertWindSpeed = (speedKmH: number) => {
    if (settings.unit === 'fahrenheit') {
      return Math.round(speedKmH / 1.609); // Convert km/h to mph
    }
    return speedKmH;
  };

  const getTemperatureUnit = () => settings.unit === 'fahrenheit' ? '°F' : '°C';
  const getWindSpeedUnit = () => settings.unit === 'fahrenheit' ? 'mph' : 'km/h';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        const provider = settings.provider || 'openweathermap';
        const apiKey = provider === 'openweathermap'
          ? settings.apiKey
          : settings.metOfficeApiKey;

        if (!apiKey) {
          throw new Error(`${provider === 'openweathermap' ? 'OpenWeatherMap' : 'Met Office'} API key is required. Please add it to your widget settings.`);
        }

        let weatherData: WeatherData;

        if (provider === 'openweathermap') {
          let lat: number;
          let lon: number;
          let locationName: string;

          if (settings.location === 'auto') {
            const coords = await getCurrentLocation();
            lat = coords.lat;
            lon = coords.lon;
            locationName = await reverseGeocode(lat, lon, apiKey);
          } else {
            const geo = await fetchCoordinates(settings.location, apiKey);
            lat = geo.lat;
            lon = geo.lon;
            locationName = geo.name;
          }

          // Fetch all weather data in one call
          const oneCallData = await fetchOneCallData(lat, lon, apiKey);

          // Prepare weather data
          weatherData = {
            location: locationName,
            temperature: oneCallData.current.temp,
            condition: oneCallData.current.weather[0].description,
            icon: oneCallData.current.weather[0].icon,
            humidity: oneCallData.current.humidity,
            windSpeed: Math.round(oneCallData.current.wind_speed * 3.6), // Convert m/s to km/h
            visibility: Math.round(oneCallData.current.visibility / 1000), // Convert m to km
          };

          // Fetch forecast if enabled
          if (settings.showForecast && oneCallData.daily) {
            weatherData.forecast = oneCallData.daily
              .slice(1, 4) // Next 3 days (index 0 is today)
              .map(day => ({
                date: new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
                temp: day.temp.day,
                condition: day.weather[0].description,
                icon: day.weather[0].icon,
              }));
          }
        } else {
          // Met Office API
          const { current, forecast } = await fetchMetOfficeWeather(settings.location, apiKey);

          // Get current weather from the first period/reps
          const currentRep = current.Period[0]?.Rep[0];
          const weatherCode = currentRep?.W || '1';
          const weatherInfo = metOfficeWeatherCodes[weatherCode] || { condition: 'Unknown', icon: '01d' };

          weatherData = {
            location: current.Location.name,
            temperature: parseFloat(currentRep?.T || '0'),
            condition: weatherInfo.condition,
            icon: weatherInfo.icon,
            humidity: parseInt(currentRep?.H || '0'),
            windSpeed: Math.round(parseFloat(currentRep?.S || '0') * 1.609), // Convert mph to km/h
            visibility: parseInt(currentRep?.V || '0'),
          };

          // Process forecast data
          if (settings.showForecast && forecast.Period.length > 1) {
            const dailyForecasts = forecast.Period.slice(1, 4).map(period => {
              const rep = period.Rep[0]; // Daytime data
              const weatherCode = rep?.W || '1';
              const weatherInfo = metOfficeWeatherCodes[weatherCode] || { condition: 'Unknown', icon: '01d' };

              return {
                date: new Date(period.value).toLocaleDateString('en-US', { weekday: 'short' }),
                temp: parseFloat(rep?.Dm || '0'), // Day max temperature
                condition: weatherInfo.condition,
                icon: weatherInfo.icon,
              };
            });

            weatherData.forecast = dailyForecasts;
          }
        }

        setWeather(weatherData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
        setError(errorMessage);
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [settings.location, settings.unit, settings.showForecast, settings.provider, settings.apiKey, settings.metOfficeApiKey]);

  if (loading) {
    return (
      <BaseWidget
        config={config}
        onUpdateConfig={onUpdateConfig}
        isEditing={isEditing}
        title="Weather"
        icon={<Cloud className="h-4 w-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </BaseWidget>
    );
  }

  if (error || !weather) {
    return (
      <BaseWidget
        config={config}
        onUpdateConfig={onUpdateConfig}
        isEditing={isEditing}
        title="Weather"
        icon={<Cloud className="h-4 w-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-full text-center">
          <div className="text-sm text-muted-foreground">
            {error || 'Unable to load weather'}
          </div>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      config={config}
      onUpdateConfig={onUpdateConfig}
      isEditing={isEditing}
      title={weather.location}
      icon={<Cloud className="h-4 w-4" />}
      className="h-full"
    >
      <div className="flex flex-col h-full">
        {/* Current weather */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.icon)}
            <div>
              <div className="text-2xl font-bold">
                {convertTemperature(weather.temperature)}{getTemperatureUnit()}
              </div>
              <div className="text-sm text-muted-foreground">{weather.condition}</div>
            </div>
          </div>
        </div>

        {/* Weather details */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-500" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-3 w-3 text-gray-500" />
            <span>{convertWindSpeed(weather.windSpeed)} {getWindSpeedUnit()}</span>
          </div>
        </div>

        {/* Forecast */}
        {settings.showForecast && weather.forecast && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">3-Day Forecast</div>
            <div className="space-y-1">
              {weather.forecast.map((day, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="w-16">{day.date}</span>
                  <div className="flex items-center gap-1">
                    {getWeatherIcon(day.icon)}
                    <span className="font-medium">{convertTemperature(day.temp)}{getTemperatureUnit()}</span>
                  </div>
                  <span className="text-muted-foreground truncate ml-2">{day.condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}

// Settings component for the Weather widget
export function WeatherWidgetSettings({ settings, onSettingsChange }: { settings: Record<string, any>; onSettingsChange: (settings: Record<string, any>) => void }) {
  const commonLocations = [
    'auto',
    'London, UK',
    'New York, US',
    'Tokyo, Japan',
    'Sydney, Australia',
    'Paris, France',
    'Berlin, Germany',
    'Toronto, Canada',
    'Singapore',
    'Mumbai, India',
  ];

  const provider = settings.provider || 'openweathermap';

  const handleApiKeyChange = (provider: string, value: string) => {
    const trimmedValue = value.trim();
    if (provider === 'openweathermap') {
      onSettingsChange({ ...settings, apiKey: trimmedValue });
    } else {
      onSettingsChange({ ...settings, metOfficeApiKey: trimmedValue });
    }
  };

  const isCustomLocation = settings.location !== 'auto' && !commonLocations.includes(settings.location);
  const [customLocation, setCustomLocation] = useState(isCustomLocation ? settings.location : '');

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Weather Provider</label>
        <select
          value={provider}
          onChange={(e) => onSettingsChange({ ...settings, provider: e.target.value })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          <option value="openweathermap">OpenWeatherMap (Global)</option>
          <option value="metoffice">Met Office (UK)</option>
        </select>
      </div>

      {provider === 'openweathermap' ? (
        <div>
          <label className="text-sm font-medium">
            OpenWeatherMap API Key
            <span className="text-xs text-muted-foreground ml-1">
              (Get one at openweathermap.org)
            </span>
          </label>
          <input
            type="password"
            placeholder="Your OpenWeatherMap API key..."
            value={settings.apiKey || ''}
            onChange={(e) => handleApiKeyChange('openweathermap', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for OpenWeatherMap API access
          </p>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">
            Met Office API Key
            <span className="text-xs text-muted-foreground ml-1">
              (Get one at metoffice.gov.uk)
            </span>
          </label>
          <input
            type="password"
            placeholder="Your Met Office API key..."
            value={settings.metOfficeApiKey || ''}
            onChange={(e) => handleApiKeyChange('metoffice', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for Met Office API access
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Location</label>
        <div className="space-y-2">
          <select
            value={commonLocations.includes(settings.location) ? settings.location : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                onSettingsChange({ ...settings, location: customLocation || 'London, UK' });
              } else {
                onSettingsChange({ ...settings, location: e.target.value });
              }
            }}
            className="w-full mt-1 p-2 border rounded-md"
          >
            {commonLocations.map(location => (
              <option key={location} value={location}>
                {location === 'auto' ? '📍 Auto-detect current location' : location}
              </option>
            ))}
            <option value="custom">✏️ Custom Location...</option>
          </select>

          {(settings.location === 'custom' || !commonLocations.includes(settings.location)) && (
            <input
              type="text"
              placeholder="Enter city name (e.g., Paris, FR)"
              value={customLocation}
              onChange={(e) => {
                setCustomLocation(e.target.value);
                onSettingsChange({ ...settings, location: e.target.value });
              }}
              className="w-full p-2 border rounded-md text-sm"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {provider === 'metoffice'
            ? 'Met Office data is primarily for UK locations. Auto-detect finds nearest UK weather station.'
            : 'Select a city or choose auto-detect to use your current location'
          }
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Temperature Unit</label>
        <select
          value={settings.unit}
          onChange={(e) => onSettingsChange({ ...settings, unit: e.target.value as 'celsius' | 'fahrenheit' })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          <option value="celsius">Celsius (°C)</option>
          <option value="fahrenheit">Fahrenheit (°F)</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showForecast"
          checked={settings.showForecast}
          onChange={(e) => onSettingsChange({ ...settings, showForecast: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="showForecast" className="text-sm">Show 3-day forecast</label>
      </div>
    </div>
  );
}