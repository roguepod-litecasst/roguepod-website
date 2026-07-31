import React from 'react';
import { Route, Routes } from 'react-router-dom';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import Home from './pages/Home';

const App: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink-900">
    <SiteHeader />
    <main className="flex-1">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </main>
    <SiteFooter />
  </div>
);

export default App;
