import React, { useState, useEffect } from 'react';

export default function TasksTab({ initialTasks = [] }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // Load initial tasks from props when they change
  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks.map((t, index) => ({
        id: `task-${index}-${Date.now()}`,
        text: t.text,
        priority: t.priority || 'medium',
        completed: false
      })));
    } else {
      setTasks([]);
    }
  }, [initialTasks]);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: `task-custom-${Date.now()}`,
      text: newTaskText.trim(),
      priority: newTaskPriority,
      completed: false
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskText('');
    setNewTaskPriority('medium');
  };

  const handleDeleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleCopyTasks = () => {
    const text = tasks.map(t => `[${t.completed ? 'x' : ' '}] (${t.priority.toUpperCase()}) ${t.text}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("Tasks copied to clipboard!");
  };

  return (
    <div className="tasks-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '15px' }}>Action Items Board</h4>
        {tasks.length > 0 && (
          <button className="btn-secondary" onClick={handleCopyTasks} style={{ padding: '4px 10px', fontSize: '12px' }}>
            📋 Copy Task List
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
          No action tasks generated. Add one below to start your study plan!
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className="task-item">
              <div 
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
              ></div>
              <div className={`task-text ${task.completed ? 'completed' : ''}`}>
                {task.text}
              </div>
              <span className={`task-priority ${task.priority}`}>
                {task.priority}
              </span>
              <button 
                onClick={() => handleDeleteTask(task.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px', marginLeft: '6px' }}
                title="Delete task"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
        <input
          type="text"
          className="url-input"
          placeholder="Add custom task..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          style={{ padding: '8px 12px' }}
        />
        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '8px',
            fontSize: '13px',
            outline: 'none'
          }}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          + Add
        </button>
      </form>
    </div>
  );
}
