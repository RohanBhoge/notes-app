import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import UserList from "./components/UserList";
import RegisterUser from "./components/RegisterUser";

const App = () => {
  return (  
    <Router>
      <Header />
      <main style={{ padding: "1rem" }}>
        <Routes>
          <Route path="/" element={<UserList />} />
          <Route path="/register" element={<RegisterUser />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
