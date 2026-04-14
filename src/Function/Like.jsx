import React, { useState, useEffect } from "react";
import axios from "axios";
import { ThumbsUp, ThumbsDown } from "lucide-react";

const LikeDislike = ({ videoId, isDarkMode, user }) => {
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [status, setStatus] = useState(null);

    // 1. Fetch initial counts (Run this for EVERYONE, logged in or not)
    useEffect(() => {
        const fetchStatus = async () => {
            if (!videoId) return;
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}`, { withCredentials: true });
                const videoData = res.data.data;

                // ALWAYS set the total counts
                setLikes(Number(videoData.likes?.length || 0));
                setDislikes(Number(videoData.dislikes?.length || 0));

                // ONLY check if the thumb should be filled if they are logged in
                if (user) {
                    const userId = String(user._id || user.id);
                    const likesArray = (videoData.likes || []).map(id => String(id));
                    const dislikesArray = (videoData.dislikes || []).map(id => String(id));

                    if (likesArray.includes(userId)) {
                        setStatus('liked');
                    } else if (dislikesArray.includes(userId)) {
                        setStatus('disliked');
                    } else {
                        setStatus(null);
                    }
                }
            } catch (err) {
                console.error("Like fetch error:", err);
            }
        };
        fetchStatus();
    }, [videoId, user]);

    // 2. Handle the click (Optimistic UI)
    const handleAction = async (actionType) => {
        if (!user) {
            alert("Please sign in to like or dislike.");
            return;
        }

        // --- OPTIMISTIC UI ---
        if (actionType === 'like') {
            if (status === 'liked') {
                setStatus(null);
                setLikes(prev => Math.max(0, Number(prev) - 1));
            } else {
                setStatus('liked');
                setLikes(prev => Number(prev) + 1);
                if (status === 'disliked') setDislikes(prev => Math.max(0, Number(prev) - 1));
            }
        } else {
            if (status === 'disliked') {
                setStatus(null);
                setDislikes(prev => Math.max(0, Number(prev) - 1));
            } else {
                setStatus('disliked');
                setDislikes(prev => Number(prev) + 1);
                if (status === 'liked') setLikes(prev => Math.max(0, Number(prev) - 1));
            }
        }

        // --- BACKGROUND SYNC ---
        try {
            const endpoint = `${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/${actionType}`;
            const res = await axios.post(endpoint, {}, { withCredentials: true });

            if (res.data.success) {
                // If the backend responds successfully, ensure our math was right
                setLikes(Number(res.data.likesCount));
                setDislikes(Number(res.data.dislikesCount));
            }
        } catch (err) {
            console.error("Like/Dislike backend error:", err);
        }
    };

    return (
        <div className={`flex items-center rounded-full overflow-hidden ${isDarkMode ? "bg-zinc-800" : "bg-white border border-zinc-300"}`}>
            <button
                onClick={() => handleAction('like')}
                className={`flex items-center gap-2 px-4 py-2 transition ${isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'} border-r ${isDarkMode ? 'border-white/10 text-white' : 'border-zinc-200 text-zinc-800'} ${status === 'liked' ? (isDarkMode ? 'text-red-400' : 'text-red-600') : ''}`}
            >
                <ThumbsUp size={18} fill={status === 'liked' ? "currentColor" : "none"} />
                <span className="text-sm font-bold">{likes}</span>
            </button>

            <button
                onClick={() => handleAction('dislike')}
                className={`flex items-center gap-2 px-4 py-2 transition ${isDarkMode ? 'hover:bg-zinc-700 text-white' : 'hover:bg-zinc-100 text-zinc-800'} ${status === 'disliked' ? (isDarkMode ? 'text-red-400' : 'text-red-600') : ''}`}
            >
                <ThumbsDown size={18} fill={status === 'disliked' ? "currentColor" : "none"} />
                <span className="text-sm font-bold">{dislikes}</span>
            </button>
        </div>
    );
};

export default LikeDislike;