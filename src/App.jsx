import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ================================
// SUPABASE
// ================================
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  // ------------------------
  // LOGIN
  // ------------------------
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [manv, setManv] = useState(null);
  const [role, setRole] = useState("");

  // ------------------------
  // LẤY DANH SÁCH LỚP GIÁO VIÊN ĐANG DẠY
  // (dùng cho lọc tìm theo tên)
  // ------------------------
  const [lopList, setLopList] = useState([]);

  async function fetchLopList(manv, role) {
    let query = supabase
      .from("tbl_lop")
      .select("malop, tenlop")
      .neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") query = query.eq("manv", manv);

    const { data } = await query;
    setLopList(data || []);
  }

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

  // ------------------------
  // PHẦN 1: TÌM THEO TÊN HV
  // ------------------------
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [searchAttendance, setSearchAttendance] = useState({});
  const [searchNotes, setSearchNotes] = useState({});

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchName.trim()) {
        setSearchResults([]);
        return;
      }

      const teacherClasses = lopList.map((l) => l.malop);

      const { data } = await supabase
        .from("tbl_hv")
        .select("*")
        .ilike("tenhv", `%${searchName}%`)
        .in("malop", teacherClasses)
        .neq("trangthai", "Đã Nghỉ")
        .limit(10);

      setSearchResults(data || []);

      // chuẩn bị dữ liệu radio / notes
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
  }, [searchName, lopList]);

  async function loadTodayDataForStudent(mahv) {
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("tbl_diemdanh")
      .select("*")
      .eq("mahv", mahv)
      .eq("ngay", today)
      .single();

    if (data) {
      setSearchAttendance((prev) => ({
        ...prev,
        [mahv]: data.trangthai,
      }));

      setSearchNotes((prev) => ({
        ...prev,
        [mahv]: data.ghichu || "",
      }));
    }
  }

  async function handleSelectStudent(hv) {
    await loadTodayDataForStudent(hv.mahv);
    setSelectedStudent(hv);
  }

  async function handleSearchSubmit() {
    if (!selectedStudent) return;

    const mahv = selectedStudent.mahv;
    const today = new Date().toISOString().split("T")[0];

    const payload = [
      {
        mahv,
        ngay: today,
        trangthai: searchAttendance[mahv],
        ghichu: searchNotes[mahv] || "",
      },
    ];

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // ------------------------
  // PHẦN 2: TÌM THEO MÃ HV
  // ------------------------
  const [searchMahv, setSearchMahv] = useState("");
  const [mahvResult, setMahvResult] = useState(null);
  const [mahvAttendance, setMahvAttendance] = useState("Có mặt");
  const [mahvNote, setMahvNote] = useState("");

  async function fetchStudentByMahv(mahv) {
    if (!mahv.trim()) return;

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

  // ================================
  // UI
  // ================================
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
        // ========= LOGIN =========
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

          {/* USERNAME */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "6px",
                color: "#34495e",
              }}
            >
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
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "6px",
                color: "#34495e",
              }}
            >
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
            }}
          >
            Đăng nhập
          </button>
        </div>
      ) : (
        <>
          {/* ============================
              TÌM THEO TÊN
          ============================ */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>🔎 Điểm danh theo tên</h2>

            <input
              type="text"
              placeholder="Nhập tên học viên..."
              value={searchName}
              onChange={(e) => {
                setSelectedStudent(null);
                setSearchName(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />

            {/* DROPDOWN */}
            {searchResults.length > 0 && !selectedStudent && (
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  marginBottom: "12px",
                }}
              >
                {searchResults.map((hv) => (
                  <div
                    key={hv.mahv}
                    onClick={() => handleSelectStudent(hv)}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {hv.tenhv} — {hv.malop}
                  </div>
                ))}
              </div>
            )}

            {/* CARD HV */}
            {selectedStudent && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  backgroundColor: "#fff",
                  borderLeft: "5px solid #3498db",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "16px",
                    marginBottom: "8px",
                    color: "#34495e",
                  }}
                >
                  {selectedStudent.tenhv} ({selectedStudent.mahv})
                </div>

                {/* STATUS */}
                <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                  {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name="selected-attendance"
                        value={st}
                        checked={
                          searchAttendance[selectedStudent.mahv] === st
                        }
                        onChange={() =>
                          setSearchAttendance((prev) => ({
                            ...prev,
                            [selectedStudent.mahv]: st,
                          }))
                        }
                      />{" "}
                      {st}
                    </label>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ghi chú..."
                  value={searchNotes[selectedStudent.mahv] || ""}
                  onChange={(e) =>
                    setSearchNotes((prev) => ({
                      ...prev,
                      [selectedStudent.mahv]: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <button
                  onClick={handleSearchSubmit}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "12px",
                    backgroundColor: "#2ecc71",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                  }}
                >
                  ✅ Lưu điểm danh
                </button>
              </div>
            )}
          </div>

          {/* ============================
              TÌM THEO MÃ HV
          ============================ */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>💳 Điểm danh theo mã HV</h2>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="Nhập mã học viên..."
                value={searchMahv}
                onChange={(e) => setSearchMahv(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
              <button
                onClick={() => fetchStudentByMahv(searchMahv)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#9b59b6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                }}
              >
                Tìm
              </button>
            </div>

            {mahvResult && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  backgroundColor: "#fff",
                  borderLeft: "5px solid #3498db",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "16px",
                    marginBottom: "8px",
                    color: "#34495e",
                  }}
                >
                  {mahvResult.tenhv} ({mahvResult.mahv})
                </div>

                <div style={{ display: "flex", gap: "20px" }}>
                  {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name="mahv-attendance"
                        value={st}
                        checked={mahvAttendance === st}
                        onChange={() => setMahvAttendance(st)}
                      />
                      {st}
                    </label>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ghi chú..."
                  value={mahvNote}
                  onChange={(e) => setMahvNote(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <button
                  onClick={handleMahvSubmit}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "12px",
                    backgroundColor: "#2ecc71",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                  }}
                >
                  ✅ Lưu điểm danh mã HV
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
