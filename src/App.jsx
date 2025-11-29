// Full updated App.jsx with checkboxes integrated
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

  const [checkFlags, setCheckFlags] = useState({});

  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchNotes, setSearchNotes] = useState({});
  const [searchAttendance, setSearchAttendance] = useState({});

  const [searchMahv, setSearchMahv] = useState("");
  const [mahvResult, setMahvResult] = useState(null);
  const [mahvAttendance, setMahvAttendance] = useState("");
  const [mahvNote, setMahvNote] = useState("");

  async function fetchLopList(manv, role) {
    let query = supabase.from("tbl_lop").select("malop, tenlop").neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") query = query.eq("manv", manv);

    const { data } = await query;
    if (data) setLopList(data);
  }

  useEffect(() => {
    if (manv && role) fetchLopList(manv, role);
  }, [manv, role]);

  async function handleLogin() {
    const { data, error } = await supabase
      .from("tbl_nv")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Sai tài khoản hoặc mật khẩu!");
      return;
    }

    setManv(data.manv);
    setRole(data.role);
    setLoggedIn(true);
    fetchLopList(data.manv, data.role);
  }

  async function fetchStudents(maLop) {
    const { data } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop)
      .neq("trangthai", "Đã Nghỉ")
      .order("tenhv", { ascending: true });

    setStudents(data || []);
    setSoLuongHocVien(data?.length || 0);

    const att = {};
    const note = {};
    const flags = {};

    (data || []).forEach((s) => {
      att[s.mahv] = "Có mặt";
      note[s.mahv] = "";
      flags[s.mahv] = {
        tot: false,
        tienbo: false,
        coGang: false,
        lamBaiTap: false,
      };
    });

    setAttendance(att);
    setNotes(note);
    setCheckFlags(flags);
  }

  function handleAttendanceChange(mahv, status) {
    setAttendance((prev) => ({ ...prev, [mahv]: status }));
  }

  function handleCheckChange(mahv, field) {
    setCheckFlags((prev) => ({
      ...prev,
      [mahv]: {
        ...prev[mahv],
        [field]: !prev[mahv][field],
      },
    }));
  }

  async function handleSubmit() {
    const today = new Date().toISOString().split("T")[0];

    const payload = students.map((s) => ({
      mahv: s.mahv,
      ngay: today,
      trangthai: attendance[s.mahv],
      ghichu: [
        checkFlags[s.mahv]?.tot ? "Tốt" : "",
        checkFlags[s.mahv]?.tienbo ? "Tiến bộ" : "",
        checkFlags[s.mahv]?.coGang ? "Có cố gắng" : "",
        checkFlags[s.mahv]?.lamBaiTap ? "Làm bài tập" : "",
        notes[s.mahv] || "",
      ]
        .filter((x) => x !== "")
        .join("; "),
    }));

    const { error } = await supabase.from("tbl_diemdanh").upsert(payload, {
      onConflict: "mahv,ngay",
    });

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  const boxStyle = {
    backgroundColor: "#f9f9f9",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

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
            style={{ textAlign: "center", color: "#2c3e50", marginBottom: "24px" }}
          >
            🔐 Đăng nhập điểm danh
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: "500", marginBottom: 6 }}>
              Tên đăng nhập:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc" }}
            />
          </div>

          <button
            onClick={handleLogin}
            style={{ width: "100%", padding: 12, backgroundColor: "#3498db", color: "#fff", borderRadius: 6 }}
          >
            Đăng nhập
          </button>
        </div>
      ) : (
        <>
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>📘 Điểm danh theo lớp</h2>

            <select
              value={selectedLop}
              onChange={(e) => setSelectedLop(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 6 }}
            >
              <option value="">-- Chọn lớp --</option>
              {lopList.map((lop) => (
                <option key={lop.malop} value={lop.malop}>
                  {lop.tenlop}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                selectedLop ? fetchStudents(selectedLop) : alert("Chọn lớp trước")
              }
              style={{ width: "100%", padding: 10, backgroundColor: "#3498db", color: "#fff", borderRadius: 6 }}
            >
              Tải danh sách lớp
            </button>

            <p>Tổng số học viên: {soLuongHocVien}</p>

            {students.map((student) => (
              <div
                key={student.mahv}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: "#fff",
                  borderLeft: "5px solid #3498db",
                  marginBottom: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                  {student.tenhv}
                </div>

                <div style={{ display: "flex", gap: 20 }}>
                  {["Có mặt", "Vắng mặt"].map((status) => (
                    <label key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="radio"
                        name={`attendance-${student.mahv}`}
                        checked={attendance[student.mahv] === status}
                        onChange={() => handleAttendanceChange(student.mahv, status)}
                      />
                      {status}
                    </label>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "14px", marginTop: 8 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkFlags[student.mahv]?.tot || false}
                      onChange={() => handleCheckChange(student.mahv, "tot")}
                    />
                    Tốt
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkFlags[student.mahv]?.tienbo || false}
                      onChange={() => handleCheckChange(student.mahv, "tienbo")}
                    />
                    Tiến bộ
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkFlags[student.mahv]?.coGang || false}
                      onChange={() => handleCheckChange(student.mahv, "coGang")}
                    />
                    Có cố gắng
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkFlags[student.mahv]?.lamBaiTap || false}
                      onChange={() => handleCheckChange(student.mahv, "lamBaiTap")}
                    />
                    Làm bài tập
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Ghi chú..."
                  value={notes[student.mahv] || ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [student.mahv]: e.target.value }))
                  }
                  style={{ width: "100%", marginTop: 6, padding: "6px 8px", borderRadius: 6 }}
                />
              </div>
            ))}

            {students.length > 0 && (
              <button
                onClick={handleSubmit}
                style={{ width: "100%", padding: 12, backgroundColor: "#2ecc71", color: "#fff", borderRadius: 6 }}
              >
                ✅ Lưu điểm danh lớp
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
