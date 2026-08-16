import React, { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Maximize,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import Hls from "hls.js";
import axios from "axios";

import { dbPromise } from "../utils/db.js";
import Subscribe from "../Function/Subscribe";
import LikeDislike from "../Function/Like";

function VideoPlayer({
  video,
  onBack,
  isDarkMode,
  user,
  setUser,
  videoList = [],
  playlistVideos = [],
  onSelectVideo,
  onSearchSubmit,
  audioUnlocked,
}) {
  const videoId = video?._id || video?.id;

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [isBuffering, setIsBuffering] = useState(true);
  const [currentVideo, setCurrentVideo] = useState(video || {});

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [showControls, setShowControls] = useState(true);

  const [subCount, setSubCount] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [isWatchLater, setIsWatchLater] = useState(false);

  // Replies
  const [replyText, setReplyText] = useState({});
  const [showReplyBox, setShowReplyBox] = useState({});
  const [showReplies, setShowReplies] = useState({});

  // Playlists
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isInPlaylist, setIsInPlaylist] = useState(false);

  // Download
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Queue
  const [queue, setQueue] = useState([]);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentResolution, setCurrentResolution] = useState("360p");

  // AI Summary
  const [summary, setSummary] = useState("");
  const [summaryStatus, setSummaryStatus] = useState("idle");
  const [showSummary, setShowSummary] = useState(false);

  // Related videos
  const [relatedVideos, setRelatedVideos] = useState([]);

  // --------------------------------------------------
  // REFS
  // --------------------------------------------------

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  const hlsRef = useRef(null);

  const animationRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const lastSavedTimeRef = useRef(0);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const normalizeTags = (tags) => {
    if (!tags) return [];

    if (Array.isArray(tags)) {
      return [
        ...new Set(
          tags
            .flatMap((tag) => String(tag).split(/[#,\s]+/))
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => tag.toLowerCase())
        ),
      ];
    }

    if (typeof tags === "string") {
      return [
        ...new Set(
          tags
            .split(/[#,\s]+/)
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => tag.toLowerCase())
        ),
      ];
    }

    return [];
  };

  const formatTime = (timeInSeconds) => {
    if (!Number.isFinite(timeInSeconds)) {
      return "0:00";
    }

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // --------------------------------------------------
  // RESET WHEN VIDEO CHANGES
  // --------------------------------------------------

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setCurrentVideo(video || {});

    setShowControls(true);
    setShowSettings(false);
    setShowDownloadMenu(false);

    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    setPlaybackSpeed(1);
    setCurrentResolution("360p");

    setIsPlaying(true);
    setIsBuffering(true);

    setShowSummary(false);
    setSummary("");
    setSummaryStatus("idle");

    lastSavedTimeRef.current = 0;
  }, [videoId]);

  // --------------------------------------------------
  // CLEANUP HLS
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // --------------------------------------------------
  // LOAD VIDEO META / COMMENTS / PLAYLIST / WATCH LATER
  // --------------------------------------------------

  useEffect(() => {
    if (!videoId) return;

    const loadData = async () => {
      try {
        const [metaRes, commentsRes, playlistRes, watchLaterRes] =
          await Promise.all([
            axios.get(
              `${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}`,
              {
                withCredentials: true,
              }
            ),

            axios.get(
              `${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`
            ),

            user
              ? axios.get(
                  `${import.meta.env.VITE_API_URL}/api/v1/playlists`,
                  {
                    withCredentials: true,
                  }
                )
              : Promise.resolve({
                  data: {
                    data: [],
                  },
                }),

            user
              ? axios.get(
                  `${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/watch-later`,
                  {
                    withCredentials: true,
                  }
                )
              : Promise.resolve({
                  data: {
                    isWatchLater: false,
                  },
                }),
          ]);

        const fetchedVideo = metaRes.data?.data || {};

        setCurrentVideo((prev) => ({
          ...prev,
          ...fetchedVideo,
        }));

        setSubCount(metaRes.data?.subCount || 0);

        setComments(commentsRes.data?.data || []);

        setIsWatchLater(
          Boolean(watchLaterRes.data?.isWatchLater)
        );

        const allPlaylists = playlistRes.data?.data || [];

        setPlaylists(allPlaylists);

        const existsInPlaylist = allPlaylists.some((playlist) =>
          playlist.videos?.some(
            (v) =>
              String(v?._id || v) === String(videoId)
          )
        );

        setIsInPlaylist(existsInPlaylist);
      } catch (error) {
        console.error("Video data sync failed:", error);
      }
    };

    loadData();
  }, [videoId, user]);

  // --------------------------------------------------
  // CHECK PLAYLIST
  // --------------------------------------------------

  useEffect(() => {
    if (!user || !videoId) return;

    const checkPlaylist = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/playlists`,
          {
            withCredentials: true,
          }
        );

        const exists = (res.data?.data || []).some((playlist) =>
          playlist.videos?.some(
            (v) =>
              String(v?._id || v) === String(videoId)
          )
        );

        setIsInPlaylist(exists);
      } catch (error) {
        console.error("Playlist check failed:", error);
      }
    };

    checkPlaylist();
  }, [videoId, user]);

  // --------------------------------------------------
  // FETCH RELATED VIDEOS
  // --------------------------------------------------

  useEffect(() => {
    if (!videoId) return;

    if (!currentVideo.category && !currentVideo.tags) {
      setRelatedVideos([]);
      return;
    }

    const fetchRelated = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/videos/related/${videoId}`,
          {
            params: {
              category: currentVideo.category,
              tags: normalizeTags(currentVideo.tags).join(","),
            },
          }
        );

        setRelatedVideos(res.data?.data || []);
      } catch (error) {
        console.error("Related videos fetch failed:", error);
        setRelatedVideos([]);
      }
    };

    fetchRelated();
  }, [
    videoId,
    currentVideo.category,
    currentVideo.tags,
  ]);

  // --------------------------------------------------
  // QUEUE
  // --------------------------------------------------

  useEffect(() => {
    if (playlistVideos.length > 0) {
      setQueue(playlistVideos);
    } else if (videoList.length > 0) {
      setQueue(videoList);
    }
  }, [playlistVideos, videoList]);

  // Restore queue from localStorage
  useEffect(() => {
    try {
      const savedQueue = JSON.parse(
        localStorage.getItem("queue")
      );

      if (Array.isArray(savedQueue) && savedQueue.length > 0) {
        setQueue(savedQueue);
      }
    } catch (error) {
      console.error("Failed to restore queue:", error);
    }
  }, []);

  // --------------------------------------------------
  // PLAYLISTS
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const fetchPlaylists = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/playlists`,
          {
            withCredentials: true,
          }
        );

        setPlaylists(res.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch playlists:", error);
      }
    };

    fetchPlaylists();
  }, [user]);

  // --------------------------------------------------
  // WATCH LATER
  // --------------------------------------------------

  const handleToggleWatchLater = async () => {
    if (!user) {
      alert("Please Sign In!");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/videos/v/${videoId}/watch-later`,
        {},
        {
          withCredentials: true,
        }
      );

      setIsWatchLater(Boolean(res.data?.isWatchLater));

      if (setUser && res.data?.success) {
        try {
          const profile = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/v1/users/profile`,
            {
              withCredentials: true,
            }
          );

          setUser(profile.data?.data);
        } catch (profileError) {
          console.error(
            "Failed to refresh profile:",
            profileError
          );
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update Watch Later");
    }
  };

  // --------------------------------------------------
  // COMMENTS
  // --------------------------------------------------

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please Sign In!");
      return;
    }

    if (!commentText.trim()) return;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`,
        {
          content: commentText.trim(),
        },
        {
          withCredentials: true,
        }
      );

      setComments((prev) => [
        res.data.data,
        ...prev,
      ]);

      setCommentText("");
    } catch (error) {
      console.error("Comment failed:", error);
      alert("Comment failed");
    }
  };

  const handleReply = async (commentId) => {
    if (!user) {
      alert("Please Sign In!");
      return;
    }

    const text = replyText[commentId]?.trim();

    if (!text) return;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/comments/${videoId}`,
        {
          content: text,
          parent: commentId,
        },
        {
          withCredentials: true,
        }
      );

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                replies: [
                  ...(comment.replies || []),
                  res.data.data,
                ],
              }
            : comment
        )
      );

      setReplyText((prev) => ({
        ...prev,
        [commentId]: "",
      }));

      setShowReplyBox((prev) => ({
        ...prev,
        [commentId]: false,
      }));
    } catch (error) {
      console.error("Reply failed:", error);
      alert("Reply failed");
    }
  };

  const updateComment = (updated) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment._id === updated._id) {
          return {
            ...updated,
            user: comment.user,
            replies: comment.replies,
          };
        }

        return {
          ...comment,
          replies: comment.replies?.map((reply) =>
            reply._id === updated._id
              ? {
                  ...updated,
                  user: reply.user,
                }
              : reply
          ),
        };
      })
    );
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      alert("Please Sign In!");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/comments/like/${commentId}`,
        {},
        {
          withCredentials: true,
        }
      );

      updateComment(res.data);
    } catch (error) {
      console.error("Like comment failed:", error);
    }
  };

  const handleDislikeComment = async (commentId) => {
    if (!user) {
      alert("Please Sign In!");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/comments/dislike/${commentId}`,
        {},
        {
          withCredentials: true,
        }
      );

      updateComment(res.data);
    } catch (error) {
      console.error("Dislike comment failed:", error);
    }
  };

  // --------------------------------------------------
  // PROGRESS SAVING
  // --------------------------------------------------

  const saveProgress = async (time) => {
    if (!user || !videoId || !Number.isFinite(time) || time < 1) {
      return;
    }

    if (
      Math.abs(time - lastSavedTimeRef.current) < 5
    ) {
      return;
    }

    const videoDuration =
      videoRef.current?.duration || duration;

    let timeToSave = time;

    // If less than 20 seconds are remaining,
    // save 0 so the video starts from beginning next time.
    if (
      videoDuration > 0 &&
      videoDuration - time < 20
    ) {
      timeToSave = 0;
    }

    try {
      lastSavedTimeRef.current = time;

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/v1/users/history/progress`,
        {
          videoId,
          watchedTime: timeToSave,
        },
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error(
        "Progress save failed:",
        error?.message
      );
    }
  };

  useEffect(() => {
    if (!user || !videoId) return;

    const interval = setInterval(() => {
      if (
        videoRef.current &&
        !videoRef.current.paused
      ) {
        saveProgress(
          videoRef.current.currentTime
        );
      }
    }, 10000);

    return () => {
      clearInterval(interval);

      if (videoRef.current) {
        saveProgress(
          videoRef.current.currentTime
        );
      }
    };
  }, [isPlaying, videoId, user]);

  // --------------------------------------------------
  // RESTORE WATCHED POSITION
  // --------------------------------------------------

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const handleAutoSeek = () => {
      const watchedTime =
        Number(currentVideo.watchedTime) || 0;

      if (
        watchedTime > 0 &&
        watchedTime < videoElement.duration
      ) {
        videoElement.currentTime = watchedTime;
      }

      if (Number.isFinite(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };

    videoElement.addEventListener(
      "loadedmetadata",
      handleAutoSeek
    );

    if (videoElement.readyState >= 1) {
      handleAutoSeek();
    }

    return () => {
      videoElement.removeEventListener(
        "loadedmetadata",
        handleAutoSeek
      );
    };
  }, [videoId, currentVideo.watchedTime]);

  // --------------------------------------------------
  // HLS PLAYER / RESOLUTION
  // --------------------------------------------------

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const targetUrl =
      currentResolution === "480p" &&
      currentVideo.videoUrl480
        ? currentVideo.videoUrl480
        : currentVideo.videoUrl;

    if (!targetUrl) {
      console.error(
        "Video URL missing:",
        currentVideo
      );
      return;
    }

    const lastTime =
      videoElement.currentTime || 0;

    const wasPlaying =
      !videoElement.paused;

    setIsBuffering(true);

    // Destroy old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Native HLS
    if (
      videoElement.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      videoElement.src = targetUrl;

      const handleLoadedMetadata = () => {
        if (
          lastTime > 0 &&
          Number.isFinite(videoElement.duration)
        ) {
          videoElement.currentTime = Math.min(
            lastTime,
            videoElement.duration
          );
        }

        setDuration(videoElement.duration || 0);
        setIsBuffering(false);

        if (wasPlaying) {
          videoElement
            .play()
            .catch(() => {});
        }
      };

      videoElement.addEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      return () => {
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
      };
    }

    // HLS.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;

      hls.loadSource(targetUrl);
      hls.attachMedia(videoElement);

      const handleManifestParsed = () => {
        if (
          lastTime > 0 &&
          Number.isFinite(videoElement.duration)
        ) {
          videoElement.currentTime = Math.min(
            lastTime,
            videoElement.duration
          );
        }

        setDuration(
          Number.isFinite(videoElement.duration)
            ? videoElement.duration
            : 0
        );

        setIsBuffering(false);

        if (wasPlaying) {
          videoElement
            .play()
            .catch(() => {});
        }
      };

      const handleFragBuffered = () => {
        setIsBuffering(false);
      };

      const handleError = (_, data) => {
        console.error(
          "HLS error:",
          data
        );

        if (data?.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;

            default:
              hls.destroy();
              break;
          }
        }
      };

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        handleManifestParsed
      );

      hls.on(
        Hls.Events.FRAG_BUFFERED,
        handleFragBuffered
      );

      hls.on(
        Hls.Events.ERROR,
        handleError
      );

      return () => {
        hls.off(
          Hls.Events.MANIFEST_PARSED,
          handleManifestParsed
        );

        hls.off(
          Hls.Events.FRAG_BUFFERED,
          handleFragBuffered
        );

        hls.off(
          Hls.Events.ERROR,
          handleError
        );

        hls.destroy();

        if (hlsRef.current === hls) {
          hlsRef.current = null;
        }
      };
    }

    console.error(
      "HLS is not supported in this browser."
    );
  }, [
    currentResolution,
    videoId,
    currentVideo.videoUrl,
    currentVideo.videoUrl480,
  ]);

  // --------------------------------------------------
  // PLAY / PAUSE EVENT LISTENERS
  // --------------------------------------------------

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };

    videoElement.addEventListener(
      "play",
      handlePlay
    );

    videoElement.addEventListener(
      "pause",
      handlePause
    );

    videoElement.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    return () => {
      videoElement.removeEventListener(
        "play",
        handlePlay
      );

      videoElement.removeEventListener(
        "pause",
        handlePause
      );

      videoElement.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );
    };
  }, []);

  // --------------------------------------------------
  // AUTO PLAY WHEN AUDIO UNLOCKS / VIDEO CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current
      .play()
      .catch(() => {});
  }, [currentVideo, audioUnlocked]);

  // --------------------------------------------------
  // TIME UPDATE
  // --------------------------------------------------

  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const current =
      videoElement.currentTime || 0;

    const total =
      videoElement.duration || 0;

    setCurrentTime(current);

    if (total > 0) {
      setDuration(total);
      setProgress(
        (current / total) * 100
      );
    }

    animationRef.current =
      requestAnimationFrame(
        handleTimeUpdate
      );
  };

  useEffect(() => {
    animationRef.current =
      requestAnimationFrame(
        handleTimeUpdate
      );

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, []);

  // --------------------------------------------------
  // PLAYER CONTROLS
  // --------------------------------------------------

  const clearControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(
        controlsTimeoutRef.current
      );

      controlsTimeoutRef.current = null;
    }
  };

  const showPlayerControls = () => {
    clearControlsTimer();

    setShowControls(true);

    if (!isPlaying) return;

    if (
      showSettings ||
      showDownloadMenu
    ) {
      return;
    }

    controlsTimeoutRef.current =
      setTimeout(() => {
        setShowControls(false);
      }, 3000);
  };

  const hidePlayerControls = () => {
    clearControlsTimer();
    setShowControls(false);
  };

  const toggleControls = (e) => {
    e?.stopPropagation();

    if (showControls) {
      hidePlayerControls();
    } else {
      showPlayerControls();
    }
  };

  const handleVideoTap = (e) => {
    e.stopPropagation();

    if (e.target !== videoRef.current) {
      return;
    }

    toggleControls(e);
  };

  const togglePlay = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    if (videoElement.paused) {
      videoElement
        .play()
        .catch(() => {});

      setIsPlaying(true);
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);

    if (videoRef.current) {
      videoRef.current.playbackRate =
        speed;
    }

    setShowSettings(false);
    showPlayerControls();
  };

  const skip = (amount) => {
    if (!videoRef.current) return;

    videoRef.current.currentTime =
      Math.max(
        0,
        Math.min(
          videoRef.current.duration || Infinity,
          videoRef.current.currentTime +
            amount
        )
      );
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current) return;

    const rect =
      e.currentTarget.getBoundingClientRect();

    const percentage =
      (e.clientX - rect.left) /
      rect.width;

    const newTime =
      percentage *
      videoRef.current.duration;

    if (Number.isFinite(newTime)) {
      videoRef.current.currentTime =
        newTime;
    }
  };

  // --------------------------------------------------
  // FULLSCREEN
  // --------------------------------------------------

  const toggleFullscreen = async (e) => {
    e.stopPropagation();

    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(
        "Fullscreen error:",
        error
      );
    }

    showPlayerControls();
  };

  // --------------------------------------------------
  // CLICK OUTSIDE DOWNLOAD MENU
  // --------------------------------------------------

  useEffect(() => {
    const handleClick = () => {
      setShowDownloadMenu(false);
    };

    document.addEventListener(
      "click",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick
      );
    };
  }, []);

  // --------------------------------------------------
  // TAG SEARCH
  // --------------------------------------------------

  const handleTagClick = (tag) => {
    if (onSearchSubmit) {
      onSearchSubmit(
        tag.trim(),
        true
      );
    }
  };

  // --------------------------------------------------
  // AI SUMMARY
  // --------------------------------------------------

  const fetchSummary = async () => {
    if (!videoId) return;

    try {
      setSummaryStatus("loading");

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/ai/summary/${videoId}`
      );

      if (
        res.data?.status === "processing"
      ) {
        setSummaryStatus("processing");
        return;
      }

      if (
        res.data?.status === "failed"
      ) {
        setSummaryStatus("failed");
        return;
      }

      setSummary(
        res.data?.summary || ""
      );

      setSummaryStatus("ready");
    } catch (error) {
      console.error(
        "Summary error:",
        error
      );

      setSummaryStatus("failed");
    }
  };

  // --------------------------------------------------
  // OFFLINE DOWNLOAD
  // --------------------------------------------------

  const handleOfflineSave = async (
    m3u8Url,
    id
  ) => {
    if (!m3u8Url) {
      alert("Video URL not available");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const db = await dbPromise;

      // Download m3u8
      const playlistResponse =
        await fetch(m3u8Url);

      if (!playlistResponse.ok) {
        throw new Error(
          `Playlist request failed: ${playlistResponse.status}`
        );
      }

      const playlistText =
        await playlistResponse.text();

      // IMPORTANT:
      // Save the m3u8 playlist because
      // loadOfflineVideo() needs it later.
      await db.put(
        "videos",
        playlistText,
        `${id}-m3u8`
      );

      // Resolve relative segment URLs correctly.
      const playlistUrl =
        new URL(m3u8Url);

      const lines =
        playlistText.split("\n");

      const segments = lines
        .map((line) => line.trim())
        .filter(
          (line) =>
            line &&
            !line.startsWith("#")
        )
        .map((line) => {
          const fullUrl = new URL(
            line,
            playlistUrl
          ).toString();

          return {
            full: fullUrl,
            key: fullUrl.split("?")[0],
          };
        });

      if (segments.length === 0) {
        throw new Error(
          "No video segments found in m3u8"
        );
      }

      // Save metadata
      await db.put(
        "videos",
        {
          id,
          title:
            currentVideo.title ||
            "Offline Video",
          thumbnail:
            currentVideo.thumbnail || "",
          videoUrl: m3u8Url,
          duration:
            currentVideo.duration ||
            formatTime(duration),
          channel:
            currentVideo.owner
              ?.username ||
            currentVideo.ownerName ||
            "Unknown",
          size: `${(
            segments.length * 0.5
          ).toFixed(1)} MB`,
        },
        `${id}-meta`
      );

      // Download segments
      for (
        let i = 0;
        i < segments.length;
        i++
      ) {
        const segmentResponse =
          await fetch(
            segments[i].full
          );

        if (!segmentResponse.ok) {
          throw new Error(
            `Segment download failed: ${i + 1}`
          );
        }

        const blob =
          await segmentResponse.blob();

        await db.put(
          "videos",
          blob,
          segments[i].key
        );

        const percent = Math.floor(
          ((i + 1) /
            segments.length) *
            100
        );

        setDownloadProgress(
          percent
        );
      }

      setIsDownloaded(true);

      alert(
        "Download Complete ✅"
      );
    } catch (error) {
      console.error(
        "Offline download failed:",
        error
      );

      alert(
        "Download failed ❌"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = async (url) => {
    if (!url) {
      alert(
        "This resolution is not available"
      );
      return;
    }

    await handleOfflineSave(
      url,
      videoId
    );

    setShowDownloadMenu(false);
  };

  // --------------------------------------------------
  // CHECK OFFLINE DOWNLOAD
  // --------------------------------------------------

  useEffect(() => {
    if (!videoId) return;

    const checkDownload = async () => {
      try {
        const db = await dbPromise;

        const meta =
          await db.get(
            "videos",
            `${videoId}-meta`
          );

        setIsDownloaded(
          Boolean(meta)
        );
      } catch (error) {
        console.error(
          "Offline check failed:",
          error
        );
      }
    };

    checkDownload();
  }, [videoId]);

  // --------------------------------------------------
  // LOAD OFFLINE VIDEO
  // --------------------------------------------------

  const loadOfflineVideo = async () => {
    try {
      const db = await dbPromise;

      const videoElement =
        videoRef.current;

      if (!videoElement || !videoId) {
        return false;
      }

      const playlist =
        await db.get(
          "videos",
          `${videoId}-m3u8`
        );

      if (!playlist) {
        return false;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: true,

        fetchSetup: async (
          context,
          initParams
        ) => {
          const cleanUrl =
            context.url.split("?")[0];

          const cached =
            await db.get(
              "videos",
              cleanUrl
            );

          if (!cached) {
            throw new Error(
              "Segment not found offline"
            );
          }

          return new Response(
            cached,
            {
              status: 200,
              headers: {
                "Content-Type":
                  "video/mp2t",
              },
            }
          );
        },
      });

      const blob = new Blob(
        [playlist],
        {
          type: "application/vnd.apple.mpegurl",
        }
      );

      const localUrl =
        URL.createObjectURL(blob);

      hls.loadSource(localUrl);
      hls.attachMedia(videoElement);

      hlsRef.current = hls;

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          videoElement
            .play()
            .catch(() => {});
        }
      );

      return true;
    } catch (error) {
      console.error(
        "Offline load failed:",
        error
      );

      return false;
    }
  };

  // --------------------------------------------------
  // SELECT VIDEO / QUEUE
  // --------------------------------------------------

  const handleSelectVideo = (
    selectedVideo,
    selectedQueue
  ) => {
    const activeQueue =
      selectedQueue?.length
        ? selectedQueue
        : queue;

    try {
      localStorage.setItem(
        "queue",
        JSON.stringify(
          activeQueue
        )
      );

      const index =
        activeQueue.findIndex(
          (item) =>
            String(
              item._id || item.id
            ) ===
            String(
              selectedVideo._id ||
                selectedVideo.id
            )
        );

      localStorage.setItem(
        "currentIndex",
        String(index)
      );
    } catch (error) {
      console.error(
        "Failed to save queue:",
        error
      );
    }

    onSelectVideo(selectedVideo);
  };

  // --------------------------------------------------
  // VIDEO ENDED
  // --------------------------------------------------

  const handleEnded = () => {
    if (!queue.length) return;

    const currentIndex =
      queue.findIndex(
        (item) =>
          String(
            item._id || item.id
          ) === String(videoId)
      );

    if (currentIndex === -1) {
      return;
    }

    const next =
      queue[currentIndex + 1];

    if (next) {
      handleSelectVideo(
        next,
        queue
      );
    }
  };

  // --------------------------------------------------
  // PLAYLIST CREATE + SAVE
  // --------------------------------------------------

  const createPlaylistAndSave =
    async () => {
      if (!user) {
        alert("Please Sign In!");
        return;
      }

      if (!newPlaylistName.trim()) {
        alert(
          "Please enter a playlist name"
        );
        return;
      }

      try {
        const res =
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/v1/playlists`,
            {
              name:
                newPlaylistName.trim(),
            },
            {
              withCredentials: true,
            }
          );

        const newPlaylist =
          res.data?.playlist ||
          res.data?.data;

        if (
          !newPlaylist ||
          !(
            newPlaylist._id ||
            newPlaylist.id
          )
        ) {
          console.error(
            "Unexpected playlist response:",
            res.data
          );

          alert(
            "Playlist created, but server response format was unexpected."
          );

          return;
        }

        const playlistId =
          newPlaylist._id ||
          newPlaylist.id;

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/v1/playlists/${playlistId}/add`,
          {
            videoId,
          },
          {
            withCredentials: true,
          }
        );

        setPlaylists((prev) => [
          ...prev,
          newPlaylist,
        ]);

        setIsInPlaylist(true);

        setNewPlaylistName("");

        setShowPlaylist(false);

        alert(
          `Success! Saved to ${newPlaylist.name}`
        );
      } catch (error) {
        console.error(
          "Create playlist error:",
          error
        );

        alert(
          error.response?.data
            ?.message ||
            "Failed to create playlist"
        );
      }
    };

  const addToPlaylist = async (
    playlistId
  ) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/playlists/${playlistId}/add`,
        {
          videoId,
        },
        {
          withCredentials: true,
        }
      );

      setIsInPlaylist(true);
      setShowPlaylist(false);
    } catch (error) {
      console.error(
        "Add to playlist failed:",
        error
      );

      alert(
        error.response?.data
          ?.message ||
          "Failed to add video to playlist"
      );
    }
  };

  // --------------------------------------------------
  // TAGS
  // --------------------------------------------------

  const tags = normalizeTags(
    currentVideo.tags
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div
      key={videoId}
      className="min-h-screen bg-[#0f0f0f] text-white"
    >
      <div className="max-w-[1700px] mx-auto p-2 md:p-6">

        {/* BACK BUTTON */}
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* =====================================================
              LEFT SIDE
          ====================================================== */}

          <div className="lg:col-span-8">

            {/* VIDEO PLAYER */}

            <div
              ref={playerContainerRef}
              onPointerMove={showPlayerControls}
              className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-red-500/20 group select-none touch-manipulation"
            >

              {/* BUFFERING */}

              {isBuffering && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin" />
                </div>
              )}

              {/* VIDEO */}

              <video
                ref={videoRef}
                onEnded={handleEnded}
                poster={
                  currentVideo.thumbnail ||
                  video?.thumbnail
                }
                playsInline
                autoPlay
                muted={!audioUnlocked}
                onClick={handleVideoTap}
                className="w-full h-full object-contain cursor-pointer bg-black"
              />

              {/* PLAYER CONTROLS */}

              {showControls && (
                <div
                  className="absolute inset-0 z-30 flex flex-col justify-between pointer-events-none"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >

                  {/* TOP */}

                  <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">

                    <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-xs font-bold border border-red-400/30">
                      <Monitor size={14} />

                      {currentResolution}

                      <span>•</span>

                      {playbackSpeed === 1
                        ? "Normal"
                        : `${playbackSpeed}x`}
                    </div>

                    <div className="flex gap-4">

                      {/* SETTINGS */}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          setShowSettings(
                            (prev) => !prev
                          );

                          clearControlsTimer();
                          setShowControls(
                            true
                          );
                        }}
                        className="text-white hover:text-red-400 transition-colors"
                      >
                        <Settings
                          size={22}
                        />
                      </button>

                      {/* FULLSCREEN */}

                      <button
                        onClick={
                          toggleFullscreen
                        }
                        className="text-white hover:text-red-400 transition-colors"
                      >
                        <Maximize
                          size={22}
                        />
                      </button>

                    </div>
                  </div>

                  {/* CENTER */}

                  <div className="flex items-center justify-center gap-10 pointer-events-auto">

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        skip(-10);
                        showPlayerControls();
                      }}
                      className="text-white hover:text-red-400 transition-colors"
                    >
                      <RotateCcw
                        size={40}
                      />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                        showPlayerControls();
                      }}
                      className="p-5 bg-red-600/80 hover:bg-red-500/90 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:scale-110 shadow-xl"
                    >
                      {isPlaying ? (
                        <Pause
                          size={50}
                        />
                      ) : (
                        <Play
                          size={50}
                          fill="white"
                        />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        skip(10);
                        showPlayerControls();
                      }}
                      className="text-white hover:text-red-400 transition-colors"
                    >
                      <RotateCw
                        size={40}
                      />
                    </button>

                  </div>

                  {/* BOTTOM */}

                  <div className="p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">

                    <div className="flex items-center gap-2 text-xs font-bold mb-2">
                      <span>
                        {formatTime(
                          currentTime
                        )}
                      </span>

                      <span>/</span>

                      <span className="opacity-70">
                        {formatTime(
                          duration
                        )}
                      </span>
                    </div>

                    <div
                      className="h-1.5 bg-white/30 w-full rounded-full overflow-hidden cursor-pointer"
                      onClick={
                        handleProgressClick
                      }
                    >
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              progress
                            )
                          )}%`,
                        }}
                      />
                    </div>

                  </div>

                </div>
              )}

              {/* SETTINGS MENU */}

              {showSettings && (
                <div
                  className="absolute right-4 top-14 w-52 bg-slate-800/95 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-red-500/20 z-50"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >

                  <div className="mb-3">

                    <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Quality
                    </p>

                    <button
                      onClick={() => {
                        setCurrentResolution(
                          "360p"
                        );
                        setShowSettings(
                          false
                        );
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                        currentResolution ===
                        "360p"
                          ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                          : "hover:bg-red-500/20 text-zinc-300"
                      }`}
                    >
                      360p

                      {currentResolution ===
                        "360p" && (
                        <Check size={14} />
                      )}
                    </button>

                    <button
                      disabled={
                        !currentVideo.videoUrl480
                      }
                      onClick={() => {
                        setCurrentResolution(
                          "480p"
                        );
                        setShowSettings(
                          false
                        );
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                        !currentVideo.videoUrl480
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-red-500/20 text-zinc-300"
                      } ${
                        currentResolution ===
                        "480p"
                          ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                          : ""
                      }`}
                    >
                      480p

                      {!currentVideo.videoUrl480
                        ? " (N/A)"
                        : currentResolution ===
                          "480p"
                        ? (
                          <Check
                            size={14}
                          />
                        )
                        : null}
                    </button>

                  </div>

                  <div>

                    <p className="px-3 py-1 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Speed
                    </p>

                    {[0.5, 1, 1.5, 2].map(
                      (speed) => (
                        <button
                          key={speed}
                          onClick={() =>
                            changeSpeed(
                              speed
                            )
                          }
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                            playbackSpeed ===
                            speed
                              ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                              : "hover:bg-red-500/20 text-zinc-300"
                          }`}
                        >
                          {speed === 1
                            ? "Normal"
                            : `${speed}x`}

                          {playbackSpeed ===
                            speed && (
                            <Check
                              size={14}
                            />
                          )}
                        </button>
                      )
                    )}

                  </div>
                </div>
              )}

            </div>

            {/* =====================================================
                VIDEO INFORMATION
            ====================================================== */}

            <div className="mt-4">

              <h1 className="text-2xl font-bold text-white mb-2">
                {currentVideo.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-3">

                {/* CHANNEL */}

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 overflow-hidden flex items-center justify-center border-2 border-red-400/30 shrink-0 font-bold text-white">

                    {currentVideo.owner
                      ?.avatar ? (
                      <img
                        src={
                          currentVideo
                            .owner.avatar
                        }
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    ) : (
                      (
                        currentVideo
                          .owner
                          ?.username ||
                        currentVideo.ownerName ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()
                    )}

                  </div>

                  <div>

                    <div className="font-bold text-lg flex items-center gap-2 text-white">

                      {currentVideo.owner
                        ?.username ||
                        currentVideo.ownerName}

                      <CheckCircle2
                        size={16}
                        className="text-red-400"
                      />

                    </div>

                    <span className="text-sm opacity-70 text-gray-300">
                      {subCount} subscribers
                    </span>

                  </div>

                  <Subscribe
                    channelId={
                      currentVideo.owner
                        ?._id ||
                      currentVideo.owner ||
                      video?.owner
                    }
                    currentUser={user}
                  />

                </div>

                {/* ACTIONS */}

                <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-red-500/20">

                  <LikeDislike
                    key={`like-${videoId}`}
                    videoId={videoId}
                    user={user}
                  />

                  <div className="w-px h-6 bg-white/20 mx-1" />

                  {/* WATCH LATER */}

                  <button
                    onClick={
                      handleToggleWatchLater
                    }
                    className={`px-4 py-2 hover:bg-red-500/20 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                      isWatchLater
                        ? "text-red-400"
                        : "text-white"
                    }`}
                  >
                    <Clock
                      size={18}
                      fill={
                        isWatchLater
                          ? "currentColor"
                          : "none"
                      }
                    />

                    {isWatchLater
                      ? "Saved"
                      : "Later"}
                  </button>

                  {/* DOWNLOAD */}

                  <div className="relative">

                    <button
                      disabled={
                        isDownloaded ||
                        isDownloading
                      }
                      onClick={(e) => {
                        e.stopPropagation();

                        if (
                          !isDownloaded &&
                          !isDownloading
                        ) {
                          setShowDownloadMenu(
                            (prev) =>
                              !prev
                          );
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 ${
                        isDownloaded
                          ? "bg-green-600"
                          : "bg-white/10 hover:bg-white/20"
                      } ${
                        isDownloading
                          ? "opacity-70 cursor-wait"
                          : ""
                      }`}
                    >
                      {isDownloaded ? (
                        <Check
                          size={16}
                        />
                      ) : (
                        <Download
                          size={16}
                        />
                      )}

                      {isDownloaded
                        ? "Downloaded"
                        : isDownloading
                        ? `${downloadProgress}%`
                        : "Download"}
                    </button>

                    {showDownloadMenu && (
                      <div
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-sm rounded-xl w-32 shadow-xl border border-red-500/20 z-50 overflow-hidden"
                      >

                        <button
                          onClick={() =>
                            handleDownload(
                              currentVideo.videoUrl
                            )
                          }
                          className="block w-full text-left px-3 py-2 hover:bg-red-500/20 text-white transition-colors"
                        >
                          360p
                        </button>

                        <button
                          disabled={
                            !currentVideo.videoUrl480
                          }
                          onClick={() =>
                            handleDownload(
                              currentVideo.videoUrl480
                            )
                          }
                          className={`block w-full text-left px-3 py-2 transition-colors ${
                            currentVideo.videoUrl480
                              ? "hover:bg-red-500/20 text-white"
                              : "opacity-30 cursor-not-allowed"
                          }`}
                        >
                          480p
                        </button>

                      </div>
                    )}

                  </div>

                  {/* PLAYLIST */}

                  <button
                    onClick={() => {
                      if (!user) {
                        alert(
                          "Please Sign In!"
                        );
                        return;
                      }

                      setShowPlaylist(true);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isInPlaylist
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                        : "hover:bg-red-500/20 text-white"
                    }`}
                  >
                    {isInPlaylist
                      ? "Saved ✓"
                      : "+ Playlist"}
                  </button>

                  {/* AI SUMMARY */}

                  <button
                    onClick={() => {
                      if (showSummary) {
                        setShowSummary(
                          false
                        );
                      } else {
                        fetchSummary();
                        setShowSummary(
                          true
                        );
                      }
                    }}
                    disabled={
                      summaryStatus ===
                      "loading"
                    }
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white"
                  >
                    {showSummary
                      ? "Hide Summary"
                      : "AI Summary"}
                  </button>

                </div>
              </div>

              {/* DESCRIPTION */}

              <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">

                <p className="text-gray-200 text-sm whitespace-pre-wrap">
                  {currentVideo.description ||
                    video?.description}
                </p>

                {/* TAGS */}

                <div className="flex flex-wrap gap-2 mt-4">

                  {tags.length > 0 ? (
                    tags.map(
                      (tag, index) => (
                        <button
                          key={`${tag}-${index}`}
                          onClick={() =>
                            handleTagClick(
                              tag
                            )
                          }
                          className="text-red-400 text-xs font-bold px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          #{tag}
                        </button>
                      )
                    )
                  ) : (
                    <span className="text-gray-500 text-xs">
                      No tags available
                    </span>
                  )}

                </div>
              </div>

              {/* AI SUMMARY */}

              {showSummary && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-blue-500/20">

                  <div className="flex justify-between items-center mb-2">

                    <h3 className="font-bold text-blue-400">
                      AI Summary
                    </h3>

                    <button
                      onClick={() =>
                        setShowSummary(
                          false
                        )
                      }
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Back
                    </button>

                  </div>

                  {summaryStatus ===
                    "loading" && (
                    <p className="text-gray-300">
                      Generating
                      summary...
                    </p>
                  )}

                  {summaryStatus ===
                    "processing" && (
                    <p className="text-yellow-400">
                      Summary is being
                      generated ⏳
                    </p>
                  )}

                  {summaryStatus ===
                    "failed" && (
                    <p className="text-red-400">
                      Failed to generate
                      summary ❌
                    </p>
                  )}

                  {summaryStatus ===
                    "ready" && (
                    <p className="text-gray-200 whitespace-pre-wrap">
                      {summary}
                    </p>
                  )}

                </div>
              )}

            </div>

            {/* =====================================================
                COMMENTS
            ====================================================== */}

            <div className="mt-8 pb-10">

              <h2 className="text-2xl font-bold mb-6 text-white">
                {comments.length} Comments
              </h2>

              {/* ADD COMMENT */}

              <form
                onSubmit={
                  handleAddComment
                }
                className="flex gap-4 mb-8"
              >

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center font-bold shrink-0 text-white border-2 border-red-400/30">
                  {user?.username
                    ?.charAt(0)
                    .toUpperCase() ||
                    "?"}
                </div>

                <div className="flex-1 flex flex-col gap-2">

                  <input
                    className="bg-slate-800/50 border border-red-500/20 rounded-xl outline-none py-3 px-4 w-full text-white placeholder-gray-400 focus:border-red-400 transition-colors"
                    placeholder="Add a comment..."
                    value={
                      commentText
                    }
                    onChange={(e) =>
                      setCommentText(
                        e.target.value
                      )
                    }
                  />

                  {commentText.trim() && (
                    <button
                      type="submit"
                      className="self-end mt-2 px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold hover:from-red-500 hover:to-red-500 transition-all"
                    >
                      Comment
                    </button>
                  )}

                </div>

              </form>

              {/* COMMENTS LIST */}

              <div className="space-y-6">

                {comments.map(
                  (comment) => (
                    <div
                      key={
                        comment._id
                      }
                      className="flex gap-4 bg-slate-800/30 p-4 rounded-2xl border border-red-500/10"
                    >

                      {/* AVATAR */}

                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-sm shrink-0 font-bold text-white border-2 border-red-400/30">
                        {comment.user?.username
                          ?.charAt(0)
                          .toUpperCase() ||
                          "?"}
                      </div>

                      <div className="flex-1">

                        <div className="text-base font-bold text-white mb-1">
                          @
                          {
                            comment
                              .user
                              ?.username
                          }
                        </div>

                        <p className="text-gray-300 leading-relaxed mb-3">
                          {
                            comment.content
                          }
                        </p>

                        {/* COMMENT ACTIONS */}

                        <div className="flex flex-wrap items-center gap-2 bg-slate-700/50 rounded-xl px-3 py-2 w-fit border border-red-500/20">

                          <button
                            onClick={() =>
                              handleLikeComment(
                                comment._id
                              )
                            }
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                              comment.likes?.includes(
                                user?._id
                              )
                                ? "text-red-400 bg-red-500/20"
                                : "text-gray-300 hover:bg-red-500/20 hover:text-red-300"
                            }`}
                          >
                            <ThumbsUp
                              size={16}
                            />

                            <span>
                              {comment
                                .likes
                                ?.length ||
                                0}
                            </span>
                          </button>

                          <div className="w-px h-6 bg-red-500/30" />

                          <button
                            onClick={() =>
                              handleDislikeComment(
                                comment._id
                              )
                            }
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                              comment.dislikes?.includes(
                                user?._id
                              )
                                ? "text-red-400 bg-red-500/20"
                                : "text-gray-300 hover:bg-red-500/20 hover:text-red-300"
                            }`}
                          >
                            <ThumbsDown
                              size={16}
                            />

                            <span>
                              {comment
                                .dislikes
                                ?.length ||
                                0}
                            </span>
                          </button>

                          <div className="w-px h-6 bg-red-500/30" />

                          <button
                            onClick={() =>
                              setShowReplyBox(
                                (prev) => ({
                                  ...prev,
                                  [comment._id]:
                                    !prev[
                                      comment
                                        ._id
                                    ],
                                })
                              )
                            }
                            className="px-3 py-1 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition-all"
                          >
                            Reply
                          </button>

                          {comment.replies
                            ?.length >
                            0 && (
                            <button
                              onClick={() =>
                                setShowReplies(
                                  (prev) => ({
                                    ...prev,
                                    [comment._id]:
                                      !prev[
                                        comment
                                          ._id
                                      ],
                                  })
                                )
                              }
                              className="text-sm font-semibold text-red-400 hover:text-red-300"
                            >
                              {showReplies[
                                comment._id
                              ]
                                ? "▲ Hide replies"
                                : `▼ View ${comment.replies.length} replies`}
                            </button>
                          )}

                        </div>

                        {/* REPLY INPUT */}

                        {showReplyBox[
                          comment._id
                        ] && (
                          <div className="flex gap-2 mt-3">

                            <input
                              className="flex-1 border-b border-zinc-600 bg-transparent outline-none text-sm text-white"
                              placeholder="Write reply..."
                              value={
                                replyText[
                                  comment
                                    ._id
                                ] || ""
                              }
                              onChange={(e) =>
                                setReplyText(
                                  (
                                    prev
                                  ) => ({
                                    ...prev,
                                    [comment._id]:
                                      e
                                        .target
                                        .value,
                                  })
                                )
                              }
                            />

                            <button
                              onClick={() =>
                                handleReply(
                                  comment._id
                                )
                              }
                              className="text-red-400 text-sm"
                            >
                              Post
                            </button>

                          </div>
                        )}

                        {/* REPLIES */}

                        {comment.replies
                          ?.length >
                          0 &&
                          showReplies[
                            comment._id
                          ] && (
                            <div className="ml-6 mt-4 border-l border-zinc-700 pl-4 space-y-3">

                              {comment.replies.map(
                                (reply) => (
                                  <div
                                    key={
                                      reply._id
                                    }
                                    className="flex gap-3"
                                  >

                                    <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs shrink-0">
                                      {reply
                                        .user
                                        ?.username
                                        ?.charAt(
                                          0
                                        )
                                        .toUpperCase() ||
                                        "?"}
                                    </div>

                                    <div>

                                      <div className="text-xs font-bold">
                                        @
                                        {
                                          reply
                                            .user
                                            ?.username
                                        }
                                      </div>

                                      <p className="text-sm text-gray-300">
                                        {
                                          reply.content
                                        }
                                      </p>

                                      <div className="flex gap-3 text-xs opacity-70 mt-1">

                                        <button
                                          onClick={() =>
                                            handleLikeComment(
                                              reply._id
                                            )
                                          }
                                        >
                                          👍{" "}
                                          {
                                            reply
                                              .likes
                                              ?.length ||
                                            0
                                          }
                                        </button>

                                        <button
                                          onClick={() =>
                                            handleDislikeComment(
                                              reply._id
                                            )
                                          }
                                        >
                                          👎{" "}
                                          {
                                            reply
                                              .dislikes
                                              ?.length ||
                                            0
                                          }
                                        </button>

                                      </div>

                                    </div>
                                  </div>
                                )
                              )}

                            </div>
                          )}

                      </div>
                    </div>
                  )
                )}

              </div>
            </div>

          </div>

          {/* =====================================================
              RIGHT SIDE - UP NEXT
          ====================================================== */}

          <div className="lg:col-span-4">

            <h3 className="font-bold mb-4 text-white text-lg">
              Up Next
            </h3>

            <div className="flex flex-col gap-4">

              {relatedVideos.length >
              0 ? (
                relatedVideos.map(
                  (relatedVideo) => (
                    <div
                      key={
                        relatedVideo._id ||
                        relatedVideo.id
                      }
                      className="flex gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all"
                      onClick={() =>
                        handleSelectVideo(
                          relatedVideo,
                          relatedVideos
                        )
                      }
                    >

                      <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0 border border-red-500/20">

                        <img
                          loading="lazy"
                          src={
                            relatedVideo.thumbnail
                          }
                          alt={
                            relatedVideo.title
                          }
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />

                      </div>

                      <div className="overflow-hidden flex-1">

                        <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400 transition-colors">
                          {
                            relatedVideo.title
                          }
                        </h4>

                        <p className="text-xs opacity-70 mt-1 text-gray-300">
                          {relatedVideo
                            .owner
                            ?.username ||
                            relatedVideo.ownerName}
                        </p>

                        <p className="text-[10px] text-red-500/80 font-bold uppercase">
                          {
                            relatedVideo.category
                          }
                        </p>

                      </div>

                    </div>
                  )
                )
              ) : (
                videoList
                  .filter(
                    (item) =>
                      String(
                        item._id ||
                          item.id
                      ) !==
                      String(videoId)
                  )
                  .slice(0, 10)
                  .map((item) => (
                    <div
                      key={
                        item._id ||
                        item.id
                      }
                      className="flex gap-3 cursor-pointer group bg-slate-800/30 p-3 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all"
                      onClick={() =>
                        handleSelectVideo(
                          item,
                          videoList
                        )
                      }
                    >

                      <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-slate-700 shrink-0 border border-red-500/20">

                        <img
                          loading="lazy"
                          src={
                            item.thumbnail
                          }
                          alt={
                            item.title
                          }
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />

                      </div>

                      <div className="overflow-hidden flex-1">

                        <h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-red-400 transition-colors">
                          {
                            item.title
                          }
                        </h4>

                        <p className="text-xs opacity-70 mt-1 text-gray-300">
                          {item
                            .owner
                            ?.username ||
                            item.ownerName}
                        </p>

                      </div>

                    </div>
                  ))
              )}

            </div>
          </div>

        </div>

        {/* =====================================================
            PLAYLIST MODAL
        ====================================================== */}

        {showPlaylist && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            <div className="bg-slate-800/95 backdrop-blur-xl p-6 rounded-2xl w-96 max-w-full shadow-2xl border border-red-500/20">

              <h2 className="text-xl font-bold mb-6 text-white">
                Save to Playlist
              </h2>

              {/* EXISTING PLAYLISTS */}

              <div className="space-y-3 max-h-48 overflow-y-auto">

                {playlists.length ===
                0 ? (
                  <p className="text-gray-400 text-sm">
                    No playlists yet.
                  </p>
                ) : (
                  playlists.map(
                    (playlist) => (
                      <button
                        key={
                          playlist._id
                        }
                        onClick={() =>
                          addToPlaylist(
                            playlist._id
                          )
                        }
                        className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-red-500/20 rounded-xl text-white transition-all border border-red-500/10 hover:border-red-400/30"
                      >
                        {
                          playlist.name
                        }
                      </button>
                    )
                  )
                )}

              </div>

              {/* CREATE NEW */}

              <div className="mt-6">

                <input
                  value={
                    newPlaylistName
                  }
                  onChange={(e) =>
                    setNewPlaylistName(
                      e.target.value
                    )
                  }
                  placeholder="New playlist name"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-red-500/20 rounded-xl outline-none text-white placeholder-gray-400 focus:border-red-400"
                />

                <button
                  onClick={
                    createPlaylistAndSave
                  }
                  className="mt-4 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-500 py-3 rounded-xl font-bold text-white transition-all"
                >
                  Create & Save
                </button>

              </div>

              <button
                onClick={() => {
                  setShowPlaylist(
                    false
                  );
                  setNewPlaylistName(
                    ""
                  );
                }}
                className="mt-4 text-sm text-red-400 hover:text-red-300"
              >
                Cancel
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default VideoPlayer;