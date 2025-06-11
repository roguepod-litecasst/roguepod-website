import React from 'react';

interface LinkItem {
  href: string;
  icon: React.ReactNode;
  text: string;
}

const App: React.FC = () => {
  const links: LinkItem[] = [
    {
      href: "https://feeds.acast.com/public/shows/roguepod-litecast",
      text: "RSS",
      icon: (
        <div className="w-10 h-10 flex items-center justify-center">
          <img src={`${process.env.PUBLIC_URL}/rss-icon.svg`} alt="RSS" className="w-8 h-8 filter invert" />
        </div>
      )
    },
    {
      href: "https://podcasts.apple.com/gb/podcast/roguepod-litecast/id1774367401",
      text: "Apple",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      )
    },
    {
      href: "https://open.spotify.com/show/0LGkjkg8uVVMg5y6slJiua",
      text: "Spotify",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.469-.077-.336.132-.67.469-.746 3.809-.871 7.077-.496 9.713 1.115.294.18.386.563.207.856zm1.223-2.723c-.226.367-.706.482-1.073.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.125-.849-.106-.973-.52-.125-.413.106-.849.52-.973 3.632-1.102 8.147-.568 11.234 1.328.366.226.48.706.257 1.074zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.128-1.166-.621-.149-.493.129-1.016.622-1.166 3.53-1.073 9.404-.865 13.115 1.338.445.264.59.837.326 1.282-.264.444-.838.59-1.282.326z"/>
        </svg>
      )
    },
    {
      href: "https://discord.gg/EEwq9VGGKb",
      text: "Discord",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.191.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      )
    },
    {
      href: "https://www.youtube.com/@RoguePodLiteCast",
      text: "YouTube",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      href: "https://www.tiktok.com/@roguepodlitecast",
      text: "TikTok",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    }
  ];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100%; 
          font-size: 48px; 
          font-weight: bold; 
          color: white;
          background: linear-gradient(45deg, #ff6b6b, #ee5a24);
          border-radius: 15px;
        ">RP</div>
      `;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 overflow-x-hidden relative"
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
         }}>
      
      {/* Enhanced Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Animated Gradient Orbs */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full opacity-20 blur-xl"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, ${
                ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'][i]
              }40, transparent)`,
              top: `${10 + i * 15}%`,
              left: `${5 + i * 20}%`,
              animation: `float 8s infinite ease-in-out ${i * 1.5}s, drift 20s infinite linear ${i * 3}s`
            }}
          />
        ))}
        
        {/* Floating Particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full bg-white bg-opacity-10"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float 6s infinite ease-in-out ${i * 0.5}s, drift 15s infinite linear ${i * 2}s`
            }}
          />
        ))}
        
        {/* Geometric Shapes */}
        <div 
          className="absolute opacity-5 rotate-45"
          style={{
            top: '10%',
            right: '10%',
            width: '300px',
            height: '300px',
            background: 'linear-gradient(45deg, transparent 40%, white 41%, white 59%, transparent 60%)',
            animation: 'rotate 30s infinite linear'
          }}
        />
        <div 
          className="absolute opacity-5 -rotate-12"
          style={{
            bottom: '20%',
            left: '5%',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, transparent 40%, white 41%, white 59%, transparent 60%)',
            animation: 'rotate 25s infinite linear reverse'
          }}
        />
      </div>

      <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl border border-white border-opacity-20 p-10 text-center max-w-lg w-full shadow-2xl animate-fadeInUp">
        
        {/* Logo */}
        <a 
          href="https://feeds.acast.com/public/shows/roguepod-litecast"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-48 h-48 mx-auto mb-8 relative overflow-hidden rounded-2xl shadow-xl animate-pulse-custom cursor-pointer transition-transform duration-300 hover:scale-105"
        >
          <img 
            src={`${process.env.PUBLIC_URL}/cover-art.png`}
            alt="RoguePod LiteCast Cover Art"
            className="w-full h-full object-cover rounded-2xl"
            onError={handleImageError}
          />
        </a>

        {/* Title */}
        <h1 className="text-white text-4xl font-bold mb-5 drop-shadow-lg animate-slideInLeft">
          RoguePod LiteCast
        </h1>

        {/* Description */}
        <p className="text-white text-opacity-90 text-lg mb-10 font-normal leading-relaxed max-w-full mx-auto animate-slideInRight">
          RoguePod LiteCast is a roguelite review podcast released every other Wednesday. Each episode Danny and David discuss a different roguelite and add it to the ultimate roguelite tierlist.
        </p>

        {/* Links Grid */}
        <div className="grid grid-cols-3 gap-5 mb-10">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-white no-underline transition-all duration-300 p-4 rounded-2xl bg-white bg-opacity-10 border border-white border-opacity-20 relative overflow-hidden group hover:-translate-y-1 hover:scale-105 hover:bg-opacity-20 hover:shadow-lg"
              style={{
                animation: `fadeInUp 0.6s ease-out ${0.1 + index * 0.1}s both`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-opacity-10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              <div className="w-10 h-10 mb-2 drop-shadow-lg relative z-10">
                {link.icon}
              </div>
              <span className="text-sm font-medium drop-shadow-sm relative z-10">
                {link.text}
              </span>
            </a>
          ))}
        </div>

        {/* Contact Section */}
        <div className="border-t border-white border-opacity-20 pt-8 animate-fadeIn">
          <p className="text-white text-opacity-90 mb-4 text-lg">Get in touch</p>
          <a
            href="mailto:host@roguepod.show"
            className="inline-flex items-center gap-3 bg-white bg-opacity-10 px-5 py-3 rounded-full no-underline text-white font-medium border border-white border-opacity-20 transition-all duration-300 hover:bg-opacity-20 hover:-translate-y-0.5 hover:shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            host@roguepod.show
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;