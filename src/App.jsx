import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lopList, setLopList] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loggedIn, setLoggedIn] = useState(false);

  // Lấy danh sách lớp
  useEffect(() => {
    async function fetchLopList() {
      const { data, error } = await supabase.from("tbl_lop").select("malop, tenlop");
	  console.log("Danh sách lớp lấy về:", data);
      if (error) {
        console.error("Lỗi tải danh sách lớp:", error.message);
      } else {
        setLopList(data);
      }
    }
    fetchLopList();
  }, []);

  // Đăng nhập
  async function handleLogin() {
    if (!username || !password || !selectedLop) {
      alert("Vui lòng điền đầy đủ thông tin đăng nhập.");
      return;
    }

    const { data, error } = await supabase
      .from("tbl_user")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Sai tên đăng nhập hoặc mật khẩu.");
    } else {
      setLoggedIn(true);
      fetchStudents(selectedLop);
    }
  }

  // Lấy danh sách học viên theo MaLop
  async function fetchStudents(maLop) {
    const { data, error } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop);

    if (error) {
      console.error("Lỗi tải học viên:", error.message);
    } else {
      setStudents(data);
      const defaultAttendance = {};
      data.forEach((s) => {
        defaultAttendance[s.mahv] = "present";
      });
      setAttendance(defaultAttendance);
    }
  }

  // Toggle điểm danh
function handleAttendanceChange(mahv, status) {
  setAttendance((prev) => ({
    ...prev,
    [mahv]: status,
  }));
}

  // Gửi điểm danh
 async function handleSubmit() {
  const date = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  const payload = {
    className: selectedLop, // tên sheet
    date: date,
    students: students.map((s) => ({
      mahv: s.mahv,
      tenhv: s.tenhv,
      status: getStatusText(attendance[s.mahv]),
    })),
  };

  try {
   const response = await fetch("https://script.google.com/macros/s/AKfycbxH-XVmnHgNNSLRUEr8qKk0skj2ZBd7AR_FW-ke_kv50puHv0aw4eMbMaKIYozqoVxO/exec", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

    const text = await response.text();
    alert(text);
  } catch (err) {
    alert("Gửi thất bại: " + err.message);
  }
}

function getStatusText(statusCode) {
  switch (statusCode) {
    case "present":
      return "Có mặt";
    case "absent_excused":
      return "Nghỉ phép";
    case "absent_unexcused":
      return "Nghỉ không phép";
    default:
      return "Không rõ";
  }
}

  // Giao diện
 return (
  <div style={{ padding: "30px", maxWidth: "720px", margin: "40px auto" }}>
    {!loggedIn ? (
      <div style={{
        backgroundColor: "#f4f6f8",
        borderRadius: "12px",
        padding: "30px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          textAlign: "center",
          color: "#2c3e50",
          marginBottom: "24px"
        }}>🔐 Đăng nhập điểm danh</h2>

        {/* Username input */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "500", marginBottom: "6px", color: "#34495e" }}>
            Tên đăng nhập:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              outlineColor: "#3498db"
            }}
          />
        </div>

        {/* Password input */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "500", marginBottom: "6px", color: "#34495e" }}>
            Mật khẩu:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              outlineColor: "#3498db"
            }}
          />
        </div>

        {/* Dropdown chọn lớp */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "500", marginBottom: "6px", color: "#34495e" }}>
            Chọn lớp:
          </label>
          <select
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              backgroundColor: "#fff"
            }}
          >
            <option value="">-- Chọn lớp --</option>
            {lopList.map((lop) => (
              <option key={lop.malop} value={lop.malop}>
                {lop.tenlop}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background-color 0.3s"
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#2980b9")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#3498db")}
        >
          Đăng nhập
        </button>
      </div>
    ) : (
      <>
        <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: 20 }}>📋 Danh sách điểm danh</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {students.map((student) => (
            <div
              key={student.mahv}
              style={{
                padding: "16px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                backgroundColor: "#f9f9f9",
                transition: "0.3s",
                borderLeft: "5px solid #3498db"
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px", color: "#34495e" }}>
                {student.tenhv}
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="present"
                    checked={attendance[student.mahv] === "present"}
                    onChange={() => handleAttendanceChange(student.mahv, "present")}
                    style={{ accentColor: "#27ae60" }}
                  />
                  Có mặt ✅
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="absent_excused"
                    checked={attendance[student.mahv] === "absent_excused"}
                    onChange={() => handleAttendanceChange(student.mahv, "absent_excused")}
                    style={{ accentColor: "#f39c12" }}
                  />
                  Nghỉ phép 🟡
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="absent_unexcused"
                    checked={attendance[student.mahv] === "absent_unexcused"}
                    onChange={() => handleAttendanceChange(student.mahv, "absent_unexcused")}
                    style={{ accentColor: "#e74c3c" }}
                  />
                  Nghỉ không phép ❌
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          style={{
            marginTop: 24,
            padding: "12px 24px",
            backgroundColor: "#2ecc71",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          ✅ Lưu điểm danh
        </button>
      </>
    )}
  </div>
);
}
export default App;
