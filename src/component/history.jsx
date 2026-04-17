import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Clock, ListVideo } from "lucide-react";

const HistoryPage = ({ isDarkMode, onSelectVideo }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/history`, { withCredentials: true });
                setHistory(res.data.data);
            } catch (err) {
                console.error("Failed to fetch history");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const clearHistory = async () => {
        if (!window.confirm("Clear all watch history?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/v1/users/history/clear`, { withCredentials: true });
            setHistory([]);
        } catch (err) {
            alert("Failed to clear history");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white p-20 font-bold text-center animate-pulse">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Clock className="text-red-400" /> Watch History
                </h1>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="flex items-center gap-2 text-sm font-bold text-red-400 hover:bg-red-500/20 px-5 py-2.5 rounded-xl transition-all duration-200 border border-red-500/20 hover:border-red-400/40">
                        <Trash2 size={16} /> Clear All
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-60">
                    <ListVideo size={80} strokeWidth={1} className="text-red-400/50" />
                    <p className="mt-4 text-lg text-gray-300">No watch history.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {history.map((item) => {
                        const video = item.video;
                        if (!video) return null;

                        return (
                            <div
                                key={item._id || video._id}
                                onClick={() => onSelectVideo({ ...video, watchedTime: item.watchedTime })}
                                className="flex flex-col md:flex-row gap-5 cursor-pointer group bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/50 p-4 rounded-2xl transition-all duration-200 border border-red-500/10 hover:border-red-400/30"
                            >
                                {/* Thumbnail Container */}
                                <div className="relative w-full md:w-64 aspect-video bg-slate-700 rounded-xl overflow-hidden shrink-0 border border-red-500/20">
                                    {/* FIX: Use Thumbnail image if available, fallback to video frame */}
                                    {video.thumbnail ? (
                                        <img
                                        loading="lazy"
                                            src={video.thumbnail}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            alt={video.title}
                                        />
                                    ) : (
                                        <video
                                            src={`${video.videoUrl}#t=2`}
                                            className="w-full h-full object-cover"
                                            muted
                                        />
                                    )}

                                    {/* Progress Bar Overlay */}
                                    {item.watchedTime > 0 && video.duration > 0 && (
                                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-600/80">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-500 to-red-600"
                                                style={{ width: `${Math.min((item.watchedTime / video.duration) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Video Info */}
                                <div className="flex-1 min-w-0 py-1">
                                    <h3 className="text-lg font-bold line-clamp-2 text-white group-hover:text-red-400 transition-colors duration-200">{video.title}</h3>
                                    <p className="text-sm opacity-70 mt-1 text-gray-300">
                                        {video.owner?.username} • {video.views} views
                                    </p>
                                    <p className="text-xs opacity-50 mt-2 text-gray-400">
                                        Watched {new Date(item.watchedAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs mt-3 line-clamp-2 opacity-60 text-gray-400 hidden md:block">
                                        {video.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;