# Manipal Reddit - College Community Platform

A Reddit-like platform specifically designed for Manipal college students to share news, events, restaurant information, and connect with each other.

## Features

### Core Features
- **Posts & Comments**: Create, vote, and comment on posts with Reddit-like functionality
- **User Authentication**: Secure signup/login with Manipal email verification
- **News Feed**: Latest college news, announcements, and updates
- **Events**: Discover and register for campus events and activities
- **Restaurants**: Find and review local restaurants with menus and offers
- **Real-time Search**: Advanced search across all content types
- **User Profiles**: Personalized profiles with karma, achievements, and activity

### Content Management
- **Multiple Post Types**: Text, image, and link posts
- **Voting System**: Upvote/downvote posts and comments
- **Content Moderation**: Report inappropriate content
- **Categories**: Organized content by topics (academic, sports, cultural, etc.)
- **Trending Algorithm**: Hot, trending, and controversial sorting

### Social Features
- **Follow System**: Follow other users and get personalized feeds
- **Saved Posts**: Bookmark posts for later viewing
- **User Statistics**: Karma score, post count, and achievements
- **Comments Threading**: Nested comment discussions

### Restaurant Features
- **Restaurant Listings**: Comprehensive restaurant database
- **Reviews & Ratings**: Rate restaurants on food, service, ambience
- **Menus**: Digital menu with prices and descriptions
- **Offers & Deals**: Special offers and discounts
- **Location-based Search**: Find nearby restaurants

### Event Management
- **Event Creation**: Create and manage campus events
- **Registration**: RSVP for events with attendance tracking
- **Event Categories**: Academic, cultural, sports, technical events
- **Calendar Integration**: View upcoming events
- **Event Updates**: Organizers can post updates

## Tech Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with custom properties and responsive design
- **JavaScript (ES6+)**: Vanilla JavaScript with modern features
- **Service Workers**: Offline functionality and caching

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: Authentication and authorization
- **bcrypt**: Password hashing

### Security & Performance
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting
- **Input Validation**: Data validation and sanitization
- **File Uploads**: Secure file handling

## Project Structure

```
MIT_RED/
├── client/                 # Frontend application
│   ├── index.html         # Main HTML file
│   ├── css/              # Stylesheets
│   │   ├── styles.css    # Core styles
│   │   ├── components.css # Component styles
│   │   └── responsive.css # Responsive design
│   ├── js/               # JavaScript modules
│   │   ├── app.js        # Main application logic
│   │   ├── auth.js       # Authentication handling
│   │   ├── posts.js      # Post management
│   │   └── api.js        # API communication
│   └── assets/           # Static assets
├── server/               # Backend application
│   ├── src/             # Source code
│   │   ├── server.js    # Main server file
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   └── middleware/  # Custom middleware
│   ├── package.json     # Server dependencies
│   └── .env.example     # Environment variables template
├── .vscode/            # VS Code configuration
│   ├── tasks.json      # Build and run tasks
│   └── launch.json     # Debug configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MIT_RED
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**
   ```bash
   cd ../server
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start MongoDB**
   - Local: Start your MongoDB service
   - Cloud: Update MONGODB_URI in .env file

6. **Run the application**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - The API is available at `http://localhost:5000/api`

### Using VS Code Tasks

If using VS Code, you can use the predefined tasks:

- **Ctrl+Shift+P** → "Tasks: Run Task" → "Full Development Setup"
- This will install dependencies, set up environment, and start the server

## API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Posts Endpoints
- `GET /api/posts` - Get posts with filtering
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/vote` - Vote on post
- `POST /api/posts/:id/save` - Save/unsave post

### User Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/:username` - Get user by username
- `POST /api/users/:userId/follow` - Follow/unfollow user
- `GET /api/users/me/feed` - Get personalized feed

### Events Endpoints
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get specific event
- `POST /api/events/:id/register` - Register for event
- `POST /api/events/:id/rate` - Rate event

### News Endpoints
- `GET /api/news` - Get news articles
- `GET /api/news/breaking` - Get breaking news
- `GET /api/news/:slug` - Get specific article
- `POST /api/news/:id/react` - React to news

### Restaurant Endpoints
- `GET /api/restaurants` - Get restaurants
- `GET /api/restaurants/:id` - Get specific restaurant
- `POST /api/restaurants/:id/review` - Add review
- `POST /api/restaurants/:id/favorite` - Add to favorites
- `GET /api/restaurants/:id/menu` - Get menu

### Search Endpoints
- `GET /api/search` - Global search
- `GET /api/search/suggestions` - Search autocomplete
- `GET /api/search/trending` - Trending searches

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Configuration

### Environment Variables

Key environment variables to configure:

- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: Secret for JWT token signing
- `EMAIL_USER` & `EMAIL_PASS`: Email configuration for notifications
- `CLIENT_URL`: Frontend application URL

### MongoDB Setup

For local development:
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use default connection: `mongodb://localhost:27017/manipal_reddit`

For production (MongoDB Atlas):
1. Create a MongoDB Atlas cluster
2. Get connection string
3. Update `MONGODB_URI` in production environment

### Email Configuration

For email functionality (verification, password reset):
1. Use Gmail with App Password
2. Configure `EMAIL_USER` and `EMAIL_PASS`
3. Enable 2FA and generate App Password for Gmail

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Mongoose schema validation
- **CORS Protection**: Configured cross-origin requests
- **Helmet**: Security headers
- **Email Verification**: Ensure valid Manipal email addresses

## Performance Optimizations

- **Database Indexing**: Optimized MongoDB indexes
- **Caching**: Service Worker caching for offline use
- **Lazy Loading**: Infinite scroll for posts
- **Image Optimization**: Compressed image uploads
- **Code Splitting**: Modular JavaScript architecture

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure email service
5. Set up file storage (if using cloud storage)

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB service is running
   - Verify connection string in .env
   - Check network connectivity

2. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure cookies are enabled

3. **Email Not Sending**
   - Verify email credentials
   - Check Gmail App Password
   - Ensure less secure apps enabled (if using Gmail)

4. **File Upload Issues**
   - Check file size limits
   - Verify allowed file types
   - Check disk space

## Future Enhancements

- **Mobile App**: React Native mobile application
- **Push Notifications**: Real-time notifications
- **Chat System**: Direct messaging between users
- **Advanced Analytics**: User engagement analytics
- **AI Moderation**: Automated content moderation
- **Integration APIs**: Campus system integrations
- **Progressive Web App**: Enhanced PWA features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@manipalreddit.com or create an issue in the repository.

## Acknowledgments

- Manipal University for inspiration
- Reddit for UI/UX inspiration
- Open source community for tools and libraries
- All contributors and testers

---

Built with ❤️ for Manipal College Students
