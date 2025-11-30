'use server';

// Mock data for reported reviews since we might not have a full reviews system with reports yet
export type ReportedReview = {
    id: string;
    movieId: string;
    movieTitle: string;
    userId: string;
    userEmail: string;
    content: string;
    reportReason: string;
    date: string;
    status: 'pending' | 'resolved' | 'dismissed';
};

const MOCK_REPORTS: ReportedReview[] = [
    {
        id: '1',
        movieId: '123',
        movieTitle: 'Dune: Part Two',
        userId: 'u1',
        userEmail: 'troll@example.com',
        content: 'Esta película es una basura, odio a todos los actores.',
        reportReason: 'Lenguaje ofensivo',
        date: '2024-03-15',
        status: 'pending'
    },
    {
        id: '2',
        movieId: '456',
        movieTitle: 'Kung Fu Panda 4',
        userId: 'u2',
        userEmail: 'spoiler@example.com',
        content: 'Al final Po se convierte en el líder espiritual y...',
        reportReason: 'Spoiler sin marcar',
        date: '2024-03-14',
        status: 'pending'
    }
];

export async function getReportedReviews() {
    // In a real app, fetch from 'reports' or 'reviews' table where status = 'reported'
    return MOCK_REPORTS;
}

export async function deleteReview(reviewId: string) {
    // In a real app, delete from DB
    console.log('Deleting review', reviewId);
    return { success: true };
}

export async function dismissReport(reviewId: string) {
    // In a real app, update report status to 'dismissed'
    console.log('Dismissing report', reviewId);
    return { success: true };
}
