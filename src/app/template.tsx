/** Re-mounts on every navigation: a quick CSS fade between pages (opacity only, disabled for reduced motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in flex min-h-full flex-1 flex-col">{children}</div>;
}
