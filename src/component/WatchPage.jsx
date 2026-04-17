import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import { 
  ThumbsUp, ThumbsDown, ArrowLeft, Maximize, Play, Pause, 
  RotateCcw, RotateCw, Clock, Download, CheckCircle2, 
  Settings, Monitor, Check 
} from "lucide-react";
import { dbPromise } from "../utils/db.js";
import Subscribe from "../Function/Subscribe";
import LikeDislike from "../Function/Like";

function VideoPlayer({ video, onBack, isDarkMode, user, setUser, videoList = [], playlistVideos = [], onSelectVideo, onSearchSubmit }) {
  const videoId = video?._id || video?.id;

  // --- ALL STATE VARIABLES ---
  const [currentVideo, setCurrentVideo] = useState(video || {});
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [queue, setQueue] = useState([]);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [showReplyBox, setShowReplyBox] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentResolution, setCurrentResolution] = useState("360p");
  const [isInPlaylist, setIsInPlaylist] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryStatus, setSummaryStatus] = useState("idle"); 
  const [showSummary, setShowSummary] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  // --- REFS ---
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const viewCountedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);
  const [isResolutionChanging, setIsResolutionChanging] = useState(false);
  const [tempPlaybackTime, setTempPlaybackTime] = useState(0);

  // --- AUTO-SCROLL AND RESET ON VIDEO CHANGE ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowSummary(false);
    setSummary("");
    setSummaryStatus("idle");
    viewCountedRef.current = false;
    setIsDownloaded(false);
  }, [videoId]);

  // --- FORMAT TIME HELPER ---
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- CONTROLS AUTOHIDE LOGIC ---
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };
  const handleContainerClick = () => {
    setShowControls(prev => !prev);
  };

  // --- 5. SEAMLESS RESOLUTION & HLS ---
  useEffect(() => {
    const initPlayer = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      const offline = await loadOfflineVideo();
      if (!offline && !isResolutionChanging) {
        const targetUrl = (currentResolution === "480p" && currentVideo.videoUrl480)
          ? currentVideo.videoUrl480 : currentVideo.videoUrl || video?.videoUrl;
        if (!targetUrl) return;
        const savedTime = videoRef.current.currentTime;
        if (hlsRef.current) hlsRef.current.destroy();
        setIsResolutionChanging(true);
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(targetUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.currentTime = tempPlaybackTime || savedTime || (currentVideo.watchedTime || 0);
            if (isPlaying) videoElement.play().catch(() => {});
            setIsResolutionChanging(false);
          });
        } else {
          videoElement.src = targetUrl;
          videoElement.currentTime = tempPlaybackTime || savedTime || (currentVideo.watchedTime || 0);
          if (isPlaying) videoElement.play().catch(() => {});
          setIsResolutionChanging(false);
        }
      }
    };
    initPlayer();
  }, [videoId, currentResolution, currentVideo.videoUrl, currentVideo.videoUrl480, isResolutionChanging]);

  // --- RESTORE PLAYBACK TIME ON RESOLUTION CHANGE ---
  const handleResolutionChange = (newRes) => {
    if (videoRef.current) {
      setTempPlaybackTime(videoRef.current.currentTime);
      setCurrentResolution(newRes);
    }
  };

  // --- 7. LIKE/DISLIKE REPLY HANDLERS ---
  const handleLikeReply = async (replyId) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/like/${replyId}`, {}, { withCredentials: true });
    updateCommentsWithReply(res.data);
  };
  const handleDislikeReply = async (replyId) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/dislike/${replyId}`, {}, { withCredentials: true });
    updateCommentsWithReply(res.data);
  };
  const updateCommentsWithReply = (updated) => {
    setComments(prev => prev.map(c => {
      if (c._id === updated._id) return updated;
      if (c.replies) {
        c.replies = c.replies.map(r => r._id === updated._id ? updated : r);
      }
      return c;
    }));
  };

  // --- 8. LOAD VIDEO METADATA, COMMENTS, PLAYLISTS ---
  useEffect(() => {
    if (!videoId) return;
    const loadMetadata = async () => {
      try {
        const [metaRes, commRes, playRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, { withCredentials: true })
        ]);
        const fetchedData = metaRes.data.data;
        setCurrentVideo(prev => ({ ...prev, ...fetchedData }));
        setSubCount(metaRes.data.subCount || 0);
        setComments(commRes.data.data || []);
        setIsWatchLater(!!metaRes.data.isWatchLater);
        setPlaylists(playRes.data.data);
        setIsInPlaylist(playRes.data.data.some(p => p.videos?.includes(videoId)));
        if (fetchedData.watchedTime > 0) {
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = fetchedData.watchedTime;
            }
          }, 500);
        }
      } catch (err) { console.error(err); }
    };
    loadMetadata();
  }, [videoId]);

  // --- FETCH RELATED VIDEOS ---
  useEffect(() => {
    const fetchRelated = async () => {
      if (!currentVideo.category) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/related/${videoId}`, {
          params: { category: currentVideo.category, tags: currentVideo.tags?.join(',') }
        });
        setRelatedVideos(res.data.data);
      } catch (err) { console.error(err); }
    };
    fetchRelated();
  }, [videoId, currentVideo.category, currentVideo.tags]);

  // --- FETCH PLAYER PLAYLISTS ---
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, {
          withCredentials: true
        });
        setPlaylists(res.data.data);
      } catch (err) { console.log(err); }
    };
    if (user) fetchPlaylists();
  }, [user, videoId]);

  // --- HLS PLAYER INITIALIZATION & RESOLUTION SWITCHING ---
  useEffect(() => {
    const initPlayer = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      const offline = await loadOfflineVideo();
      if (!offline && !isResolutionChanging) {
        const targetUrl = (currentResolution === "480p" && currentVideo.videoUrl480)
          ? currentVideo.videoUrl480 : currentVideo.videoUrl || video?.videoUrl;
        if (!targetUrl) return;
        const savedTime = videoRef.current.currentTime;
        if (hlsRef.current) hlsRef.current.destroy();
        setIsResolutionChanging(true);
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(targetUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.currentTime = tempPlaybackTime || savedTime || (currentVideo.watchedTime || 0);
            if (isPlaying) videoElement.play().catch(() => {});
            setIsResolutionChanging(false);
          });
        } else {
          videoElement.src = targetUrl;
          videoElement.currentTime = tempPlaybackTime || savedTime || (currentVideo.watchedTime || 0);
          if (isPlaying) videoElement.play().catch(() => {});
          setIsResolutionChanging(false);
        }
      }
    };
    initPlayer();
  }, [videoId, currentResolution, currentVideo.videoUrl, currentVideo.videoUrl480, isResolutionChanging]);

  // --- 9. CHECK DOWNLOAD STATUS ---
  useEffect(() => {
    const checkDownload = async () => {
      const db = await dbPromise;
      const meta = await db.get("videos", `${videoId}-meta`);
      setIsDownloaded(!!meta);
    };
    if (videoId) checkDownload();
  }, [videoId]);

  // --- 10. SET QUEUE FOR PLAYLIST CONTINUITY ---
  useEffect(() => {
    if (playlistVideos.length) {
      setQueue(playlistVideos);
    } else if (videoList.length) {
      setQueue(videoList);
    }
  }, [playlistVideos, videoList]);

  // --- 11. CLOSE DOWNLOAD MENU ON OUTSIDE CLICK ---
  useEffect(() => {
    const handleClick = () => setShowDownloadMenu(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // --- 12. SAVE PROGRESS ---
  const saveProgress = async (time) => {
    if (!user || !videoId || time < 1) return;
    if (Math.abs(time - lastSavedTimeRef.current) < 2) return;
    let timeToSave = time;
    const videoDuration = videoRef.current?.duration || duration;
    if (videoDuration > 0 && (videoDuration - time) < 20) {
      timeToSave = 0;
    }
    try {
      lastSavedTimeRef.current = time;
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/v1/users/history/progress`, { videoId, watchedTime: timeToSave }, { withCredentials: true });
    } catch (err) { console.error("Progress save failed:", err.message); }
  };
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && videoRef.current) saveProgress(videoRef.current.currentTime);
    }, 10000);
    return () => {
      clearInterval(interval);
      if (videoRef.current) saveProgress(videoRef.current.currentTime);
    };
  }, [isPlaying, videoId, user]);

  // --- 13. VIDEO EVENT HANDLERS ---
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setCurrentTime(current);
    setProgress((current / total) * 100);
    setDuration(total);
    if (current > 5 && !viewCountedRef.current) {
      viewCountedRef.current = true;
      axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/view`, {}, { withCredentials: true });
    }
  };
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };
  const skip = (amount, e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += amount;
  };

  // --- 14. OFFLINE DOWNLOAD LOGIC ---
  const loadOfflineVideo = async () => {
    try {
      const db = await dbPromise;
      const playlist = await db.get("videos", `${videoId}-m3u8`);
      return !!playlist;
    } catch { return false; }
  };
  const handleDownload = async (url) => {
    if (!url) return alert("URL Missing");
    setShowDownloadMenu(false);
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const db = await dbPromise;
      const res = await fetch(url);
      const text = await res.text();
      const base = url.substring(0, url.lastIndexOf("/") + 1);
      const segments = text.split("\n").filter(line => line.endsWith(".ts"));
      await db.put(
        "videos",
        {
          id: videoId,
          title: currentVideo.title,
          thumbnail: currentVideo.thumbnail,
          videoUrl: url,
          duration: currentVideo.duration,
          channel: currentVideo.owner?.username,
        },
        `${videoId}-meta`
      );
      for (let i = 0; i < segments.length; i++) {
        const segRes = await fetch(base + segments[i]);
        await db.put("videos", await segRes.blob(), segments[i]);
        setDownloadProgress(Math.round(((i + 1) / segments.length) * 100));
      }
      setIsDownloaded(true);
      alert("Download complete! Video available offline ✅");
    } catch { alert("Download failed ❌"); } finally { setIsDownloading(false); }
  };

  // --- 15. WATCH LATER ---
  const handleToggleWatchLater = async () => {
    if (!user) return alert("Please sign in!");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/watch-later`, {}, { withCredentials: true });
      setIsWatchLater(res.data.isWatchLater);
      if (setUser && res.data.success) {
        const profile = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/profile`, { withCredentials: true });
        setUser(profile.data.data);
      }
    } catch (err) { alert("Failed to update Watch Later"); }
  };

  // --- 16. COMMENT HANDLING ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please sign in!");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: commentText }, { withCredentials: true });
      setComments(prev => [res.data.data, ...prev]);
      setCommentText("");
    } catch { alert("Comment failed"); }
  };
  const handleLikeComment = async (id) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/like/${id}`, {}, { withCredentials: true });
    setComments(prev => prev.map(c => c._id === id ? res.data : c));
  };
  const handleDislikeComment = async (id) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/dislike/${id}`, {}, { withCredentials: true });
    setComments(prev => prev.map(c => c._id === id ? res.data : c));
  };
  const handleReply = async (id) => {
    if (!user) return alert("Please sign in!");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: replyText[id], parent: id }, { withCredentials: true });
      setComments(prev => prev.map(c => c._id === id ? { ...c, replies: [...(c.replies || []), res.data.data] } : c));
      setReplyText(prev => ({ ...prev, [id]: "" }));
      setShowReplyBox(prev => ({ ...prev, [id]: false }));
    } catch { alert("Reply failed"); }
  };

  // --- TAG HANDLING ---
  const handleTagClick = (tag) => {
    if (onSearchSubmit) {
      onSearchSubmit([], tag);
    } else {
      console.warn("onSearchSubmit prop is missing");
    }
  };

  // --- VIDEO ENDED HANDLER FOR PLAYLIST CONTINUITY ---
  const handleEnded = () => {
    if (!queue.length) return;
    const currentIndex = queue.findIndex(v => (v._id || v.id) === videoId);
    const next = queue[currentIndex + 1];
    if (next) {
      onSelectVideo(next);
    }
  };

  // --- CREATE PLAYLIST FUNCTION ---
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return alert("Please enter a playlist name");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, { name: newPlaylistName }, { withCredentials: true });
      const newPlaylist = res.data.playlist || res.data.data;
      if (newPlaylist && (newPlaylist._id || newPlaylist.id)) {
        const pid = newPlaylist._id || newPlaylist.id;
        await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${pid}/add`, { videoId }, { withCredentials: true });
        setPlaylists(prev => [...prev, newPlaylist]);
        setIsInPlaylist(true);
        setNewPlaylistName("");
        setShowPlaylist(false);
        alert(`Success! Saved to ${newPlaylist.name}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create playlist");
    }
  };

  return (
    <div key={videoId} className="min-h-screen bg-[#0f0f0f] text-white transition-colors duration-500">
      <div className="max-w-[1700px] mx-auto p-2 md:p-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* MAIN PLAYER AREA */}
          <div className="lg:col-span-8">
            {/* VIDEO PLAYER CONTAINER */}
            <div 
              ref={playerContainerRef}
              onMouseMove={handleMouseMove}
              onClick={handleContainerClick}
              className="relative aspect-video w-full bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl border border-red-500/20 group cursor-pointer"
            >
              <video
                ref={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onEnded={handleEnded}
                poster={currentVideo.thumbnail || video?.thumbnail}
                playsInline
                className="w-full h-full object-contain bg-black"
              />

              {/* BUFFERING INDICATOR */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-red-500"></div>
                </div>
              )}

              {/* CONTROLS OVERLAY */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* TOP CONTROLS */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-[12px] font-bold text-white border border-red-400/30">
                    <Monitor size={14} /> {currentResolution} • {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="hover:rotate-90 transition-transform text-white hover:text-red-400">
                      <Settings size={22} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); !document.fullscreenElement ? playerContainerRef.current.requestFullscreen() : document.exitFullscreen(); }} className="text-white hover:text-red-400">
                      <Maximize size={22} />
                    </button>
                  </div>
                </div>

                {/* PLAY/PAUSE/SKIP CONTROLS */}
                <div className="flex items-center justify-center gap-10">
                  <button onClick={(e) => { e.stopPropagation(); skip(-10, e); }} className="text-white hover:text-red-400 transition-colors">
                    <RotateCcw size={40} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(e); }} className="p-5 bg-red-600/80 hover:bg-red-500/90 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:scale-110 shadow-xl">
                    {isPlaying ? <Pause size={50} /> : <Play size={50} fill="white" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); skip(10, e); }} className="text-white hover:text-red-400 transition-colors">
                    <RotateCw size={40} />
                  </button>
                </div>

                {/* PROGRESS BAR */}
                <div className="p-2 w-full flex flex-col gap-2">
                  <div className="flex justify-between text-[12px] font-bold px-1 text-white">
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  <div 
                    className="h-1.5 bg-white/30 w-full rounded-full cursor-pointer overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!videoRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
                    }}
                  >
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* SETTINGS MENU */}
              {showSettings && (
                <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-14 w-52 bg-slate-800/95 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-red-500/20 z-50">
                  {/* QUALITY SETTINGS */}
                  <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">Quality</p>
                  <button onClick={() => { handleResolutionChange("360p"); setShowSettings(false); }} className={`w-full flex justify-between items-center px-3 py-2 rounded-xl text-sm transition ${currentResolution === "360p" ? "bg-gradient-to-r from-red-600 to-red-700 text-white" : "hover:bg-red-500/20 text-zinc-300"}`}>
                    360p {currentResolution === "360p" && <Check size={14} />}
                  </button>
                  <button 
                    disabled={!currentVideo.videoUrl480}
                    onClick={() => { handleResolutionChange("480p"); setShowSettings(false); }}
                    className={`w-full flex justify-between items-center px-3 py-2 rounded-xl text-sm transition ${!currentVideo.videoUrl480 ? "opacity-30 cursor-not-allowed" : "hover:bg-red-500/20 text-zinc-300"} ${currentResolution === "480p" ? "bg-gradient-to-r from-red-600 to-red-700 text-white" : ""}`}
                  >
                    480p {currentResolution === "480p" && <Check size={14} />}
                  </button>
                  
                  {/* PLAYBACK SPEED SETTINGS */}
                  <p className="px-3 py-1 mt-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">Speed</p>
                  {[0.5, 1, 1.5, 2].map(speed => (
                    <button key={speed} onClick={() => { setPlaybackSpeed(speed); if (videoRef.current) videoRef.current.playbackRate = speed; setShowSettings(false); }} className={`w-full flex justify-between items-center px-3 py-2 rounded-xl text-sm transition ${playbackSpeed === speed ? "bg-gradient-to-r from-red-600 to-red-700 text-white" : "hover:bg-red-500/20"}`}>
                      {speed}x {playbackSpeed === speed && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS & INFO */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white overflow-hidden">
                   {currentVideo.owner?.avatar ? <img src={currentVideo.owner.avatar} className="w-full h-full object-cover" /> : (currentVideo.owner?.username || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2 text-white">{currentVideo.owner?.username} <CheckCircle2 size={16} className="text-red-400" /></div>
                  <span className="text-sm opacity-70 text-gray-300">{subCount} subscribers</span>
                </div>
                <Subscribe channelId={currentVideo.owner?._id} currentUser={user} />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-red-500/20">
                <LikeDislike videoId={videoId} user={user} />
                
                <button onClick={handleToggleWatchLater} className={`px-4 py-2 hover:bg-red-500/20 rounded-xl text-sm font-medium transition flex items-center gap-2 ${isWatchLater ? 'text-red-400' : 'text-white'}`}>
                  <Clock size={18} fill={isWatchLater ? "currentColor" : "none"} /> {isWatchLater ? "Saved" : "Later"}
                </button>
                
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-500/90 backdrop-blur-sm rounded-xl text-sm flex items-center gap-2 transition-all duration-200"
                  >
                    {isDownloading ? (
                      <span className="animate-pulse text-red-400">Wait {downloadProgress}%</span>
                    ) : isDownloaded ? (
                      <span className="text-green-400">Downloaded ✓</span>
                    ) : (
                      <>
                        <Download size={18} /> Download
                      </>
                    )}
                  </button>
                  
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-12 bg-slate-800/95 backdrop-blur-sm rounded-xl p-2 w-32 shadow-xl border border-red-500/20 z-50">
                      <button onClick={() => handleDownload(currentVideo.videoUrl)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left text-white">
                        360p
                      </button>
                      <button onClick={() => handleDownload(currentVideo.videoUrl480)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left text-white">
                        480p
                      </button>
                    </div>
                  )}
                </div>
                
                <button onClick={() => setShowPlaylist(true)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isInPlaylist ? "bg-gradient-to-r from-red-600 to-red-700 text-white" : "hover:bg-red-500/20"}`}>
                  {isInPlaylist ? "Saved ✓" : "+ Playlist"}
                </button>
                
                <button 
                  onClick={() => { 
                    if (!showSummary) fetchSummary(); 
                    setShowSummary(!showSummary); 
                  }}
                  disabled={summaryStatus === "loading"}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-all"
                >
                  {showSummary ? "Hide Summary" : "AI Summary"}
                </button>
              </div>
            </div>

            {/* DESCRIPTION AND TAGS */}
            <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                {currentVideo.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {currentVideo.tags?.map((tag, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleTagClick(tag)}
                    className="text-red-400 text-[11px] font-bold px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* AI SUMMARY */}
            {showSummary && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-blue-500/20">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-blue-400">AI Summary</h3>
                  <button onClick={() => setShowSummary(false)} className="text-sm text-red-400 hover:text-red-300">
                    Close
                  </button>
                </div>
                
                {summaryStatus === "loading" && <p className="text-gray-300 animate-pulse">Generating summary...</p>}
                {summaryStatus === "processing" && <p className="text-yellow-400">Summary is being generated ⏳</p>}
                {summaryStatus === "failed" && <p className="text-red-400">Failed to generate summary ❌</p>}
                {summaryStatus === "ready" && <p className="text-gray-200 whitespace-pre-wrap">{summary || "Summary not available."}</p>}
              </div>
            )}
          </div>

          {/* COMMENTS SECTION */}
          <div className="mt-8 pb-10">
            <h2 className="text-xl font-bold mb-6 text-white">{comments.length} Comments</h2>
            {/* ADD COMMENT FORM */}
            <form onSubmit={async (e) => { e.preventDefault(); if(!user) return alert("Sign In!"); const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: commentText }, { withCredentials: true }); setComments(prev => [res.data.data, ...prev]); setCommentText(""); }} className="flex gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white shrink-0">{user?.username?.charAt(0).toUpperCase() || "?"}</div>
              <input className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-red-500 text-white" placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
            </form>

            {/* COMMENTS LIST */}
            <div className="space-y-6">
              {comments.map((c) => (
                <div key={c._id} className="flex gap-4 bg-slate-800/30 p-4 rounded-2xl border border-red-500/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-bold shrink-0 text-white border-2 border-red-400/30">
                    {c.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-red-400">@{c.user?.username}</div>
                    <p className="text-gray-200 mt-1">{c.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
                      <button onClick={() => handleLikeComment(c._id)} className="flex items-center gap-1 hover:text-red-400"><ThumbsUp size={14}/> {c.likes?.length || 0}</button>
                      <button onClick={() => setShowReplyBox(p => ({...p, [c._id]: !p[c._id]}))} className="hover:text-red-400">Reply</button>
                      {c.replies?.length > 0 && <button onClick={() => setShowReplies(p => ({...p, [c._id]: !p[c._id]}))}>{showReplies[c._id] ? '▲ Hide' : `▼ View ${c.replies.length} replies`}</button>}
                    </div>
                    {/* REPLY INPUT */}
                    {showReplyBox[c._id] && (
                      <div className="mt-3 flex gap-2">
                        <input className="flex-1 bg-black/30 border-b border-white/20 p-2 outline-none text-sm" placeholder="Write a reply..." value={replyText[c._id] || ""} onChange={e => setReplyText(p => ({...p, [c._id]: e.target.value}))} />
                        <button onClick={() => handleReply(c._id)} className="text-red-400 text-sm font-bold">Post</button>
                      </div>
                    )}
                    {/* RENDER REPLIES (WITH LIKE/DISLIKE) */}
                    {showReplies[c._id] && c.replies?.map(r => (
                      <div key={r._id} className="ml-6 mt-4 border-l border-white/10 pl-4">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs">{r.user?.username?.charAt(0).toUpperCase()}</div>
                          @{r.user?.username}
                          {/* Like button */}
                          <button onClick={() => handleLikeReply(r._id)} className="flex items-center gap-1 hover:text-red-400">👍 {r.likes?.length || 0}</button>
                          {/* Dislike button */}
                          <button onClick={() => handleDislikeReply(r._id)} className="flex items-center gap-1 hover:text-red-400">👎 {r.dislikes?.length || 0}</button>
                        </div>
                        <p className="text-sm">{r.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4">
          <h3 className="font-bold mb-4 text-lg text-white">Up Next</h3>
          <div className="flex flex-col gap-4">
            {(relatedVideos.length ? relatedVideos : videoList).filter(v => (v._id || v.id) !== videoId).slice(0, 10).map((v) => (
              <div key={v._id || v.id} onClick={() => onSelectVideo(v)} className="flex gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-2xl border border-white/5 hover:border-red-400/30 transition-all">
                <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0 border border-red-500/20">
                  <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={v.title} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400">{v.title}</h4>
                  <p className="text-xs opacity-70 mt-1 text-gray-400">{v.owner?.username || v.ownerName}</p>
                  {v.category && <p className="text-[10px] text-red-500/80 font-bold uppercase">{v.category}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLAYLIST MODAL */}
      {showPlaylist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1a1a] p-6 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Clock className="text-red-500"/> Save to Playlist</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
              {playlists.map(p => (
                <button key={p._id} className="w-full text-left p-4 hover:bg-red-500/10 bg-white/5 rounded-2xl border border-white/5 text-white" 
                  onClick={async () => { await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${p._id}/add`, { videoId }, { withCredentials: true }); setIsInPlaylist(true); setShowPlaylist(false); alert("Added!"); }}>{p.name}</button>
              ))}
            </div>
            <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-red-500 mb-4 text-white" placeholder="New playlist name..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
            <button className="w-full bg-red-600 hover:bg-red-500 p-4 rounded-2xl font-bold text-white" onClick={async () => {
              if(!newPlaylistName.trim()) return;
              const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, { name: newPlaylistName }, { withCredentials: true });
              const pid = res.data.playlist?._id || res.data.data?._id;
              await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${pid}/add`, { videoId }, { withCredentials: true });
              setPlaylists(prev => [...prev, (res.data.playlist || res.data.data)]);
              setIsInPlaylist(true); setShowPlaylist(false);
            }}>Create & Save</button>
            <button onClick={() => setShowPlaylist(false)} className="w-full text-center mt-4 text-gray-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;