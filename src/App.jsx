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

  // thêm state tìm kiếm
  const [searchName, setSearchName] = useState("");
  const [searchMahv, setSearchMahv] = useState("");

  // lấy danh sách lớp
  async function fetchLopList(manv, role) {
    let query = supabase
      .from("tbl_lop")
      .select("malop, tenlop")
      .neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") {
      query = query.eq("manv", manv);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Lỗi tải danh sách lớp:", error.message);
    } else {
      setLopList(data);
    }
  }

  useEffect(() => {
    if (manv && role) {
      fetchLopList(manv, role);
    }
  }, [manv, role]);

  // đăng nhập
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
      setManv(data.manv);
      setRole(data.role);
      setLoggedIn(true);
      fetchLopList(data.manv, data.role);
    }
  }

  // lấy học viên theo lớp
  async function fetchStudents(maLop) {
    const { data: studentData, error: studentError } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop)
      .neq("trangthai", "Đã Nghỉ")
      .order("tenhv", { ascending: true });

    if (studentError) {
      console.error("Lỗi tải học viên:", studentError.message);
      return;
    }

    setStudents(studentData);
    setSoLuongHocVien(studentData.length);

    // lấy trạng thái điểm danh gần nhất
    const { data: diemDanhData, error: diemDanhError } = await supabase
      .from("tbl_diemdanh")
      .select("mahv, trangthai, ghichu, ngay")
      .in("mahv", studentData.map((s) => s.mahv))
      .order("ngay", { ascending: false });

    if (diemDanhError) {
      console.error("Lỗi lấy điểm danh:", diemDanhError.message);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceMap = {};
    const notesMap = {};
    const seenToday = new Set();
    const seenBefore = new Set();

    for (const record of diemDanhData || []) {
      const recordDate = new Date(record.ngay);
      recordDate.setHours(0, 0, 0, 0);
      const isToday = recordDate.getTime() === today.getTime();
      const mahv = record.mahv;

      if (isToday && !seenToday.has(mahv)) {
        attendanceMap[mahv] = record.trangthai || "Có mặt";
        notesMap[mahv] = record.ghichu || "";
        seenToday.add(mahv);
      } else if (
        !isToday &&
        !seenToday.has(mahv) &&
        !seenBefore.has(mahv)
      ) {
        notesMap[mahv] = record.ghichu || "";
        seenBefore.add(mahv);
      }
    }

    for (const s of studentData) {
      if (!attendanceMap[s.mahv]) attendanceMap[s.mahv] = "Có mặt";
      if (!notesMap[s.mahv]) notesMap[s.mahv] = "";
    }

    setAttendance(attendanceMap);
    setNotes(notesMap);
  }

  // tìm học viên theo mã (nếu không chọn lớp)
  async function fetchStudentByMahv(mahv) {
    if (!mahv) return;

    const { data, error } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("mahv", mahv)
      .neq("trangthai", "Đã Nghỉ")
      .single();

    if (error || !data) {
      alert("❌ Không tìm thấy học viên với mã: " + mahv);
      return;
    }

    setStudents([data]);
    setSoLuongHocVien(1);
    setAttendance({ [data.mahv]: "Có mặt" });
    setNotes({ [data.mahv]: "" });
  }

  // toggle điểm danh
  function handleAttendanceChange(mahv, status) {
    setAttendance((prev) => ({
      ...prev,
      [mahv]: status,
    }));
  }

  // lưu điểm danh
  async function handleSubmit() {
    const today = new Date().toISOString().split("T")[0];
    const payload = students.map((s) => ({
      mahv: s.mahv,
      ngay: today,
      trangthai: attendance[s.mahv],
      ghichu: notes[s.mahv] || "",
    }));

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });

    if (error) {
      alert("Lỗi lưu điểm danh: " + error.message);
    } else {
      alert("✅ Điểm danh đã được lưu thành công!");
    }
  }

  // lọc theo tên
  const filteredStudents = students.filter((s) =>
    s.tenhv.toLowerCase().includes(searchName.toLowerCase())
  );

  return (
    <div style={{ padding: "30px", maxWidth: "720px", margin: "40px auto" }}>
      {!loggedIn ? (
        <div
          style={{
            backgroundColor: "#f4f6f8",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              color: "#2c3e50",
              marginBottom: "24px",
            }}
          >
            🔐 Đăng nhập điểm danh
          </h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
          />
          <button onClick={handleLogin}>Đăng nhập</button>
        </div>
      ) : (
        <>
          {/* chọn lớp */}
          <div style={{ marginBottom: "20px" }}>
            <label>Chọn lớp:</label>
            <select
              value={selectedLop}
              onChange={(e) => setSelectedLop(e.target.value)}
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
          >
            Tải danh sách lớp
          </button>

          {/* tìm kiếm theo tên */}
          <div style={{ marginTop: "20px" }}>
            <label>Tìm theo tên học viên:</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nhập tên học viên..."
            />
          </div>

          {/* tìm theo mã hv */}
          <div style={{ marginTop: "20px" }}>
            <label>Điểm danh theo mã học viên:</label>
            <input
              type="text"
              value={searchMahv}
              onChange={(e) => setSearchMahv(e.target.value)}
              placeholder="Nhập mã học viên..."
            />
            <button onClick={() => fetchStudentByMahv(searchMahv)}>Tìm</button>
          </div>

          <h2>📋 Danh sách điểm danh</h2>
          <p>Tổng số học viên: {soLuongHocVien}</p>

          {filteredStudents.map((student) => (
            <div
              key={student.mahv}
              style={{
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            >
              <b>{student.tenhv}</b> ({student.mahv})
              <div>
                <label>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="Có mặt"
                    checked={attendance[student.mahv] === "Có mặt"}
                    onChange={() =>
                      handleAttendanceChange(student.mahv, "Có mặt")
                    }
                  />
                  Có mặt
                </label>
                <label>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="Nghỉ phép"
                    checked={attendance[student.mahv] === "Nghỉ phép"}
                    onChange={() =>
                      handleAttendanceChange(student.mahv, "Nghỉ phép")
                    }
                  />
                  Nghỉ phép
                </label>
                <label>
                  <input
                    type="radio"
                    name={`attendance-${student.mahv}`}
                    value="Nghỉ không phép"
                    checked={attendance[student.mahv] === "Nghỉ không phép"}
                    onChange={() =>
                      handleAttendanceChange(student.mahv, "Nghỉ không phép")
                    }
                  />
                  Nghỉ không phép
                </label>
              </div>
              <input
                type="text"
                placeholder="Ghi chú..."
                value={notes[student.mahv] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [student.mahv]: e.target.value,
                  }))
                }
              />
            </div>
          ))}

          <button onClick={handleSubmit}>✅ Lưu điểm danh</button>
        </>
      )}
    </div>
  );
}

export default App;
