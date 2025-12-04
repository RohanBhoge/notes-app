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
      // Use a more distinct class for error messages
      setMessage("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    // Note: The email parameter here is a guess based on the usage in the component.
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

  // Use primary blue loading text
  if (loading) return <p className="text-center py-10 text-xl font-semibold text-blue-600">Loading users...</p>;

  return (
    // Main Container with padding and light background consistency
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      
      {/* Title */}
      <h2 className="text-3xl font-bold text-blue-900 mb-6 border-b-2 border-blue-200 pb-2">
        <span role="img" aria-label="user-icon">👤</span> All Registered Users
      </h2>
      
      {/* Message/Notification */}
      {message && (
        // Tailwind Alert Styling (Success/Error feedback)
        <div className={`p-3 mb-4 rounded-lg font-medium ${message.includes("Error") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto shadow-xl rounded-lg border border-blue-100">
        <table className="min-w-full divide-y divide-blue-200">
          
          {/* Table Header: Darker Blue BG, White Text - ADDED SR. NO */}
          <thead className="bg-blue-600 align-center">
            <tr>
              <TableHeaderCell>Sr. No</TableHeaderCell> {/* NEW COLUMN HEADER */}
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Full Name</TableHeaderCell>
              <TableHeaderCell>Created At</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white divide-y divide-blue-100">
            {users.length ? (
              users.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? 'bg-blue-50' : 'bg-white hover:bg-blue-100 transition duration-150'}>
                  
                  {/* NEW SERIAL NUMBER CELL (index + 1) */}
                  <TableBodyCell className="font-semibold text-blue-900">{index + 1}</TableBodyCell> 
                  
                  <TableBodyCell>{user.id}</TableBodyCell>
                  <TableBodyCell className="font-medium text-blue-600">{user.email}</TableBodyCell>
                  <TableBodyCell>{user.full_name || "-"}</TableBodyCell>
                  <TableBodyCell className="text-sm">{new Date(user.created_at).toLocaleDateString()}</TableBodyCell>
                  <TableBodyCell>
                    <button 
                      onClick={() => handleDelete(user.email)}
                      className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-semibold transition duration-150"
                    >
                      Delete
                    </button>
                  </TableBodyCell>
                </tr>
              ))
            ) : (
              // No Users Row - ADJUSTED colSpan from 5 to 6
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic bg-white">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper components remain the same
const TableHeaderCell = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
    {children}
  </th>
);

const TableBodyCell = ({ children, className = "" }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-gray-700 ${className}`}>
    {children}
  </td>
);

export default UserList;