import fetch from 'node-fetch';

export async function fetchCommuteTime(source, destination, departureTime) {
  console.log('Starting fetchCommuteTime function...(googleMaps.js)', { source, destination, departureTime });
  
  try {
    console.log('Constructing URL...');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(source)}&destinations=${encodeURIComponent(destination)}&departure_time=${encodeURIComponent(departureTime)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    console.log('URL constructed (redacted):', url.replace(process.env.GOOGLE_MAPS_API_KEY, 'REDACTED'));
    console.log('Starting fetch request...');
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      console.log('Fetch request completed with status:', response.status);

      if (!response.ok) {
        console.error('HTTP Error:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Google Maps API request failed: ${response.status} ${response.statusText}`);
      }

      console.log('Parsing JSON response...');
      const data = await response.json();
      console.log('JSON parsed successfully');
      
      if (!data.rows?.[0]?.elements?.[0]?.duration_in_traffic?.value) {
        console.error('Invalid response structure:', {
          status: data.status,
          errorMessage: data.error_message,
          rows: data.rows?.length,
          elements: data.rows?.[0]?.elements?.length,
          firstElement: data.rows?.[0]?.elements?.[0]
        });
        throw new Error(`Invalid response from Google Maps API: ${data.status || 'Unknown error'}`);
      }

      const durationMinutes = data.rows[0].elements[0].duration_in_traffic.value / 60;
      console.log('Successfully calculated duration:', durationMinutes, 'minutes');
      
      return durationMinutes;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out after 10 seconds');
      throw new Error('Request timed out');
    }
    
    console.error('Error in fetchCommuteTime:', {
      errorMessage: error.message,
      errorName: error.name,
      source,
      destination,
      apiKeyPresent: !!process.env.GOOGLE_MAPS_API_KEY,
      apiKeyLength: process.env.GOOGLE_MAPS_API_KEY?.length
    });
    throw error;
  }
}