import axios from "axios";

const API_URL = import.meta.env.REACT_APP_API_URL || "https://notes-app-plum-three.vercel.app/api/v1";

export const registerUser = async (userData) => {
  const res = await axios.post(`${API_URL}/auth/register`, userData);
  console.log(res.data);
  
  return res.data;
};
    
export const getAllUsers = async () => {
  const res = await axios.get(`${API_URL}/auth/get-users`);
  return res.data;
};

export const deleteUser = async (email) => {
  const res = await axios.delete(`${API_URL}/auth/delete-user`, {
    data: { email }, // Pass email in the request body
  });
  return res.data;
};
