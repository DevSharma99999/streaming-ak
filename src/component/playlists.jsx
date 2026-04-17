import React, { useEffect, useState } from "react";
import axios from "axios";
import { Play, Trash2, Plus, ListVideo } from "lucide-react";

export default function PlaylistsPage({ onSelect }) {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchPlaylists = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, {
        withCredentials: true,
      });
      setPlaylists(res.data.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/playlists`,
        { name: newPlaylistName },
        { withCredentials: true }
      );
      setNewPlaylistName("");
      setShowCreate(false);
      fetchPlaylists(); // Refresh list
    } catch (err) {
      alert("Failed to create playlist");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Your Library</h2>
          <p className="text-zinc-500 text-sm mt-1">Manage your curated collections</p>
        </div>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-bold transition-all active:scale-95 shadow-lg shadow-red-600/20"
        >
          <Plus size={20} /> New Playlist
        </button>
      </div>

      {/* CREATE MODAL / INLINE FORM */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-10 bg-zinc-900/50 p-6 rounded-2xl border border-red-500/20 flex gap-4 animate-in fade-in slide-in-from-top-4">
          <input 
            type="text" 
            placeholder="Playlist Name..."
            className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-red-600 transition-colors"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
          />
          <button type="submit" className="bg-white text-black px-6 py-2 rounded-xl font-bold hover:bg-zinc-200">Create</button>
        </form>
      )}

      {/* PLAYLIST GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {playlists.map((p) => {
          const firstVideo = p.videos?.[0];
          
          return (
            <div
              key={p._id}
              className="group relative"
            >
              {/* THUMBNAIL CONTAINER */}
              <div 
                onClick={() => onSelect(p._id)}
                className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
              >
                {firstVideo ? (
                  firstVideo.thumbnail ? (
                    <img
                    loading="lazy"
                      src={firstVideo.thumbnail}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={p.name}
                    />
                  ) : (
                    <video src={`${firstVideo.videoUrl}#t=2`} className="w-full h-full object-cover" muted />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <ListVideo size={48} className="text-zinc-600" />
                  </div>
                )}

                {/* SIDE OVERLAY (YouTube Style) */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center border-l border-white/10">
                  <span className="text-xl font-black">{p.videos?.length || 0}</span>
                  <ListVideo size={20} />
                </div>

                {/* HOVER PLAY BUTTON */}
                <div className="absolute inset-0 bg-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="bg-red-600 p-4 rounded-full shadow-xl">
                      <Play fill="white" size={30} />
                   </div>
                </div>
              </div>

              {/* INFO */}
              <div className="mt-4 flex justify-between items-start px-1">
                <div>
                  <h3 className="font-bold text-lg leading-tight group-hover:text-red-500 transition-colors">{p.name}</h3>
                  <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">View full playlist</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}