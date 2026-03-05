import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
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
    
    // Load dữ liệu điểm danh ngày đã chọn
    await loadAttendanceByDate(maLop, selectedDate);
  }
// LOAD ĐIỂM DANH NGÀY (date)
  async function loadAttendanceByDate(maLop, dateStr) {
 const resNoiDung = await supabase
    
    const { data } = await supabase
      .from("tbl_diemdanh")
      .select("*")
      .eq("ngay", dateStr);

    if (!data) return;

    setAttendance((prev) => {
      const updated = { ...prev };
      data.forEach((row) => {
        if (updated[row.mahv] !== undefined) {
          updated[row.mahv] = row.trangthai;
        }
      });
      return updated;
    });

    setNotes((prev) => {
      const updated = { ...prev };
      data.forEach((row) => {
        if (updated[row.mahv] !== undefined) {
          updated[row.mahv] = row.ghichu || "";
        }
      });
      return updated;
    });
  }
  async function handleSubmit() {
    const diemDanhNgay = selectedDate;
    const payload = students.map((s) => ({
      mahv: s.mahv,
      ngay: diemDanhNgay,
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
      .select(`
        *,
        tenlop:tbl_lop.tenlop
      `)
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
    const diemDanhNgay = selectedDate;
    const payload = searchResults.map((s) => ({
      mahv: s.mahv,
      ngay: diemDanhNgay,
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
    const diemDanhNgay = selectedDate;
    const payload = [
      {
        mahv: mahvResult.mahv,
        ngay: diemDanhNgay,
        trangthai: mahvAttendance,
        ghichu: mahvNote,
      },
    ];
    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });
    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

// ... giữ nguyên phần import, state, hàm fetch như code bạn gửi ...

// UI
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
      <div style={{
        backgroundColor: "#f4f6f8",
        borderRadius: "12px",
        padding: "30px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: "24px" }}>
          🔐 Đăng nhập điểm danh
        </h2>
        {/* Username */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "500", marginBottom: "6px", color: "#34495e" }}>
            Tên đăng nhập:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", outlineColor: "#3498db" }}
          />
        </div>
        {/* Password */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "500", marginBottom: "6px", color: "#34495e" }}>
            Mật khẩu:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", outlineColor: "#3498db" }}
          />
        </div>
        <button
          onClick={handleLogin}
          style={{ width: "100%", padding: "12px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
        >
          Đăng nhập
        </button>
      </div>
    ) : (
      <>
        {/* ---------- PHẦN 1: LỚP ---------- */}
        <div style={boxStyle}>
          <h2 style={{ color: "#2c3e50" }}>📘 Điểm danh theo lớp</h2>
          { (role === "Quản lý" || role === "Giám đốc") && (
            <div style={{ margin: "12px 0" }}>
              <label>📅 Chọn ngày điểm danh:</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ marginLeft: "10px", padding: "6px" }} />
            </div>
          )}
          <select
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="">-- Chọn lớp --</option>
            {lopList.map((lop) => (
              <option key={lop.malop} value={lop.malop}>{lop.tenlop}</option>
            ))}
          </select>
          <button
            onClick={() => selectedLop ? fetchStudents(selectedLop) : alert("Chọn lớp trước")}
            style={{ width: "100%", padding: "10px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", marginBottom: "16px" }}
          >
            Tải danh sách lớp
          </button>

          <p>Tổng số học viên: {soLuongHocVien}</p>
          {students.map((student) => (
            <div key={student.mahv} style={{
              padding: "16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fff", borderLeft: "5px solid #3498db", marginBottom: "12px"
            }}>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px", color: "#34495e" }}>
                {student.tenhv}
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                {["Có mặt","Vắng mặt"].map(status => (
                  <label key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name={`attendance-${student.mahv}`}
                      value={status}
                      checked={attendance[student.mahv] === status}
                                onChange={() =>
                          setAttendance((prev) => ({
                            ...prev,
                            [student.mahv]: status,
                          }))
                        }
                    /> {status}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ghi chú..."
                value={notes[student.mahv] || ""}
                onChange={(e) => setNotes(prev => ({ ...prev, [student.mahv]: e.target.value }))}
                style={{ width: "100%", marginTop: "6px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>
          ))}
          {students.length > 0 && (
            <button
              onClick={handleSubmit}
              style={{ width: "100%", padding: "12px", backgroundColor: "#2ecc71", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600" }}
            >
              ✅ Lưu điểm danh lớp
            </button>
          )}
        </div>

        {/* ---------- PHẦN 2: TÊN ---------- */}
        <div style={boxStyle}>
          <h2 style={{ color: "#2c3e50" }}>🔎 Điểm danh theo tên HV</h2>
          <input
            type="text"
            placeholder="Nhập tên học viên..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
          {searchResults.map((s) => (
            <div key={s.mahv} style={{
              padding: "16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fff", borderLeft: "5px solid #3498db", marginBottom: "12px"
            }}>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px", color: "#34495e" }}>
                {s.tenhv} - {s.tenlop}
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                {["Có mặt","Vắng mặt"].map(status => (
                  <label key={status}>
                    <input
                      type="radio"
                      name={`search-attendance-${s.mahv}`}
                      value={status}
                      checked={searchAttendance[s.mahv] === status}
                      onChange={() => setSearchAttendance(prev => ({ ...prev, [s.mahv]: status }))}
                    /> {status}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ghi chú..."
                value={searchNotes[s.mahv] || ""}
                onChange={(e) => setSearchNotes(prev => ({ ...prev, [s.mahv]: e.target.value }))}
                style={{ width: "100%", marginTop: "6px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>
          ))}
          {searchResults.length > 0 && (
            <button
              onClick={handleSearchSubmit}
              style={{ width: "100%", padding: "12px", backgroundColor: "#2ecc71", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600" }}
            >
              ✅ Lưu điểm danh tìm tên
            </button>
          )}
        </div>

        {/* ---------- PHẦN 3: MÃ ---------- */}
        <div style={boxStyle}>
          <h2 style={{ color: "#2c3e50" }}>💳 Điểm danh theo mã HV</h2>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Nhập mã học viên..."
              value={searchMahv}
              onChange={(e) => setSearchMahv(e.target.value)}
              style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            <button
              onClick={() => fetchStudentByMahv(searchMahv)}
              style={{ padding: "10px 16px", backgroundColor: "#9b59b6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600" }}
            >
              Tìm
            </button>
          </div>
          {mahvResult && (
            <div style={{
              padding: "16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fff", borderLeft: "5px solid #3498db", marginBottom: "12px"
            }}>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px", color: "#34495e" }}>
                {mahvResult.tenhv} ({mahvResult.mahv})
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                {["Có mặt","Vắng mặt"].map(status => (
                  <label key={status}>
                    <input
                      type="radio"
                      name="mahv-attendance"
                      value={status}
                      checked={mahvAttendance === status}
                      onChange={() => setMahvAttendance(status)}
                    /> {status}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ghi chú..."
                value={mahvNote}
                onChange={(e) => setMahvNote(e.target.value)}
                style={{ width: "100%", marginTop: "6px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
              <button
                onClick={handleMahvSubmit}
                style={{ width: "100%", marginTop: "10px", padding: "12px", backgroundColor: "#2ecc71", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600" }}
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
