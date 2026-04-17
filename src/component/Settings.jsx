import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  User, Check, Camera, Loader2, X
} from 'lucide-react';

const SettingsPage = ({ user, setUser }) => {

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [showAvatarMenu, setShowAvatarMenu] = useState(false); // ✅ FIX
  const [showAvatarPreview, setShowAvatarPreview] = useState(false); // ✅ MODAL

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setFullName(user?.fullName || "");
      setEmail(user?.email || "");
    }
  }, [user, isEditing]);

  // FETCH USER
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/users/profile`,
          { withCredentials: true }
        );

        if (res.data.success) {
          setUser(res.data.data);
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchUser();
  }, []);

  // SAVE DETAILS
  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/v1/users/update-account`,
        { fullName, email },
        { withCredentials: true }
      );

      if (res.data.success) {
        setUser(res.data.data);
        setIsEditing(false);
      }
    } catch (err) {
      alert("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  // UPLOAD IMAGE
  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'avatar' ? 'avatar' : 'coverImage', file);

    setIsUpdating(true);

    try {
      const endpoint = type === 'avatar' ? '/avatar' : '/cover-image';

      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/v1/users${endpoint}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* COVER SECTION */}
      <div className="relative">
        <div className="h-56 w-full rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-red-600 via-red-700 to-red-600">
          {user?.coverImage ? (
            <img loading="lazy" src={user.coverImage + "?t=" + Date.now()} className="w-full h-full object-cover" alt="cover" />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>

        <label className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg text-sm cursor-pointer font-medium transition-colors">
          <Camera className="w-4 h-4 inline mr-2" />
          Change Banner
          <input type="file" hidden onChange={(e) => handleFileChange(e, 'coverImage')} />
        </label>

        {/* PROFILE SECTION */}
        <div className="px-6 md:px-8 pt-8 pb-6 flex items-center gap-6">

          {/* AVATAR */}
          <div className="relative -mt-20">
            <div
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              className="w-32 h-32 rounded-2xl border-4 border-white overflow-hidden bg-gradient-to-br from-red-600 to-black shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
            >
              {user?.avatar ? (
                <img loading="lazy" src={user.avatar + "?t=" + Date.now()} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white"><User size={48} /></div>
              )}
            </div>

            {/* AVATAR MENU */}
            {showAvatarMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowAvatarPreview(true);
                    setShowAvatarMenu(false);
                  }}
                  className="block px-4 py-3 hover:bg-red-600/20 text-white w-full text-left transition-colors"
                >
                  View Profile
                </button>
                <div className="h-px bg-zinc-800" />
                <label className="block px-4 py-3 hover:bg-red-600/20 text-white cursor-pointer flex items-center gap-2 transition-colors">
                  <Camera size={16} />
                  Change Avatar
                  <input type="file" hidden onChange={(e) => handleFileChange(e, 'avatar')} />
                </label>
              </div>
            )}
          </div>

          {/* USER INFO */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold">@{user?.username}</h2>
            <p className="text-zinc-400 text-sm mt-1">Manage your account settings</p>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            disabled={isEditing}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${isEditing ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white'}`}
          >
            {isEditing ? 'Editing...' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* ACCOUNT DETAILS FORM */}
      <form
        onSubmit={handleUpdateDetails}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-lg"
      >
        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-red-600 rounded-full" />
            Account Details
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Full Name</label>
            <input
              disabled={!isEditing}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-all outline-none ${!isEditing
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                : 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                }`}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
            <input
              disabled={!isEditing}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-all outline-none ${!isEditing
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                : 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                }`}
              placeholder="your.email@example.com"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!isEditing || isUpdating}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${isUpdating || !isEditing ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white'}`}
          >
            {isUpdating ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 rounded-lg font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ✅ AVATAR MODAL */}
      {showAvatarPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">

          <div className="relative">

            <button
              onClick={() => setShowAvatarPreview(false)}
              className="absolute -top-10 right-0 text-white"
            >
              <X />
            </button>

            <img
            loading="lazy"
              src={user?.avatar}
              className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-2xl"
              alt="preview"
            />

          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;