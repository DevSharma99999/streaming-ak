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

  // --- 1. ALL STATES (MANDATORY PRESERVATION) ---
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
  const [tempPlaybackTime, setTempPlaybackTime] = useState(0);

  // --- 2. REFS ---
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const viewCountedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  // --- 3. AUTO-SCROLL & RESET ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowSummary(false);
    setSummary("");
    setSummaryStatus("idle");
    viewCountedRef.current = false;
    setTempPlaybackTime(0);
  }, [videoId]);

  // --- 4. FORMAT TIME HELPER ---
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- 5. CONTROLS TOGGLE LOGIC ---
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };

  const handleContainerClick = (e) => {
    // Only toggle if we click the background or the video, not buttons
    if (e.target.tagName === 'VIDEO' || e.target.id === 'controls-bg') {
      setShowControls(prev => !prev);
    }
  };

  // --- 6. SEAMLESS RESOLUTION & HLS ---
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
            videoElement.currentTime = tempPlaybackTime || savedTime || (currentVideo.watchedTime || 0);
            if (isPlaying) videoElement.play().catch(() => {});
          });
        } else {
          videoElement.src = targetUrl;
          videoElement.currentTime = tempPlaybackTime || savedTime;
          if (isPlaying) videoElement.play().catch(() => {});
        }
      }
    };
    initPlayer();
  }, [videoId, currentResolution]);

  const handleResolutionChange = (newRes) => {
    if (videoRef.current) {
      setTempPlaybackTime(videoRef.current.currentTime);
      setCurrentResolution(newRes);
      setShowSettings(false); // ✅ Auto-close settings menu
    }
  };

  // --- 7. DATA FETCHING (SYNC, RELATED, HISTORY) ---
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
      } catch (err) { console.error(err); }
    };
    loadMetadata();
  }, [videoId]);

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

  const saveProgress = async (time) => {
    if (!user || !videoId || time < 1) return;
    if (Math.abs(time - lastSavedTimeRef.current) < 2) return;
    let timeToSave = (duration - time < 20) ? 0 : time;
    try {
      lastSavedTimeRef.current = time;
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/v1/users/history/progress`, { videoId, watchedTime: timeToSave }, { withCredentials: true });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const interval = setInterval(() => { if (isPlaying && videoRef.current) saveProgress(videoRef.current.currentTime); }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, videoId, user]);

  // --- 8. CORE ACTIONS ---
  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };

  const skip = (amount, e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += amount;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    setDuration(videoRef.current.duration);
    if (videoRef.current.currentTime > 5 && !viewCountedRef.current) {
      viewCountedRef.current = true;
      axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/view`, {}, { withCredentials: true });
    }
  };

  const fetchSummary = async () => {
    setSummaryStatus("loading");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ai/summary/${videoId}`);
      if (res.data.status === "processing") { setSummaryStatus("processing"); return; }
      setSummary(res.data.summary);
      setSummaryStatus("ready");
    } catch { setSummaryStatus("failed"); }
  };

  // --- 9. DOWNLOAD & OFFLINE ---
  const handleDownload = async (url) => {
    if (!url) return alert("URL Missing");
    setShowDownloadMenu(false); // ✅ Auto-close download menu
    try {
      setIsDownloading(true); setDownloadProgress(0);
      const db = await dbPromise;
      const res = await fetch(url);
      const text = await res.text();
      const base = url.substring(0, url.lastIndexOf("/") + 1);
      const segments = text.split("\n").filter(line => line.endsWith(".ts"));
      await db.put("videos", { id: videoId, title: currentVideo.title, thumbnail: currentVideo.thumbnail, videoUrl: url, duration: currentVideo.duration, channel: currentVideo.owner?.username }, `${videoId}-meta`);
      for (let i = 0; i < segments.length; i++) {
        const segRes = await fetch(base + segments[i]);
        await db.put("videos", await segRes.blob(), segments[i]);
        setDownloadProgress(Math.round(((i + 1) / segments.length) * 100));
      }
      setIsDownloaded(true); alert("Ready Offline ✅");
    } catch { alert("Failed ❌"); } finally { setIsDownloading(false); }
  };

  const loadOfflineVideo = async () => {
    try {
      const db = await dbPromise;
      const playlist = await db.get("videos", `${videoId}-m3u8`);
      return !!playlist;
    } catch { return false; }
  };

  // --- 10. COMMENT & REPLY ACTIONS ---
  const handleLikeComment = async (id) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/like/${id}`, {}, { withCredentials: true });
    updateCommentState(res.data);
  };

  const handleDislikeComment = async (id) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/dislike/${id}`, {}, { withCredentials: true });
    updateCommentState(res.data);
  };

  const handleReply = async (id) => {
    if (!user) return alert("Please Sign In!");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: replyText[id], parent: id }, { withCredentials: true });
      setComments(prev => prev.map(c => c._id === id ? { ...c, replies: [...(c.replies || []), res.data.data] } : c));
      setReplyText(prev => ({ ...prev, [id]: "" }));
      setShowReplyBox(prev => ({ ...prev, [id]: false }));
      setShowReplies(prev => ({ ...prev, [id]: true }));
    } catch { alert("Reply failed"); }
  };

  const updateCommentState = (updated) => {
    setComments(prev => prev.map(c => c._id === updated._id ? updated : c));
  };

  const handleTagClick = (tag) => {
    if (onSearchSubmit) onSearchSubmit([], tag);
  };

  return (
    <div key={videoId} className="min-h-screen bg-[#0f0f0f] text-white p-2 md:p-6 transition-colors duration-500">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-400 hover:text-red-300">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          
          {/* VIDEO PLAYER AREA */}
          <div 
            ref={playerContainerRef} 
            onMouseMove={handleMouseMove}
            onClick={handleContainerClick}
            className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-red-500/20 group cursor-pointer"
          >
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                const q = playlistVideos.length ? playlistVideos : videoList;
                const idx = q.findIndex(v => (v._id || v.id) === videoId);
                if (q[idx + 1]) onSelectVideo(q[idx + 1]);
              }}
              poster={currentVideo.thumbnail}
              className="w-full h-full object-contain bg-black"
            />

            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-red-500"></div>
              </div>
            )}

            {/* CONTROLS OVERLAY */}
            <div id="controls-bg" className={`absolute inset-0 bg-black/40 flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-[12px] font-bold">
                  <Monitor size={14} /> {currentResolution} • {playbackSpeed}x
                </div>
                <div className="flex gap-4">
                   <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="hover:rotate-90 transition-transform"><Settings size={22} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if (!document.fullscreenElement) { playerContainerRef.current.requestFullscreen(); } else { document.exitFullscreen(); } }}><Maximize size={22} /></button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-10">
                <button onClick={(e) => skip(-10, e)} className="text-white hover:text-red-400 transition-colors"><RotateCcw size={40} /></button>
                <button onClick={togglePlay} className="p-5 bg-red-600/80 hover:bg-red-500 rounded-full scale-110 shadow-xl transition-all">
                  {isPlaying ? <Pause size={50} /> : <Play size={50} fill="white" />}
                </button>
                <button onClick={(e) => skip(10, e)} className="text-white hover:text-red-400 transition-colors"><RotateCw size={40} /></button>
              </div>

              <div className="p-2 w-full flex flex-col gap-2">
                <div className="flex justify-between text-[12px] font-bold px-1">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div className="h-1.5 bg-white/30 w-full rounded-full cursor-pointer overflow-hidden group/bar" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration; }}>
                  <div className="h-full bg-red-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* RESOLUTION SETTINGS MENU */}
            {showSettings && (
              <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-14 w-52 bg-[#1a1a1a] rounded-2xl p-2 border border-white/10 z-50 shadow-2xl">
                <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">Quality</p>
                <button onClick={() => handleResolutionChange("360p")} className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm ${currentResolution === "360p" ? "bg-red-600" : "hover:bg-white/5"}`}>360p {currentResolution === "360p" && <Check size={14} />}</button>
                <button disabled={!currentVideo.videoUrl480} onClick={() => handleResolutionChange("480p")} className={`w-full flex justify-between px-3 py-2 rounded-xl text-sm ${!currentVideo.videoUrl480 ? "opacity-20" : ""} ${currentResolution === "480p" ? "bg-red-600" : "hover:bg-white/5"}`}>480p {currentResolution === "480p" && <Check size={14} />}</button>
                <p className="px-3 py-1 mt-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">Playback Speed</p>
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button key={speed} onClick={() => changeSpeed(speed)} className={`w-full text-left px-3 py-2 rounded-xl text-sm ${playbackSpeed === speed ? "bg-red-600" : "hover:bg-white/5"}`}>{speed}x</button>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS & INFO */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold overflow-hidden border-2 border-white/10">
                   {currentVideo.owner?.avatar ? <img src={currentVideo.owner.avatar} className="w-full h-full object-cover" /> : (currentVideo.owner?.username || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2 text-white">{currentVideo.owner?.username} <CheckCircle2 size={16} className="text-red-400" /></div>
                  <span className="text-sm opacity-70 text-gray-300">{subCount} subscribers</span>
                </div>
                <Subscribe channelId={currentVideo.owner?._id} currentUser={user} />
              </div>

              <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-red-500/20">
                <LikeDislike videoId={videoId} user={user} />
                <button onClick={() => setShowPlaylist(true)} className={`px-4 py-2 rounded-xl text-sm transition ${isInPlaylist ? "bg-red-600 font-bold" : "hover:bg-white/5"}`}>{isInPlaylist ? "Saved ✓" : "+ Playlist"}</button>
                
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} className="px-4 py-2 hover:bg-white/5 rounded-xl text-sm flex items-center gap-2">
                    {isDownloading ? <span className="animate-pulse">Wait {downloadProgress}%</span> : <><Download size={18}/> Download</>}
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-12 bg-[#1a1a1a] rounded-xl p-2 border border-white/10 z-50 w-32 shadow-2xl">
                      <button onClick={() => handleDownload(currentVideo.videoUrl)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left text-white">360p</button>
                      <button onClick={() => handleDownload(currentVideo.videoUrl480)} className="block w-full px-4 py-2 hover:bg-red-500/20 rounded-lg text-left text-white">480p</button>
                    </div>
                  )}
                </div>
                <button onClick={() => { if(!showSummary) fetchSummary(); setShowSummary(!showSummary); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-all">AI Summary</button>
              </div>
            </div>

            {/* DESCRIPTION & TAGS (FULLY RESTORED) */}
            <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
               <p className="text-sm text-gray-200 whitespace-pre-wrap">{currentVideo.description}</p>
               <div className="flex flex-wrap gap-2 mt-4">
                  {currentVideo.tags?.map((tag, i) => (
                    <button key={i} onClick={() => handleTagClick(tag)} className="text-red-400 text-[11px] font-bold px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all">#{tag}</button>
                  ))}
               </div>
            </div>

            {/* AI SUMMARY (FULLY RESTORED) */}
            {showSummary && (
               <div className="mt-4 p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-blue-400 flex items-center gap-2"><Monitor size={18}/> AI Video Analysis</h3>
                    <button onClick={() => setShowSummary(false)} className="text-xs text-red-400 hover:underline">Close</button>
                  </div>
                  {summaryStatus === "loading" ? <p className="animate-pulse">Thinking...</p> : <p className="text-gray-200 text-sm leading-relaxed">{summary || "Generating..."}</p>}
               </div>
            )}
          </div>
          
          {/* COMMENTS & REPLIES (FULLY RESTORED LOGIC) */}
          <div className="mt-8 pb-10">
             <h2 className="text-2xl font-bold mb-6 text-white">{comments.length} Comments</h2>
             <form onSubmit={handleAddComment} className="flex gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white shrink-0">{user?.username?.charAt(0).toUpperCase() || "?"}</div>
                <input className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-red-500 text-white" placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
             </form>

             <div className="space-y-6">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold shrink-0 text-white">{c.user?.username?.charAt(0).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-red-400">@{c.user?.username}</div>
                      <p className="text-gray-200 mt-1">{c.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
                         <button onClick={() => handleLikeComment(c._id)} className="flex items-center gap-1 hover:text-red-400"><ThumbsUp size={14}/> {c.likes?.length || 0}</button>
                         <button onClick={() => handleDislikeComment(c._id)} className="flex items-center gap-1 hover:text-red-400"><ThumbsDown size={14}/> {c.dislikes?.length || 0}</button>
                         <button onClick={() => setShowReplyBox(p => ({...p, [c._id]: !p[c._id]}))} className="hover:text-red-400">Reply</button>
                         {c.replies?.length > 0 && <button onClick={() => setShowReplies(p => ({...p, [c._id]: !p[c._id]}))}>{showReplies[c._id] ? '▲ Hide' : `▼ View ${c.replies.length} replies`}</button>}
                      </div>
                      
                      {showReplyBox[c._id] && (
                        <div className="mt-3 flex gap-2">
                           <input className="flex-1 bg-black/30 border-b border-white/20 p-2 outline-none text-sm text-white" placeholder="Write a reply..." value={replyText[c._id] || ""} onChange={e => setReplyText(p => ({...p, [c._id]: e.target.value}))} />
                           <button onClick={() => handleReply(c._id)} className="text-red-400 text-sm font-bold">Post</button>
                        </div>
                      )}

                      {/* REPLIES MAPPING (FULLY RESTORED) */}
                      {showReplies[c._id] && c.replies?.map(r => (
                        <div key={r._id} className="ml-6 mt-4 border-l border-white/10 pl-4">
                           <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                             <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center text-[10px] text-white">{r.user?.username?.charAt(0).toUpperCase()}</div>
                             @{r.user?.username}
                           </div>
                           <p className="text-sm text-gray-300 mt-1">{r.content}</p>
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
          <h3 className="font-bold mb-4 text-lg text-white border-b border-white/10 pb-2">Up Next</h3>
          <div className="flex flex-col gap-4">
            {(relatedVideos.length ? relatedVideos : videoList).filter(v => (v._id || v.id) !== videoId).slice(0, 10).map((v) => (
              <div key={v._id || v.id} onClick={() => onSelectVideo(v)} className="flex gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-2xl border border-white/5 hover:border-red-400/30 transition-all duration-300">
                <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0">
                  <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="thumb" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400 transition-colors">{v.title}</h4>
                  <p className="text-xs opacity-70 mt-1 text-gray-400">{v.owner?.username || v.ownerName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLAYLIST MODAL (FULLY RESTORED) */}
      {showPlaylist && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1a1a] p-6 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Clock className="text-red-500"/> Save to Playlist</h2>
               <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2 scrollbar-hide">
                 {playlists.map(p => (
                   <button key={p._id} className="w-full text-left p-4 hover:bg-red-500/10 bg-white/5 rounded-2xl border border-white/5 text-white transition-all" 
                     onClick={async () => { await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${p._id}/add`, { videoId }, { withCredentials: true }); setIsInPlaylist(true); setShowPlaylist(false); alert("Saved!"); }}>{p.name}</button>
                 ))}
               </div>
               <div className="border-t border-white/10 pt-6">
                 <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-red-500 mb-4 text-white" placeholder="Playlist name..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
                 <button className="w-full bg-red-600 hover:bg-red-500 p-4 rounded-2xl font-bold text-white transition-all shadow-lg" onClick={async () => {
                    if(!newPlaylistName.trim()) return;
                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, { name: newPlaylistName }, { withCredentials: true });
                    const pid = res.data.playlist?._id || res.data.data?._id;
                    await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/playlists/${pid}/add`, { videoId }, { withCredentials: true });
                    setPlaylists(prev => [...prev, (res.data.playlist || res.data.data)]);
                    setIsInPlaylist(true); setShowPlaylist(false); alert("Created & Saved!");
                 }}>Create & Save</button>
               </div>
               <button onClick={() => setShowPlaylist(false)} className="w-full text-center mt-4 text-gray-500 hover:text-white">Cancel</button>
            </div>
         </div>
      )}
    </div>
  );
}

export default VideoPlayer;