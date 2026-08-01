import React from 'react';
import { Route, Routes } from 'react-router-dom';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import Episode from './pages/Episode';
import Episodes from './pages/Episodes';
import Home from './pages/Home';
import ScrollToTop from './components/ScrollToTop';

const App: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink-900">
    <ScrollToTop />
    <SiteHeader />
    <main className="flex-1">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/episodes" element={<Episodes />} />
        <Route path="/episodes/:slug" element={<Episode />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </main>
    <SiteFooter />
  </div>
);

export default App;
