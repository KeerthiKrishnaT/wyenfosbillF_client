import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// This function will be called with the Firebase token
export const getAuthHeader = (token) => {
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const fetchPurchases = (token) => axios.get(`${API_URL}/api/purchases`, getAuthHeader(token));
export const createPurchase = (purchase, token) => axios.post(`${API_URL}/api/purchases`, purchase, getAuthHeader(token));
export const updatePurchase = (id, purchase, token) => axios.put(`${API_URL}/api/purchases/${id}`, purchase, getAuthHeader(token));
export const deletePurchase = (id, token) => axios.delete(`${API_URL}/api/purchases/${id}`, getAuthHeader(token));
