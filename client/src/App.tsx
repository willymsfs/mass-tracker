import React, { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

const App = () => {
  const existingToken = localStorage.getItem("token");
  const [token, setToken] = useState<string | null>(existingToken);

  return (
    <div className="min-h-screen bg-gray-100">
      {!token ? (
        <Login setToken={(token: string) => {
          localStorage.setItem("token", token);
          setToken(token);
        }} />
      ) : (
        <Dashboard token={token} />
      )}
    </div>
  );
};

export default App;

