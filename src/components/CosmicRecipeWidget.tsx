// src/components/CosmicRecipeWidget.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAstrologicalRecipes, resetCircuitBreaker, Recipe } from '../services/astrologyApi';
import { celestialConfig } from '../config/celestialConfig'; // Import celestialConfig

interface SavedChartData {
  year: number;
  month: number;
  day: number;
  time: string;
  latitude: number;
  longitude: number;
}


const ConstellationLoader = () => (
    <div className="relative w-full h-24 flex items-center justify-center">
        <p className="text-amber-50 font-serif animate-pulse">Casting Celestial Spells...</p>
        {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute bg-white rounded-full animate-ping" style={{
                width: `${Math.random() * 3 + 2}px`,
                height: `${Math.random() * 3 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random()}s`,
            }}></div>
        ))}
    </div>
);

// Helper to get current Chaldean Planetary Hour Ruler for Forest Hills (America/New_York)
const getChaldeanPlanetaryHour = () => {
  const now = new Date();
  // For simplicity, we'll use a fixed offset for America/New_York, or could use an Intl.DateTimeFormat
  // However, getting accurate timezone-aware *local* hour based on current date is tricky without a lib.
  // For now, let's assume the server is in the correct timezone or a simple offset.
  // A robust solution would involve a library like 'luxon' or 'moment-timezone'.
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    weekday: 'long',
    timeZone: 'America/New_York'
  };
  const dateInNY = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

  let hour: number = 0;
  let weekday: string = '';

  for (const part of dateInNY) {
    if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
      // Adjust for 12-hour format potentially returned by 'numeric' hour if not careful.
      // For simplicity, assuming 24-hour format after parsing, or will manually convert.
      // A more reliable way:
      const hour24 = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now);
      hour = parseInt(hour24, 10);
    }
    if (part.type === 'weekday') {
      weekday = part.value;
    }
  }

  const planetaryOrder = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

  // Starting ruler for each day (first hour of the day)
  const dayRulers: { [key: string]: string } = {
    'Sunday': 'Sun',
    'Monday': 'Moon',
    'Tuesday': 'Mars',
    'Wednesday': 'Mercury',
    'Thursday': 'Jupiter',
    'Friday': 'Venus',
    'Saturday': 'Saturn',
  };

  const startRuler = dayRulers[weekday];
  if (!startRuler) return 'Unknown';

  const startIndex = planetaryOrder.indexOf(startRuler);
  if (startIndex === -1) return 'Unknown';

  // Chaldean hours start from sunrise, but for simplification, we use current hour.
  // The sequence repeats every 7 hours.
  const rulerIndex = (startIndex + hour) % 7;

  return planetaryOrder[rulerIndex];
};

// New helper function to determine elemental requirement based on planetary hour
const getElementalRequirement = (planetaryHour: string) => {
  switch (planetaryHour) {
    case 'Sun':
    case 'Mars':
      return { element: 'Fire', sodiumThreshold: 150, fiberThreshold: 20 };
    case 'Moon':
    case 'Venus':
      return { element: 'Water', sodiumThreshold: 100, fiberThreshold: 30 };
    case 'Jupiter':
      return { element: 'Air', sodiumThreshold: 120, fiberThreshold: 25 };
    case 'Saturn':
    case 'Mercury':
      return { element: 'Earth', sodiumThreshold: 80, fiberThreshold: 35 };
    default:
      return { element: 'None', sodiumThreshold: 0, fiberThreshold: 0 };
  }
};


interface CosmicRecipeWidgetProps {
  savedChart?: SavedChartData;
}

const CosmicRecipeWidget: React.FC<CosmicRecipeWidgetProps> = ({ savedChart }) => {
    const [birthData, setBirthData] = useState(() => {
        if (savedChart) {
            return savedChart;
        }
        // Use celestialConfig for default values
        return {
            year: celestialConfig.defaultBirthChart.year,
            month: celestialConfig.defaultBirthChart.month,
            day: celestialConfig.defaultBirthChart.day,
            time: '12:00', // Default time can remain hardcoded or moved to config if needed
            latitude: celestialConfig.forestHillsCoordinates.latitude,
            longitude: celestialConfig.forestHillsCoordinates.longitude,
        };
    });
    const [recipes, setRecipes] = useState<Recipe | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRecipes, setShowRecipes] = useState(false);

    useEffect(() => {
        localStorage.setItem('userLatitude', birthData.latitude.toString());
        localStorage.setItem('userLongitude', birthData.longitude.toString());
    }, [birthData.latitude, birthData.longitude]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setBirthData(prevData => ({
            ...prevData,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleRandomCoordinates = () => {
        const randomLatitude = parseFloat((Math.random() * 180 - 90).toFixed(4));
        const randomLongitude = parseFloat((Math.random() * 360 - 180).toFixed(4));
        setBirthData(prevData => ({
            ...prevData,
            latitude: randomLatitude,
            longitude: randomLongitude,
        }));
    };

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError(null);
        setRecipes(null);
        setShowRecipes(false); // Reset showRecipes when loading starts

        const result = await fetchAstrologicalRecipes(birthData);

        if (result.isError) {
            // Check if status and body exist on the error object
            if (('status' in result && result.status === 500) || ('body' in result && typeof result.body === 'string' && result.body.includes("UndefinedTable"))) {
                setError("Database Error: The recipe table is missing on the server. Please ask the administrator to initialize the database.");
            } else {
                setError((result as { isError: true; message: string }).message);
            }
        } else {
            setRecipes((result as { isError: false; data: any }).data);
            // After setting recipes, set showRecipes to true after a small delay to trigger fade-in
            setTimeout(() => setShowRecipes(true), 100);
        }

        setIsLoading(false);
    }, [birthData]);

    const handleRetry = () => {
        resetCircuitBreaker();
        handleSubmit();
    };

    const inputStyle = "bg-indigo-950 border border-amber-400 text-amber-50 font-serif rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-300";

    return (
        <div className="bg-indigo-950 border-2 border-amber-400 text-amber-50 font-serif p-6 rounded-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Cosmic Recipe Generator</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Input fields */}
                    <div>
                        <label htmlFor="year" className="block mb-1">Year</label>
                        <input type="number" name="year" id="year" value={birthData.year} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="month" className="block mb-1">Month</label>
                        <input type="number" name="month" id="month" value={birthData.month} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="day" className="block mb-1">Day</label>
                        <input type="number" name="day" id="day" value={birthData.day} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="time" className="block mb-1">Time (24h)</label>
                        <input type="time" name="time" id="time" value={birthData.time} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="latitude" className="block mb-1">Latitude</label>
                        <input type="number" step="any" name="latitude" id="latitude" value={birthData.latitude} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="longitude" className="block mb-1">Longitude</label>
                        <input type="number" step="any" name="longitude" id="longitude" value={birthData.longitude} onChange={handleChange} className={inputStyle} />
                    </div>
                </div>
                {!isLoading && !error && (
                    <div className="flex flex-col space-y-2">
                        <button type="submit" className="w-full bg-amber-400 text-indigo-950 font-bold py-2 px-4 rounded hover:bg-amber-300 transition-colors duration-300">
                            Get My Cosmic Recipe
                        </button>
                        <button type="button" onClick={handleRandomCoordinates} className="w-full bg-gray-600 text-amber-50 font-bold py-2 px-4 rounded hover:bg-gray-500 transition-colors duration-300">
                            Generate Random Coordinates
                        </button>
                    </div>
                )}
            </form>

            {isLoading && <ConstellationLoader />}

            {error && (
                <div className="mt-4 p-4 border border-red-500 bg-red-900 text-white rounded">
                    <p className="font-bold">Error:</p>
                    <p className="mb-4">{error}</p>
                    <button onClick={handleRetry} className="w-full bg-amber-400 text-indigo-950 font-bold py-2 px-4 rounded hover:bg-amber-300 transition-colors duration-300">
                        Retry
                    </button>
                </div>
            )}

            {recipes && (
                <div className={`mt-4 p-4 border border-amber-400 rounded transition-opacity duration-500 ${showRecipes ? 'opacity-100' : 'opacity-0'}`}>
                    <h3 className="text-xl font-bold mb-2">Your Cosmic Recipes:</h3>
                    {/* Chaldean Planetary Hour Ruler */}
                    <div className="mb-4">
                        <p className="text-lg font-bold">Current Planetary Hour Ruler:</p>
                        <p className="text-amber-300 text-2xl">{getChaldeanPlanetaryHour()}</p>
                    </div>

                    {/* Elemental Requirements and SMES */}
                    <div className="mb-4">
                        <p className="text-lg font-bold">Alchemical Quantities (SMES):</p>
                        <div className="flex flex-col space-y-1">
                            {Object.entries(recipes.alchemical_quantities).map(([key, value]) => (
                                <div key={key} className="flex items-center">
                                    <span className="w-24 capitalize">{key}:</span>
                                    <div className="flex-grow bg-gray-700 rounded-full h-3">
                                        <div
                                            className="bg-purple-400 h-3 rounded-full"
                                            style={{ width: `${Math.min(value as number, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="ml-2 text-sm">{(value as number).toFixed(2)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 6-Metric Grid: Sodium and Fiber */}
                    <div className="mb-4">
                        <p className="text-lg font-bold">6-Metric Grid (Sodium & Fiber):</p>
                        {(() => {
                            const currentPlanetaryHourRuler = getChaldeanPlanetaryHour();
                            const elementalReq = getElementalRequirement(currentPlanetaryHourRuler);

                            const isSodiumAligned = recipes.sodium >= elementalReq.sodiumThreshold * 0.9 && recipes.sodium <= elementalReq.sodiumThreshold * 1.1;
                            const isFiberAligned = recipes.fiber >= elementalReq.fiberThreshold * 0.9 && recipes.fiber <= elementalReq.fiberThreshold * 1.1;

                            const sodiumGlowClass = isSodiumAligned ? 'shadow-lg shadow-amber-500/50 animate-pulse' : '';
                            const fiberGlowClass = isFiberAligned ? 'shadow-lg shadow-emerald-500/50 animate-pulse' : '';

                            return (
                                <div className="space-y-2">
                                    <div className={`flex items-center p-2 rounded ${sodiumGlowClass}`}>
                                        <span className="w-24">Sodium:</span>
                                        <span className="flex-grow text-right">{recipes.sodium}mg</span>
                                    </div>
                                    <div className={`flex items-center p-2 rounded ${fiberGlowClass}`}>
                                        <span className="w-24">Fiber:</span>
                                        <span className="flex-grow text-right">{recipes.fiber}g</span>
                                    </div>
                                    {elementalReq.element !== 'None' && (
                                        <p className="text-sm text-amber-200">
                                            Current Elemental Requirement ({elementalReq.element}): Sodium ~{elementalReq.sodiumThreshold}mg, Fiber ~{elementalReq.fiberThreshold}g
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Potency Meter */}
                    <div className="mb-4">
                        <p className="text-lg font-bold">Total Potency Score:</p>
                        <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                            <div
                                className={`bg-amber-400 h-4 rounded-full ${recipes.totalPotencyScore > 150 ? 'shadow-glow' : ''}`}
                                style={{ width: `${Math.min(recipes.totalPotencyScore, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-right">{recipes.totalPotencyScore.toFixed(2)}%</p>
                    </div>

                    <pre className="bg-black bg-opacity-20 p-2 rounded whitespace-pre-wrap">
                        {JSON.stringify(recipes, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default CosmicRecipeWidget;
