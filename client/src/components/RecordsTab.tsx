import React, { useEffect, useState } from "react";
import { massAPI } from "../api";

interface RecordsTabProps {
  refreshTrigger: number;
}

const RecordsTab: React.FC<RecordsTabProps> = ({ refreshTrigger }) => {
  const [deceased, setDeceased] = useState<any[]>([]);
  const [fixedIntentions, setFixedIntentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"deceased" | "intentions">("deceased");

  useEffect(() => {
    fetchRecords();
  }, [refreshTrigger]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Get current month to fetch data
      const now = new Date();
      const response = await massAPI.getCalendarMonth(now.getFullYear(), now.getMonth() + 1);
      // In a real app, we'd have dedicated endpoints to fetch all deceased and intentions
      // For now, we'll show a placeholder
      setDeceased([]);
      setFixedIntentions([]);
    } catch (err) {
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeceased = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await massAPI.deleteDeceased(id);
        fetchRecords();
      } catch (err) {
        setError("Failed to delete deceased record");
      }
    }
  };

  const handleDeleteIntention = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await massAPI.deleteFixedIntention(id);
        fetchRecords();
      } catch (err) {
        setError("Failed to delete intention");
      }
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab("deceased")}
          className={`py-2 px-4 font-semibold ${
            activeTab === "deceased"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          Deceased Members
        </button>
        <button
          onClick={() => setActiveTab("intentions")}
          className={`py-2 px-4 font-semibold ${
            activeTab === "intentions"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          Fixed Intentions
        </button>
      </div>

      {activeTab === "deceased" && (
        <div>
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : deceased.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              No deceased members registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="border p-3 text-left">Name</th>
                    <th className="border p-3 text-left">Date of Death</th>
                    <th className="border p-3 text-left">Scheduled Date</th>
                    <th className="border p-3 text-left">Status</th>
                    <th className="border p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deceased.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="border p-3">{d.name}</td>
                      <td className="border p-3">
                        {new Date(d.dateOfDeath).toLocaleDateString()}
                      </td>
                      <td className="border p-3">
                        {d.massScheduledDate
                          ? new Date(d.massScheduledDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="border p-3">
                        <span
                          className={`px-2 py-1 rounded text-sm font-semibold ${
                            d.massScheduledDate
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {d.massScheduledDate ? "Scheduled" : "Pending"}
                        </span>
                      </td>
                      <td className="border p-3 text-center">
                        <button
                          onClick={() => handleDeleteDeceased(d.id)}
                          className="text-red-600 hover:text-red-900 font-semibold text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "intentions" && (
        <div>
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : fixedIntentions.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              No fixed intentions registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="border p-3 text-left">Type</th>
                    <th className="border p-3 text-left">Day of Month</th>
                    <th className="border p-3 text-left">Description</th>
                    <th className="border p-3 text-left">Conflict</th>
                    <th className="border p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedIntentions.map((fi) => (
                    <tr key={fi.id} className="hover:bg-gray-50">
                      <td className="border p-3">{fi.type}</td>
                      <td className="border p-3">{fi.dateOfMonth}</td>
                      <td className="border p-3">{fi.description || "-"}</td>
                      <td className="border p-3">
                        {fi.conflictFlag ? (
                          <span className="text-red-600 font-semibold">⚠️ Yes</span>
                        ) : (
                          <span className="text-green-600">✓ No</span>
                        )}
                      </td>
                      <td className="border p-3 text-center">
                        <button
                          onClick={() => handleDeleteIntention(fi.id)}
                          className="text-red-600 hover:text-red-900 font-semibold text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordsTab;
