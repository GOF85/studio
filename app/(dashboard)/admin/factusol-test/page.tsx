import { ArticleViewer } from '@/components/article-viewer';

export default function FactusolTestPage() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-6">
            <main className="w-full max-w-4xl">
                <ArticleViewer />
            </main>
        </div>
    );
}
