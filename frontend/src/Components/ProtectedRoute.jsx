import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "./Teacher/context/auth/AuthContext";

const ProtectedRoute = () => {
  const { adminAuthToken } = useContext(AuthContext);

  if (!adminAuthToken) {
    return <Navigate to="/login-page" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
