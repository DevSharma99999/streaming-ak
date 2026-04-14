import React, { useState, useEffect } from "react";
import axios from "axios";
import { ArrowLeft, Trash2, PlayCircle } from "lucide-react";

export default function PlaylistPage({ playlistId, onBack, onSelectVideo }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/v1/playlists/${playlistId}`,
        { withCredentials: true }
      );
      setVideos(res.data.data.videos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playlistId) fetchPlaylist();
  }, [playlistId]);

  const handleRemove = async (e, videoId) => {
    e.stopPropagation(); // Prevent playing the video when clicking delete
    if (!window.confirm("Remove this video from the playlist?")) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/playlists/${playlistId}/remove`,
        { videoId },
        { withCredentials: true }
      );
      // Update local state to remove the video immediately
      setVideos(videos.filter((v) => v._id !== videoId));
    } catch (err) {
      alert("Failed to remove video");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] p-20 text-center animate-pulse text-red-500 font-bold">Loading Playlist...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-zinc-900 border border-white/10 hover:bg-red-600 transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:scale-110" />
        </button>
        <h2 className="text-2xl font-bold tracking-tight">Playlist Content</h2>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col gap-3">
        {videos.length > 0 ? (
          videos.map((v) => (
            <div
              key={v._id}
              onClick={() => onSelectVideo({ ...v, src: v.videoUrl })}
              className="group flex items-center gap-4 cursor-pointer bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-800/60 p-3 rounded-2xl transition-all duration-300 border border-white/5 hover:border-red-500/30"
            >
              {/* THUMBNAIL */}
              <div className="relative w-48 h-28 bg-zinc-800 rounded-xl overflow-hidden shrink-0">
                {v.thumbnail ? (
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <video src={v.videoUrl + "#t=2"} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                  <PlayCircle size={32} className="text-red-500" />
                </div>
              </div>

              {/* INFO */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate group-hover:text-red-500 transition-colors">
                  {v.title}
                </h3>
                <p className="text-sm text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                  {v.ownerName || "Unknown Creator"}
                </p>
              </div>

              {/* REMOVE ACTION */}
              <button
                onClick={(e) => handleRemove(e, v._id)}
                className="p-3 mr-2 rounded-xl text-zinc-600 hover:text-white hover:bg-red-600 transition-all duration-200"
                title="Remove from playlist"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-xl font-bold italic">This playlist is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}