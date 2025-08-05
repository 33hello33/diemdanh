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
  const [manv, setManv] = useState(null);
  const [role, setRole] = useState("");
const [soLuongHocVien, setSoLuongHocVien] = useState(0);
const [notes, setNotes] = useState({});

async function fetchLopList(manv, role) {
   let query = supabase.from("tbl_lop").select("malop, tenlop");

  if (role === "Giáo viên") {
    query = query.eq("manv", manv); // chỉ lấy lớp của chính giảng viên đó
  }

  const { data, error } = await query;

  if (error) {
    console.error("Lỗi tải danh sách lớp:", error.message);
  } else {
    setLopList(data);
  }
  }

  
  // Lấy danh sách lớp
// useEffect sẽ chạy lại mỗi khi maNV thay đổi
useEffect(() => {
  if (manv && role) {
    fetchLopList(manv, role);
  }
}, [manv, role]);

  // Đăng nhập
  async function handleLogin() {
    if (!username || !password) {
      alert("Vui lòng điền đầy đủ thông tin đăng nhập.");
      return;
    }

    const { data, error } = await supabase
      .from("tbl_nv")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Sai tên đăng nhập hoặc mật khẩu.");
    } else {
		setManv(data.manv);         // 
	  setRole(data.role);
	  setLoggedIn(true);
	  fetchLopList(data.manv, data.role); // ✅ gọi lấy lớp theo quyền
    }
  }
  
  // Lấy danh sách học viên theo MaLop
async function fetchStudents(maLop) {
  // 1. Lấy học viên
  const { data: studentData, error: studentError } = await supabase
    .from("tbl_hv")
    .select("*")
    .eq("malop", maLop)
	.neq("trangthai", "Đã Nghỉ");  // ⬅️ Chỉ lấy học viên chưa nghỉ

  if (studentError) {
    console.error("Lỗi tải học viên:", studentError.message);
    return;
  }

  setStudents(studentData);
  setSoLuongHocVien(studentData.length);

  // 2. Lấy trạng thái và ghi chú gần nhất của từng học viên
  const { data: diemDanhData, error: diemDanhError } = await supabase
    .from("tbl_diemdanh")
    .select("mahv, trangthai, ghichu, ngay")
    .in("mahv", studentData.map((s) => s.mahv))
    .order("ngay", { ascending: false });

  if (diemDanhError) {
    console.error("Lỗi lấy điểm danh:", diemDanhError.message);
  }

	  const today = new Date();
	today.setHours(0, 0, 0, 0); // reset về 00:00 hôm nay

	const attendanceMap = {};
	const notesMap = {};

	const seenToday = new Set();
	const seenBefore = new Set();

	for (const record of diemDanhData || []) {
	  const recordDate = new Date(record.ngay);
	  recordDate.setHours(0, 0, 0, 0); // so sánh theo ngày, bỏ giờ

	  const isToday = recordDate.getTime() === today.getTime();
	  const mahv = record.mahv;

	  if (isToday && !seenToday.has(mahv)) {
		attendanceMap[mahv] = record.trangthai || "Có mặt";
		notesMap[mahv] = record.ghichu || "";
		seenToday.add(mahv);
	  } else if (!isToday && !seenToday.has(mahv) && !seenBefore.has(mahv)) {
		// chỉ lấy ghi chú gần nhất nếu không có bản ghi hôm nay
		notesMap[mahv] = record.ghichu || "";
		seenBefore.add(mahv);
	  }
	}

	// Gán mặc định nếu chưa có dữ liệu
	for (const s of studentData) {
	  if (!attendanceMap[s.mahv]) attendanceMap[s.mahv] = "Có mặt";
	  if (!notesMap[s.mahv]) notesMap[s.mahv] = "";
	}

	setAttendance(attendanceMap);
	setNotes(notesMap);
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
    const today = new Date().toISOString().split("T")[0]; // ngày hôm nay
  const payload = students.map((s) => ({
    mahv: s.mahv,
    ngay: today,
    trangthai: attendance[s.mahv],
	  ghichu: notes[s.mahv] || ""
  }));

  const { data, error } = await supabase
    .from("tbl_diemdanh")
    .upsert(payload, { onConflict: ["mahv", "ngay"] });

  if (error) {
    alert("Lỗi lưu điểm danh: " + error.message);
  } else {
    alert("✅ Điểm danh đã được lưu thành công!");
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
          onClick={() => {
  if (selectedLop) fetchStudents(selectedLop);
  else alert("Vui lòng chọn lớp trước khi tải danh sách.");
}}
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
          Tải danh sách lớp
        </button>
		
        <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: 20 }}>📋 Danh sách điểm danh</h2>
		  <p>Tổng số học viên: {soLuongHocVien}</p>
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
                    value="Có mặt"
                    checked={attendance[student.mahv] === "Có mặt"}
                    onChange={() => handleAttendanceChange(student.mahv, "Có mặt")}
                    style={{ accentColor: "#27ae60" }}
                  />
                  Có mặt ✅
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="Nghỉ phép"
                    checked={attendance[student.mahv] === "Nghỉ phép"}
                    onChange={() => handleAttendanceChange(student.mahv, "Nghỉ phép")}
                    style={{ accentColor: "#f39c12" }}
                  />
                  Nghỉ phép 🟡
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="Nghỉ không phép"
                    checked={attendance[student.mahv] === "Nghỉ không phép"}
                    onChange={() => handleAttendanceChange(student.mahv, "Nghỉ không phép")}
                    style={{ accentColor: "#e74c3c" }}
                  />
                  Nghỉ không phép ❌
                </label>
              </div>
			  <div style={{ marginTop: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>
    Ghi chú:
    <input
      type="text"
      placeholder="Nhập ghi chú nếu có..."
      value={notes[student.mahv] || ""}
      onChange={(e) =>
        setNotes((prev) => ({
          ...prev,
          [student.mahv]: e.target.value
        }))
      }
      style={{
        width: "100%",
        marginTop: "4px",
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        fontSize: "14px"
      }}
    />
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
