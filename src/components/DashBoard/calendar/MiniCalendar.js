import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './MiniCalendar.css';

const MiniCalendar = () => {
  const [value, setValue] = useState(new Date());
  const [events, setEvents] = useState({});

  useEffect(() => {
    const storedEvents = JSON.parse(localStorage.getItem('calendarEvents')) || {};
    setEvents(storedEvents);
  }, []);

  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  const addEvent = (dateStr) => {
    const event = prompt('Enter event:');
    if (event) {
      setEvents((prev) => ({
        ...prev,
        [dateStr]: [...(prev[dateStr] || []), event],
      }));
    }
  };

  const deleteEvent = (dateStr, index) => {
    if (window.confirm('Delete this event?')) {
      const updated = [...events[dateStr]];
      updated.splice(index, 1);
      const newEvents = { ...events, [dateStr]: updated };
      if (updated.length === 0) delete newEvents[dateStr];
      setEvents(newEvents);
    }
  };

  const formatDate = (date) => date.toISOString().split('T')[0];

  return (
<div className="mini-calend-wrapper"> 
      <h3>Mini Calendar</h3>
      <Calendar
        onChange={setValue}
        value={value}
        onClickDay={(date) => addEvent(formatDate(date))}
        tileContent={({ date }) => {
          const dateStr = formatDate(date);
          return (
            <>
              {events[dateStr]?.map((event, i) => (
                <div key={i} className="event-dot" onClick={(e) => { e.stopPropagation(); deleteEvent(dateStr, i); }}>
                  📌 {event}
                </div>
              ))}
            </>
          );
        }}
      />
    </div>
  );
};

export default MiniCalendar;
