// server.js - Complete Working Version
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Validate env
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('❌ Missing DATABASE_URL or JWT_SECRET in .env');
  process.exit(1);
}
console.log('✅ Environment variables validated');

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => console.error('Database error:', err));

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'https://content-deck-woad.vercel.app'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', apiLimiter);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, name, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, name, bio, created_at',
      [username.toLowerCase(), email.toLowerCase(), hashedPassword, name, '']
    );
    
    const token = jwt.sign(
      { id: newUser.rows[0].id, username: newUser.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ New user registered: ${username}`);
    res.status(201).json({ token, user: newUser.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username.toLowerCase()]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.rows[0].id, username: user.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const { password: _, ...userWithoutPassword } = user.rows[0];
    console.log(`✅ User logged in: ${username}`);
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, name, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// BLOG ROUTES
// ============================================

app.get('/api/v1/blogs', authenticateToken, async (req, res) => {
  try {
    const blogs = await pool.query(
      'SELECT * FROM blogs WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(blogs.rows);
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/v1/blogs', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags, is_public } = req.body;
    
    const newBlog = await pool.query(
      'INSERT INTO blogs (user_id, title, content, tags, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, title.trim(), content.trim(), tags || [], is_public !== false]
    );
    
    console.log(`✅ Blog created: "${title}"`);
    res.status(201).json(newBlog.rows[0]);
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/v1/blogs/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags, is_public } = req.body;
    
    const blog = await pool.query(
      'UPDATE blogs SET title = $1, content = $2, tags = $3, is_public = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *',
      [title.trim(), content.trim(), tags || [], is_public, req.params.id, req.user.id]
    );
    
    if (blog.rows.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    res.json(blog.rows[0]);
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/v1/blogs/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM blogs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// MOVIE ROUTES
// ============================================

app.get('/api/v1/movies', authenticateToken, async (req, res) => {
  try {
    const movies = await pool.query(
      'SELECT * FROM movies WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(movies.rows);
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/v1/movies', authenticateToken, async (req, res) => {
  try {
    const { title, year, rating, notes, is_public } = req.body;
    
    const newMovie = await pool.query(
      'INSERT INTO movies (user_id, title, year, rating, notes, is_public) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, title.trim(), parseInt(year), parseInt(rating), notes?.trim() || '', is_public !== false]
    );
    
    console.log(`✅ Movie added: "${title}" (${year})`);
    res.status(201).json(newMovie.rows[0]);
  } catch (error) {
    console.error('Create movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/v1/movies/:id', authenticateToken, async (req, res) => {
  try {
    const { title, year, rating, notes, is_public } = req.body;
    
    const movie = await pool.query(
      'UPDATE movies SET title = $1, year = $2, rating = $3, notes = $4, is_public = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING *',
      [title.trim(), parseInt(year), parseInt(rating), notes?.trim() || '', is_public, req.params.id, req.user.id]
    );
    
    if (movie.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json(movie.rows[0]);
  } catch (error) {
    console.error('Update movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/v1/movies/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM movies WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json({ message: 'Movie deleted' });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// TV SHOW ROUTES
// ============================================

app.get('/api/v1/tvshows', authenticateToken, async (req, res) => {
  try {
    const shows = await pool.query(
      'SELECT * FROM tv_shows WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(shows.rows);
  } catch (error) {
    console.error('Get TV shows error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/v1/tvshows', authenticateToken, async (req, res) => {
  try {
    const { title, year, rating, notes, is_public } = req.body;
    
    const newShow = await pool.query(
      'INSERT INTO tv_shows (user_id, title, year, rating, notes, is_public) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, title.trim(), parseInt(year), parseInt(rating), notes?.trim() || '', is_public !== false]
    );
    
    console.log(`✅ TV show added: "${title}" (${year})`);
    res.status(201).json(newShow.rows[0]);
  } catch (error) {
    console.error('Create TV show error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/v1/tvshows/:id', authenticateToken, async (req, res) => {
  try {
    const { title, year, rating, notes, is_public } = req.body;
    
    const show = await pool.query(
      'UPDATE tv_shows SET title = $1, year = $2, rating = $3, notes = $4, is_public = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING *',
      [title.trim(), parseInt(year), parseInt(rating), notes?.trim() || '', is_public, req.params.id, req.user.id]
    );
    
    if (show.rows.length === 0) {
      return res.status(404).json({ error: 'TV show not found' });
    }
    
    res.json(show.rows[0]);
  } catch (error) {
    console.error('Update TV show error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/v1/tvshows/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tv_shows WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TV show not found' });
    }
    
    res.json({ message: 'TV show deleted' });
  } catch (error) {
    console.error('Delete TV show error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PUBLIC CONTENT ROUTES (NEW!)
// ============================================

// Get public blogs by username
app.get('/api/v1/public/:username/blogs', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [req.params.username.toLowerCase()]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const blogs = await pool.query(
      'SELECT id, title, content, tags, created_at FROM blogs WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC',
      [user.rows[0].id]
    );
    
    res.json(blogs.rows);
  } catch (error) {
    console.error('Get public blogs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get public movies by username
app.get('/api/v1/public/:username/movies', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [req.params.username.toLowerCase()]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const movies = await pool.query(
      'SELECT id, title, year, rating, notes, created_at FROM movies WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC',
      [user.rows[0].id]
    );
    
    res.json(movies.rows);
  } catch (error) {
    console.error('Get public movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get public TV shows by username
app.get('/api/v1/public/:username/tvshows', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [req.params.username.toLowerCase()]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const shows = await pool.query(
      'SELECT id, title, year, rating, notes, created_at FROM tv_shows WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC',
      [user.rows[0].id]
    );
    
    res.json(shows.rows);
  } catch (error) {
    console.error('Get public TV shows error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PROFILE ROUTES (NEW!)
// ============================================

// Get public profile with stats
app.get('/api/v1/profile/:username', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, name, bio, created_at FROM users WHERE username = $1',
      [req.params.username.toLowerCase()]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get public content counts
    const blogCount = await pool.query(
      'SELECT COUNT(*) FROM blogs WHERE user_id = $1 AND is_public = true',
      [user.rows[0].id]
    );
    
    const movieCount = await pool.query(
      'SELECT COUNT(*) FROM movies WHERE user_id = $1 AND is_public = true',
      [user.rows[0].id]
    );
    
    const tvCount = await pool.query(
      'SELECT COUNT(*) FROM tv_shows WHERE user_id = $1 AND is_public = true',
      [user.rows[0].id]
    );
    
    res.json({
      ...user.rows[0],
      stats: {
        blogs: parseInt(blogCount.rows[0].count),
        movies: parseInt(movieCount.rows[0].count),
        tvShows: parseInt(tvCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update own profile
app.put('/api/v1/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const updatedUser = await pool.query(
      'UPDATE users SET name = $1, bio = $2 WHERE id = $3 RETURNING id, username, email, name, bio, created_at',
      [name.trim(), bio?.trim() || '', req.user.id]
    );
    
    res.json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ADVANCED FILTERING ROUTES (NEW!)
// ============================================

// Get blogs with filters
app.get('/api/v1/blogs/filter', authenticateToken, async (req, res) => {
  try {
    const { sortBy, search, tag } = req.query;
    
    let query = 'SELECT * FROM blogs WHERE user_id = $1';
    const params = [req.user.id];
    
    // Add search filter
    if (search) {
      query += ' AND (title ILIKE $2 OR content ILIKE $2)';
      params.push(`%${search}%`);
    }
    
    // Add tag filter
    if (tag) {
      query += ` AND ${params.length + 1} = ANY(tags)`;
      params.push(tag);
    }
    
    // Add sorting
    switch(sortBy) {
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      case 'title':
        query += ' ORDER BY title ASC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }
    
    const blogs = await pool.query(query, params);
    res.json(blogs.rows);
  } catch (error) {
    console.error('Filter blogs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get movies with filters
app.get('/api/v1/movies/filter', authenticateToken, async (req, res) => {
  try {
    const { sortBy, minRating, year } = req.query;
    
    let query = 'SELECT * FROM movies WHERE user_id = $1';
    const params = [req.user.id];
    
    // Add rating filter
    if (minRating) {
      query += ` AND rating >= ${params.length + 1}`;
      params.push(parseInt(minRating));
    }
    
    // Add year filter
    if (year) {
      query += ` AND year = ${params.length + 1}`;
      params.push(parseInt(year));
    }
    
    // Add sorting
    switch(sortBy) {
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      case 'rating':
        query += ' ORDER BY rating DESC, created_at DESC';
        break;
      case 'year':
        query += ' ORDER BY year DESC';
        break;
      case 'title':
        query += ' ORDER BY title ASC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }
    
    const movies = await pool.query(query, params);
    res.json(movies.rows);
  } catch (error) {
    console.error('Filter movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get TV shows with filters
app.get('/api/v1/tvshows/filter', authenticateToken, async (req, res) => {
  try {
    const { sortBy, minRating, year } = req.query;
    
    let query = 'SELECT * FROM tv_shows WHERE user_id = $1';
    const params = [req.user.id];
    
    // Add rating filter
    if (minRating) {
      query += ` AND rating >= ${params.length + 1}`;
      params.push(parseInt(minRating));
    }
    
    // Add year filter
    if (year) {
      query += ` AND year = ${params.length + 1}`;
      params.push(parseInt(year));
    }
    
    // Add sorting
    switch(sortBy) {
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      case 'rating':
        query += ' ORDER BY rating DESC, created_at DESC';
        break;
      case 'year':
        query += ' ORDER BY year DESC';
        break;
      case 'title':
        query += ' ORDER BY title ASC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }
    
    const shows = await pool.query(query, params);
    res.json(shows.rows);
  } catch (error) {
    console.error('Filter TV shows error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/v1/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

app.use('/api/auth/*', (req, res, next) => {
  req.url = req.url.replace('/api/auth', '/api/v1/auth');
  next();
});

app.use('/api/blogs*', (req, res, next) => {
  req.url = req.url.replace('/api/blogs', '/api/v1/blogs');
  next();
});

app.use('/api/movies*', (req, res, next) => {
  req.url = req.url.replace('/api/movies', '/api/v1/movies');
  next();
});

app.use('/api/tvshows*', (req, res, next) => {
  req.url = req.url.replace('/api/tvshows', '/api/v1/tvshows');
  next();
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/v1/health`);
  console.log('================================\n');
});