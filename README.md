# 🎬 ContentDeck

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/frontend-React_19-61DAFB.svg)
![Node](https://img.shields.io/badge/backend-Node.js-339933.svg)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1.svg)

> **Your personal digital universe.**
> Track your favorite Movies & TV Shows, write personal Blogs, and manage your creative life in one secure, privacy-focused hub.

---

##  Overview

**ContentDeck** is a full-stack PERN application (Postgres, Express, React, Node) designed for creators and media enthusiasts. Unlike standard tracking apps, ContentDeck emphasizes **privacy controls**, allowing users to toggle individual items between "Public" and "Private" visibility.

It features a modern, responsive interface built with **Tailwind CSS** that supports a fully immersive **Dark Mode**, keyboard navigation, and interactive particle backgrounds.

##  Key Features

###  User Experience
- **Immersive UI:** Fully responsive design with Dark/Light mode toggles, sound effects, and confetti animations on success.
- **Keyboard Power User:** Built-in keyboard shortcuts (Press `⌘/` or `Ctrl+/`) for rapid navigation.
- **Visual Feedback:** Interactive particle backgrounds and toast notifications.

###  Security & Privacy
- **Granular Privacy:** Toggle any Blog, Movie, or TV Show as `Public` or `Private` instantly.
- **Secure Auth:** JWT-based stateless authentication with Bcrypt password hashing.
- **Rate Limiting:** Backend protection against brute-force attacks.

###  Technical Highlights
- **Smart Filtering:** Sort content by rating, year, or custom tags.
- **Real-time Search:** Debounced search for instant filtering without API overload.
- **Public Profiles:** Shareable user profiles that only display public-facing content.

---

##  Tech Stack

| Frontend | Backend | Database & Tools |
| :--- | :--- | :--- |
| **React 19** (Latest) | **Node.js & Express** | **PostgreSQL** |
| **Tailwind CSS** | **JWT** (Auth) | **pg** (Node-Postgres) |
| **Lucide React** (Icons) | **Winston** (Logging) | **Helmet** (Security) |
| **Context API** | **Rate Limit** | **Nixpacks** (Deployment) |

---

##  Installation & Setup

### Prerequisites
- Node.js (v16+)
- PostgreSQL (Local or Cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/content-deck.git
```
### 2. Backend Setup
```bash
cd backend
npm install
```
Create a **.env** file in the **backend/** folder:
```Code snippet
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/contentdeck
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```
Start the server:
```bash
npm start
```
### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a **.env** file in the **frontend/** folder:
```Code snippet
REACT_APP_API_URL=http://localhost:5001/api/v1
```
Launch the UI:
```bash
npm start
```
Visit **http://localhost:3000** to start using ContentDeck!

##  Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ + K` | Focus Search Bar |
| `⌘ + N` | Create New Blog |
| `⌘ + M` | Add New Movie |
| `⌘ + T` | Add New TV Show |
| `⌘ + D` | Toggle Dark/Light Mode |
| `ESC` | Close any open modal |

##  Project Structure

```Plaintext
content-deck/
├── backend/
│   ├── init-db.js       # Auto-initializes SQL tables
│   ├── schema.sql       # Database schema source
│   └── server.js        # Express API & Routes
└── frontend/
    ├── src/
    │   ├── components/  # Reusable UI (Modals, Particles)
    │   ├── contexts/    # Global State (Auth, Theme)
    │   ├── hooks/       # Custom Hooks
    │   └── services/    # Centralized API calls
    └── public/
```

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project

2. Create your Feature Branch (git checkout -b feature/AmazingFeature)

3. Commit your changes (git commit -m 'Add some AmazingFeature')

4. Push to the Branch (git push origin feature/AmazingFeature)

5. Open a Pull Request
