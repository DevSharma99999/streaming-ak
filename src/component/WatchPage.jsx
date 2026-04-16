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

  // --- 1. ALL ORIGINAL STATES (MANDATORY PRESERVATION) ---
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
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [showReplyBox, setShowReplyBox] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
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

  // --- 2. REFS ---
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const viewCountedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  // --- 3. AUTO-SCROLL TO TOP ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowSummary(false);
    setSummary("");
    setSummaryStatus("idle");
    viewCountedRef.current = false;
  }, [videoId]);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // --- 4. TOGGLE CONTROLS LOGIC ---
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };

  // --- 5. SEAMLESS RESOLUTION & HLS LOGIC ---
  useEffect(() => {
    const initPlayer = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const offline = await loadOfflineVideo();
      if (!offline) {
        const targetUrl = (currentResolution === "480p" && currentVideo.videoUrl480)
          ? currentVideo.videoUrl480 : currentVideo.videoUrl || video?.videoUrl;

        if (!targetUrl) return;
        const savedTime = videoElement.currentTime;

        if (hlsRef.current) hlsRef.current.destroy();

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(targetUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.currentTime = savedTime > 0 ? savedTime : (currentVideo.watchedTime || 0);
            videoElement.play().catch(() => {});
            setIsPlaying(true);
          });
        } else {
          videoElement.src = targetUrl;
          videoElement.currentTime = savedTime;
          videoElement.play().catch(() => {});
        }
      }
    };
    initPlayer();
  }, [videoId, currentResolution, currentVideo.videoUrl, currentVideo.videoUrl480]);

  // --- 6. DATA SYNC & HISTORY PROGRESS ---
  const saveProgress = async (time) => {
    if (!user || !videoId || time < 1) return;
    if (Math.abs(time - lastSavedTimeRef.current) < 2) return;
    let timeToSave = time;
    const videoDuration = videoRef.current?.duration || duration;
    if (videoDuration > 0 && (videoDuration - time) < 20) timeToSave = 0;
    try {
      lastSavedTimeRef.current = time;
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/v1/users/history/progress`,
        { videoId, watchedTime: timeToSave }, { withCredentials: true }
      );
    } catch (err) { console.error("History sync failed", err); }
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

  useEffect(() => {
    const loadMetadata = async () => {
      if (!videoId) return;
      try {
        const [metaRes, commRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`)
        ]);
        setCurrentVideo(prev => ({ ...prev, ...metaRes.data.data }));
        setSubCount(metaRes.data.subCount || 0);
        setComments(commRes.data.data || []);
        if (metaRes.data.isWatchLater !== undefined) setIsWatchLater(metaRes.data.isWatchLater);
      } catch (err) { console.error(err); }
    };
    loadMetadata();
  }, [videoId]);

  // Related Videos fetch
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
  }, [videoId, currentVideo.category]);

  // --- 7. CORE PLAYER ACTIONS ---
  const togglePlay = (e) => {
    if (e) e.stopPropagation();
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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(cur);
    setProgress((cur / dur) * 100);

    if (cur > 5 && !viewCountedRef.current) {
      viewCountedRef.current = true;
      axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/view`, {}, { withCredentials: true });
    }
  };

  // --- 8. OFFLINE & DOWNLOAD LOGIC ---
  const loadOfflineVideo = async () => {
    try {
      const db = await dbPromise;
      if (!videoRef.current || !videoId) return false;
      const playlist = await db.get("videos", `${videoId}-m3u8`);
      if (!playlist) return false;
      const hls = new Hls({
        enableWorker: true,
        fetchSetup: async (context) => {
          const cached = await db.get("videos", context.url.split("?")[0]);
          return cached ? new Response(cached) : fetch(context.url);
        }
      });
      const blob = new Blob([playlist], { type: "application/vnd.apple.mpegurl" });
      hls.loadSource(URL.createObjectURL(blob));
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;
      return true;
    } catch { return false; }
  };

  const handleDownload = async (url) => {
    if (!url) return alert("Video not available");
    try {
      setIsDownloading(true);
      const db = await dbPromise;
      const res = await fetch(url);
      const text = await res.text();
      const base = url.substring(0, url.lastIndexOf("/") + 1);
      const segments = text.split("\n").filter(line => line.endsWith(".ts"));
      await db.put("videos", { id: videoId, title: currentVideo.title, thumbnail: currentVideo.thumbnail, videoUrl: url, duration: currentVideo.duration, channel: currentVideo.owner?.username || "Unknown" }, `${videoId}-meta`);
      for (let i = 0; i < segments.length; i++) {
        const segRes = await fetch(base + segments[i]);
        await db.put("videos", await segRes.blob(), segments[i]);
        setDownloadProgress(Math.round(((i + 1) / segments.length) * 100));
      }
      setIsDownloaded(true);
      alert("Download Complete ✅");
    } catch { alert("Download failed ❌"); } finally { setIsDownloading(false); }
  };

  // --- 9. COMMENT & INTERACTION LOGIC ---
  const handleLikeComment = async (id) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/like/${id}`, {}, { withCredentials: true });
    setComments(prev => prev.map(c => c._id === id ? res.data : c));
  };

  const handleReply = async (id) => {
    if (!user) return alert("Please Sign In!");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: replyText[id], parent: id }, { withCredentials: true });
      setComments(prev => prev.map(c => c._id === id ? { ...c, replies: [...(c.replies || []), res.data.data] } : c));
      setReplyText(prev => ({ ...prev, [id]: "" }));
      setShowReplyBox(prev => ({ ...prev, [id]: false }));
    } catch { alert("Reply failed"); }
  };

  // AI Summary Logic
  const fetchSummary = async () => {
    setSummaryStatus("loading");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ai/summary/${videoId}`);
      if (res.data.status === "processing") return setSummaryStatus("processing");
      setSummary(res.data.summary);
      setSummaryStatus("ready");
    } catch { setSummaryStatus("failed"); }
  };

  return (
    <div key={videoId} className="min-h-screen bg-[#0f0f0f] text-white p-2 md:p-6 transition-colors duration-500">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-400 hover:text-red-300">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          
          {/* PROFESSIONAL PLAYER UI */}
          <div 
            ref={playerContainerRef} 
            onMouseMove={handleMouseMove}
            className="relative aspect-video w-full bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl border border-red-500/20 group"
          >
            <video
              ref={videoRef}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                const q = playlistVideos.length ? playlistVideos : videoList;
                const idx = q.findIndex(v => (v._id || v.id) === videoId);
                if (q[idx + 1]) onSelectVideo(q[idx + 1]);
              }}
              poster={currentVideo.thumbnail || video?.thumbnail}
              className="w-full h-full object-contain cursor-pointer bg-black"
            />

            {/* BUFFERING SPINNER */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-red-500"></div>
              </div>
            )}

            {/* CONTROLS OVERLAY */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-[12px] font-bold">
                  <Monitor size={14} /> {currentResolution} • {playbackSpeed}x
                </div>
                <div className="flex gap-4">
                  <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="hover:rotate-90 transition-transform"><Settings size={22} /></button>
                  <button onClick={() => !document.fullscreenElement ? playerContainerRef.current.requestFullscreen() : document.exitFullscreen()}><Maximize size={22} /></button>
                </div>
              </div>

              {/* CENTER ACTIONS */}
              <div className="flex items-center justify-center gap-10">
                <button onClick={(e) => skip(-10, e)} className="text-white hover:text-red-400"><RotateCcw size={40} /></button>
                <button onClick={togglePlay} className="p-5 bg-red-600/80 hover:bg-red-500 rounded-full scale-110 shadow-xl transition-all">
                  {isPlaying ? <Pause size={50} /> : <Play size={50} fill="white" />}
                </button>
                <button onClick={(e) => skip(10, e)} className="text-white hover:text-red-400"><RotateCw size={40} /></button>
              </div>

              {/* PROGRESS BAR */}
              <div className="p-2 w-full flex flex-col gap-2">
                <div className="flex justify-between text-[12px] font-bold px-1">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div 
                  className="h-1.5 bg-white/30 w-full rounded-full cursor-pointer overflow-hidden group/bar" 
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
                  }}
                >
                  <div className="h-full bg-red-500 group-hover/bar:bg-red-400 transition-colors" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* QUALITY/SPEED SETTINGS */}
            {showSettings && (
              <div className="absolute right-4 top-14 w-52 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl p-2 border border-red-500/20 z-50 shadow-2xl">
                <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase">Quality</p>
                <button onClick={() => { setCurrentResolution("360p"); setShowSettings(false); }} className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm ${currentResolution === "360p" ? "bg-red-600" : "hover:bg-white/5"}`}>360p {currentResolution === "360p" && <Check size={14} />}</button>
                <button disabled={!currentVideo.videoUrl480} onClick={() => { setCurrentResolution("480p"); setShowSettings(false); }} className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm ${!currentVideo.videoUrl480 ? "opacity-20" : ""} ${currentResolution === "480p" ? "bg-red-600" : "hover:bg-white/5"}`}>480p {currentResolution === "480p" && <Check size={14} />}</button>
                <p className="px-3 py-1 mt-2 text-[10px] font-bold text-red-400 uppercase">Playback Speed</p>
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button key={speed} onClick={() => changeSpeed(speed)} className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm ${playbackSpeed === speed ? "bg-red-600" : "hover:bg-white/5"}`}>{speed === 1 ? 'Normal' : `${speed}x`}</button>
                ))}
              </div>
            )}
          </div>

          {/* VIDEO INFO & ACTIONS */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-3 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white border-2 border-white/10 overflow-hidden">
                   {currentVideo.owner?.avatar ? <img src={currentVideo.owner.avatar} className="w-full h-full object-cover" /> : (currentVideo.owner?.username || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2 text-white">{currentVideo.owner?.username} <CheckCircle2 size={16} className="text-red-400" /></div>
                  <span className="text-sm opacity-70 text-gray-300">{subCount} subscribers</span>
                </div>
                <Subscribe channelId={currentVideo.owner?._id || currentVideo.owner} currentUser={user} />
              </div>

              <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-red-500/20">
                <LikeDislike videoId={videoId} user={user} />
                <button onClick={() => setShowPlaylist(true)} className={`px-4 py-2 rounded-xl text-sm transition ${isInPlaylist ? "bg-red-600" : "hover:bg-white/5"}`}>{isInPlaylist ? "Saved ✓" : "+ Playlist"}</button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} className="px-4 py-2 hover:bg-white/5 rounded-xl text-sm flex items-center gap-2"><Download size={18}/> Download</button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-12 bg-[#1a1a1a] rounded-xl p-2 border border-white/10 z-50 w-32 shadow-2xl">
                      <button onClick={() => handleDownload(currentVideo.videoUrl)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left">360p</button>
                      <button onClick={() => handleDownload(currentVideo.videoUrl480)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left">480p</button>
                    </div>
                  )}
                </div>
                <button onClick={() => { setShowSummary(!showSummary); if(!summary) fetchSummary(); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold">AI Summary</button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
               <p className="text-sm text-gray-200 whitespace-pre-wrap">{currentVideo.description}</p>
               <div className="flex flex-wrap gap-2 mt-4">
                  {currentVideo.tags?.map((tag, i) => (
                    <button key={i} onClick={() => onSearchSubmit([], tag)} className="text-red-400 text-[11px] font-bold px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">#{tag}</button>
                  ))}
               </div>
            </div>

            {showSummary && (
               <div className="mt-4 p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-blue-400 flex items-center gap-2"><Monitor size={18}/> AI Video Analysis</h3>
                    <button onClick={() => setShowSummary(false)} className="text-xs text-red-400 hover:underline">Close</button>
                  </div>
                  {summaryStatus === "loading" ? <p className="animate-pulse">Generating...</p> : <p className="text-gray-200 text-sm leading-relaxed">{summary}</p>}
               </div>
            )}
          </div>
          
          {/* --- 10. COMMENT SECTION (FULLY PRESERVED RECURSIVE LOGIC) --- */}
          <div className="mt-8 pb-10">
             <h2 className="text-2xl font-bold mb-6 text-white">{comments.length} Comments</h2>
             <form onSubmit={async (e) => { e.preventDefault(); if(!user) return alert("Sign In!"); const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: commentText }, { withCredentials: true }); setComments(prev => [res.data.data, ...prev]); setCommentText(""); }} className="flex gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white border border-white/10 shrink-0">{user?.username?.charAt(0).toUpperCase() || "?"}</div>
                <input className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-red-500" placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
             </form>
             <div className="space-y-6">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold shrink-0">{c.user?.username?.charAt(0).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-red-400">@{c.user?.username}</div>
                      <p className="text-gray-200 mt-1">{c.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
                         <button onClick={() => handleLikeComment(c._id)} className="flex items-center gap-1 hover:text-red-400"><ThumbsUp size={14}/> {c.likes?.length || 0}</button>
                         <button onClick={() => handleReply(c._id)} className="hover:text-red-400">Reply</button>
                         {c.replies?.length > 0 && <button onClick={() => setShowReplies(p => ({...p, [c._id]: !p[c._id]}))}>{showReplies[c._id] ? '▲ Hide' : `▼ View ${c.replies.length} replies`}</button>}
                      </div>
                      {showReplies[c._id] && c.replies?.map(r => (
                        <div key={r._id} className="ml-6 mt-4 border-l border-white/10 pl-4">
                           <div className="text-xs font-bold text-gray-400">@{r.user?.username}</div>
                           <p className="text-sm text-gray-300">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* SIDEBAR: UP NEXT */}
        <div className="lg:col-span-4">
          <h3 className="font-bold mb-4 text-lg text-white">Up Next</h3>
          <div className="flex flex-col gap-4">
            {(relatedVideos.length ? relatedVideos : videoList).filter(v => (v._id || v.id) !== videoId).slice(0, 15).map((v) => (
              <div key={v._id || v.id} onClick={() => onSelectVideo(v)} className="flex gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-2xl border border-white/5 hover:border-red-400/30 transition-all">
                <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0">
                  <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400">{v.title}</h4>
                  <p className="text-xs opacity-70 mt-1 text-gray-400">{v.owner?.username || v.ownerName}</p>
                  <p className="text-[10px] text-red-500 font-bold uppercase">{v.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- 11. PLAYLIST MODAL (FULLY PRESERVED) --- */}
      {showPlaylist && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] p-6 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="text-red-500"/> Save to Playlist</h2>
               <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2 scrollbar-hide">
                 {playlists.map(p => (
                   <button key={p._id} className="w-full text-left p-4 hover:bg-red-500/10 bg-white/5 rounded-2xl border border-white/5 transition-all" onClick={async () => { await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${p._id}/add`, { videoId }, { withCredentials: true }); setShowPlaylist(false); alert("Saved!"); }}>{p.name}</button>
                 ))}
               </div>
               <div className="border-t border-white/10 pt-6">
                 <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-red-500 mb-4" placeholder="Create new playlist..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
                 <button className="w-full bg-red-600 hover:bg-red-500 p-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20" onClick={async () => { if(!newPlaylistName.trim()) return; const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, { name: newPlaylistName }, { withCredentials: true }); const pid = res.data.playlist?._id || res.data.data?._id; await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${pid}/add`, { videoId }, { withCredentials: true }); setPlaylists(p => [...p, res.data.playlist || res.data.data]); setShowPlaylist(false); alert("Created & Saved!"); }}>Create & Save</button>
               </div>
               <button onClick={() => setShowPlaylist(false)} className="w-full text-center mt-4 text-gray-500 text-sm hover:text-white transition-colors">Cancel</button>
            </div>
         </div>
      )}
    </div>
  );
}

export default VideoPlayer;