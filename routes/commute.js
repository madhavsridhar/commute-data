import express from 'express';
import { CommuteData } from '../models/CommuteData.js';
import { cache } from '../index.js';
import { fetchCommuteTime } from '../services/googleMaps.js';
// import cron from 'node-cron';

export const commuteRouter = express.Router();

// Hardcoded locations
// const SOURCE = "Shubha Labha Apartment";
// const DESTINATION = "Docusign RMZ Ecoworld Bengaluru";

// Function to fetch and store commute time
async function fetchAndStoreCommuteTime(req) {
  console.log('Starting fetchAndStoreCommuteTime function... (commute.js)');
  try {
    const { source, destination } = req.query;
    // const { source, destination, timeRange, frequency } = req.query;
    
    // Validate input parameters
    if (!source || !destination) {
      console.log('Missing parameters:', { source, destination });
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        received: { source, destination } 
      });
    }
    console.log('Parameters received:', { source, destination });
    
    const cacheKey = `${source}-${destination}`;
    console.log('Checking cache for key:', cacheKey);
    
    // const cacheKey = `${SOURCE}-${DESTINATION}`;
    
    console.log('Fetching from Google Maps API...');
    
    const duration = await fetchCommuteTime(source, destination);
    // const duration = await fetchCommuteTime(source, destination, departureTime);
    
    console.log('Received duration from API:', duration);
    
    // Save to database with timeout
    console.log('Saving to database...');
    const commute = new CommuteData({
      duration,
      source,
      destination,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'short' }),
      status: 'success'
    });

    const savePromise = commute.save();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database save timeout')), 5000)
    );

    await Promise.race([savePromise, timeoutPromise]);
    console.log('Successfully saved to database');

    // Cache the result
    console.log('Caching result...');
    cache.set(cacheKey, { duration });

    return duration;
  } catch (error) {
    console.error('Error in scheduled fetch:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Schedule task to run every 15 minutes
// cron.schedule('*/15 * * * *', async () => {
//   console.log('Running scheduled commute time fetch...');
//   try {
//     await fetchAndStoreCommuteTime();
//     console.log('Scheduled fetch completed successfully');
//   } catch (error) {
//     console.error('Scheduled task failed:', error);
//   }
// });

// Test endpoint to verify route functionality
commuteRouter.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ status: 'Router is working' });
});

// Get current commute time
commuteRouter.get('/current', async (req, res, next) => {
  console.log('Current commute endpoint hit');
  console.log(req);
  try {
    // const cacheKey = `${source}-${destination}`;
    // console.log('Checking cache for key:', cacheKey);
    
    // // Check cache first
    // const cachedResult = cache.get(cacheKey);
    // if (cachedResult) {
    //   console.log('Cache hit:', cachedResult);
    //   return res.json(cachedResult);
    // }
    
    // console.log('Cache miss, fetching new data...');
    const duration = await fetchAndStoreCommuteTime(req);
    
    console.log('Sending response...');
    res.json({ duration });
  } catch (error) {
    console.error('Error in /current endpoint:', {
      message: error.message,
      stack: error.stack
    });
    next(error);
  }
});

// Get historical data
commuteRouter.get('/history', async (req, res, next) => {
  console.log('History endpoint hit');
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = await CommuteData.find({
      timestamp: { $gte: startDate },
      status: 'success'
    })
    .limit(100)  // Add limit for safety
    .sort({ timestamp: -1 });

    res.json(history);
  } catch (error) {
    console.error('Error in /history endpoint:', error);
    next(error);
  }
});

// Get weekly averages
commuteRouter.get('/weekly-averages', async (req, res, next) => {
  console.log('Weekly averages endpoint hit');
  try {
    const averages = await CommuteData.aggregate([
      {
        $match: {
          status: 'success',
          timestamp: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          averageDuration: { $avg: '$duration' }
        }
      }
    ]).exec();

    res.json(averages);
  } catch (error) {
    console.error('Error in /weekly-averages endpoint:', error);
    next(error);
  }
});