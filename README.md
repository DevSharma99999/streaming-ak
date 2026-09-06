# 🎥 Valdora - AI Powered Video Streaming Platform

> A full-stack video streaming platform inspired by YouTube, featuring AI-powered video summarization, multi-resolution streaming, cloud storage, and personalized user features.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge)

---

## 📖 Overview

Valdora is a modern video-sharing platform that enables users to upload, stream, and interact with video content through an intuitive interface.

Unlike a traditional CRUD application, Valdora includes an intelligent video-processing pipeline that compresses uploaded videos into multiple resolutions, stores them on the cloud, generates AI-powered summaries using Google Gemini, and delivers optimized streaming through Cloudinary CDN.

---

## ✨ Features

### 👤 Authentication
- Secure JWT Authentication
- User Registration & Login
- Profile Management

### 🎬 Video Management
- Upload Videos
- Automatic Thumbnail Upload
- Multi-resolution Processing (360p & 480p)
- Video Streaming
- View Counter

### 🤖 AI Features
- AI Video Summary
- Automatic Transcript Processing
- Google Gemini Integration

### ❤️ User Engagement
- Like Videos
- Comment System
- Channel Subscription
- User Channels

### 📚 Personalization
- Watch History
- Watch Later
- Playlist Management
- Offline Downloads

### 🔍 Search & Recommendation
- Search by Title
- Search by Description
- Search by Tags
- Category-based Recommendation System

---

## 🛠 Tech Stack

### Frontend
- React.js
- Tailwind CSS
- JavaScript
- Axios

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Cloud & APIs
- Cloudinary
- Google Gemini API
- JWT Authentication

### Video Processing
- FFmpeg

### Deployment
- Vercel
- Render

---

## ⚙️ System Architecture

```
User
   │
   ▼
React Frontend
   │
REST API
   │
Express + Node.js
   │
 ├── JWT Authentication
 ├── FFmpeg Processing
 ├── Gemini API
 ├── Cloudinary
 └── MongoDB
```

---

## 🚀 Video Upload Workflow

```text
Upload Video
      │
      ▼
Backend Receives File
      │
      ▼
FFmpeg Compression
      │
      ▼
Transcript Extraction
      │
      ▼
Google Gemini Summary
      │
      ▼
Cloudinary Upload
      │
      ▼
Metadata Stored in MongoDB
```

---

## 📂 Project Structure

```
client/
│── src/
│── components/
│── pages/
│── hooks/

server/
│── controllers/
│── models/
│── routes/
│── middleware/
│── utils/

uploads/

README.md
```

---

## 📸 Screenshots

### 🏠 Home Page

(Add Screenshot)

### 🎬 Video Player

(Add Screenshot)

### ⬆ Upload Page

(adding Screenshot)

### 🤖 AI Summary

(Adding Screenshot)

### 📚 Playlist

(Add Screenshot)

### 📜 Watch History

(Add Screenshot)

---

## 🔧 Installation

Clone the repository

```bash
git clone https://github.com/yourusername/valdora.git
```

Move into project

```bash
cd valdora
```

Install dependencies

```bash
npm install
```

Start Backend

```bash
npm run dev
```

Start Frontend

```bash
cd client

npm install

npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file

```env
PORT=

MONGODB_URI=

JWT_SECRET=

ACCESS_TOKEN_SECRET=

REFRESH_TOKEN_SECRET=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
```

---

## 📈 Highlights

- AI-powered Video Summarization
- Multi-resolution Streaming
- Secure Authentication
- Cloud-based Video Delivery
- Responsive User Interface
- Personalized User Experience
- Optimized Search
- Modern Full-Stack Architecture

---

## 🌍 Future Improvements

- Live Streaming
- AI Recommendation Engine
- Mobile Application
- Subtitle Generation
- Creator Monetization
- AI Content Moderation

---

## 👨‍💻 Team

- Dev Sharma
- Chirag Kumar

---

## 📄 License

This project is developed for educational purposes as part of the B.Tech curriculum at J.C. Bose University of Science & Technology, YMCA.
