import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Video as VideoIcon, Eye } from "lucide-react";
import Subscribe from "../Function/Subscribe";

export default function ChannelPage({
  isDarkMode,
  onBack,
  username,
  onSelectVideo,
  currentUser
}) {
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAvatar, setShowAvatar] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/users/c/${username}`,
          { withCredentials: true }
        );
        if (res.data.success) {
          setChannelData(res.data.data);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white p-20 text-center font-bold animate-pulse">Loading...</div>;
  if (!channelData) return <div className="min-h-screen bg-[#0f0f0f] text-white p-20 text-center">Channel not found</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      
      {/* 🔥 COVER SECTION */}
      <div className="relative w-full h-64 md:h-72 bg-black">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors duration-200"
        >
          <ArrowLeft size={22} />
        </button>

        {channelData.coverImage ? (
          <img
            src={channelData.coverImage}
            className="w-full h-full object-cover"
            alt="cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-900/50 to-red-950/50" />
        )}
      </div>

      {/* 🔥 CHANNEL INFO SECTION */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          
          {/* AVATAR */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-red-800 border-4 border-red-400/30 shadow-xl">
              {channelData.avatar ? (
                <img
                  src={channelData.avatar}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => setShowAvatar(true)}
                  alt="avatar"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {channelData.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* TEXT INFO + SUBSCRIBE */}
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-between gap-4 w-full">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                {channelData.fullName || channelData.username}
                <CheckCircle2 className="text-red-500" size={20} />
              </h1>
              <p className="text-sm opacity-70 mt-1 text-gray-300">
                @{channelData.username} • {channelData.subscribersCount || 0} subscribers • {channelData.videos?.length || 0} videos
              </p>
            </div>

            <div className="mt-2 md:mt-4">
              <Subscribe
                channelId={channelData._id}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 VIDEOS SECTION */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <VideoIcon size={20} className="text-red-500" />
          <h2 className="text-xl font-bold text-white">Videos</h2>
        </div>

        {channelData.videos?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {channelData.videos.map((video) => (
              <div 
                key={video._id} 
                onClick={() => onSelectVideo({ ...video, src: video.videoUrl, ownerName: channelData.username })}
                className="relative group bg-slate-800/30 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all duration-200 cursor-pointer"
              >
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-700 border border-red-500/20">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={video.title}
                    />
                  ) : (
                    <video
                      src={`${video.videoUrl}#t=2`}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                </div>

                <h4 className="mt-3 font-semibold text-base line-clamp-2 text-white group-hover:text-red-500 transition-colors duration-200">
                  {video.title}
                </h4>
                
                <div className="mt-1 flex items-center gap-2 text-xs opacity-60 text-gray-400">
                  <span>{video.views || 0} views</span>
                  <span>•</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-60">
            <VideoIcon size={48} className="mx-auto mb-4 text-red-500/30" />
            <p className="text-lg text-gray-300">No videos uploaded yet.</p>
          </div>
        )}
      </main>

      {/* AVATAR MODAL */}
      {showAvatar && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAvatar(false)}
        >
          <img
            src={channelData.avatar}
            className="max-w-md w-full rounded-2xl shadow-2xl border border-red-500/20"
            alt="avatar large"
          />
        </div>
      )}
    </div>
  );
}