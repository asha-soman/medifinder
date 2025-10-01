import axios from 'axios';

const axiosInstance = axios.create({
 // baseURL: 'http://localhost:5001', // local
  baseURL: '15.134.76.220:5001', // live
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

export default axiosInstance;
//demo
