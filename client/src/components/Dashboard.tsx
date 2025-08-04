import React, { useEffect, useState } from "react";
import axios from "axios";

interface DashboardProps {
  token: string;
}

interface Mass {
  id: number;
  type: string;
  massDate: string;
  description?: string;
  serialNumber?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ token }) => {
  const [masses, setMasses] = useState<Mass[]>([]);
  const [error, setError] = useState("");

  const fetchMasses = async () => {
    try {
      // For demonstration, adjust as needed
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const response = await axios.get(`http://localhost:5000/api/mass/month/${year}/${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMasses(response.data.masses);
    } catch (err) {
      setError("Could not fetch mass data");
    }
  };

  const logMass = async (type: "PERSONAL" | "BULK" | "FIXED_DATE") => {
    try {
      await axios.post(
        "http://localhost:5000/api/mass",
        { type, description: `${type} mass logged`, source: "App" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMasses();
    } catch (err) {
      setError("Error logging mass");
    }
  };

  useEffect(() => {
    fetchMasses();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-center text-2xl mb-4">Dashboard</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex space-x-4 justify-center mb-6">
        <button className="bg-green-500 text-white p-2 rounded" onClick={() => logMass("PERSONAL")}>
          Log Personal Mass
        </button>
        <button className="bg-yellow-500 text-white p-2 rounded" onClick={() => logMass("FIXED_DATE")}>
          Log Fixed-Date Mass
        </button>
        <button className="bg-blue-500 text-white p-2 rounded" onClick={() => logMass("BULK")}>
          Log Bulk Mass
        </button>
      </div>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="py-2 border-b">ID</th>
            <th className="py-2 border-b">Type</th>
            <th className="py-2 border-b">Date</th>
            <th className="py-2 border-b">Serial (if applicable)</th>
          </tr>
        </thead>
        <tbody>
          {masses.map((mass) => (
            <tr key={mass.id}>
              <td className="text-center py-2 border-b">{mass.id}</td>
              <td className="text-center py-2 border-b">{mass.type}</td>
              <td className="text-center py-2 border-b">{new Date(mass.massDate).toLocaleString()}</td>
              <td className="text-center py-2 border-b">{mass.serialNumber ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;

