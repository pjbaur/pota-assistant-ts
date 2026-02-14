// API module exports

export {
  fetchAllParks,
  fetchParkByReference,
  fetchParksByEntity,
  checkApiHealth,
  NetworkError,
  type ParkApiData,
} from './pota-client.js';

export {
  fetchForecast,
  type OpenMeteoDaily,
  type OpenMeteoResponse,
} from './weather-client.js';
