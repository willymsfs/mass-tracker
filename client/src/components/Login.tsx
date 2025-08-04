import React, { useState } from "react";
import axios from "axios";

interface LoginProps {
  setToken: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ setToken }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", { username, password });
      setToken(response.data.token);
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-center text-2xl mb-4">Priest Login</h2>
      <form onSubmit={loginHandler} className="max-w-sm mx-auto bg-white p-6 rounded shadow">
        <input
          type="text"
          placeholder="Username"
          className="border p-2 w-full mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
      </form>
    </div>
  );
};

export default Login;

