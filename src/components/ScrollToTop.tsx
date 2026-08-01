import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side route changes keep the previous scroll position, so navigating
 * from a card halfway down the episode index into an episode page would land
 * mid-article. Reset on pathname change — but not when there's a hash, since
 * those navigations mean "scroll to this section" and handle it themselves.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
