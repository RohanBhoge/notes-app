import React, { useEffect, useState } from "react";
import { getAllUsers, deleteUser } from "../api/userApi";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      setMessage("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(email);
      setMessage("User deleted successfully");
      fetchUsers();
    } catch (err) {
      setMessage("Error deleting user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;

  return (
    <div>
      <h2>All Users</h2>
      {message && <p>{message}</p>}
      <table className="text-black" border="1" cellPadding="5" cellSpacing="0" >
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Full Name</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length ? users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.full_name || "-"}</td>
              <td>{new Date(user.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => handleDelete(user.email)}>Delete</button>
              </td>
            </tr>
          )) : <tr><td colSpan="5">No users found</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
