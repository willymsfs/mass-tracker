import React, { useEffect, useState } from "react";
import { massAPI } from "../api";

interface CalendarViewProps {
  year: number;
  month: number;
  refreshTrigger: number;
}

const CalendarView: React.FC<CalendarViewProps> = ({ year, month, refreshTrigger }) => {
  const [calendarData, setCalendarData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [year, month, refreshTrigger]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await massAPI.getCalendarMonth(year, month);
      setCalendarData(response.data);
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getMassColor = (massType: string) => {
    switch (massType) {
      case "BLOCKED":
        return "bg-gray-300 text-gray-800";
      case "FIXED":
        return "bg-blue-300 text-blue-900";
      case "DECEASED":
        return "bg-red-300 text-red-900";
      case "GREGORIAN":
        return "bg-green-300 text-green-900";
      case "PERSONAL":
        return "bg-yellow-300 text-yellow-900";
      case "BULK":
        return "bg-purple-300 text-purple-900";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading calendar...</div>;
  }

  if (!calendarData) {
    return <div className="text-center py-8 text-red-600">Failed to load calendar</div>;
  }

  const days = [];
  const totalDays = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {new Date(year, month - 1).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <p className="text-gray-600">
          Total Masses: {calendarData.totalMasses} | Blocked Days: {calendarData.totalBlockedDays}
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-300 rounded"></div>
          <span>Fixed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-300 rounded"></div>
          <span>Deceased</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-300 rounded"></div>
          <span>Gregorian</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300 rounded"></div>
          <span>Personal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-300 rounded"></div>
          <span>Bulk</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 border border-gray-300 rounded">
        {/* Header */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-gray-800 text-white p-2 text-center font-bold text-sm"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="bg-gray-50 p-2 min-h-24"></div>;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayMasses = calendarData.scheduledMasses.filter(
            (m: any) => m.date.split("T")[0] === dateStr
          );
          const isBlocked = calendarData.blockedDays.some(
            (b: any) => b.date.split("T")[0] === dateStr
          );

          return (
            <div
              key={day}
              className={`border border-gray-200 p-2 min-h-24 cursor-pointer hover:bg-blue-50 transition ${
                isBlocked ? "bg-gray-200" : ""
              }`}
              onClick={() => setSelectedDay({ day, dateStr, masses: dayMasses, blocked: isBlocked })}
            >
              <div className="font-bold text-sm mb-1">{day}</div>
              {isBlocked && <div className="text-xs bg-gray-400 text-white p-1 rounded mb-1">Blocked</div>}
              <div className="space-y-1">
                {dayMasses.slice(0, 2).map((mass: any, i: number) => (
                  <div
                    key={i}
                    className={`text-xs p-1 rounded truncate ${getMassColor(mass.massType)}`}
                  >
                    {mass.massType}
                  </div>
                ))}
                {dayMasses.length > 2 && (
                  <div className="text-xs text-gray-600 p-1">+{dayMasses.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              {new Date(`${selectedDay.dateStr}T00:00:00`).toLocaleDateString("default", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>

            {selectedDay.blocked && (
              <div className="mb-4 p-3 bg-gray-200 rounded text-gray-900 font-semibold">
                🚫 No Mass Celebrated (Blocked Day)
              </div>
            )}

            {selectedDay.masses.length > 0 ? (
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {selectedDay.masses.map((mass: any, i: number) => (
                  <div key={i} className={`p-3 rounded ${getMassColor(mass.massType)}`}>
                    <div className="font-semibold text-sm">{mass.massType}</div>
                    {mass.intentionDescription && (
                      <div className="text-xs mt-1">{mass.intentionDescription}</div>
                    )}
                    {mass.serialNumber && (
                      <div className="text-xs mt-1">#{ mass.serialNumber}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !selectedDay.blocked && (
                <p className="text-gray-600 mb-4">No masses scheduled for this day</p>
              )
            )}

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
