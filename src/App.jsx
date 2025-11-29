// Clean fixed full App.jsx
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

  async function loadTodayData() {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("tbl_diemdanh")
      .select("mahv, trangthai, ghichu")
      .eq("ngay", today);

    if (!data) return;

    setAttendance((prev) => {
      const next = { ...prev };
      data.forEach((r) => {
        if (next[r.mahv] !== undefined) next[r.mahv] = r.trangthai || "Có mặt";
      });
      return next;
    });

    setNotes((prev) => {
      const next = { ...prev };
      data.forEach((r) => {
        if (next[r.mahv] !== undefined) next[r.mahv] = r.ghichu || "";
      });
      return next;
    });

    setCheckFlags((prev) => {
      const next = { ...prev };
      data.forEach((r) => {
        if (next[r.mahv] !== undefined) {
          const g = r.ghichu || "";
          next[r.mahv] = {
            tot: g.includes("Tốt"),
            tienbo: g.includes("Tiến bộ"),
            coGang: g.includes("Có cố gắng"),
            lamBaiTap: g.includes("Làm bài tập"),
          };
        }
      });
      return next;
    });
  }

  useEffect(() => {
    if (students.length > 0) loadTodayData();
  }, [students]);

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
        <div style={{ backgroundColor: "#f4f6f8", borderRadius: 12, padding: 30 }}>
          <h2 style={{ textAlign: "center" }}>🔐 Đăng nhập điểm danh</h2>

          <div style={{ display: "flex", gap: "8px", marginTop: 6 }}>
  <input
    type="text"
    placeholder="Ghi chú..."
    value={notes[student.mahv] || ""}
    onChange={(e) => setNotes((prev) => ({ ...prev, [student.mahv]: e.target.value }))}
    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc" }}
  />

  <button
    onClick={async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("tbl_alert").insert([
        {
          manv: manv,
          mahv: student.mahv,
          time: now,
          ghichu: notes[student.mahv] || "",
        },
      ]);
      if (error) alert("❌ Lỗi gửi cảnh báo!");
      else alert("🔴 Đã gửi cảnh báo!");
    }}
    style={{
      backgroundColor: "#e74c3c",
      color: "white",
      border: "none",
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: "18px",
    }}
  >
    ⚠️
  </button>
</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 10 }} />

          <button onClick={handleLogin} style={{ width: "100%", padding: 12, marginTop: 10 }}>Đăng nhập</button>
        </div>
      ) : (
        <>
          <div style={boxStyle}>
            <h2>📘 Điểm danh theo lớp</h2>

            <select value={selectedLop} onChange={(e) => setSelectedLop(e.target.value)} style={{ width: "100%", padding: 10 }}>
              <option value="">-- Chọn lớp --</option>
              {lopList.map((lop) => (
                <option key={lop.malop} value={lop.malop}>{lop.tenlop}</option>
              ))}
            </select>

            <button onClick={() => (selectedLop ? fetchStudents(selectedLop) : alert("Chọn lớp"))} style={{ width: "100%", padding: 10, marginTop: 10 }}>Tải danh sách lớp</button>

            {students.map((student) => (
              <div key={student.mahv} style={{ background: "#fff", padding: 16, borderRadius: 10, marginTop: 10 }}>
