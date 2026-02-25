import React, { useState } from "react";
import { massAPI } from "../api";

interface FormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const BlockedDayForm: React.FC<FormProps> = ({ onClose, onSuccess }) => {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await massAPI.createBlockedDay(date, reason);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create blocked day");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Add Blocked Day</h2>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Good Friday, Annual Retreat"
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const IntentionForm: React.FC<FormProps> = ({ onClose, onSuccess }) => {
  const [dateOfMonth, setDateOfMonth] = useState("");
  const [type, setType] = useState("BIRTHDAY");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await massAPI.createFixedIntention({ dateOfMonth: parseInt(dateOfMonth), type, description });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create intention");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Add Fixed Intention</h2>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Day of Month (1-31)</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dateOfMonth}
              onChange={(e) => setDateOfMonth(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option>BIRTHDAY</option>
              <option>DEATH_ANNIVERSARY</option>
              <option>ORDINATION</option>
              <option>FEAST_DAY</option>
              <option>OTHER</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Fr. Smith's Birthday"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DeceasedForm: React.FC<FormProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [dateOfDeath, setDateOfDeath] = useState("");
  const [useManualDate, setUseManualDate] = useState(false);
  const [manualScheduleDate, setManualScheduleDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await massAPI.createDeceased({
        name,
        dateOfDeath,
        manualDateFlag: useManualDate,
        scheduleDateOverride: useManualDate ? manualScheduleDate : null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to register deceased");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Register Deceased Member</h2>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Date of Death</label>
            <input
              type="date"
              value={dateOfDeath}
              onChange={(e) => setDateOfDeath(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="useManual"
              checked={useManualDate}
              onChange={(e) => setUseManualDate(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="useManual" className="text-sm">
              Override celebration date (default: death date + 2 days)
            </label>
          </div>
          {useManualDate && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Celebration Date</label>
              <input
                type="date"
                value={manualScheduleDate}
                onChange={(e) => setManualScheduleDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const BatchForm: React.FC<FormProps> = ({ onClose, onSuccess }) => {
  const [code, setCode] = useState("PROV");
  const [seriesType, setSeriesType] = useState("GREGORIAN");
  const [totalIntentions, setTotalIntentions] = useState("30");
  const [donorName, setDonorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await massAPI.createBatch({
        code,
        seriesType,
        totalIntentions: parseInt(totalIntentions),
        donorName: donorName || null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Submit Mass Batch</h2>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Batch Code</label>
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="PROV">Province</option>
              <option value="GEN">General</option>
              <option value="DONOR">Donor</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Type</label>
            <select
              value={seriesType}
              onChange={(e) => setSeriesType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="GREGORIAN">Gregorian (30-series)</option>
              <option value="BULK">Bulk</option>
              <option value="DONOR_BATCH">Donor Batch</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Total Intentions</label>
            <input
              type="number"
              min="1"
              value={totalIntentions}
              onChange={(e) => setTotalIntentions(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Donor Name (optional)</label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
