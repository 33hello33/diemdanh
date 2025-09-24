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

  // tìm theo tên
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchNotes, setSearchNotes] = useState({});
  const [searchAttendance, setSearchAttendance] = useState({});

  // tìm theo mã HV
  const [searchMahv, setSearchMahv] = useState("");
  const [mahvResult, setMahvResult] = useState(null);
  const [mahvAttendance, setMahvAttendance] = useState("");
  const [mahvNote, setMahvNote] = useState("");

  // ------------------------
  // PHẦN 1: LOGIN + CHỌN LỚP
  // ------------------------
  async function fetchLopList(manv, role) {
    let query = supabase
      .from("tbl_lop")
      .select("malop, tenlop")
      .neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") query = query.eq("manv", manv);

    const { data, error } = await query;
    if (!error) setLopList(data);
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
    (data || []).forEach((s) => {
      att[s.mahv] = "Có mặt";
      note[s.mahv] = "";
    });
    setAttendance(att);
    setNotes(note);
  }

  function handleAttendanceChange(mahv, status) {
    setAttendance((prev) => ({ ...prev, [mahv]: status }));
  }

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

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // ------------------------
  // PHẦN 2: TÌM THEO TÊN
  // ------------------------
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchName) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from("tbl_hv")
        .select("*")
        .ilike("tenhv", `%${searchName}%`)
        .neq("trangthai", "Đã Nghỉ")
        .limit(10);

      setSearchResults(data || []);
      const att = {};
      const note = {};
      (data || []).forEach((s) => {
        att[s.mahv] = "Có mặt";
        note[s.mahv] = "";
      });
      setSearchAttendance(att);
      setSearchNotes(note);
    }, 200);
    return () => clearTimeout(delay);
  }, [searchName]);

  async function handleSearchSubmit() {
    const today = new Date().toISOString().split("T")[0];
    const payload = searchResults.map((s) => ({
      mahv: s.mahv,
      ngay: today,
      trangthai: searchAttendance[s.mahv],
      ghichu: searchNotes[s.mahv] || "",
    }));
    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });
    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // ------------------------
  // PHẦN 3: TÌM THEO MÃ HV
  // ------------------------
  async function fetchStudentByMahv(mahv) {
    if (!mahv) return;
    const { data, error } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("mahv", mahv)
      .neq("trangthai", "Đã Nghỉ")
      .single();

    if (error || !data) {
      alert("❌ Không tìm thấy HV");
      setMahvResult(null);
      return;
    }
    setMahvResult(data);
    setMahvAttendance("Có mặt");
    setMahvNote("");
  }

  async function handleMahvSubmit() {
    if (!mahvResult) return;
    const today = new Date().toISOString().split("T")[0];
    const payload = [
      {
        mahv: mahvResult.mahv,
        ngay: today,
        trangthai: mahvAttendance,
        ghichu: mahvNote,
      },
    ];
    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });
    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // ------------------------
  // UI
  // ------------------------
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
        // ---------- LOGIN ----------
        <div style={boxStyle}>
          <h2 style={{ textAlign: "center", color: "#2c3e50" }}>
            🔐 Đăng nhập điểm danh
          </h2>
          <input
            type="text"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", margin: "10px 0", padding: "10px" }}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", margin: "10px 0", padding: "10px" }}
          />
          <button
            onClick={handleLogin}
            style={{ width: "100%", padding: "12px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "6px" }}
          >
            Đăng nhập
          </button>
        </div>
      ) : (
        <>
          {/* ---------- PHẦN 1 ---------- */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>📘 Điểm danh theo lớp</h2>
            {/* ... phần 1 code ở đây ... */}
          </div>

          {/* ---------- PHẦN 2 ---------- */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>🔎 Điểm danh theo tên HV</h2>
            {/* ... phần 2 code ở đây ... */}
          </div>

          {/* ---------- PHẦN 3 ---------- */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>💳 Điểm danh theo mã HV</h2>
            {/* ... phần 3 code ở đây ... */}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
