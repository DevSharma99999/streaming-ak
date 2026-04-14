import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Trash2,
  Video as VideoIcon,
  MoreVertical,
  Edit3,
  X,
  RefreshCcw
} from "lucide-react";

const Profile = ({ isDarkMode, onBack, user, profileData: profileDataProp, onSelectVideo }) => {

  const [profileData, setProfileData] = useState(profileDataProp || null);
  const [loading, setLoading] = useState(!profileDataProp);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);

  const fetchProfile = async () => {
    try {
      if (!profileDataProp) setLoading(true);
      const res = await axios.get("http://localhost:5000/api/v1/users/profile", { withCredentials: true });
      if (res.data.success) setProfileData(res.data.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileDataProp) {
      setProfileData(profileDataProp);
      setLoading(false);
    } else {
      fetchProfile();
    }
  }, [profileDataProp]);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white p-20 text-center font-bold animate-pulse">Loading...</div>;

  const displayUser = profileData || user;
  if (!displayUser) return <div className="min-h-screen bg-[#0f0f0f] text-white p-20 text-center">Please login</div>;

  const theme = isDarkMode ? "bg-[#0f0f0f] text-white" : "bg-white text-black";

  // DELETE
  const handleDelete = async (videoId) => {
    if (!window.confirm("Delete this video?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/videos/delete/${videoId}`, { withCredentials: true });
      setProfileData({
        ...profileData,
        videos: profileData.videos.filter(v => v._id !== videoId)
      });
    } catch {
      alert("Delete failed");
    }
  };

  // UPDATE
  const handleUpdate = async (e) => {
  e.preventDefault();
  try {
    // Ensure tags is a string before splitting (it might already be an array from the DB)
    const tagString = Array.isArray(editingVideo.tags) 
      ? editingVideo.tags.join(",") 
      : editingVideo.tags;

    const res = await axios.patch(
      `http://localhost:5000/api/v1/videos/update/${editingVideo._id}`,
      {
        title: editingVideo.title,
        description: editingVideo.description,
        tags: tagString // Send as string, backend handles the split
      },
      { withCredentials: true }
    );
      if (res.data.success) {
        setProfileData({
          ...profileData,
          videos: profileData.videos.map(v =>
            v._id === editingVideo._id ? res.data.data : v
          )
        });
        setEditingVideo(null);
      }
    } catch {
      alert("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* 🔥 BIG COVER (FIXED) */}
      <div className="relative w-full h-72 md:h-80 bg-black">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors duration-200"
        >
          <ArrowLeft size={22} />
        </button>

        {displayUser.coverImage ? (
          <img
            src={displayUser.coverImage + "?t=" + Date.now()}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-900/50 to-red-950/50" />
        )}

        <button
          onClick={fetchProfile}
          className="absolute bottom-4 right-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 p-2 rounded-full text-white transition-all duration-200"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* 🔥 PROFILE INFO (NO OVERLAP NOW) */}
      <div className="max-w-6xl mx-auto px-6 py-6">

        <div className="flex items-center gap-6">

          {/* AVATAR */}
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-red-800 border-4 border-red-400/30">
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar + "?t=" + Date.now()}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                {displayUser.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* INFO */}
          <div>
            <h1 className="text-3xl font-bold text-white">
              {displayUser.fullName || displayUser.username}
            </h1>

            <p className="text-sm opacity-70 mt-1 text-gray-300">
              @{displayUser.username} • {profileData?.videos?.length || 0} videos
            </p>
          </div>

        </div>
      </div>

      {/* 🔥 VIDEOS */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        <div className="flex items-center gap-2 mb-6">
          <VideoIcon size={20} className="text-red-400" />
          <h2 className="text-2xl font-bold text-white">Videos</h2>
        </div>

        {profileData?.videos?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {profileData.videos.map((video) => (

              <div key={video._id} className="relative group bg-slate-800/30 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 hover:border-red-400/30 transition-all duration-200">

                <div
                  onClick={() => onSelectVideo({ ...video, src: video.videoUrl })}
                  className="aspect-video rounded-xl overflow-hidden bg-slate-700 cursor-pointer border border-red-500/20"
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <video
                      src={`${video.videoUrl}#t=2`}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                </div>

                <h4 className="mt-3 font-semibold text-base line-clamp-2 text-white group-hover:text-red-400 transition-colors duration-200">
                  {video.title}
                </h4>

                {/* MENU */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === video._id ? null : video._id);
                    }}
                    className="bg-black/50 hover:bg-red-600/80 p-2 rounded-full text-white transition-colors duration-200"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeMenu === video._id && (
                    <div className="absolute right-0 mt-2 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl z-50 border border-red-500/20">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVideo(video);
                          setActiveMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-red-500/20 text-white rounded-t-xl transition-colors duration-200 w-full text-left"
                      >
                        <Edit3 size={14} /> Edit
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(video._id);
                          setActiveMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 rounded-b-xl transition-colors duration-200 w-full text-left"
                      >
                        <Trash2 size={14} /> Delete
                      </button>

                    </div>
                  )}
                </div>

              </div>

            ))}

          </div>
        ) : (
          <div className="text-center py-20 opacity-60">
            <VideoIcon size={48} className="mx-auto mb-4 text-red-400/50" />
            <p className="text-lg text-gray-300">No videos uploaded yet.</p>
          </div>
        )}

      </main>

      {/* EDIT MODAL */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleUpdate} className="bg-slate-800/95 backdrop-blur-xl p-6 rounded-2xl w-96 space-y-4 border border-red-500/20">
            <input
              value={editingVideo.title}
              onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-700/50 border border-red-500/20 text-white placeholder-gray-400 focus:border-red-400 transition-colors"
              placeholder="Video title"
            />
            <textarea
              value={editingVideo.description}
              onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-700/50 border border-red-500/20 text-white placeholder-gray-400 focus:border-red-400 transition-colors resize-none"
              rows="4"
              placeholder="Video description"
            />
            <textarea
  value={Array.isArray(editingVideo.tags) ? editingVideo.tags.join(", ") : editingVideo.tags}
  onChange={(e) => setEditingVideo({ ...editingVideo, tags: e.target.value })}
  className="w-full p-3 rounded-xl bg-slate-700/50 border border-red-500/20 text-white placeholder-gray-400 focus:border-red-400 transition-colors resize-none"
  rows="2"
  placeholder="Video tags (comma separated)"
/>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 px-4 py-3 rounded-xl text-white transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Profile;