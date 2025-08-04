import React, { useState } from 'react';
import './UpcomingTasks.css';

const UpcomingTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDue, setNewDue] = useState('');

  const handleAddTask = () => {
    if (newTask.trim() && newDue.trim()) {
      setTasks([...tasks, { title: newTask, due: newDue }]);
      setNewTask('');
      setNewDue('');
    }
  };

  const handleDeleteTask = (index) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks);
  };

  return (
    <div className="tasks-card tasks-animated">
      <h2>Upcoming Tasks</h2>
      <div className="task-form">
        <input
          type="text"
          placeholder="Task title"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <input
          type="text"
          placeholder="Due date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
        />
        <button onClick={handleAddTask}>Add</button>
      </div>
      {tasks.length === 0 ? (
        <p className="no-tasks">No upcoming tasks added yet.</p>
      ) : (
        <ul>
          {tasks.map((task, index) => (
            <li key={index}>
              <div className="task-info">
                <span className="task-title">{task.title}</span>
                <span className="task-date">({task.due})</span>
              </div>
              <button
                className="delete-task"
                onClick={() => handleDeleteTask(index)}
                title="Delete Task"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UpcomingTasks;