import React, { useEffect, useState } from "react";
import axios from "axios";
import { Clock, Play } from "lucide-react";

export default function WatchLater({ isDarkMode, onSelectVideo }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWatchLater = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/watch-later`, { withCredentials: true });
                setVideos(res.data.data || []);
            } catch (err) {
                if (err.response?.status === 401) {
                    setError("Please sign in to view Watch Later.");
                } else {
                    setError(err.response?.data?.message || err.message || "Failed to load watch later videos");
                }
            } finally {
                setLoading(false);
            }
        };

        loadWatchLater();
    }, []);

    if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white p-10 font-bold text-center animate-pulse">Loading Watch Later...</div>;
    if (error) return <div className="min-h-screen bg-[#0f0f0f] text-red-400 p-10 text-center">{error}</div>;

    if (!videos.length) return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center py-40 opacity-60">
            <Clock size={80} strokeWidth={1} className="text-red-400/50" />
            <p className="mt-4 text-lg text-gray-300">Your Watch Later list is empty.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white px-4 md:px-8 py-6">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Clock className="text-red-400" /> Watch Later
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                    <div
                        key={video._id}
                        onClick={() => onSelectVideo(video)}
                        className="cursor-pointer group flex flex-col gap-3 bg-slate-800/30 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all duration-200 hover:scale-105"
                    >
                        {/* Thumbnail Container */}
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-700 shadow-lg border border-red-500/20">
                            {/* FIX: Thumbnail Logic consistent with rest of app */}
                            {video.thumbnail ? (
                                <img
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

                            {/* Play overlay on hover */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <Play fill="white" size={32} className="text-white" />
                            </div>
                        </div>

                        {/* Text Details */}
                        <div className="flex gap-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm line-clamp-2 text-white group-hover:text-red-400 transition-colors duration-200">
                                    {video.title || "Untitled Video"}
                                </h3>
                                <p className="text-xs opacity-70 mt-1 text-gray-300">
                                    {video.owner?.username || video.ownerName || "Unknown Creator"}
                                </p>
                                <p className="text-[10px] opacity-50 uppercase font-bold mt-1 text-gray-400">
                                    {video.views || 0} views
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}