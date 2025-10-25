
'use client';

// This is a specific layout for the production tablet view, without the main app navigation.
export default function ProduccionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen">
      {children}
    </div>
  );
}
