import React, { useState, useEffect } from "react";
import axios from "axios";

const Subscribe = ({ channelId, currentUser }) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Sync status with Backend
    useEffect(() => {
        const checkStatus = async () => {
            // SILENT GUARD: If data is still loading from DB, just return. 
            // Don't log errors here; the component will re-run once channelId arrives.
            if (!currentUser || !channelId || channelId === "undefined") return;
            
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/is-subscribed/${channelId}`, { withCredentials: true });
                setIsSubscribed(res.data.isSubscribed);
            } catch (err) {
                // Only log if the request actually fails
                console.error("Subscription check failed:", err.response?.data || err.message);
            }
        };
        checkStatus();
    }, [channelId, currentUser]);

    // 2. Handle Click
    const handleSubscribe = async () => {
        if (!currentUser) return alert("Please sign in to subscribe.");
        
        // If the user clicks before currentVideo.owner has loaded
        if (!channelId || channelId === "undefined") {
            // User-facing feedback is better than just a console warning
            return alert("Channel information is still loading. Please wait a moment.");
        }

        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/users/subscribe/${channelId}`, {}, { withCredentials: true });
            setIsSubscribed(res.data.subscribed);
        } catch (err) {
            console.error("Subscription toggle failed:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // 3. Prevent self-subscription
    const currentUserId = currentUser?._id || currentUser?.id;
    // Compare as strings to handle MongoDB ObjectIDs safely
    if (currentUserId && channelId && String(channelId) === String(currentUserId)) {
        return null; 
    }

    return (
        <button 
            onClick={handleSubscribe}
            disabled={loading}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                isSubscribed 
                ? "bg-zinc-700 text-white hover:bg-zinc-600" 
                : "bg-white text-black hover:bg-zinc-200"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            {isSubscribed ? "Subscribed" : "Subscribe"}
        </button>
    );
};

export default Subscribe;