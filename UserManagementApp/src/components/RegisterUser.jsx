import React, { useState } from "react";
import { registerUser } from "../api/userApi";

const RegisterUser = ({ onUserRegistered }) => {
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = await registerUser(form);
      setMessage("User registered successfully!");
      onUserRegistered && onUserRegistered();
      setForm({ email: "", password: "", full_name: "" });
    } catch (err) {
      setMessage(err.response?.data?.error || "Error registering user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Register User</h2>
      <form onSubmit={handleSubmit} className="text-black">
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <input name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} />
        <button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default RegisterUser;
