import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
axios.defaults.withCredentials = true;
import {
  Home as HomeIcon, CircleFadingPlus, Settings, Play, PlaySquare,
  Clock, Search, Bell, UserCircle, Menu, Download, LogOut, X
} from "lucide-react";

// Components
import SettingsPage from "./Settings";
import Profile from "./YTprofile";
import SubscriptionsPage from "./Subscriptions";
import VideoPlayer from "./WatchPage";
import DownloadsPage from "./Download";
import CreatePost from "./CreatePost";
import AuthModal from "./authModal";
import HistoryPage from "./history";
import WatchLater from "./WatchLater";
import ChannelPage from "./ChannelPage";
import PlaylistsPage from "./playlists";
import PlaylistPage from "./playlistPage";
import SearchBar from "./search";

  const categories = ["All", "General", "Coding", "Music", "Education", "Entertainment"];

function YouTubeDesign() {

  useEffect(() => {
    // Pokes the Render backend to wake it up from sleep
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/health`)
      .catch(() => { /* Ignore errors, we just want to wake it up */ });
  }, []);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadedVideos, setDownloadedVideos] = useState([]);
  const [show, setShow] = useState('Home');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // Tracks the channel to view
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [page, setPage] = useState("home");
  const playlistVideos = [];
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [pageno, setPageno] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  


  const onSelectVideo = (video) => {
    setSelectedVideo(video);
    setShow("VideoPlayer");
  };

  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Check Login Status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/profile`, { withCredentials: true });
        setUser(res.data.data);
      } catch (err) {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // 2. Fetch Videos
  //   useEffect(() => {
  //     const fetchVideos = async () => {
  //       try {
  //         setIsLoading(true);
  //         const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos`);
  //         const formattedVideos = response.data.data.map(v => ({
  //   id: v._id,
  //   src: v.videoUrl,
  //   title: v.title,
  //   description: v.description,
  //   owner: v.owner?._id || v.owner,
  //   ownerName: v.owner?.username || "Unknown",
  //   ownerAvatar: v.owner?.avatar || null, // ✅ ADDED
  //   views: `${v.views} views`,
  //   thumbnail: v.thumbnail,
  //   time: "Just now"
  // }));
  //         setVideos(formattedVideos);
  //       } catch (error) {
  //         console.error("Failed to fetch videos:", error);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     };
  //     fetchVideos();
  //   }, []);
  // 1. Create a function to fetch by category
const fetchVideosByCategory = async (category) => {
  try {
    setIsLoading(true);
    setActiveCategory(category);
    setPageno(1); // Reset pagination
    
    const url = category === "All" 
      ? `${import.meta.env.VITE_API_URL}/api/v1/videos?page=1&limit=10`
      : `${import.meta.env.VITE_API_URL}/api/v1/videos?category=${category}&page=1&limit=10`;

    const response = await axios.get(url);
    const formatted = response.data.data.map(v => ({
      id: v._id,
      src: v.videoUrl,
      title: v.title,
      description: v.description,
      ownerName: v.owner?.username,
      ownerAvatar: v.owner?.avatar,
      views: `${v.views} views`,
      thumbnail: v.thumbnail,
      category: v.category // Ensure this is mapped
    }));

    setVideos(formatted);
    setHasMore(formatted.length === 10);
  } catch (error) {
    console.error("Category fetch failed:", error);
  } finally {
    setIsLoading(false);
  }
};

// 2. In your JSX, update the button onClick:
{categories.map((cat) => (
    <button
      key={cat}
      onClick={() => handleCategoryClick(cat)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        activeCategory === cat ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {cat}
    </button>
  ))}
const fetchVideos = async (pageNum = 1, category = activeCategory) => {
    try {
        if (pageNum === 1) setIsLoading(true);
        else setIsFetchingMore(true);

        const categoryParam = category !== "All" ? `&category=${category}` : "";
        // Fetch 12 at a time
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos?page=${pageNum}&limit=12${categoryParam}`);

        const newFetchedVideos = response.data.data.map(v => ({
            id: v._id,
            _id: v._id, // Add this for sync
            src: v.videoUrl,
            videoUrl: v.videoUrl,
            title: v.title,
            ownerName: v.owner?.username || "Unknown",
            ownerAvatar: v.owner?.avatar || null,
            views: `${v.views} views`,
            thumbnail: v.thumbnail,
            category: v.category
        }));

        // Use the backend hasMore flag or check length
        if (newFetchedVideos.length < 12) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }

        setVideos(prev => pageNum === 1 ? newFetchedVideos : [...prev, ...newFetchedVideos]);

    } catch (error) {
        console.error("Failed to fetch videos:", error);
    } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
    }
};

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;

      if (scrolledToBottom && hasMore && !isFetchingMore && !isLoading && show === 'Home') {
        setPageno(prev => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetchingMore, isLoading, show]);

  // Trigger fetch when page changes
  useEffect(() => {
    if (pageno > 1) {
      fetchVideos(pageno);
    }
  }, [pageno]);

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/users/logout`);
      setUser(null);
      setShow('Home');
    } catch (err) {
      console.error("Logout failed");
    }
  };
  // Inside YouTubeDesign function

  // Update your video filtering logic
  const filteredVideos = activeCategory === "All"
    ? videos
    : videos.filter(v => v.category === activeCategory);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => { localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode)); }, [isDarkMode]);

  const themeBg = "bg-[#0f0f0f]";
  const themeText = "text-white";
  const themeNav = "bg-[#0f0f0f]";
  const isFullScreenView = show === 'Setting' || show === 'Profile' || show === 'SubscriptionsPage' || show === 'VideoPlayer' || show === 'ChannelPage';

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setShow('VideoPlayer');
  };
 const handleCategoryClick = (cat) => {
    setVideos([]); // Clear existing list for smooth transition
    setActiveCategory(cat);
    setPageno(1); // Reset page count
    setHasMore(true);
    fetchVideos(1, cat); // Fetch page 1 of new category
};

  useEffect(() => { fetchVideos(1); }, []);

  const renderMainContent = () => {
    switch (show) {
      case 'SubscriptionsPage':
        return (
          <SubscriptionsPage
            isDarkMode={isDarkMode}
            onBack={() => setShow('Home')}
            currentUser={user}
            onSelectChannel={(username) => {
              setSelectedChannel(username);
              setShow('ChannelPage');
            }}
          />
        );
      case 'SearchResults':
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Search Results</h2>
            {searchResults.length > 0 ? (
              <MainFeed
                isDarkMode={isDarkMode}
                onSelectVideo={handleSelectVideo}
                videoList={searchResults}
                isLoading={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                <Search size={64} className="mb-4" />
                <p className="text-lg font-semibold">No videos found</p>
                <button onClick={() => setShow('Home')} className="text-red-500 mt-2">Back to Home</button>
              </div>
            )}
          </div>
        );
      case 'ChannelPage':
        return (
          <ChannelPage
            isDarkMode={isDarkMode}
            onBack={() => setShow('SubscriptionsPage')}
            username={selectedChannel}
            currentUser={user}
            onSelectVideo={handleSelectVideo}
          />
        );
      case 'Setting':
        return (
          <SettingsPage
            onBack={() => setShow('Home')}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            user={user}           // ✅ FIX
            setUser={setUser}     // ✅ FIX
          />
        );
      case 'PlaylistPage':
        return (
          <PlaylistPage
            playlistId={selectedPlaylist}
            onBack={() => setShow("Playlists")}
            onSelectVideo={handleSelectVideo}
          />
        );
      case 'Playlists':
        return (
          <PlaylistsPage
            onSelect={(id) => {
              setSelectedPlaylist(id);
              setShow("PlaylistPage");
            }}
          />
        );
      case 'Profile':
        return user ? <Profile isDarkMode={isDarkMode} onBack={() => setShow('Home')} user={user} onSelectVideo={handleSelectVideo} /> : <div className="p-10 text-center text-red-400">Please sign in.</div>;
      case 'History':
        return user ? <HistoryPage isDarkMode={isDarkMode} onSelectVideo={handleSelectVideo} /> : <div className="p-10 text-center text-red-400">Please sign in.</div>;
      case 'WatchLater':
        return user ? <WatchLater isDarkMode={isDarkMode} onSelectVideo={handleSelectVideo} /> : <div className="p-10 text-center text-red-400">Please sign in.</div>;
      case 'Download':
        return <DownloadsPage
          isDarkMode={isDarkMode}
          onBack={() => setShow("Home")}
          onSelectVideo={onSelectVideo}
        />;
     // Inside YouTubeDesign.js -> renderMainContent()
case 'VideoPlayer':
  return (
    <VideoPlayer
      key={selectedVideo?._id || selectedVideo?.id}
      video={selectedVideo}
      playlistVideos={playlistVideos}
      videoList={videos}
      isDarkMode={isDarkMode}
      onBack={() => setShow('Home')}
      user={user}
      setUser={setUser}
      onSelectVideo={handleSelectVideo}
      // ✅ ADD THIS PROP BELOW:
      // Inside renderMainContent -> case 'VideoPlayer'
onSearchSubmit={async (results, query) => {
  try {
    let finalResults = results;
    if (!results || results.length === 0) {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/search?q=${query}`);
      finalResults = res.data;
    }

    const formatted = finalResults.map(v => ({
      id: v._id,
      _id: v._id,       // ✅ Add this: VideoPlayer uses _id
      src: v.videoUrl,  // ✅ Ensure this is mapped
      videoUrl: v.videoUrl, // ✅ Add this: VideoPlayer specifically looks for videoUrl
      title: v.title,
      ownerName: v.owner?.username,
      ownerAvatar: v.owner?.avatar,
      views: `${v.views} views`,
      thumbnail: v.thumbnail, // ✅ Ensure thumbnail is passed
    }));

    setSearchResults(formatted);
    setShow('SearchResults');
  } catch (err) {
    console.error("Tag search failed", err);
  }
}}
    />
  );
      case 'Home':
      default:
        return (
          <MainFeed
            isDarkMode={isDarkMode}
            onSelectVideo={handleSelectVideo}
            videoList={filteredVideos} // Change from 'videos' to 'filteredVideos'
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeBg} ${themeText}`}>
      <nav className="flex justify-between items-center px-4 md:px-6 h-16 sticky top-0 z-40 border-b bg-[#0f0f0f] border-zinc-800 transition-colors duration-300">
        <div className="flex items-center gap-4 w-44">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 lg:hidden rounded-lg hover:bg-zinc-800 active:bg-zinc-700 text-inherit transition-colors cursor-pointer"><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group" onClick={() => setShow('Home')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="hidden sm:inline text-xl font-bold tracking-tight">Valdora</span>
          </div>
        </div>
        {/* Center Section: Search */}
        <div className="hidden lg:flex flex-1 max-w-[720px] ml-10">
          <SearchBar
            isDarkMode={isDarkMode}
            onSelectVideo={handleSelectVideo}
            onSearchSubmit={(results) => {
              const formatted = results.map(v => ({
                id: v._id,
                src: v.videoUrl,
                title: v.title,
                ownerName: v.owner?.username,
                ownerAvatar: v.owner?.avatar,
                views: `${v.views} views`,
                thumbnail: v.thumbnail,
              }));
              setSearchResults(formatted);
              setShow('SearchResults');
            }}
          />
        </div>
        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 md:gap-4 justify-end">
          {user ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsCreateModalOpen(true)} className="p-2.5 hover:bg-zinc-800 rounded-lg transition-colors hidden sm:flex items-center gap-2 text-sm font-medium">
                <CircleFadingPlus size={20} />
                <span className="hidden md:inline">Create</span>
              </button>
              <button onClick={handleLogout} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors hidden sm:block">
                <LogOut size={20} />
              </button>
              <div
                onClick={() => setShow('Profile')}
                className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center cursor-pointer hover:ring-2 ring-red-500 transition-all duration-200 shrink-0"
              >
                {user?.avatar ? (
                  <img loading="lazy" src={user.avatar + "?t=" + Date.now()} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 bg-red-600 hover:bg-red-700 active:scale-95 text-white">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* CATEGORY FILTER - Improved Styling */}
      {show === 'Home' && (
        <div className="sticky top-16 z-30 border-b bg-[#0f0f0f] border-zinc-800 transition-colors">
          <div className="flex gap-2 px-4 md:px-6 py-4 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeCategory === cat
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex">
        {!isFullScreenView && (
          <aside className="w-64 hidden lg:block h-[calc(100vh-128px)] sticky top-32 px-2 py-3 overflow-y-auto">
            <SidebarContent isDarkMode={isDarkMode} show={show} onSelect={setShow} user={user} />
          </aside>
        )}
        <main className={`flex-1 min-w-0 ${isFullScreenView ? 'w-full' : ''}`}>
          {renderMainContent()}
        </main>
      </div>

      {/* MOBILE MENU MODAL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ pointerEvents: 'auto' }}
          />

          {/* Menu Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-60 overflow-y-auto z-50 shadow-lg bg-[#0f0f0f]">
            <div className="sticky top-0 flex justify-between items-center p-4 border-b border-zinc-800">
              <span className="font-bold">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-500/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-2">
              <SidebarContent
                isDarkMode={isDarkMode}
                show={show}
                onSelect={(id) => {
                  setShow(id);
                  setIsMobileMenuOpen(false);
                }}
                user={user}
              />
            </div>
          </aside>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isDarkMode={isDarkMode} setUser={setUser} />
      <CreatePost isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} isDarkMode={isDarkMode} />
    </div>
  );
}

// RESTORED: SidebarContent component
function SidebarContent({ isDarkMode, show, onSelect, user }) {
  const navItems = [
    { id: 'Home', icon: <HomeIcon size={20} />, label: 'Home' },
    { id: 'SubscriptionsPage', icon: <PlaySquare size={20} />, label: 'Subscriptions' },
  ];

  const personalItems = [
    ...(user ? [
      { id: 'Profile', icon: <UserCircle size={20} />, label: 'Your channel' },
      { id: 'History', icon: <Clock size={20} />, label: 'History' },
      { id: 'WatchLater', icon: <Clock size={20} />, label: 'Watch Later' },
    ] : []),
    { id: 'Download', icon: <Download size={20} />, label: 'Download' },
    { id: 'Setting', icon: <Settings size={20} />, label: 'Setting' },
    { id: 'Playlists', icon: <PlaySquare size={20} />, label: 'Playlists' }
  ];
  const activeClass = "bg-red-600/20 text-red-400 font-semibold";
  const hoverClass = "hover:bg-zinc-800 transition-colors";

  return (
    <div className="flex flex-col gap-1 text-inherit">
      {navItems.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.id)} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${show === item.id ? activeClass : hoverClass}`}>
          {item.icon} <span className="text-sm font-medium">{item.label}</span>
        </button>
      ))}
      <div className="my-4 h-px bg-zinc-800" />
      <h3 className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-500">You</h3>
      {personalItems.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.id)} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${show === item.id ? activeClass : hoverClass}`}>
          {item.icon} <span className="text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function MainFeed({ isDarkMode, onSelectVideo, videoList, isLoading }) {
  if (isLoading) return (
    <div className="p-10 text-center">
      <div className="inline-block">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-700 border-t-red-600 mb-4"></div>
        <p className="font-semibold text-zinc-400">Loading Valdora...</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-6 pt-4 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {videoList.map((video) => (
          <div key={video.id} onClick={() => onSelectVideo(video)} className="flex flex-col gap-3 cursor-pointer group">
            {/* Thumbnail Container */}
            <div className="relative aspect-video rounded-xl overflow-hidden transition-all duration-300 bg-zinc-800 shadow-md group-hover:shadow-xl">
              {video.thumbnail ? (
                <img loading="lazy" src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-100 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <video src={`${video.src}#t=2`} muted className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
            </div>

            {/* Video Info */}
            <div className="flex gap-3 flex-1">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-red-600 to-red-700 font-semibold text-sm">
                {video.ownerAvatar ? (
                  <img loading="lazy" src={video.ownerAvatar + "?t=" + Date.now()} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{video.ownerName?.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold line-clamp-2 leading-tight text-sm text-white group-hover:text-red-400 transition-colors">{video.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">{video.ownerName}</p>
                <p className="text-xs text-zinc-500">{video.views}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default YouTubeDesign;