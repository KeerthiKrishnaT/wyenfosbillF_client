import axios from 'axios';

const API_URL = 'http://localhost:5000/api/purchases';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const fetchPurchases = () => axios.get(API_URL, getAuthHeader());
export const createPurchase = (purchase) => axios.post(API_URL, purchase, getAuthHeader());
export const updatePurchase = (id, purchase) => axios.put(`${API_URL}/${id}`, purchase, getAuthHeader());
export const deletePurchase = (id) => axios.delete(`${API_URL}/${id}`, getAuthHeader());
