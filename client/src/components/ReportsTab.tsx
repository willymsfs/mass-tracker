import React, { useState } from "react";
import { reportsAPI } from "../api";

interface ReportsTabProps {
  year: number;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ year }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const handleCanonicalRegister = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getCanonicalRegister(year);
      setSelectedReport({ type: "canonical", data: response.data });
    } catch (err: any) {
      setError("Failed to generate canonical register");
    } finally {
      setLoading(false);
    }
  };

  const handleYearlyBook = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getYearlyBook(year);
      setSelectedReport({ type: "yearly", data: response.data });
    } catch (err: any) {
      setError("Failed to generate yearly book");
    } finally {
      setLoading(false);
    }
  };

  const handleDeceasedSummary = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getDeceasedSummary(year);
      setSelectedReport({ type: "deceased", data: response.data });
    } catch (err: any) {
      setError("Failed to generate deceased summary");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthlyPersonal = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getMonthlyPersonal(year);
      setSelectedReport({ type: "monthly", data: response.data });
    } catch (err: any) {
      setError("Failed to generate monthly personal report");
    } finally {
      setLoading(false);
    }
  };

  const downloadAsJSON = () => {
    if (!selectedReport) return;
    const json = JSON.stringify(selectedReport.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${selectedReport.type}-${year}.json`;
    a.click();
  };

  if (selectedReport) {
    return (
      <div>
        <button
          onClick={() => setSelectedReport(null)}
          className="mb-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold"
        >
          ← Back to Reports
        </button>

        <div className="bg-white p-6 rounded border border-gray-300">
          <h3 className="text-2xl font-bold mb-4">{selectedReport.data.title}</h3>
          <button
            onClick={downloadAsJSON}
            className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
          >
            📥 Download as JSON
          </button>

          <div className="overflow-x-auto">
            {selectedReport.type === "canonical" && (
              <>
                <h4 className="text-xl font-semibold mt-6 mb-3">Register</h4>
                <table className="min-w-full border-collapse border border-gray-300 mb-6">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="border p-2 text-left">Serial No.</th>
                      <th className="border p-2 text-left">Date Received</th>
                      <th className="border p-2 text-left">From Whom</th>
                      <th className="border p-2 text-left">Celebrated</th>
                      <th className="border p-2 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.data.register.slice(0, 20).map((entry: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border p-2">{entry.serialNo}</td>
                        <td className="border p-2">{new Date(entry.dateOfReceipt).toLocaleDateString()}</td>
                        <td className="border p-2">{entry.fromWhom}</td>
                        <td className="border p-2">{new Date(entry.dateCelebrated).toLocaleDateString()}</td>
                        <td className="border p-2">{entry.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 className="text-xl font-semibold mt-6 mb-3">Monthly Personal Summary</h4>
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="border p-2 text-left">Month</th>
                      <th className="border p-2 text-center">Count</th>
                      <th className="border p-2 text-center">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.data.monthlyPersonalSummary.map((entry: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border p-2">{entry.monthName}</td>
                        <td className="border p-2 text-center">{entry.count}</td>
                        <td className="border p-2 text-center">{entry.verified}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {selectedReport.type === "yearly" && (
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Type</th>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-center">Serial</th>
                    <th className="border p-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.data.entries.slice(0, 50).map((entry: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border p-2">{entry.date}</td>
                      <td className="border p-2">{entry.type}</td>
                      <td className="border p-2">{entry.description}</td>
                      <td className="border p-2 text-center">{entry.serialNum}</td>
                      <td className="border p-2">{entry.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport.type === "deceased" && (
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Date of Death</th>
                    <th className="border p-2 text-left">Date Celebrated</th>
                    <th className="border p-2 text-center">Days Delay</th>
                    <th className="border p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.data.entries.map((entry: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border p-2">{entry.name}</td>
                      <td className="border p-2">{entry.dateOfDeath}</td>
                      <td className="border p-2">{entry.dateCelebrated}</td>
                      <td className="border p-2 text-center">{entry.daysDelay || "-"}</td>
                      <td className="border p-2">{entry.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport.type === "monthly" && (
              <div>
                <div className={`text-lg font-bold mb-6 p-4 rounded ${selectedReport.data.allVerified ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"}`}>
                  {selectedReport.data.allVerified ? "✓ All months verified (3 per month)" : `⚠️ Some months don't have exactly 3 masses`}
                </div>
                {selectedReport.data.monthlyBreakdown.map((month: any, i: number) => (
                  <div key={i} className="mb-4 p-4 border border-gray-200 rounded">
                    <div className="font-semibold flex justify-between">
                      <span>{month.monthName}</span>
                      <span className={month.verified ? "text-green-600" : "text-red-600"}>
                        {month.count}/3
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleCanonicalRegister}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded font-semibold disabled:opacity-50"
        >
          📋 Canonical Register
        </button>
        <button
          onClick={handleYearlyBook}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white py-4 rounded font-semibold disabled:opacity-50"
        >
          📖 Yearly Mass Book
        </button>
        <button
          onClick={handleDeceasedSummary}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white py-4 rounded font-semibold disabled:opacity-50"
        >
          ⚰️ Deceased Summary
        </button>
        <button
          onClick={handleMonthlyPersonal}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white py-4 rounded font-semibold disabled:opacity-50"
        >
          📊 Monthly Verification
        </button>
      </div>

      {loading && <p className="mt-6 text-center text-blue-600 font-semibold">Loading report...</p>}
    </div>
  );
};

export default ReportsTab;
