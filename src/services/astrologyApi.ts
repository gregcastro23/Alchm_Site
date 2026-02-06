// src/services/astrologyApi.ts

interface BirthData {
  year: number;
  month: number;
  day: number;
  time: string; // "HH:MM"
  latitude: number;
  longitude: number;
}

interface AlchemicalQuantities {
  spirit: number;
  essence: number;
  matter: number;
  substance: number;
}

export interface Recipe {
  id?: string; // Assuming a recipe ID
  name?: string; // Recipe name
  description?: string; // Recipe description
  alchemical_quantities: AlchemicalQuantities;
  totalPotencyScore: number;
  // TODO: Add other relevant fields from the API response for a complete recipe object
}


// Simple in-memory circuit breaker
const circuitBreaker = {
  failureCount: 0,
  isBroken: false,
  lastFailureTime: 0,
  failureThreshold: 3, // Break after 3 consecutive failures
  resetTimeout: 30000, // 30 seconds
};

export const resetCircuitBreaker = () => {
  console.log("Circuit breaker manually reset.");
  circuitBreaker.failureCount = 0;
  circuitBreaker.isBroken = false;
  circuitBreaker.lastFailureTime = 0;
};

const handleFailure = (error?: any) => {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
    circuitBreaker.isBroken = true;
    console.error("Circuit breaker tripped. Halting requests.");
  }
  // Return a structured error object
  return {
    isError: true,
    message: error?.message || 'An unknown error occurred.',
    status: error?.status,
  };
};

const handleSuccess = () => {
  if (circuitBreaker.failureCount > 0) {
    console.log("Request successful. Resetting circuit breaker.");
    resetCircuitBreaker();
  }
};

export const fetchAstrologicalRecipes = async (birthData: BirthData) => {
  if (circuitBreaker.isBroken) {
    if (Date.now() - circuitBreaker.lastFailureTime > circuitBreaker.resetTimeout) {
      console.log("Circuit breaker reset timeout elapsed. Attempting request.");
      circuitBreaker.isBroken = false; // Half-open state
    } else {
      return handleFailure({ message: "Circuit is open. Please try again later." });
    }
  }

  const API_URL = 'http://192.168.0.129:8001/api/astrological/recipe-recommendations-by-chart';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(birthData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorPayload = {
        message: `HTTP error! Status: ${response.status}`,
        status: response.status,
        body: ''
      };
      try {
        errorPayload.body = await response.text();
      } catch (e) {
        // ignore if can't read body
      }
      return handleFailure(errorPayload);
    }

    const data: Recipe = await response.json(); // Explicitly type data as Recipe
    handleSuccess();
    return { isError: false, data };
  } catch (error: any) {
    console.error("Failed to fetch astrological recipes:", error);
    if (error.name === 'AbortError') {
      return handleFailure({ message: 'Request timed out after 10 seconds.' });
    }
    return handleFailure(error);
  }
};

export const mockFetchAstrologicalRecipes = async (birthData: BirthData) => {
  console.log("Using mock data for astrological recipes based on Forest Hills context.");
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockResponse: Recipe = {
    id: "mock-recipe-forest-hills-123",
    name: "Alchemical Dish (Forest Hills Mock)",
    description: "This mock recipe demonstrates the alchemical breakdown for a typical Forest Hills astrological chart, showing high potency.",
    alchemical_quantities: {
      spirit: 28.50, // Example value reflecting Forest Hills influence
      essence: 32.75, // Example value
      matter: 22.25, // Example value
      substance: 16.50, // Example value
    },
    totalPotencyScore: 175.00, // Representing 1.75x, so 175% for display purposes if capped at 100
  };

  return { isError: false, data: mockResponse };
};

