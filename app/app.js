import { AuthProvider } from './contexts/AuthContext';
import Navigation from './navigation'; // We'll create this next

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}