import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { ProjectObservatory } from './pages/ProjectObservatory';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

/**
 * Simple hash-based router
 */
function useHashRouter() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

function App() {
  const route = useHashRouter();

  return (
    <QueryClientProvider client={queryClient}>
      {route === '/observatory' ? <ProjectObservatory /> : <UnifiedDashboard />}
    </QueryClientProvider>
  );
}

export default App;
