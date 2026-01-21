import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  // LOGIN
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [manv, setManv] = useState(null);
  const [role, setRole] = useState("");

  // LỚP
  const [lopList, setLopList] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");

  // HỌC VIÊN
  const [students, setStudents] = useState([]);
  const [soLuongHocVien, setSoLuongHocVien] = useState(0);

  // ĐIỂM DANH
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState({});
  const [notes, setNotes] = useState({});

  // TÌM THEO TÊN
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchAttendance, setSearchAttendance] = useState({});
  const [searchNotes, setSearchNotes] = useState({});

  // TÌM MÃ HV
  const [searchMahv, setSearchMahv] = useState("");
  const [mahvResult, setMahvResult] = useState(null);
  const [mahvAttendance, setMahvAttendance] = useState("");
  const [mahvNote, setMahvNote] = useState("");

  // THỐNG KÊ
  const [tkHocVien, setTkHocVien] = useState(0);
  const [tkThuHP, setTkThuHP] = useState(0);
  const [tkThuBH, setTkThuBH] = useState(0);
  const [tkChi, setTkChi] = useState(0);
  
  // -----------------------------------------------------
  // FUNCS
  // -----------------------------------------------------

  // Kiểm tra thứ 7
  const isSaturday = (dateStr) => new Date(dateStr).getDay() === 6;

  // LOGIN
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
  
useEffect(() => {
  if (loggedIn && role === "Quản lý") {
    loadThongKe();
  }
}, [loggedIn, role]);
  
  // LẤY DANH SÁCH LỚP
  async function fetchLopList(manv, role) {
    let q = supabase
      .from("tbl_lop")
      .select("malop, tenlop")
      .neq("daxoa", "Đã Xóa");

    if (role === "Giáo viên") q = q.eq("manv", manv);

    const { data } = await q;
    setLopList(data || []);
  }

  // LẤY DANH SÁCH HỌC VIÊN + ĐIỂM DANH NGÀY ĐÓ
  async function fetchStudents(maLop) {
    if (!maLop) return;

    const { data: hv } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop)
      .neq("trangthai", "Đã Nghỉ")
      .order("tenhv", { ascending: true });

    setStudents(hv || []);
    setSoLuongHocVien(hv?.length || 0);

    // Set mặc định
    const att = {};
    const note = {};
    const defaultStatus = isSaturday(selectedDate)
      ? "Nghỉ không phép"
      : "Có mặt";

    (hv || []).forEach((s) => {
      att[s.mahv] = defaultStatus;
      note[s.mahv] = "";
    });

    setAttendance(att);
    setNotes(note);

    // Load dữ liệu điểm danh ngày đã chọn
    await loadAttendanceByDate(maLop, selectedDate);
  }

  // LOAD ĐIỂM DANH NGÀY (date)
  async function loadAttendanceByDate(maLop, dateStr) {
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

  // SAVE ĐIỂM DANH LỚP
  async function handleSubmit() {
    const payload = students.map((s) => ({
      mahv: s.mahv,
      ngay: selectedDate,
      trangthai: attendance[s.mahv],
      ghichu: notes[s.mahv] || "",
    }));

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // --------------------------------------------------------------------
  // AUTO REFRESH KHI ĐỔI LỚP HOẶC ĐỔI NGÀY
  // --------------------------------------------------------------------
  useEffect(() => {
    if (selectedLop) fetchStudents(selectedLop);
  }, [selectedLop, selectedDate]);

  // --------------------------------------------------------------------
  // TÌM THEO TÊN
  // --------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(async () => {
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

    return () => clearTimeout(timer);
  }, [searchName]);

  async function handleSearchSubmit() {
    const payload = searchResults.map((s) => ({
      mahv: s.mahv,
      ngay: selectedDate,
      trangthai: searchAttendance[s.mahv],
      ghichu: searchNotes[s.mahv] || "",
    }));

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }

  // --------------------------------------------------------------------
  // TÌM THEO MÃ HV
  // --------------------------------------------------------------------
  async function fetchStudentByMahv(code) {
    if (!code) return;

    const { data, error } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("mahv", code)
      .neq("trangthai", "Đã Nghỉ")
      .single();

    if (error || !data) {
      alert("❌ Không tìm thấy học viên!");
      setMahvResult(null);
      return;
    }

    setMahvResult(data);
    setMahvAttendance("Có mặt");
    setMahvNote("");
  }

  async function handleMahvSubmit() {
    if (!mahvResult) return;

    const payload = [
      {
        mahv: mahvResult.mahv,
        ngay: selectedDate,
        trangthai: mahvAttendance,
        ghichu: mahvNote,
      },
    ];

    const { error } = await supabase
      .from("tbl_diemdanh")
      .upsert(payload, { onConflict: "mahv,ngay" });

    alert(error ? "❌ Lỗi lưu!" : "✅ Lưu thành công!");
  }
  
  // --------------------------------------------------------------------
  // THỐNG KÊ
  // --------------------------------------------------------------------
async function loadThongKe() {
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstDayStr = firstDay.toISOString().split("T")[0];

  const today = new Date().toISOString().split("T")[0];

  // 1. Tổng học viên ĐANG HỌC
  const { data: hv } = await supabase
    .from("tbl_hv")
    .select("mahv")
    .eq("trangthai", "Đang học");

  setTkHocVien(hv?.length || 0);

  // 2. Tổng thu HP tháng này
  const { data: hp } = await supabase
    .from("tbl_hd")
    .select("dadong")
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", firstDayStr)
    .lte("ngaylap", today);

  const sumHP =
    hp
      ?.map((x) => Number(x.dadong.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;

  setTkThuHP(sumHP);

  // 3. Tổng thu BH tháng này
  const { data: bh } = await supabase
    .from("tbl_billhanghoa")
    .select("dadong")
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", firstDayStr)
    .lte("ngaylap", today);

  const sumBH =
    bh
      ?.map((x) => Number(x.dadong.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;

  setTkThuBH(sumBH);

  // 4. Tổng chi tháng này
  const { data: pc } = await supabase
    .from("tbl_phieuchi")
    .select("chiphi")
    .eq("loaiphieu", "Chi")    
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", firstDayStr)
    .lte("ngaylap", today);

  const sumChi =
    pc
      ?.map((x) => Number(x.chiphi.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;

  setTkChi(sumChi);
}
  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------

  return (
    <div className="container-wrapper" style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      {!loggedIn ? (
       <div className="glass-card">
    {/* PHẦN DÀNH CHO NHÂN VIÊN */}
    <div style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
      <h3>👨‍🏫 Dành cho Giáo viên / Quản lý</h3>
      <input type="text" className="form-control" placeholder="Tên đăng nhập" onChange={(e) => setUsername(e.target.value)} />
      <input type="password" className="form-control" placeholder="Mật khẩu" onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" onClick={handleLogin}>Đăng nhập</button>
    </div>

    {/* PHẦN DÀNH CHO PHỤ HUYNH */}
    <div>
      <h3>👪 Dành cho Phụ huynh</h3>
      <p style={{ fontSize: '13px', color: '#666' }}>Nhập mã học viên để xem học phí và kết quả</p>
      <input 
        type="text" 
        className="form-control" 
        placeholder="Mã học viên (Ví dụ: HV001)" 
        onKeyDown={(e) => { if(e.key === 'Enter') handleParentLookup(e.target.value) }}
        id="parent-mahv-input"
      />
      <button 
        className="btn btn-success" 
        onClick={() => handleParentLookup(document.getElementById('parent-mahv-input').value)}
      >
        Tra cứu nhanh
      </button>
    </div>
  </div>
      ) : (
        <>
          {/* PHẦN 0: THỐNG KÊ DASHBOARD */}
          {role === "Quản lý" && (
            <div className="glass-card">
              <h3 style={{ marginBottom: "16px", color: "var(--primary)" }}>📊 Thống kê tháng {new Date().getMonth() + 1}</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Học viên</div>
                  <div className="stat-value">{tkHocVien}</div>
                </div>
                <div className="stat-card" style={{ borderColor: "var(--success)" }}>
                  <div className="stat-label">Học phí</div>
                  <div className="stat-value">{tkThuHP.toLocaleString()}đ</div>
                </div>
                <div className="stat-card" style={{ borderColor: "var(--info)" }}>
                  <div className="stat-label">Hàng hóa</div>
                  <div className="stat-value">{tkThuBH.toLocaleString()}đ</div>
                </div>
                <div className="stat-card" style={{ borderColor: "var(--danger)" }}>
                  <div className="stat-label">Tổng chi</div>
                  <div className="stat-value">{tkChi.toLocaleString()}đ</div>
                </div>
              </div>
            </div>
          )}

          {/* PHẦN 1: ĐIỂM DANH THEO LỚP */}
          <div className="glass-card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>📘 Điểm danh theo lớp</h2>

            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
              {role === "Quản lý" && (
                <input
                  type="date"
                  className="form-control"
                  style={{ width: "160px" }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              )}
              <select
                className="form-control"
                value={selectedLop}
                onChange={(e) => setSelectedLop(e.target.value)}
              >
                <option value="">-- Chọn lớp --</option>
                {lopList.map((lop) => (
                  <option key={lop.malop} value={lop.malop}>{lop.tenlop}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px", fontSize: "14px", color: "#64748B" }}>
              Sĩ số: <strong>{soLuongHocVien}</strong> học viên
            </div>

            {students.map((s) => (
              <div key={s.mahv} className="student-item">
                <div style={{ fontWeight: "700", color: "var(--text)" }}>{s.tenhv}</div>
                <div className="radio-group">
                  {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name={`att-${s.mahv}`}
                        checked={attendance[s.mahv] === st}
                        onChange={() => setAttendance((prev) => ({ ...prev, [s.mahv]: st }))}
                      /> {st}
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ghi chú..."
                  value={notes[s.mahv] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [s.mahv]: e.target.value }))}
                />
              </div>
            ))}

            {students.length > 0 && (
              <button className="btn btn-success" style={{ width: "100%", marginTop: "10px" }} onClick={handleSubmit}>
                ✅ Lưu điểm danh lớp
              </button>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/*        PHẦN 2: TÌM THEO TÊN                      */}
          {/* -------------------------------------------------- */}
          <div className="glass-card">
            <h2 style={{ color: "#2c3e50" }}>🔎 Điểm danh theo tên</h2>

            <input
              type="text"
              placeholder="Nhập tên học viên..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 12,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />

            {searchResults.map((s) => (
              <div
                key={s.mahv}
                style={{
                  background: "#fff",
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 12,
                  borderLeft: "5px solid #3498db",
                }}
              >
                <div style={{ fontWeight: 600 }}>{s.tenhv}</div>

                <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                  {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name={`search-att-${s.mahv}`}
                        checked={searchAttendance[s.mahv] === st}
                        onChange={() =>
                          setSearchAttendance((prev) => ({
                            ...prev,
                            [s.mahv]: st,
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
                  value={searchNotes[s.mahv] || ""}
                  onChange={(e) =>
                    setSearchNotes((prev) => ({
                      ...prev,
                      [s.mahv]: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 6,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            ))}

            {searchResults.length > 0 && (
              <button
                onClick={handleSearchSubmit}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "#2ecc71",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                ✅ Lưu điểm danh tìm tên
              </button>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/*        PHẦN 3: TÌM THEO MÃ HV                    */}
          {/* -------------------------------------------------- */}
        <div className="glass-card">
            <h2 style={{ color: "#2c3e50" }}>💳 Điểm danh theo mã HV</h2>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Nhập mã học viên..."
                value={searchMahv}
                onChange={(e) => setSearchMahv(e.target.value)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
              <button
                onClick={() => fetchStudentByMahv(searchMahv)}
                style={{
                  padding: "10px 16px",
                  background: "#9b59b6",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Tìm
              </button>
            </div>

            {mahvResult && (
              <div
                style={{
                  background: "#fff",
                  padding: 16,
                  borderRadius: 10,
                  borderLeft: "5px solid #3498db",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {mahvResult.tenhv} ({mahvResult.mahv})
                </div>

                <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                  {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name="mahv-att"
                        checked={mahvAttendance === st}
                        onChange={() => setMahvAttendance(st)}
                      />{" "}
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
                    marginTop: 6,
                    padding: 6,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />

                <button
                  onClick={handleMahvSubmit}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 12,
                    background: "#2ecc71",
                    color: "#fff",
                    borderRadius: 6,
                    fontWeight: 600,
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
