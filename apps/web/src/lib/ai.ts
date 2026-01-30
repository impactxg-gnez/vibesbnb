import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generates a vector embedding for a given text using Google's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    return embedding.values;
}

/**
 * Analyzes a natural language query to extract structured search parameters and a 'vibe' description.
 */
export async function analyzeSearchQuery(query: string) {
    if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    Analyze the following property search query and extract structured information.
    Query: "${query}"

    Return a JSON object with:
    1. "location": (string or null) The mentioned location.
    2. "guests": (number or null) Minimum number of guests/people.
    3. "vibe": (string) A descriptive "vibe" or category (e.g., "luxury beach house", "cozy mountain cabin", "modern city studio").
    4. "highlights": (string[]) Key amenities or features mentioned (e.g., "pool", "fast wifi", "scenic view").

    Example: "looking for a quiet villa in bali for 4 people with a private pool"
    Output: {
      "location": "bali",
      "guests": 4,
      "vibe": "quiet private villa",
      "highlights": ["pool", "quiet"]
    }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
        // Strip markdown formatting if present
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Error parsing Gemini response:', error);
        return {
            location: null,
            guests: 1,
            vibe: query,
            highlights: []
        };
    }
}

/**
 * Generates a short "Match Reason" explaining why a property matches the user's requirement.
 */
export async function generateMatchReason(query: string, propertyName: string, propertyDescription: string) {
    if (!apiKey) return "Matches your description.";

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    User Search: "${query}"
    Property: "${propertyName}"
    Description: "${propertyDescription}"

    Explain in 10-15 words why this property is a good match for the user's search. Be enthusiastic and focus on the "vibe".
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        return "Matches your vibe perfectly.";
    }
}
