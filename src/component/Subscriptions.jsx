import React, { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, CheckCircle2 } from "lucide-react";
import Subscribe from "../Function/Subscribe";
import axios from "axios";

const SubscriptionsPage = ({ isDarkMode, onBack, currentUser, onSelectChannel }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/v1/users/subscriptions", { withCredentials: true });
        setSubscriptions(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white p-10 text-center">Loading subscriptions...</div>;
  if (error) return <div className="min-h-screen bg-[#0f0f0f] text-red-400 p-10 text-center">{error}</div>;

  const themeBg = "bg-[#0f0f0f]";
  const themeText = "text-white";
  const themeHover = "hover:bg-red-500/10";
  const themeBorder = "border-red-500/20";

  return (
    <div className={`${themeBg} ${themeText} min-h-screen transition-colors duration-500`}>
      <header className={`sticky top-0 z-20 ${themeBg} border-b ${themeBorder} px-6 py-5 backdrop-blur-xl shadow-sm`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button onClick={onBack} className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-zinc-800 ${themeHover} transition-all duration-300`}>
              <ArrowLeft size={20} className="text-red-400" />
              <span className="text-sm font-semibold text-white">Back</span>
            </button>
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm uppercase tracking-[0.24em] text-red-400 opacity-80">Subscription Hub</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Your Channels</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage and browse the creators you follow.</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="mb-6 rounded-3xl border border-zinc-800 bg-slate-900/90 p-5 shadow-lg shadow-red-500/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-red-400 opacity-80">Subscriptions</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{subscriptions.length} channels followed</h2>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-black/40 px-4 py-3 text-sm text-zinc-300">
              Pro tip: tap a channel to view its page and see latest uploads.
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {subscriptions.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-red-500/20 bg-slate-900/90 shadow-lg shadow-red-500/10">
              <p className="text-xl font-semibold text-white">No subscriptions found</p>
              <p className="text-sm mt-3 text-zinc-400">Explore creators and follow the channels that match your interests.</p>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id || sub._id}
                onClick={() => onSelectChannel(sub.username)}
                className="group flex items-center justify-between p-5 rounded-3xl bg-slate-900/95 border border-zinc-800 shadow-lg shadow-red-500/5 transition-all duration-300 cursor-pointer hover:border-red-500/30 hover:shadow-red-500/20 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-800 shadow-xl transition-all duration-300 group-hover:border-red-400/30">
                    {sub.avatar ? (
                      <img src={sub.avatar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-xl font-bold text-white">{sub.username?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-white group-hover:text-red-400 transition-colors duration-300">
                      {sub.username}
                      <CheckCircle2 size={16} className="text-red-400" />
                    </h3>
                    <p className="text-sm text-zinc-400">Subscribed channel</p>
                    <p className="text-xs mt-1 text-zinc-500">{sub.subscriberCount ? `${sub.subscriberCount} subscribers` : 'Subscriber info unavailable'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Subscribe channelId={sub.id || sub._id} currentUser={currentUser} />
                  <button className="p-3 rounded-full bg-slate-900 border border-zinc-800 text-red-400 transition-all duration-300 hover:bg-red-500/10 hover:scale-105">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default SubscriptionsPage;