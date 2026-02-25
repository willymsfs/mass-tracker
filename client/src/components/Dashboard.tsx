import React, { useEffect, useState } from "react";
import { massAPI, reportsAPI, authAPI } from "../api";
import CalendarView from "./CalendarView";
import BlockedDayForm from "./BlockedDayForm";
import IntentionForm from "./IntentionForm";
import DeceasedForm from "./DeceasedForm";
import BatchForm from "./BatchForm";
import RecordsTab from "./RecordsTab";
import ReportsTab from "./ReportsTab";

interface DashboardProps {
  token: string;
}

const Dashboard: React.FC<DashboardProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<"calendar" | "records" | "reports">(
    "calendar"
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBlockedDayForm, setShowBlockedDayForm] = useState(false);
  const [showIntentionForm, setShowIntentionForm] = useState(false);
  const [showDeceasedForm, setShowDeceasedForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUserProfile(response.data);
    } catch (err) {
      setError("Failed to load profile");
    }
  };

  const handleRunScheduler = async () => {
    setLoading(true);
    try {
      await massAPI.runScheduler(currentYear);
      setRefreshTrigger(refreshTrigger + 1);
      alert("Scheduler executed successfully!");
    } catch (err: any) {
      setError(err.response?.data?.error || "Scheduler failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Mass Tracker 2026</h1>
            {userProfile && (
              <p className="text-sm text-blue-100">
                Welcome, {userProfile.name || userProfile.username}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Month/Year Selector and Action Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month/Year Selector */}
            <div className="flex gap-2 items-center">
              <label className="font-semibold">Navigate to:</label>
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(currentYear, i).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - 2 + i}>
                    {new Date().getFullYear() - 2 + i}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setShowBlockedDayForm(true)}
                className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                + Blocked Day
              </button>
              <button
                onClick={() => setShowIntentionForm(true)}
                className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                + Intention
              </button>
              <button
                onClick={() => setShowDeceasedForm(true)}
                className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                + Deceased
              </button>
              <button
                onClick={() => setShowBatchForm(true)}
                className="bg-green-400 hover:bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                + Batch
              </button>
              <button
                onClick={handleRunScheduler}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Running..." : "Run Scheduler"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex-1 py-3 font-semibold transition ${
                  activeTab === "calendar"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📅 Calendar
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`flex-1 py-3 font-semibold transition ${
                  activeTab === "records"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📋 Records
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex-1 py-3 font-semibold transition ${
                  activeTab === "reports"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📊 Reports
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "calendar" && (
              <CalendarView
                year={currentYear}
                month={currentMonth}
                refreshTrigger={refreshTrigger}
              />
            )}
            {activeTab === "records" && (
              <RecordsTab refreshTrigger={refreshTrigger} />
            )}
            {activeTab === "reports" && <ReportsTab year={currentYear} />}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBlockedDayForm && (
        <BlockedDayForm
          onClose={() => setShowBlockedDayForm(false)}
          onSuccess={() => {
            setShowBlockedDayForm(false);
            setRefreshTrigger(refreshTrigger + 1);
          }}
        />
      )}
      {showIntentionForm && (
        <IntentionForm
          onClose={() => setShowIntentionForm(false)}
          onSuccess={() => {
            setShowIntentionForm(false);
            setRefreshTrigger(refreshTrigger + 1);
          }}
        />
      )}
      {showDeceasedForm && (
        <DeceasedForm
          onClose={() => setShowDeceasedForm(false)}
          onSuccess={() => {
            setShowDeceasedForm(false);
            setRefreshTrigger(refreshTrigger + 1);
          }}
        />
      )}
      {showBatchForm && (
        <BatchForm
          onClose={() => setShowBatchForm(false)}
          onSuccess={() => {
            setShowBatchForm(false);
            setRefreshTrigger(refreshTrigger + 1);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
