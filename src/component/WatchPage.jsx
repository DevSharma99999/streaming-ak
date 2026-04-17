import React, { useState, useEffect, useRef } from 'react';

import { ThumbsUp, ThumbsDown } from "lucide-react";

import Hls from 'hls.js';

import axios from 'axios';

import {

  ArrowLeft, Maximize, Play, Pause, RotateCcw, RotateCw,

  Clock, Download, CheckCircle2,

  Settings, Monitor, Check

} from "lucide-react";

import { dbPromise } from "../utils/db.js";

import Subscribe from "../Function/Subscribe";

import LikeDislike from "../Function/Like";



function VideoPlayer({ video, onBack, isDarkMode, user, setUser, videoList = [], playlistVideos = [], onSelectVideo, onSearchSubmit }) {

  const videoId = video?._id || video?.id;

useEffect(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
}, [videoId]);

const clickTimeoutRef = useRef(null);
const animationRef = useRef(null);
const [isBuffering, setIsBuffering] = useState(true);

  const [currentVideo, setCurrentVideo] = useState(video || {});

  const [isPlaying, setIsPlaying] = useState(true);

  const [progress, setProgress] = useState(0);

  const [currentTime, setCurrentTime] = useState(0); // For live incrementing display

  const [duration, setDuration] = useState(0); // Total duration

  const [showControls, setShowControls] = useState(true);

  const [subCount, setSubCount] = useState(0);

  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");

  const [isWatchLater, setIsWatchLater] = useState(false);

  // ONLY NEW STATES ADDED (keep rest same)

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



  // Settings & Resolution States

  const [showSettings, setShowSettings] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [currentResolution, setCurrentResolution] = useState("360p");

  const [isInPlaylist, setIsInPlaylist] = useState(false);

  //ai work

  const [summary, setSummary] = useState("");

  const [summaryStatus, setSummaryStatus] = useState("idle");

  const [showSummary, setShowSummary] = useState(false);

  const [relatedVideos, setRelatedVideos] = useState([]);



  // Change your "Up Next" mapping from 'videoList' to 'relatedVideos'

  // idle | loading | ready | processing | failed



  const videoRef = useRef(null);

  const playerContainerRef = useRef(null);

  const hlsRef = useRef(null);

  const controlsTimeoutRef = useRef(null);

  const viewCountedRef = useRef(false);

  const lastSavedTimeRef = useRef(0);



  // Helper to format time (e.g., 153 -> 2:33)

  const formatTime = (timeInSeconds) => {

    if (isNaN(timeInSeconds)) return "0:00";

    const minutes = Math.floor(timeInSeconds / 60);

    const seconds = Math.floor(timeInSeconds % 60);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  };





  useEffect(() => {

    const checkPlaylist = async () => {

      try {

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, {

          withCredentials: true

        });



        const exists = res.data.data.some(p =>

          p.videos?.includes(videoId)

        );



        setIsInPlaylist(exists);

      } catch (err) {

        console.log(err);

      }

    };



    if (user && videoId) checkPlaylist();

  }, [videoId, user]);

useEffect(() => {
  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
       hlsRef.current = null;
    }
  };
}, []);
useEffect(() => {
  if (!videoId) return;
  setCurrentResolution("360p");
}, [videoId]);

  useEffect(() => {

    const fetchRelated = async () => {

      if (!currentVideo.category && !currentVideo.tags) return;



      try {

        // Simple Algo: Fetch videos in the same category, or with similar tags

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/related/${videoId}`, {

          params: {

            category: currentVideo.category,

            tags: currentVideo.tags?.join(',')

          }

        });

        setRelatedVideos(res.data.data);

      } catch (err) {

        console.error("Related videos fetch failed", err);
      }

    };



    fetchRelated();

  }, [videoId, currentVideo.category, currentVideo.tags]);



  // --- 1. DATA SYNC ---

  useEffect(() => {

    if (!videoId) return;

    viewCountedRef.current = false;

    const loadData = async () => {

      try {

        const [metaRes, commRes] = await Promise.all([

          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}`, { withCredentials: true }),

          axios.get(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`)

        ]);

        const fetchedData = metaRes.data.data;

        const startTime = video?.watchedTime !== undefined ? video.watchedTime : fetchedData.watchedTime;



        setCurrentVideo(prev => ({ ...prev, ...fetchedData, watchedTime: startTime }));

        setSubCount(metaRes.data.subCount || 0);

        setComments(commRes.data.data || []);

        if (metaRes.data.isWatchLater !== undefined) setIsWatchLater(metaRes.data.isWatchLater);

      } catch (err) { console.error("Sync failed:", err); }

    };

    loadData();

  }, [videoId]);



  useEffect(() => {

    setShowSummary(false);

    setSummary("");

    setSummaryStatus("idle");

  }, [videoId]);



  // --- 2. THE TIMESTAMP SEEKER ---

  useEffect(() => {

    const videoElement = videoRef.current;

    if (!videoElement) return;



    const handleAutoSeek = () => {

      if (currentVideo.watchedTime > 0) {

        videoElement.currentTime = currentVideo.watchedTime;

      }

      setDuration(videoElement.duration);

    };



    videoElement.addEventListener('loadedmetadata', handleAutoSeek);

    if (videoElement.readyState >= 1) handleAutoSeek();

    return () => videoElement.removeEventListener('loadedmetadata', handleAutoSeek);

  }, [videoId, currentVideo.watchedTime]);



  // --- 3. PROGRESS SAVING ---

  // --- 3. PROGRESS SAVING ---

  const saveProgress = async (time) => {

    if (!user || !videoId || time < 1) return;



    // Throttle saves to avoid spamming the server

    if (Math.abs(time - lastSavedTimeRef.current) < 5) return;



    let timeToSave = time;

    // Use the actual video duration from the ref for precision

    const videoDuration = videoRef.current?.duration || duration;



    // ✅ The 20-second "End of Video" reset

    if (videoDuration > 0 && (videoDuration - time) < 20) {

      console.log("Video near completion. Resetting history to 0.");

      timeToSave = 0;

    }



    try {

      lastSavedTimeRef.current = time;

      await axios.patch(`${import.meta.env.VITE_API_URL}/api/v1/users/history/progress`,

        { videoId, watchedTime: timeToSave },

        { withCredentials: true }

      );

    } catch (err) {

      console.error("Progress save failed:", err.message);

    }

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

    if (playlistVideos.length) {

      setQueue(playlistVideos); // playlist priority

    } else if (videoList.length) {

      setQueue(videoList); // fallback

    }

  }, [playlistVideos, videoList]);


  useEffect(() => {

    const checkDownload = async () => {

      const db = await dbPromise;

      const meta = await db.get("videos", `${videoId}-meta`);



      setIsDownloaded(!!meta);

    };



    if (videoId) checkDownload();

  }, [videoId]);



  useEffect(() => {

    const savedQueue = JSON.parse(localStorage.getItem("queue"));

    const index = Number(localStorage.getItem("currentIndex"));



    if (savedQueue && savedQueue.length) {

      setQueue(savedQueue);

    }

  }, []);



  useEffect(() => {

    const handleClick = () => setShowDownloadMenu(false);

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);

  }, []);



  // --- 4. SEAMLESS RESOLUTION SWITCHER ---

useEffect(() => {
  const videoElement = videoRef.current;
  if (!videoElement) return;

   videoElement.preload = "auto";
  const targetUrl =
    currentResolution === "480p" && currentVideo.videoUrl480
      ? currentVideo.videoUrl480
      : currentVideo.videoUrl;

  if (!targetUrl) return;

  const lastTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;

  // destroy old instance
  if (hlsRef.current) {
    hlsRef.current.destroy();
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });

    hlsRef.current = hls;

    hls.loadSource(targetUrl);
    hls.attachMedia(videoElement);

    // ✅ WAIT until video is actually ready
   hls.on(Hls.Events.MANIFEST_PARSED, () => {
  videoElement.currentTime = lastTime;

  if (wasPlaying) {
    videoElement.play().catch(() => {});
  }

  setIsBuffering(false);
});
hls.on(Hls.Events.FRAG_BUFFERED, () => {
  setIsBuffering(false);
});
hls.on(Hls.Events.FRAG_LOADED, () => setIsBuffering(false));

  } else {
    videoElement.src = targetUrl;

    videoElement.onloadedmetadata = () => {
      videoElement.currentTime = lastTime;
      if (wasPlaying) videoElement.play();
    };
  }

}, [currentResolution, videoId]);

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  video.addEventListener("play", onPlay);
  video.addEventListener("pause", onPause);

  return () => {
    video.removeEventListener("play", onPlay);
    video.removeEventListener("pause", onPause);
  };
}, []);

  //fetch playlists if user is logged in

  useEffect(() => {

    const fetchPlaylists = async () => {

      try {

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/playlists`, {

          withCredentials: true

        });

        setPlaylists(res.data.data);

      } catch (err) {

        console.log(err);

      }

    };



    if (user) fetchPlaylists();

  }, [user]);



  const handleTagClick = (tag) => {
  if (onSearchSubmit) {
    onSearchSubmit([tag.trim()], "");
  }
};



  const fetchSummary = async () => {

    try {

      setSummaryStatus("loading");



      const res = await axios.get(

        `${import.meta.env.VITE_API_URL}/api/ai/summary/${videoId}`

      );



      if (res.data.status === "processing") {

        setSummaryStatus("processing");

        return;

      }



      if (res.data.status === "failed") {

        setSummaryStatus("failed");

        return;

      }



      setSummary(res.data.summary);

      setSummaryStatus("ready");



    } catch (err) {

      console.error(err);

      setSummaryStatus("failed");

    }

  };



  const handleOfflineSave = async (m3u8Url, id) => {

    try {

      setIsDownloading(true);

      setDownloadProgress(0);



      const db = await dbPromise;



      const res = await fetch(m3u8Url);

      const text = await res.text();



      const base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);



      const segments = text

        .split("\n")

        .filter(line => line.endsWith(".ts"))

        .map(line => ({

          full: base + line,

          key: line

        }));



      await db.put("videos", {

        id,

        title: currentVideo.title,

        thumbnail: currentVideo.thumbnail,

        videoUrl: m3u8Url,

        duration: currentVideo.duration || "0:00",

        channel: currentVideo.owner?.username || "Unknown",

        size: `${(segments.length * 0.5).toFixed(1)} MB`

      }, `${id}-meta`);


      for (let i = 0; i < segments.length; i++) {

        const segRes = await fetch(segments[i].full);

        const blob = await segRes.blob();


       const key = segments[i].full.split("?")[0];
await db.put("videos", blob, key);
         setDownloadProgress(Math.floor(((i + 1) / segments.length) * 100));

      }



      alert("Download Complete ✅");

    } catch (err) {

      console.error(err);

      alert("Download failed ❌");

    } finally {

      setIsDownloading(false);

    }

  };



 const handleSelectVideo = (video, queue) => {
  localStorage.setItem("queue", JSON.stringify(queue));
  localStorage.setItem(
    "currentIndex",
    queue.findIndex(v => v._id === video._id)
  );

  onSelectVideo(video); // ✅ FIXED
};



  const loadOfflineVideo = async () => {

    try {

      const db = await dbPromise;



      const video = videoRef.current;

      if (!video || !videoId) return false;



      // ✅ Get saved playlist

      const playlist = await db.get("videos", `${videoId}-m3u8`);

      if (!playlist) return false;



      if (hlsRef.current) hlsRef.current.destroy();



      const hls = new Hls({

        enableWorker: true,



        fetchSetup: async (context) => {

          const cleanUrl = context.url.split("?")[0];



          const cached = await db.get("videos", cleanUrl);



          if (cached) {

            return new Response(cached);

          } else {

            throw new Error("Segment not found offline");

          }

        }

      });



      const blob = new Blob([playlist], {

        type: "application/vnd.apple.mpegurl"

      });



      const localUrl = URL.createObjectURL(blob);



      hls.loadSource(localUrl);

      hls.attachMedia(video);



      hlsRef.current = hls;



      return true;

    } catch (err) {

      console.log("Offline load failed:", err);

      return false;

    }

  };



  // --- 5. PLAYER UI CONTROLS & DURATION DISPLAY ---

  const handleTimeUpdate = () => {
  if (!videoRef.current) return;

  const current = videoRef.current.currentTime;
  const total = videoRef.current.duration;

  setCurrentTime(current);

  if (total > 0) {
    setProgress((current / total) * 100);
  }

  animationRef.current = requestAnimationFrame(handleTimeUpdate);
};

useEffect(() => {
  animationRef.current = requestAnimationFrame(handleTimeUpdate);

  return () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
}, []);


  const togglePlay = () => {

    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }

    else { videoRef.current.pause(); setIsPlaying(false); }

  };



  const changeSpeed = (speed) => {

    setPlaybackSpeed(speed);

    videoRef.current.playbackRate = speed;

    setShowSettings(false);

  };



  const skip = (amount) => { if (videoRef.current) videoRef.current.currentTime += amount; };



  const handleMouseMove = () => {

    setShowControls(true);

    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = setTimeout(() => { if (isPlaying && !showSettings) setShowControls(false); }, 3000);

  };



  const handleToggleWatchLater = async () => {

    if (!user) return alert("Please Sign In!");

    try {

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/watch-later`, {}, { withCredentials: true });

      setIsWatchLater(res.data.isWatchLater);

      if (setUser && res.data.success) {

        const profile = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/users/profile`, { withCredentials: true });

        setUser(profile.data.data);

      }

    } catch (err) { alert("Failed to update Watch Later"); }

  };



  const handleAddComment = async (e) => {

    e.preventDefault();

    if (!user) return alert("Please Sign In!");

    try {

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`, { content: commentText }, { withCredentials: true });

      setComments(prev => [res.data.data, ...prev]);

      setCommentText("");

    } catch (err) { alert("Comment failed"); }

  };



  // Reply

  const handleReply = async (id) => {

    if (!user) return alert("Please Sign In!");



    try {

      const res = await axios.post(

        `${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`,

        { content: replyText[id], parent: id },

        { withCredentials: true }

      );



      setComments(prev =>

        prev.map(c =>

          c._id === id

            ? { ...c, replies: [...(c.replies || []), res.data] }

            : c

        )

      );



      setReplyText(prev => ({ ...prev, [id]: "" }));

      setShowReplyBox(prev => ({ ...prev, [id]: false }));

    } catch {

      alert("Reply failed");

    }

  };



  // Update comment state

  const updateComment = (updated) => {

    setComments(prev =>

      prev.map(c => {

        if (c._id === updated._id) return updated;



        return {

          ...c,

          replies: c.replies?.map(r =>

            r._id === updated._id ? updated : r

          )

        };

      })

    );

  };



  const handleDownload = async (url) => {

    if (!url) {

      alert("Video not available");

      return;

    }



    console.log("Downloading:", url); // debug



    await handleOfflineSave(url, videoId);

  };





  const handleEnded = () => {

    if (!queue.length) return;



    const currentIndex = queue.findIndex(

      v => (v._id || v.id) === videoId

    );



    const next = queue[currentIndex + 1];



    if (next) {

     handleSelectVideo(next, queue);
    }
  };


  // Like

  const handleLikeComment = async (id) => {

    const res = await axios.post(

      `${import.meta.env.VITE_API_URL}/api/v1/comments/like/${id}`,

      {},

      { withCredentials: true }

    );

    updateComment(res.data);

  };



  // Dislike

  const handleDislikeComment = async (id) => {

    const res = await axios.post(

      `${import.meta.env.VITE_API_URL}/api/v1/comments/dislike/${id}`,

      {},

      { withCredentials: true }

    );

    updateComment(res.data);

  };



  return (

    <div key={videoId} className="min-h-screen bg-[#0f0f0f] text-white transition-colors duration-500">

      <div className="max-w-[1700px] mx-auto p-2 md:p-6">

        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors">

          <ArrowLeft size={20} /> Back

        </button>



        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">

            <div 
  ref={playerContainerRef} 
  onMouseMove={handleMouseMove}
  onClick={() => setShowControls(prev => !prev)}
 className="relative aspect-video w-full bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl border border-red-500/20 group">

{isBuffering && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40 pointer-events-none">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )}

              <video

                ref={videoRef}

                onEnded={handleEnded}

                poster={currentVideo.thumbnail || video?.thumbnail}

                playsInline
                autoPlay   // ✅ ADD THIS
                muted    

                className="w-full h-full object-contain cursor-pointer bg-black"


onClick={(e) => {
  e.stopPropagation();
  togglePlay();
}}

                 onWaiting={() => setIsBuffering(true)}
  onPlaying={() => setIsBuffering(false)}
  onCanPlay={() => setIsBuffering(false)}   // ✅ important
  onSeeking={() => setIsBuffering(true)}    // ✅ when user skips
  onSeeked={() => setIsBuffering(false)}  

              />



              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>

                <div className="flex justify-between items-center">

                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-[12px] font-bold text-white border border-red-400/30">

                    <Monitor size={14} /> {currentResolution} • {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}

                  </div>

                  <div className="flex gap-4">

                    <button
  onClick={(e) => {
    e.stopPropagation();   // ✅ IMPORTANT
    setShowSettings(prev => !prev);
  }} className="text-white hover:text-red-400 transition-colors hover:rotate-90 duration-300">

                      <Settings size={22} />

                    </button>

                    <button onClick={() => !document.fullscreenElement ? playerContainerRef.current.requestFullscreen() : document.exitFullscreen()} className="text-white hover:text-red-400 transition-colors">

                      <Maximize size={22} />

                    </button>

                  </div>

                </div>



                {/* Settings Menu Popup */}

                {showSettings && (

                  <div className="absolute right-4 top-14 w-52 bg-slate-800/95 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-red-500/20 z-50">

                    <div className="mb-3">

                      <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">Quality</p>

                      <button onClick={() => { setCurrentResolution("360p"); setShowSettings(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${currentResolution === "360p" ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'hover:bg-red-500/20 text-zinc-300'}`}>

                        360p {currentResolution === "360p" && <Check size={14} />}

                      </button>

                      <button

                        disabled={!currentVideo.videoUrl480}

                        onClick={() => { setCurrentResolution("480p"); setShowSettings(false); }}

                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${!currentVideo.videoUrl480 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-500/20 text-zinc-300'} ${currentResolution === "480p" ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : ''}`}

                      >

                        480p {!currentVideo.videoUrl480 ? '(N/A)' : (currentResolution === "480p" && <Check size={14} />)}

                      </button>

                    </div>

                    <div>

                      <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">Speed</p>

                      {[0.5, 1, 1.5, 2].map(speed => (

                        <button key={speed} onClick={() => changeSpeed(speed)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${playbackSpeed === speed ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' : 'hover:bg-red-500/20 text-zinc-300'}`}>

                          {speed === 1 ? 'Normal' : `${speed}x`} {playbackSpeed === speed && <Check size={14} />}

                        </button>

                      ))}

                    </div>

                  </div>

                )}



                <div className="flex items-center justify-center gap-10">

                  <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white hover:text-red-400 transition-colors">

                    <RotateCcw size={40} />

                  </button>

                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-5 bg-red-600/80 hover:bg-red-500/90 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:scale-110 shadow-xl">

                    {isPlaying ? <Pause size={50} /> : <Play size={50} fill="white" />}

                  </button>

                  <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white hover:text-red-400 transition-colors">

                    <RotateCw size={40} />

                  </button>

                </div>



                {/* --- PROGRESS BAR & TIMELINE DISPLAY --- */}

                <div className="p-2 w-full flex flex-col gap-2">

                  <div className="flex items-center gap-2 text-[12px] font-bold text-white drop-shadow-md">

                    <span>{formatTime(currentTime)}</span>

                    <span>/</span>

                    <span className="opacity-70">{formatTime(duration)}</span>

                  </div>

                  <div className="h-1.5 bg-white/30 w-full rounded-full overflow-hidden cursor-pointer" onClick={(e) => {

                    if (!videoRef.current) return;

                    const rect = e.currentTarget.getBoundingClientRect();

                    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;

                  }}>

                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600" style={{ width: `${progress}%` }} />

                  </div>

                </div>

              </div>

            </div>



            <div className="mt-4">

              <h1 className="text-2xl font-bold text-white mb-2">{currentVideo.title}</h1>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-3">

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 overflow-hidden flex items-center justify-center border-2 border-red-400/30 shrink-0 font-bold text-white">

                    {currentVideo.owner?.avatar ? <img src={currentVideo.owner.avatar} className="w-full h-full object-cover" alt="avatar" /> : (currentVideo.owner?.username || currentVideo.ownerName)?.charAt(0).toUpperCase()}

                  </div>

                  <div>

                    <div className="font-bold text-lg flex items-center gap-2 text-white">

                      {currentVideo.owner?.username || currentVideo.ownerName}

                      <CheckCircle2 size={16} className="text-red-400" />

                    </div>

                    <span className="text-sm opacity-70 text-gray-300">{subCount} subscribers</span>

                  </div>

                  <Subscribe channelId={currentVideo.owner?._id || currentVideo.owner || video?.owner} currentUser={user} />

                </div>



                <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-red-500/20">

                  <LikeDislike key={`like-${videoId}`} videoId={videoId} user={user} />

                  <div className="w-[1px] h-6 bg-white/20 mx-1" />

                  <button onClick={handleToggleWatchLater} className={`px-4 py-2 hover:bg-red-500/20 rounded-xl text-sm font-medium transition flex items-center gap-2 ${isWatchLater ? 'text-red-400' : 'text-white'}`}>

                    <Clock size={18} fill={isWatchLater ? "currentColor" : "none"} /> {isWatchLater ? "Saved" : "Later"}

                  </button>

                  <div className="relative group">

                    <button
  disabled={isDownloaded}
  className={`px-4 py-2 rounded-full text-sm ${
    isDownloaded ? "bg-green-600" : "bg-white/10"
  }`}
  onClick={(e) => {
    e.stopPropagation();
    setShowDownloadMenu(prev => !prev);
  }}
>
  <span className={`w-4 h-4 rounded-full ${
    isDownloaded ? "bg-green-400" : "bg-white/10"
  } animate-pulse`} />
  Download
</button>

                    {isDownloading && (

                      <div className="absolute right-0 mt-2 bg-black text-white px-3 py-2 rounded">

                        Downloading... {downloadProgress}%

                      </div>

                    )}



                    {showDownloadMenu && (

                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 bg-slate-800/95 backdrop-blur-sm rounded-xl mt-2 w-32 shadow-xl border border-red-500/20 z-50">



                        <button

                          onClick={() => handleDownload(currentVideo.videoUrl)}

                          className="block w-full text-left px-3 py-2 hover:bg-red-500/20 text-white rounded-lg transition-colors"

                        >

                          360p

                        </button>



                        <button

                          onClick={() => handleDownload(currentVideo.videoUrl480)}

                          className="block w-full text-left px-3 py-2 hover:bg-red-500/20 text-white rounded-lg transition-colors"

                        >

                          480p

                        </button>



                      </div>

                    )}

                  </div>

                  <button

                    onClick={() => setShowPlaylist(true)}

                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isInPlaylist ? "bg-gradient-to-r from-red-600 to-red-700 text-white" : "hover:bg-red-500/20 text-white"

                      }`}

                  >

                    {isInPlaylist ? "Saved ✓" : "+ Playlist"}

                  </button>

                  <button

                    onClick={() => {

                      if (showSummary) {

                        setShowSummary(false);

                      } else {

                        fetchSummary();

                        setShowSummary(true);

                      }

                    }}

                    disabled={summaryStatus === "loading"}

                    className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white"

                  >

                    {showSummary ? "Hide Summary" : "AI Summary"}

                  </button>

                </div>

              </div>

              <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">

                {/* Use currentVideo.description for synced data */}

                <p className="text-gray-200 text-sm whitespace-pre-wrap">

                  {currentVideo.description || video?.description}

                </p>



                <div className="flex flex-wrap gap-2 mt-4">
  {currentVideo.tags ? (
    (Array.isArray(currentVideo.tags)
      ? currentVideo.tags
      : currentVideo.tags.split(",")
    ).map((tag, index) => (
      <button
        key={index}
        onClick={() => handleTagClick(tag.trim())}
        className="text-red-400 text-xs font-bold px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all"
      >
        #{tag.trim()}
      </button>
    ))
  ) : (
    <span className="text-gray-500 text-xs italic">
      No tags available
    </span>
  )}
</div>

              </div>

              {showSummary && (

                <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-blue-500/20">



                  {/* HEADER WITH BACK BUTTON */}

                  <div className="flex justify-between items-center mb-2">

                    <h3 className="font-bold text-blue-400">AI Summary</h3>



                    <button

                      onClick={() => setShowSummary(false)}

                      className="text-sm text-red-400 hover:text-red-300"

                    >

                      Back

                    </button>

                  </div>



                  {/* STATES */}

                  {summaryStatus === "loading" && (

                    <p className="text-gray-300">Generating summary...</p>

                  )}



                  {summaryStatus === "processing" && (

                    <p className="text-yellow-400">Summary is being generated ⏳</p>

                  )}



                  {summaryStatus === "failed" && (

                    <p className="text-red-400">Failed to generate summary ❌</p>

                  )}



                  {summaryStatus === "ready" && (

                    <p className="text-gray-200 whitespace-pre-wrap">{summary}</p>

                  )}



                </div>

              )}

            </div>



            <div className="mt-8 pb-10">

              <h2 className="text-2xl font-bold mb-6 text-white">{comments.length} Comments</h2>



              {/* ADD COMMENT */}

              <form onSubmit={handleAddComment} className="flex gap-4 mb-8">

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-bold shrink-0 text-white border-2 border-red-400/30">

                  {user?.username?.charAt(0).toUpperCase() || "?"}

                </div>



                <div className="flex-1 flex flex-col gap-2">

                  <input

                    className="bg-slate-800/50 backdrop-blur-sm border border-red-500/20 rounded-xl outline-none py-3 px-4 w-full text-white placeholder-gray-400 focus:border-red-400 transition-colors"

                    placeholder="Add a comment..."

                    value={commentText}

                    onChange={(e) => setCommentText(e.target.value)}

                  />



                  {commentText && (

                    <button

                      type="submit"

                      className="self-end mt-2 px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold hover:from-red-500 hover:to-red-500 transition-all duration-200"

                    >

                      Comment

                    </button>

                  )}

                </div>

              </form>



              {/* COMMENTS */}

              <div className="space-y-6">

                {comments.map((c) => (

                  <div key={c._id} className="flex gap-4 bg-slate-800/30 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10">

                    {/* Avatar */}

                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-sm shrink-0 font-bold text-white border-2 border-red-400/30">

                      {c.user?.username?.charAt(0).toUpperCase()}

                    </div>



                    <div className="flex-1">

                      <div className="text-base font-bold text-white mb-1">@{c.user?.username}</div>

                      <p className="text-gray-300 leading-relaxed mb-3">{c.content}</p>



                      {/* ACTIONS */}

                      <div className="flex items-center gap-2 bg-slate-700/50 backdrop-blur-sm rounded-xl px-3 py-2 w-fit border border-red-500/20">



                        <button

                          onClick={() => handleLikeComment(c._id)}

                          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200

    ${c.likes?.includes(user?._id)

                              ? "text-red-400 bg-red-500/20"

                              : "text-gray-300 hover:bg-red-500/20 hover:text-red-300"}`}

                        >

                          <ThumbsUp size={16} />

                          <span className="font-medium">{c.likes?.length || 0}</span>

                        </button>



                        <div className="w-[1px] h-6 bg-red-500/30" />



                        <button

                          onClick={() => handleDislikeComment(c._id)}

                          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200

   ${c.dislikes?.includes(user?._id)

                              ? "text-red-400 bg-red-500/20"

                              : "text-gray-300 hover:bg-red-500/20 hover:text-red-300"}`}

                        >

                          <ThumbsDown size={16} />

                          <span className="font-medium">{c.dislikes?.length || 0}</span>

                        </button>



                        <div className="w-[1px] h-6 bg-red-500/30" />



                        <button

                          onClick={() => setShowReplyBox(prev => ({ ...prev, [c._id]: !prev[c._id] }))}

                          className={`px-3 py-1 rounded-lg transition-all duration-200

    ${showReplyBox[c._id]

                              ? "bg-red-500/20 text-red-300"

                              : "text-gray-300 hover:bg-red-500/20 hover:text-red-300"}`}

                        >

                          Reply

                        </button>

                        {c.replies?.length > 0 && (

                          <button

                            onClick={() =>

                              setShowReplies(prev => ({

                                ...prev,

                                [c._id]: !prev[c._id]

                              }))

                            }

                            className={`text-sm mt-2 font-semibold transition

      ${isDarkMode

                                ? "text-red-400 hover:text-red-300"

                                : "text-red-500 hover:text-red-300"}`}

                          >

                            {showReplies[c._id]

                              ? "▲ Hide replies"

                              : `▼ View ${c.replies.length} replies`}

                          </button>

                        )}

                      </div>

                      {/* REPLY BOX */}

                      {showReplyBox[c._id] && (

                        <div className="flex gap-2 mt-2">

                          <input

                            className="flex-1 border-b border-zinc-600 bg-transparent outline-none text-sm"

                            placeholder="Write reply..."

                            value={replyText[c._id] || ""}

                            onChange={(e) =>

                              setReplyText(prev => ({

                                ...prev,

                                [c._id]: e.target.value

                              }))

                            }

                          />



                          <button

                            onClick={() => handleReply(c._id)}

                            className="text-red-400 text-sm"

                          >

                            Post

                          </button>

                        </div>

                      )}



                      {/* REPLIES */}

                      {c.replies?.length > 0 && showReplies[c._id] && (

                        <div className="ml-6 mt-4 border-l border-zinc-700 pl-4 space-y-3 transition-all duration-300">

                          {c.replies.map((r) => (

                            <div key={r._id} className="flex gap-3">

                              <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs">

                                {r.user?.username?.charAt(0).toUpperCase()}

                              </div>



                              <div>

                                <div className="text-xs font-bold">@{r.user?.username}</div>

                                <p className="text-sm">{r.content}</p>



                                <div className="flex gap-3 text-xs opacity-70 mt-1">

                                  <button onClick={() => handleLikeComment(r._id)}>

                                    👍 {r.likes?.length || 0}

                                  </button>



                                  <button onClick={() => handleDislikeComment(r._id)}>

                                    👎 {r.dislikes?.length || 0}

                                  </button>

                                </div>

                              </div>

                            </div>

                          ))}

                        </div>

                      )}



                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

          <div className="lg:col-span-4">

            <h3 className="font-bold mb-4 text-white text-lg">Up Next</h3>

            <div className="flex flex-col gap-4">

              {relatedVideos.length > 0 ? (

                relatedVideos.map((v) => (

                  <div

                    key={v._id || v.id}

                    className="flex gap-3 cursor-pointer group bg-slate-800/30 backdrop-blur-sm p-3 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all duration-200"

                    onClick={() => onSelectVideo(v)}

                  >

                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0 border border-red-500/20">

                      <img loading="lazy" src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />

                    </div>

                    <div className="overflow-hidden flex-1">

                      <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400 transition-colors">{v.title}</h4>

                      <p className="text-xs opacity-70 mt-1 text-gray-300">{v.owner?.username || v.ownerName}</p>

                      <p className="text-[10px] text-red-500/80 font-bold uppercase">{v.category}</p>

                    </div>

                  </div>

                ))

              ) : (

                /* Fallback to general list if no related videos found */

                videoList.filter(v => (v._id || v.id) !== videoId).slice(0, 10).map((v) => (

                  <div key={v.id || v._id} className="flex gap-3 cursor-pointer group bg-slate-800/30 backdrop-blur-sm p-3 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all duration-200" onClick={() => onSelectVideo(v)}>

                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0 border border-red-500/20">

                      <img loading="lazy" src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />

                    </div>

                    <div className="overflow-hidden flex-1">

                      <h4 className="text-sm font-bold line-clamp-2 group-hover:text-red-400 transition-colors duration-200 text-white">{v.title}</h4>

                      <p className="text-xs opacity-70 mt-1 text-gray-300">{v.ownerName || v.owner?.username}</p>

                    </div>

                  </div>

                ))

              )}

            </div>

          </div>



          {showPlaylist && (

            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">

              <div className="bg-slate-800/95 backdrop-blur-xl p-6 rounded-2xl w-96 shadow-2xl border border-red-500/20">

                <h2 className="text-xl font-bold mb-6 text-white">Save to Playlist</h2>



                {/* EXISTING PLAYLISTS */}

                <div className="space-y-3 max-h-48 overflow-y-auto">

                  {playlists.map(p => (

                    <button

                      key={p._id}

                      onClick={async () => {

                        await axios.post(

                          `${import.meta.env.VITE_API_URL}/api/v1/playlists/${p._id}/add`,

                          { videoId },

                          { withCredentials: true }

                        );

                        setShowPlaylist(false);

                      }}

                      className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-red-500/20 rounded-xl text-white transition-all duration-200 border border-red-500/10 hover:border-red-400/30"

                    >

                      {p.name}

                    </button>

                  ))}

                </div>



                {/* CREATE NEW */}

                <div className="mt-6">

                  <input

                    value={newPlaylistName}

                    onChange={(e) => setNewPlaylistName(e.target.value)}

                    placeholder="New playlist name"

                    className="w-full px-4 py-3 bg-slate-700/50 border border-red-500/20 rounded-xl outline-none text-white placeholder-gray-400 focus:border-red-400 transition-colors"

                  />



                  <button

                    // Around line 900 in WatchPage.jsx

                    onClick={async () => {

                      if (!newPlaylistName.trim()) return alert("Please enter a name");



                      try {

                        const res = await axios.post(

                          `${import.meta.env.VITE_API_URL}/api/v1/playlists`,

                          { name: newPlaylistName },

                          { withCredentials: true }

                        );



                        // ✅ Robust check for common response patterns

                        const newPlaylist = res.data.playlist || res.data.data;



                        if (newPlaylist && (newPlaylist._id || newPlaylist.id)) {

                          const pid = newPlaylist._id || newPlaylist.id;



                          // Add current video to the newly created playlist

                          await axios.post(

                            `${import.meta.env.VITE_API_URL}/api/v1/playlists/${pid}/add`,

                            { videoId },

                            { withCredentials: true }

                          );



                          // Update state for UI feedback

                          setPlaylists(prev => [...prev, newPlaylist]);

                          setIsInPlaylist(true);

                          setNewPlaylistName("");

                          setShowPlaylist(false);

                          alert(`Success! Saved to ${newPlaylist.name}`);

                        } else {

                          // This is what triggered your error message

                          console.error("Server Response:", res.data);

                          alert("Playlist created, but server response format was unexpected.");

                        }

                      } catch (err) {

                        console.error("Full Error Object:", err);

                        alert(err.response?.data?.message || "Failed to create playlist");

                      }

                    }}

                    className="mt-4 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-500 py-3 rounded-xl font-bold text-white transition-all duration-200"

                  >

                    Create & Save

                  </button>

                </div>



                <button

                  onClick={() => setShowPlaylist(false)}

                  className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors"

                >

                  Cancel

                </button>

              </div>



            </div>

          )}

        </div>

      </div>

    </div>

  );

}


export default VideoPlayer;
