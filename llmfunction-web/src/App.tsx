import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CreateFunctionPage } from './pages/CreateFunctionPage';
import { FunctionPage } from './pages/FunctionPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateFunctionPage />} />
            <Route path="/function/:id" element={<FunctionPage />} />
            {/* Add more routes here */}
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
