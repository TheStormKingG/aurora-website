/**
 * Route-change enter transition (preqal.org AnimatedRoutes parity,
 * enter-only): templates remount per navigation, so the page-enter
 * animation plays on every route change. Reduced-motion disables it
 * in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
