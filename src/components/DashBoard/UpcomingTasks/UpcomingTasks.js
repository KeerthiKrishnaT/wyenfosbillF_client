import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UpcomingTasks.css';

const UpcomingTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const [userRole, setUserRole] = useState('customer');

  useEffect(() => {
    fetchTasks();
    checkUserRole();
  }, []);

  const checkUserRole = () => {
    const token = localStorage.getItem('token');
    const firebaseToken = localStorage.getItem('firebaseToken');
    
    if (firebaseToken) {
      // Use Firebase token for API calls
      setUserRole('customer'); // Default to customer for task creation
    } else if (token) {
      // Fallback to regular token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'customer');
      } catch (error) {
        setUserRole('customer');
      }
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const firebaseToken = localStorage.getItem('firebaseToken');
      const token = localStorage.getItem('token');
      
      if (!firebaseToken && !token) {
        setTasks([]);
        return;
      }

      const authToken = firebaseToken || token;
      const response = await axios.get('http://localhost:5000/api/tasks', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim() || !newTask.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const firebaseToken = localStorage.getItem('firebaseToken');
      const token = localStorage.getItem('token');
      const authToken = firebaseToken || token;
      
      if (!authToken) {
        alert('Authentication token not found. Please log in again.');
        return;
      }
      
      console.log('Sending task with token:', authToken ? 'Token exists' : 'No token');
      
      const response = await axios.post('http://localhost:5000/api/tasks', {
        ...newTask,
        status: 'pending',
        createdAt: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setTasks([...tasks, response.data]);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error creating task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const firebaseToken = localStorage.getItem('firebaseToken');
      const token = localStorage.getItem('token');
      const authToken = firebaseToken || token;
      
      await axios.delete(`http://localhost:5000/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const firebaseToken = localStorage.getItem('firebaseToken');
      const token = localStorage.getItem('token');
      const authToken = firebaseToken || token;
      
      await axios.put(`http://localhost:5000/api/tasks/${taskId}`, {
        status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Update the task in the local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' }
          : task
      ));
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error completing task. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="upcoming-tasks-container">
      <div className="tasks-header">
        <h4>Upcoming Tasks</h4>
        {userRole === 'customer' && (
          <button 
            className="add-task-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add Task'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form className="add-task-form" onSubmit={handleAddTask}>
          <input
            type="text"
            placeholder="Task Title"
            value={newTask.title}
            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Task Description"
            value={newTask.description}
            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
            required
          />
          <div className="form-row">
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="submit-task-btn">Create Task</button>
        </form>
      )}

      <div className="tasks-list">
        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="no-tasks">No upcoming tasks</p>
        ) : (
                     tasks.map((task) => (
             <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
               <div className="task-header">
                 <h5 className="task-title">{task.title}</h5>
                 <div className="task-badges">
                   <span 
                     className="priority-badge"
                     style={{ backgroundColor: getPriorityColor(task.priority) }}
                   >
                     {task.priority}
                   </span>
                   {task.status === 'completed' && (
                     <span className="status-badge completed">
                       ✓ Completed
                     </span>
                   )}
                 </div>
               </div>
               <p className="task-description">{task.description}</p>
                             <div className="task-footer">
                 <span className="task-date">Due: {formatDate(task.dueDate)}</span>
                 <div className="task-actions">
                   {task.status !== 'completed' && (
                     <button 
                       className="complete-task-btn"
                       onClick={() => handleCompleteTask(task.id)}
                     >
                       Complete
                     </button>
                   )}
                   <button 
                     className="delete-task-btn"
                     onClick={() => handleDeleteTask(task.id)}
                   >
                     Delete
                   </button>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingTasks;
