import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"// App.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    axios.get("/api/classes").then(res => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      axios.get(`/api/students?class_id=${selectedClass}`)
        .then(res => {
          setStudents(res.data);
          const initAttendance = {};
          res.data.forEach(s => initAttendance[s.id] = "present");
          setAttendance(initAttendance);
        });
    }
  }, [selectedClass]);

  const handleSubmit = () => {
    const payload = Object.entries(attendance).map(([id, status]) => ({
      student_id: Number(id),
      status,
    }));
    axios.post("/api/attendance", payload).then(() => alert("Đã lưu điểm danh"));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Điểm danh học sinh</h1>

      <select onChange={(e) => setSelectedClass(e.target.value)} className="mt-4">
        <option value="">-- Chọn lớp --</option>
        {classes.map(cls => (
          <option key={cls.id} value={cls.id}>{cls.name}</option>
        ))}
      </select>

      {students.length > 0 && (
        <div className="mt-4">
          {students.map(student => (
            <div key={student.id} className="flex items-center gap-4">
              <span>{student.name}</span>
              <select
                value={attendance[student.id]}
                onChange={(e) => setAttendance({ ...attendance, [student.id]: e.target.value })}
              >
                <option value="present">Có mặt</option>
                <option value="absent">Vắng</option>
              </select>
            </div>
          ))}
          <button onClick={handleSubmit} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Lưu điểm danh
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
