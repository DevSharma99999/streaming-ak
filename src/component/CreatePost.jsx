import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  X, Video, Clapperboard, FileText, ChevronLeft,
  Upload, Film, Music, Gamepad2, Laptop, Image as ImageIcon
} from "lucide-react";

const CreatePost = ({ isOpen, onClose, isDarkMode, onUpload }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const categories = ["General", "Coding", "Music", "Education", "Entertainment"];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    category: 'General',
    videoFile: null,
    videoFileName: '',
    thumbnailFile: null,
    thumbnailFileName: ''
  });

  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  if (!isOpen) return null;

  const bgModal = isDarkMode ? "bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700" : "bg-gradient-to-br from-white to-zinc-50 border-zinc-200";
  const inputBg = isDarkMode ? "bg-zinc-800/50 border-zinc-600 focus:border-red-500" : "bg-zinc-100/50 border-zinc-300 focus:border-red-500";
  const hoverBtn = isDarkMode ? "hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-700/20" : "hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-700/10";

  const handleVideoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        videoFile: e.target.files[0],
        videoFileName: e.target.files[0].name
      });
    }
  };

  const handleThumbChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        thumbnailFile: e.target.files[0],
        thumbnailFileName: e.target.files[0].name
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.videoFile) return alert("Please select a video file!");

    setIsUploading(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("tags", formData.tags);
    data.append("category", formData.category);

    // Matches 'videoFile' key in your backend router
    data.append("videoFile", formData.videoFile);

    // Adds thumbnail if selected
    if (formData.thumbnailFile) {
      data.append("thumbnail", formData.thumbnailFile);
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/videos/upload`, data, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      console.log("Backend Response:", response.data);

      if (onUpload) {
        onUpload({ ...formData, jobId: response.data.jobId });
      }

      handleClose();
      alert("Success! Your video is being processed in 360p and 480p.");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Error uploading video. Check your connection or file size.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      title: '',
      description: '',
      tags: '',
      category: 'General',
      videoFile: null,
      videoFileName: '',
      thumbnailFile: null,
      thumbnailFileName: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl border backdrop-blur-xl ${bgModal} overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-600/10 via-red-700/10 to-red-600/10 border-b border-inherit">
          <div className="flex items-center gap-3">
            {step === 2 && <button onClick={() => setStep(1)} className="p-2 rounded-full hover:bg-red-500/20 transition-colors"><ChevronLeft size={20} className="text-red-400" /></button>}
            <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent">{step === 1 ? "Create Post" : `Post Details`}</h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-red-500/20 transition-colors"><X size={20} className="text-red-400" /></button>
        </div>

        {/* Step 1: Type Selection */}
        {step === 1 && (
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">What would you like to post?</h3>
              <p className="text-sm opacity-70">Choose the type of content you want to share</p>
            </div>
            <div className="grid gap-4">
              <button onClick={() => { setSelectedType('video'); setStep(2); }} className={`group flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${hoverBtn} border border-transparent hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10`}>
                <div className={`p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 group-hover:from-red-500/30 group-hover:to-pink-500/30 transition-all duration-300`}><Video className="text-red-400" size={24} /></div>
                <div className="text-left">
                  <p className="font-bold text-base mb-1">Upload Video</p>
                  <p className="text-sm opacity-70">Share a video with your audience</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Video File Input */}
            <div className={`group flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${isDarkMode ? 'border-zinc-600 hover:border-red-500/50 bg-gradient-to-r from-red-500/5 to-red-700/5' : 'border-zinc-300 hover:border-red-500/50 bg-gradient-to-r from-red-500/5 to-red-700/5'} hover:shadow-lg hover:shadow-red-500/10`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-500/20 to-red-700/20 text-red-400 rounded-xl group-hover:from-red-500/30 group-hover:to-red-700/30 transition-all duration-300"><Upload size={20} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase opacity-70 mb-1">Video File</p>
                  <p className="text-sm truncate max-w-[180px] font-medium">{formData.videoFileName || "No video selected"}</p>
                  <p className="text-xs opacity-50">MP4, MOV, AVI up to 500MB</p>
                </div>
              </div>
              <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoChange} />
              <button type="button" onClick={() => videoInputRef.current.click()} className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-red-500/25">Select Video</button>
            </div>

            {/* Thumbnail File Input */}
            <div className={`group flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${isDarkMode ? 'border-zinc-600 hover:border-red-500/50 bg-gradient-to-r from-red-500/5 to-red-700/5' : 'border-zinc-300 hover:border-red-500/50 bg-gradient-to-r from-red-500/5 to-red-700/5'} hover:shadow-lg hover:shadow-red-500/10`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-500/20 to-red-700/20 text-red-400 rounded-xl group-hover:from-red-500/30 group-hover:to-red-700/30 transition-all duration-300"><ImageIcon size={20} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase opacity-70 mb-1">Custom Thumbnail</p>
                  <p className="text-sm truncate max-w-[180px] font-medium">{formData.thumbnailFileName || "Auto-generated if empty"}</p>
                  <p className="text-xs opacity-50">JPG, PNG up to 5MB</p>
                </div>
              </div>
              <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={handleThumbChange} />
              <button type="button" onClick={() => thumbInputRef.current.click()} className="px-4 py-2 bg-gradient-to-r from-zinc-600 to-zinc-700 text-white text-sm font-bold rounded-xl hover:from-zinc-700 hover:to-zinc-800 transition-all duration-300">Select Image</button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase opacity-70 tracking-wide">Title</label>
              <input required type="text" className={`w-full p-4 rounded-xl border-2 outline-none text-base transition-all duration-300 focus:ring-2 focus:ring-red-500/20 ${inputBg}`} placeholder="Enter an engaging video title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>

            {/* Ensure only ONE description block exists */}
<div className="space-y-2">
  <label className="text-sm font-bold uppercase opacity-70 tracking-wide">Description</label>
  <textarea 
    rows="4" 
    className={`w-full p-4 rounded-xl border-2 outline-none text-base resize-none transition-all duration-300 focus:ring-2 focus:ring-red-500/20 ${inputBg}`} 
    placeholder="Describe your video content..." 
    value={formData.description} 
    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
  />
</div>

{/* Tags block follows once */}
<div className="space-y-2">
  <label className="text-sm font-bold uppercase opacity-70 tracking-wide">Tags</label>
  <input 
    type="text" 
    className={`w-full p-4 rounded-xl border-2 outline-none text-base transition-all duration-300 focus:ring-2 focus:ring-red-500/20 ${inputBg}`} 
    placeholder="e.g. #MERN #Tutorial #Coding" 
    value={formData.tags} 
    onChange={(e) => setFormData({ ...formData, tags: e.target.value })} 
  />
</div>

            <div className="space-y-2">
  <label className="text-sm font-bold uppercase opacity-70 tracking-wide">Category</label>
  <select 
    className={`w-full p-4 rounded-xl border-2 outline-none text-base transition-all duration-300 focus:ring-2 focus:ring-red-500/20 ${inputBg}`} 
    value={formData.category} 
    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
  >
    {categories.map((cat) => (
      <option key={cat} value={cat}>
        {cat}
      </option>
    ))}
  </select>
</div>
            <button
              type="submit"
              disabled={isUploading}
              className={`w-full py-4 font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 text-base ${isUploading ? 'bg-gradient-to-r from-zinc-500 to-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 via-red-700 to-red-600 hover:from-red-700 hover:via-red-800 hover:to-red-700 text-white hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isUploading ? "Uploading & Processing..." : "Publish Video"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreatePost;