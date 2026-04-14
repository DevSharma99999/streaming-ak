import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from "./component/HomePage";
import NotificationsDropdown from "./Function/Notification";
import ResetPassword from "./component/ResetPassword";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/home", element: <HomePage /> },
  { path: "/watch/:videoId", element: <HomePage /> },
  { path: "/c/:username", element: <HomePage /> },
  { path: "/history", element: <HomePage /> },
  { path: "/subscriptions", element: <HomePage /> },
  { path: "/settings", element: <HomePage /> },
  { path: "/download", element: <HomePage /> },
  { path: "/notifications", element: <NotificationsDropdown /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "*", element: <Navigate to="/" replace /> },

]);

export default router;