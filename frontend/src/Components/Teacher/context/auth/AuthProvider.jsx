import AuthContext from "./AuthContext.jsx";
import { useState } from "react";

const AuthProvider = (props) => {
  const [adminAuthToken, setAdminAuthToken] = useState(
    localStorage.getItem("Admin_Token")
      ? localStorage.getItem("Admin_Token")
      : null
  );

  const BackendUrl = import.meta.env.VITE_BACKEND_URL || "https://notes-app-plum-three.vercel.app";

  console.log(adminAuthToken);
  return (
    <AuthContext.Provider
      value={{ adminAuthToken, setAdminAuthToken, BackendUrl }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};  

export default AuthProvider;