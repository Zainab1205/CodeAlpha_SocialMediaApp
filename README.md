# CodeAlpha_SocialMediaApp

A mini social media platform built for the CodeAlpha Full Stack Development Internship (Task 2).

## Features
- User registration & login (username + email, bcrypt-hashed passwords, session auth)
- User profiles with editable bio
- Create, view, and delete posts
- Like / unlike posts
- Comment on posts
- Follow / unfollow other users
- "For You" (global) feed and "Following" (personalized) feed
- Followers / following lists
- User search

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via better-sqlite3)
- **Auth:** express-session + bcryptjs

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open your browser at [http://localhost:3001](http://localhost:3001)

The database file `social.db` is created automatically on first run.

## Project Structure
```
CodeAlpha_SocialMediaApp/
├── server.js
├── db.js
├── routes/
│   ├── auth.js      # Register / login / logout / session
│   ├── posts.js     # Posts, likes, comments
│   └── users.js     # Profiles, follow system, search
└── public/
    ├── index.html      # Feed (For You / Following)
    ├── profile.html     # User profile + their posts
    ├── connections.html  # Followers / following list
    ├── search.html      # Search for users
    ├── login.html
    ├── register.html
    ├── css/style.css
    └── js/app.js, posts.js
```

## Notes
- Register two or more accounts (e.g. in separate browser profiles/incognito windows) to test following, liking, and commenting between users.
- Sessions are stored in memory, so restarting the server will log everyone out.
