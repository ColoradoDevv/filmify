import Groq from 'groq-sdk';

const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

// Initialize Groq
const groq = apiKey ? new Groq({ apiKey, dangerouslyAllowBrowser: true }) : null;

export interface Recommendation {
    title: string;
    reason: string;
}

export async function getGeminiRecommendations(favorites: string[]): Promise<Recommendation[]> {
    console.log('🔑 Groq API Key status:', apiKey ? '✅ Configured' : '❌ Missing');

    if (!groq) {
        console.warn('⚠️ Groq API Key not found. Please set NEXT_PUBLIC_GROQ_API_KEY in .env.local');
        return [];
    }

    if (favorites.length === 0) {
        console.log('📭 No favorites provided, skipping recommendations');
        return [];
    }

    console.log('🎬 Generating recommendations based on:', favorites);

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
        console.log('📡 Sending request to Groq API...');
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1000,
        });

        const text = completion.choices[0]?.message?.content || '';
        console.log('📥 Raw Groq response:', text);

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations = JSON.parse(jsonStr);
        console.log('✨ Parsed recommendations:', recommendations);

        return recommendations;
    } catch (error: any) {
        // Handle specific error types
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
            console.warn('⚠️ Groq API quota exceeded. Please wait or check your limits.');
            console.info('ℹ️ Visit: https://console.groq.com');
        } else if (error?.message?.includes('401') || error?.message?.includes('API_KEY_INVALID')) {
            console.warn('⚠️ Groq API key invalid. Please generate a new API key.');
            console.info('ℹ️ Visit: https://console.groq.com/keys');
        } else {
            console.error('❌ Error fetching recommendations from Groq:', error?.message || error);
        }

        if (error instanceof Error) {
            console.debug('Error details:', {
                message: error.message,
                name: error.name
            });
        }

        return [];
    }
}

/**
 * Get movie recommendations as a JSON array of titles
 */
export async function getMovieRecommendationsJSON(prompt: string): Promise<string[]> {
    if (!groq) {
        console.warn('⚠️ Groq API Key not found');
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
        console.error('❌ Error getting movie recommendations:', error);
        return [];
    }
}

/**
 * Generate a generic AI response based on a prompt
 */
export async function generateAIResponse(prompt: string): Promise<string> {
    if (!groq) {
        console.warn('⚠️ Groq API Key not found');
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
        console.error('❌ Error generating AI response:', error);
        return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
}

/**
 * Get AI-generated notifications for new movie releases
 */
export async function getNewReleasesNotifications(): Promise<any[]> {
    if (!groq) {
        console.warn('⚠️ Groq API Key not found');
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
        const notifications = JSON.parse(jsonStr);

        return notifications.map((n: any, i: number) => ({
            id: `release-${i}`,
            type: 'newReleases',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error: any) {
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
            console.warn('⚠️ Groq API quota exceeded for new releases');
        } else if (error?.message?.includes('401') || error?.message?.includes('API_KEY_INVALID')) {
            console.warn('⚠️ Groq API key invalid');
        }
        return [];
    }
}

/**
 * Get AI-generated movie industry news notifications
 */
export async function getMovieNewsNotifications(): Promise<any[]> {
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
        const notifications = JSON.parse(jsonStr);

        return notifications.map((n: any, i: number) => ({
            id: `news-${i}`,
            type: 'friendActivity',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error: any) {
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
            console.warn('⚠️ Groq API quota exceeded for news');
        } else if (error?.message?.includes('401') || error?.message?.includes('API_KEY_INVALID')) {
            console.warn('⚠️ Groq API key invalid');
        }
        return [];
    }
}

/**
 * Get AI-generated special offers notifications
 */
export async function getSpecialOffersNotifications(favorites: string[]): Promise<any[]> {
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
        const notifications = JSON.parse(jsonStr);

        return notifications.map((n: any, i: number) => ({
            id: `offer-${i}`,
            type: 'offers',
            title: n.title,
            message: n.message,
            time: n.time,
            read: false
        }));
    } catch (error: any) {
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
            console.warn('⚠️ Groq API quota exceeded for offers');
        } else if (error?.message?.includes('401') || error?.message?.includes('API_KEY_INVALID')) {
            console.warn('⚠️ Groq API key invalid');
        }
        return [];
    }
}
