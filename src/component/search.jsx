import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search } from "lucide-react";

const SearchBar = ({ isDarkMode, onSelectVideo, onSearchSubmit }) => {

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim().length > 2) {
                fetchResults();
            } else {
                setResults([]);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const fetchResults = async () => {
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/videos/search?q=${query}`);
            setResults(data);
            setShowDropdown(true);
        } catch (err) {
            console.error("Search error", err);
        }
    };

    const handleResultClick = (video) => {
        const formattedVideo = {
            ...video,
            id: video._id, // Ensure we map _id to id
            ownerName: video.owner?.username,
            ownerAvatar: video.owner?.avatar
        };
        onSelectVideo(formattedVideo);
        setQuery("");
        setShowDropdown(false);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (query.trim().length > 0) {
            // Send the current results to the main page view
            onSearchSubmit(results, query);
            setShowDropdown(false);
        }
    };


    return (
        <div className="relative w-full" ref={dropdownRef}>
            <form className="flex w-full" onSubmit={handleSearchSubmit}>
                <div className="flex w-full items-center border border-red-500/20 rounded-l-full px-4 py-2 bg-slate-800/50 backdrop-blur-sm">
                    <Search className="w-4 h-4 text-red-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.length > 2 && setShowDropdown(true)}
                        className="w-full bg-transparent outline-none text-sm text-white placeholder-gray-400 focus:text-white"
                    />
                </div>
                <button type="submit" className="border border-l-0 border-red-500/20 rounded-r-full px-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200">
                    <Search className="w-5 h-5 text-white" />
                </button>
            </form>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
                <ul className="absolute top-full left-0 w-full mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden bg-slate-800/95 backdrop-blur-xl border border-red-500/20">
                    {results.map((vid) => (
                        <li
                            key={vid._id}
                            onClick={() => handleResultClick(vid)}
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-red-500/20 transition-all duration-200 border-b border-red-500/10 last:border-b-0"
                        >
                            <img loading="lazy" src={vid.thumbnail} alt="thumb" className="w-16 h-10 object-cover rounded-lg border border-red-500/20" />
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="text-sm font-medium truncate text-white hover:text-red-400 transition-colors duration-200">{vid.title}</span>
                                <span className="text-xs opacity-70 text-gray-300">{vid.owner?.username || "Unknown"}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
export default SearchBar;