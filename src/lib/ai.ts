'use server';

import Groq from 'groq-sdk';
import { getSettings } from "./admin-settings";

const apiKey = process.env.GROQ_API_KEY;

// Initialize Groq
const groq = apiKey ? new Groq({ apiKey }) : null;

export interface Recommendation {
    title: string;
    reason: string;
}

export interface Notification {
    id: string;
    type: 'newReleases' | 'friendActivity' | 'offers' | 'recommendations';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

interface AIRecommendationResponse {
    title: string;
    reason: string;
}

interface AINotificationResponse {
    title: string;
    message: string;
    time: string;
}

export async function getGeminiRecommendations(favorites: string[]): Promise<Recommendation[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    if (favorites.length === 0) {
        return [];
    }

    const prompt = `Act as a movie recommendation expert.
Based on these favorite movies: ${favorites.join(', ')}.
Recommend 3 similar movies that the user might like.
IMPORTANT: Respond in Spanish.
Return ONLY a JSON array with this format:
[
    { "title": "Movie Title", "reason": "Short reason why" }
]
Do not include markdown formatting or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1000,
        });

        const text = completion.choices[0]?.message?.content || '';

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations: AIRecommendationResponse[] = JSON.parse(jsonStr);

        return recommendations;
    } catch (error) {
        return [];
    }
}

/**
 * Get movie recommendations as a JSON array of titles
 */
export async function getMovieRecommendationsJSON(prompt: string): Promise<string[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    const systemPrompt = `Act as a movie recommendation engine.
    Based on the user's request, recommend 4-5 specific movies.
    Return ONLY a JSON array of strings with the exact movie titles.
    Example: ["Inception", "The Matrix", "Interstellar"]
    Do not include any other text, markdown, or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 200,
        });

        const text = completion.choices[0]?.message?.content || '[]';
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const titles = JSON.parse(jsonStr);

        return Array.isArray(titles) ? titles : [];
    } catch (error) {
        return [];
    }
}

/**
 * Generate a generic AI response based on a prompt
 */
export async function generateAIResponse(prompt: string): Promise<string> {
    const settings = await getSettings();
    if (!settings.enableAi) return 'La IA está deshabilitada por el administrador.';

    if (!groq) {
        return 'Lo siento, la IA no está configurada correctamente.';
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 500,
        });

        return completion.choices[0]?.message?.content || '';
    } catch (error) {
        return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
}

/**
 * Get AI-generated notifications for new movie releases
 */
export async function getNewReleasesNotifications(): Promise<Notification[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    const prompt = `Act as a movie news expert.
    Generate 2 exciting notifications about recent movie releases or upcoming blockbusters.
    Make them feel timely and engaging, as if they just happened.
    IMPORTANT: Respond in Spanish.
    Return ONLY a JSON array with this format:
    [
        { 
            "title": "Movie Title", 
            "message": "Brief exciting description (max 60 chars)",
            "time": "Hace X min/horas"
        }
    ]
    Do not include markdown formatting or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 500,
        });

        const text = completion.choices[0]?.message?.content || '';
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const notifications: AINotificationResponse[] = JSON.parse(jsonStr);

        return notifications.map((n, i) => ({
            id: `release-${i}`,
            type: 'newReleases',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error) {
        return [];
    }
}

/**
 * Get AI-generated movie industry news notifications
 */
export async function getMovieNewsNotifications(): Promise<Notification[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    const prompt = `Act as a movie industry news reporter.
    Generate 2 interesting news items about the film industry, awards, or trending topics in cinema.
    Make them feel current and newsworthy.
    IMPORTANT: Respond in Spanish.
    Return ONLY a JSON array with this format:
    [
        { 
            "title": "News Headline", 
            "message": "Brief news summary (max 60 chars)",
            "time": "Hace X horas/días"
        }
    ]
    Do not include markdown formatting or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 500,
        });

        const text = completion.choices[0]?.message?.content || '';
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const notifications: AINotificationResponse[] = JSON.parse(jsonStr);

        return notifications.map((n, i) => ({
            id: `news-${i}`,
            type: 'friendActivity',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error) {
        return [];
    }
}

/**
 * Get AI-generated special offers notifications
 */
export async function getSpecialOffersNotifications(favorites: string[]): Promise<Notification[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    const favoritesContext = favorites.length > 0
        ? `The user likes: ${favorites.join(', ')}.`
        : '';

    const prompt = `Act as a streaming service marketing expert.
    ${favoritesContext}
    Generate 1 personalized special offer or promotion for a movie streaming service.
    Make it feel exclusive and valuable.
    IMPORTANT: Respond in Spanish.
    Return ONLY a JSON array with this format:
    [
        { 
            "title": "Offer Title", 
            "message": "Offer description (max 60 chars)",
            "time": "Válido por X días"
        }
    ]
    Do not include markdown formatting or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 300,
        });

        const text = completion.choices[0]?.message?.content || '';
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const notifications: AINotificationResponse[] = JSON.parse(jsonStr);

        return notifications.map((n, i) => ({
            id: `offer-${i}`,
            type: 'offers',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error) {
        return [];
    }
}

/**
 * Get AI-generated search correction
 */
export async function getSearchCorrection(query: string): Promise<string | null> {
    const settings = await getSettings();
    if (!settings.enableAi) return null;

    if (!groq) {
        return null;
    }

    const prompt = `Act as a movie search assistant.
    The user searched for: "${query}".
    Did they likely mean a specific movie or TV show title that is spelled differently?
    If yes, return ONLY the corrected title.
    If the spelling seems correct or you are unsure, return "null".
    Example: User "moaaana" -> Return "Moana"
    Example: User "matrix" -> Return "null" (correct spelling)
    IMPORTANT: Return ONLY the string of the title or the string "null". Do not include quotes or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 50,
        });

        const text = completion.choices[0]?.message?.content?.trim() || 'null';
        if (text.toLowerCase() === 'null' || text.toLowerCase() === query.toLowerCase()) {
            return null;
        }

        // Remove quotes if present
        return text.replace(/^["']|["']$/g, '');
    } catch (error) {
        return null;
    }
}
/**
 * Get YouTube trailer ID using AI
 */
export async function getYouTubeTrailerId(title: string, year: string, type: 'movie' | 'tv', productionCompany?: string): Promise<string | null> {
    const settings = await getSettings();
    if (!settings.enableAi) return null;

    if (!groq) {
        return null;
    }

    const companyContext = productionCompany ? ` produced by "${productionCompany}"` : '';
    const channelContext = productionCompany ? ` Look specifically on the official "${productionCompany}" YouTube channel or their local subsidiary channels.` : '';

    const prompt = `Act as a movie database expert.
    Find the YouTube video ID for the official trailer of the ${type}: "${title}" (${year})${companyContext}.
    ${channelContext}
    Return ONLY the 11-character YouTube video ID string.
    Example: "d9My665987"
    If you are not 100% sure or cannot find a specific trailer, return "null".
    IMPORTANT: Return ONLY the ID string or "null". Do not include quotes, explanations, or full URLs.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 20,
        });

        const text = completion.choices[0]?.message?.content?.trim() || 'null';

        // Clean up the response
        let videoId = text.replace(/^["']|["']$/g, '');

        // Handle explicit null from AI
        if (videoId.toLowerCase() === 'null') {
            return null;
        }

        // Handle if AI returns a full URL
        if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
            const urlMatch = videoId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) {
                videoId = urlMatch[1];
            }
        }

        // Validate ID format (11 characters, alphanumeric, -, _)
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return null;
        }

        return videoId;
    } catch (error) {
        return null;
    }
}
