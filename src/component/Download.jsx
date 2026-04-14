import React, { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Play, HardDrive } from "lucide-react";
import { dbPromise } from "../utils/db";

const DownloadsPage = ({ isDarkMode, onBack, onSelectVideo }) => {

  const [downloads, setDownloads] = useState([]);

  // ✅ LOAD FROM INDEXED DB
  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    const db = await dbPromise;
    const allKeys = await db.getAllKeys("videos");

    const metaKeys = allKeys.filter(k => k.endsWith("-meta"));

    const data = await Promise.all(
      metaKeys.map(key => db.get("videos", key))
    );

    setDownloads(data);
  };

  // ✅ DELETE DOWNLOAD
  const removeDownload = async (id) => {
    const db = await dbPromise;

    const keys = await db.getAllKeys("videos");

    const relatedKeys = keys.filter(k => k.includes(id));

    for (let key of relatedKeys) {
      await db.delete("videos", key);
    }

    setDownloads(prev => prev.filter(v => v.id !== id));
  };

  // 🎨 Theme
  const theme = {
    bg: isDarkMode ? "bg-[#0f0f0f]" : "bg-white",
    text: isDarkMode ? "text-white" : "text-black",
    card: isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-100",
    border: isDarkMode ? "border-white/10" : "border-gray-200",
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* HEADER */}
      <div className="flex items-center gap-4 p-4 border-b border-red-500/20">
        <button onClick={onBack} className="text-red-400 hover:text-red-300 transition-colors">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">Downloads</h1>
      </div>

      {/* STORAGE */}
      <div className="p-4 flex items-center gap-2">
        <HardDrive className="text-red-400" />
        <span className="text-gray-300">{downloads.length} videos downloaded</span>
      </div>

      {/* LIST */}
      <div className="p-4 space-y-3">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-60">
            <HardDrive size={80} strokeWidth={1} className="text-red-400/50" />
            <p className="mt-4 text-lg text-gray-300">No downloads</p>
          </div>
        ) : (
          downloads.map(video => (
            <div
              key={video.id}
              className="flex gap-3 p-4 rounded-2xl cursor-pointer bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-200 border border-red-500/10 hover:border-red-400/30"
              onClick={() =>
                onSelectVideo({
                  ...video,
                  _id: video.id, // 🔥 IMPORTANT
                })
              } // 🔥 PLAY OFFLINE
            >
              <img
                src={video.thumbnail}
                className="w-32 h-20 object-cover rounded-xl border border-red-500/20"
              />

              <div className="flex-1">
                <h3 className="font-bold text-white hover:text-red-400 transition-colors duration-200">{video.title}</h3>
                <p className="text-sm opacity-70 text-gray-300">{video.channel}</p>
              </div>

              <button onClick={(e) => {
                e.stopPropagation();
                removeDownload(video.id);
              }} className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/20 rounded-lg">
                <Trash2 />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;