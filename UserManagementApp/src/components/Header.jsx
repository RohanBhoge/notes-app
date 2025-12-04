import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header style={{ padding: "1rem", backgroundColor: "#282c34", color: "white" }}>
      <h1>User Management App</h1>
      <nav>
        <Link to="/" >Home</Link>
        <Link to="/register">Register User</Link>
      </nav>
    </header>
  );
};

export default Header;