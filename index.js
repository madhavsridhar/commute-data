// index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import cors from 'cors';
import { commuteRouter } from './routes/commute.js';
import { errorHandler } from './middleware/errorHandler.js';
// Add at the top with your other imports
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Cache setup - store results for 5 minutes
export const cache = new NodeCache({ stdTTL: 300 });

// Rate limiting - 350 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 350,
  message: 'Too many requests, please try again later.'
});

// Middleware

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(cors());  // This allows all origins for testing
// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   methods: ['GET', 'POST']
// }));
app.use(express.json());
app.use(limiter);

// Routes
app.use('/api/commute', commuteRouter);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// models/Commute.js
// import mongoose from 'mongoose';

// const commuteSchema = new mongoose.Schema({
//   timestamp: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   duration: {
//     type: Number,
//     required: true
//   },
//   source: {
//     type: String,
//     required: true
//   },
//   destination: {
//     type: String,
//     required: true
//   },
//   dayOfWeek: {
//     type: String,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['success', 'error'],
//     default: 'success'
//   },
//   errorMessage: String
// });

// // Index for efficient querying
// commuteSchema.index({ timestamp: -1 });
// commuteSchema.index({ dayOfWeek: 1 });

// export const Commute = mongoose.model('Commute', commuteSchema);

// routes/commute.js
// import express from 'express';
// import { Commute } from '../models/Commute.js';
// import { cache } from '../index.js';
// import { fetchCommuteTime } from '../services/googleMaps.js';

// export const commuteRouter = express.Router();

// Get current commute time
// commuteRouter.get('/current', async (req, res, next) => {
//   try {
//     const source = 'Times Square, NY'; // Replace this with your source location
//     const destination = 'Central Park, NY'; // Replace this with your destination location

//     const cacheKey = `${source}-${destination}`;
    
//     // Check cache first
//     const cachedResult = cache.get(cacheKey);
//     if (cachedResult) {
//       return res.json(cachedResult);
//     }

//     // Fetch new data from Google Maps API
//     const duration = await fetchCommuteTime(source, destination);
    
//     // Save to database
//     const commute = new Commute({
//       duration,
//       source,
//       destination,
//       dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'short' })
//     });
//     await commute.save();

//     // Cache the result
//     cache.set(cacheKey, { duration });

//     res.json({ duration });
//   } catch (error) {
//     next(error);
//   }
// });

// // Get historical data
// commuteRouter.get('/history', async (req, res, next) => {
//   try {
//     const { days = 7 } = req.query;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);

//     const history = await Commute.find({
//       timestamp: { $gte: startDate },
//       status: 'success'
//     })
//     .sort({ timestamp: -1 });

//     res.json(history);
//   } catch (error) {
//     next(error);
//   }
// });

// // Get weekly averages
// commuteRouter.get('/weekly-averages', async (req, res, next) => {
//   try {
//     const averages = await Commute.aggregate([
//       {
//         $match: {
//           status: 'success',
//           timestamp: {
//             $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
//           }
//         }
//       },
//       {
//         $group: {
//           _id: '$dayOfWeek',
//           averageDuration: { $avg: '$duration' }
//         }
//       }
//     ]);

//     res.json(averages);
//   } catch (error) {
//     next(error);
//   }
// });

// services/googleMaps.js
// import fetch from 'node-fetch';

// export async function fetchCommuteTime(source, destination) {
//   try {
//     const response = await fetch(
//       `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(source)}&destinations=${encodeURIComponent(destination)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
//     );

//     if (!response.ok) {
//       throw new Error('Google Maps API request failed');
//     }

//     const data = await response.json();
    
//     if (!data.rows?.[0]?.elements?.[0]?.duration?.value) {
//       throw new Error('Invalid response from Google Maps API');
//     }

//     return data.rows[0].elements[0].duration.value / 60; // Convert to minutes
//   } catch (error) {
//     console.error('Error fetching commute time:', error);
//     throw error;
//   }
// }

// middleware/errorHandler.js
// export function errorHandler(err, req, res, next) {
//   console.error(err.stack);

//   // Handle specific error types
//   if (err.name === 'ValidationError') {
//     return res.status(400).json({
//       error: 'Validation Error',
//       details: err.message
//     });
//   }

//   if (err.name === 'MongoError' && err.code === 11000) {
//     return res.status(409).json({
//       error: 'Duplicate Entry',
//       details: 'This record already exists'
//     });
//   }

//   // Default error response
//   res.status(500).json({
//     error: 'Internal Server Error',
//     details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
//   });
// }

// .env
// PORT=3000
// NODE_ENV=development