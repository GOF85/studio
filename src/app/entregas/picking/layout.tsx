'use client';

// This layout is likely not needed anymore if the page is simple, 
// but keeping it in case there are future nested routes for picking.
export default function PickingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
