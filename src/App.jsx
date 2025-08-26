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

  // Calendar states
  const [calendarOpen, setCalendarOpen] = useState({});      // { mahv: boolean }
  const [calendarMonth, setCalendarMonth] = useState({});    // { mahv: Date (first day of month) }
  const [historyMap, setHistoryMap] = useState({});          // { mahv: { 'YYYY-MM-DD': 'Có mặt' | 'Nghỉ phép' | 'Nghỉ không phép' } }

  // Colors for statuses
  const STATUS_COLOR = {
    "Có mặt": "#27ae60",         // xanh
    "Nghỉ phép": "#f1c40f",      // vàng
    "Nghỉ không phép": "#e67e22" // cam
  };

  // ====================== Utils (calendar) ======================
  function toISODate(d) {
    const tzOff = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOff * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  function getMonthRange(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { first, last };
  }

  function daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // ====================== Fetch Lớp ======================
  async function fetchLopList(manv, role) {
    let query = supabase
      .from("tbl_lop")
      .select("malop, tenlop")
      .neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") {
      query = query.eq("manv", manv); // chỉ lấy lớp của chính giảng viên đó
    }

    const { data, error } = await query;

    if (error) {
      console.error("Lỗi tải danh sách lớp:", error.message);
    } else {
      setLopList(data || []);
    }
  }

  useEffect(() => {
    if (manv && role) {
      fetchLopList(manv, role);
    }
  }, [manv, role]);

  // ====================== Đăng nhập ======================
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

  // ====================== Fetch Học viên + trạng thái gần nhất ======================
  async function fetchStudents(maLop) {
    // Reset calendar UI khi đổi lớp
    setCalendarOpen({});
    setCalendarMonth({});
    setHistoryMap({});

    // 1) Lấy học viên
    const { data: studentData, error: studentError } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop)
      .neq("trangthai", "Đã Nghỉ");

    if (studentError) {
      console.error("Lỗi tải học viên:", studentError.message);
      return;
    }

    setStudents(studentData || []);
    setSoLuongHocVien((studentData || []).length);

    // 2) Lấy trạng thái & ghi chú gần nhất theo từng học viên
    const { data: diemDanhData, error: diemDanhError } = await supabase
      .from("tbl_diemdanh")
      .select("mahv, trangthai, ghichu, ngay")
      .in("mahv", (studentData || []).map((s) => s.mahv))
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
      } else if (!isToday && !seenToday.has(mahv) && !seenBefore.has(mahv)) {
        // chỉ lấy ghi chú gần nhất nếu không có bản ghi hôm nay
        notesMap[mahv] = record.ghichu || "";
        seenBefore.add(mahv);
      }
    }

    // Gán mặc định nếu chưa có dữ liệu
    for (const s of studentData || []) {
      if (!attendanceMap[s.mahv]) attendanceMap[s.mahv] = "Có mặt";
      if (!notesMap[s.mahv]) notesMap[s.mahv] = "";
    }

    setAttendance(attendanceMap);
    setNotes(notesMap);
  }

  // ====================== Toggle trạng thái điểm danh ======================
  function handleAttendanceChange(mahv, status) {
    setAttendance((prev) => ({
      ...prev,
      [mahv]: status,
    }));
  }

  // ====================== Lưu điểm danh ======================
  async function handleSubmit() {
    const today = new Date().toISOString().split("T")[0];
    const payload = students.map((s) => ({
      mahv: s.mahv,
      ngay: today,
      trangthai: attendance[s.mahv],
      ghichu: notes[s.mahv] || ""
    }));

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: ["mahv", "ngay"] });

    if (error) {
      alert("Lỗi lưu điểm danh: " + error.message);
    } else {
      alert("✅ Điểm danh đã được lưu thành công!");
    }
  }

  // ====================== Lịch sử điểm danh theo tháng ======================
  async function fetchAttendanceHistoryForMonth(mahv, monthDate) {
  const { first, last } = getMonthRange(monthDate);
  const from = toISODate(first);
  const to = toISODate(last);

  const { data, error } = await supabase
    .from("tbl_diemdanh")
    .select("mahv, trangthai, ghichu, ngay") // 👈 thêm ghichu
    .eq("mahv", mahv)
    .gte("ngay", from)
    .lte("ngay", to)
    .order("ngay", { ascending: true });

  if (error) {
    console.error("Lỗi lấy lịch sử điểm danh:", error.message);
    return;
  }

  const map = {};
  for (const r of data || []) {
    const iso = toISODate(new Date(r.ngay));
    map[iso] = {
      status: r.trangthai || "",
      note: (r.ghichu || "").trim()
    };
  }
  setHistoryMap(prev => ({ ...prev, [mahv]: map }));
}

  function toggleCalendar(mahv) {
    setCalendarOpen(prev => {
      const willOpen = !prev[mahv];
      if (willOpen) {
        const startMonth = new Date();
        startMonth.setDate(1);
        setCalendarMonth(m => ({ ...m, [mahv]: startMonth }));
        fetchAttendanceHistoryForMonth(mahv, startMonth);
      }
      return { ...prev, [mahv]: willOpen };
    });
  }

  function changeMonth(mahv, delta) {
    setCalendarMonth(prev => {
      const cur = prev[mahv] || new Date();
      const next = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
      const updated = { ...prev, [mahv]: next };
      fetchAttendanceHistoryForMonth(mahv, next);
      return updated;
    });
  }

  // ====================== Calendar component ======================
  function AttendanceCalendar({ mahv, monthDate }) {
    const { first } = getMonthRange(monthDate);
    const firstWeekday = new Date(first.getFullYear(), first.getMonth(), 1).getDay(); // 0=CN
    const totalDays = daysInMonth(monthDate);

    // Build cells (leading blanks + days)
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    const m = monthDate.getMonth() + 1;
    const y = monthDate.getFullYear();
    const monthYearLabel = `${m.toString().padStart(2, "0")}/${y}`;
    const studentHistory = historyMap[mahv] || {};

    return (
      <div style={{ marginTop: 12, border: "1px solid #e1e4e8", borderRadius: 10, padding: 12, background: "#fff" }}>
        {/* Header: chuyển tháng */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button
            onClick={() => changeMonth(mahv, -1)}
            style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, background: "#f8f9fa", cursor: "pointer" }}
          >
            ⟵ Tháng trước
          </button>
          <div style={{ fontWeight: 600, color: "#34495e" }}>Lịch {monthYearLabel}</div>
          <button
            onClick={() => changeMonth(mahv, 1)}
            style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, background: "#f8f9fa", cursor: "pointer" }}
          >
            Tháng sau ⟶
          </button>
        </div>

        {/* Header thứ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 6
          }}
        >
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
            <div key={d} style={{ textAlign: "center", fontWeight: 600 }}>{d}</div>
          ))}
        </div>

        {/* Grid ngày */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />;

            const d = new Date(y, monthDate.getMonth(), day);
            const iso = toISODate(d);
            const entry = studentHistory[iso];
            const status = entry?.status || "";
            const bg = STATUS_COLOR[status] || "#f0f2f5";
            const color = status ? "#fff" : "#333";

            return (
              <div
                key={iso}
                title={status || "Không có dữ liệu"}
                style={{
                  borderRadius: 8,
                  padding: "10px 6px",
                  textAlign: "center",
                  background: bg,
                  color,
                  minHeight: 46,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600
                }}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Chú thích màu */}
        <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 12, color: "#4b5563", flexWrap: "wrap" }}>
          {Object.entries(STATUS_COLOR).map(([k, v]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: v, display: "inline-block" }} />
              {k}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: "#f0f2f5", display: "inline-block" }} />
            Không có dữ liệu
          </span>
        </div>

        {/* Danh sách ghi chú theo ngày */}
{(() => {
  const noteEntries = Object.entries(studentHistory)
    .filter(([dateISO, v]) => v?.note)              // chỉ lấy ngày có note
    .sort(([a], [b]) => (a < b ? -1 : 1));          // sắp tăng dần theo ngày

  if (noteEntries.length === 0) return (
    <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
      Không có ghi chú trong tháng này.
    </div>
  );

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#374151" }}>Ghi chú theo ngày</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {noteEntries.map(([dateISO, v]) => {
          const [yyyy, mm, dd] = dateISO.split("-");
          const badgeColor = STATUS_COLOR[v.status] || "#9ca3af";
          return (
            <div
              key={dateISO}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 10px",
                background: "#fafafa"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 3, background: badgeColor, display: "inline-block"
                }} />
                <span style={{ fontWeight: 600 }}>{`${dd}/${mm}`}</span>
                {v.status && (
                  <span style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    borderRadius: 6,
                    fontSize: 12,
                    background: "#eef2ff",
                    color: "#374151",
                    border: "1px solid #e5e7eb"
                  }}>
                    {v.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>
                {v.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
})()}
      </div>
    );
  }

  // ====================== UI ======================
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

                <div style={{ display: "flex", gap: "20px", fontSize: "14px", flexWrap: "wrap" }}>
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

                {/* Ghi chú */}
                <div style={{ marginTop: "10px" }}>
                  <label style={{ fontSize: "13px", color: "#555", display: "block" }}>
                    Ghi chú:
                    <textarea
                      placeholder="Nhập ghi chú nếu có..."
                      value={notes[student.mahv] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [student.mahv]: e.target.value
                        }))
                      }
                      rows={4}
                      style={{
                        width: "100%",
                        marginTop: "4px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        overflow: "hidden",
                        resize: "vertical",
                        minHeight: "80px"
                      }}
                    ></textarea>
                  </label>
                </div>

                {/* Nút xem/ẩn lịch sử */}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => toggleCalendar(student.mahv)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    {calendarOpen[student.mahv] ? "Ẩn lịch sử điểm danh" : "Xem lịch sử điểm danh"}
                  </button>
                </div>

                {/* Calendar */}
                {calendarOpen[student.mahv] && calendarMonth[student.mahv] && (
                  <AttendanceCalendar
                    mahv={student.mahv}
                    monthDate={calendarMonth[student.mahv]}
                  />
                )}
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
