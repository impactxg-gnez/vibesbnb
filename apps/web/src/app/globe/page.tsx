'use client';
export const dynamic = 'force-dynamic';
import { PropertyGlobe } from '@/components/globe/PropertyGlobe';

export default function GlobePage() {
    return (
        <main className="min-h-screen bg-charcoal-950">
            <PropertyGlobe />
        </main>
    );
}
