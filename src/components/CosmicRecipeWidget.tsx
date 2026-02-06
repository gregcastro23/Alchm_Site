// src/components/CosmicRecipeWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAstrologicalRecipes, resetCircuitBreaker } from '../services/astrologyApi';

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

const CosmicRecipeWidget: React.FC = () => {
    const [birthData, setBirthData] = useState(() => {
        const savedLat = localStorage.getItem('userLatitude');
        const savedLon = localStorage.getItem('userLongitude');
        return {
            year: 2000,
            month: 1,
            day: 1,
            time: '12:00',
            latitude: savedLat ? parseFloat(savedLat) : 34.0522,
            longitude: savedLon ? parseFloat(savedLon) : -118.2437,
        };
    });
    const [recipes, setRecipes] = useState<any>(null);
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
                    <pre className="bg-black bg-opacity-20 p-2 rounded whitespace-pre-wrap">
                        {JSON.stringify(recipes, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default CosmicRecipeWidget;
