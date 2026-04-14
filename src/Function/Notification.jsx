import React, { useState } from "react";
import { Settings, MoreVertical, Trash2, Pin, BellOff } from "lucide-react";
 import VideoPlayer from "../component/WatchPage"; 

const NotificationsDropdown = ({ isDarkMode = true, setShow, closeDropdown }) => {
  // 1. Notification Data State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "video",
      user: "MrBeast",
      message: "uploaded: I Built A City",
      time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      thumbnail: "https://picsum.photos/seed/yt1/160/90",
      unread: true,
      isPinned: false
    },
    {
      id: 2,
      type: "profile",
      user: "Veritasium",
      message: "subscribed to your channel!",
      time: new Date(Date.now() - 1000 * 60 * 60 * 24),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=V",
      unread: false,
      isPinned: false
    },
    {
      id: 3,
      type: "video",
      user: "Daily Dose",
      message: "uploaded: This is a giant balloon",
      time: new Date(Date.now() - 1000 * 60 * 30),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=D",
      thumbnail: "https://picsum.photos/seed/yt2/160/90",
      unread: true,
      isPinned: false
    }
  ]);

  const [activeMenu, setActiveMenu] = useState(null);

  // Helper: Time ago logic
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // --- NAVIGATION & ACTIONS ---
  const handleNotificationClick = (notif) => {
    const target = notif.type === "profile" ? "Profile" : "VideoPlayer";
    
    if (typeof setShow === "function") {
      setShow(target);
    }
    if (typeof closeDropdown === "function") {
      closeDropdown();
    }
  };

  const deleteNotif = (e, id) => {
    e.stopPropagation(); // Prevents navigating to video when deleting
    setNotifications(notifications.filter(n => n.id !== id));
    setActiveMenu(null);
  };

  const togglePin = (e, id) => {
    e.stopPropagation();
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isPinned: !n.isPinned } : n
    ));
    setActiveMenu(null);
  };

  // YouTube Authentic Theme Colors
  const bgColor = isDarkMode ? "bg-[#212121]" : "bg-white";
  const borderColor = isDarkMode ? "border-white/10" : "border-black/10";
  const textColor = isDarkMode ? "text-white" : "text-zinc-900";
  const subText = isDarkMode ? "text-zinc-400" : "text-zinc-500";
  const menuBg = isDarkMode ? "bg-[#282828]" : "bg-white shadow-xl";
  const hoverBg = isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5";

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className={`absolute top-12 right-0 w-80 md:w-[420px] max-h-[520px] rounded-xl shadow-2xl border ${bgColor} ${textColor} z-[100] flex flex-col overflow-hidden`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
        <span className="font-normal text-base">Notifications</span>
        <Settings className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100" />
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 pb-32 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-12 text-center opacity-50 text-sm italic">No notifications yet</div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={`flex items-start gap-3 px-4 py-3 ${hoverBg} cursor-pointer relative group transition-colors`}
            >
              {/* Status Indicators */}
              <div className="flex flex-col items-center gap-1.5 mt-2 w-2 flex-shrink-0">
                 {n.unread && <div className="w-1.5 h-1.5 bg-[#3ea6ff] rounded-full" />}
                 {n.isPinned && <Pin className="w-3 h-3 text-[#3ea6ff] fill-[#3ea6ff]" />}
              </div>

              {/* Avatar */}
              <img src={n.avatar} alt="" className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] leading-tight line-clamp-3">
                  <span className="font-bold">{n.user}</span> {n.message}
                </p>
                <p className={`text-xs mt-1 ${subText}`}>{formatTimeAgo(n.time)}</p>
              </div>

              {/* Thumbnail (16:9 Style) */}
              {n.thumbnail && (
                <div className="w-20 h-11 flex-shrink-0 rounded overflow-hidden bg-black/20">
                  <img src={n.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Action Button & Menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === n.id ? null : n.id);
                  }}
                  className={`p-1.5 rounded-full transition-opacity ${activeMenu === n.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {activeMenu === n.id && (
                  <div 
                    className={`absolute right-0 top-full mt-1 w-40 rounded-lg border py-1 shadow-2xl z-[120] ${menuBg} ${borderColor}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={(e) => togglePin(e, n.id)} 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                      <Pin className="w-4 h-4" /> {n.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button 
                      onClick={(e) => deleteNotif(e, n.id)} 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <div className={`my-1 border-t ${borderColor}`} />
                    <button className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                      <BellOff className="w-4 h-4" /> Mute
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsDropdown;