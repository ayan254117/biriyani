import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Restaurant {
  name: string;
  address: string;
  rating?: number;
  uri?: string;
  description?: string;
}

export async function findBiryaniPlaces(lat?: number, lng?: number): Promise<{ text: string; places: any[] }> {
  const locationPrompt = lat && lng ? ` near coordinates ${lat}, ${lng}` : " in my area";
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find the best Biryani restaurants for Iftar or Sehri${locationPrompt}. Provide a list with their names, specialties, and why they are good for Ramadan. Also mention if they have special Iftar boxes.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined
        }
      }
    },
  });

  const text = response.text || "No information found.";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const places = groundingChunks
    .filter((chunk: any) => chunk.maps)
    .map((chunk: any) => ({
      title: chunk.maps.title,
      uri: chunk.maps.uri
    }));

  return { text, places };
}

export async function getRamadanTimings(lat?: number, lng?: number): Promise<string> {
  const locationPrompt = lat && lng ? ` for coordinates ${lat}, ${lng}` : " for my current location";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `What are the Iftar and Sehri timings for today (${new Date().toLocaleDateString()})${locationPrompt}? Please provide the exact times in a clear format.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text || "Timings not available.";
}
