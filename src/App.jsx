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
  
  const [tkHVHoctrongngay, setTkHVHoctrongngay] = useState(0);
   const [tkHVNghitrongngay, setTkHVNghitrongngay] = useState(0);
   const [tkThuTrongNgay, setTkThuTrongNgay] = useState(0);
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
    const defaultStatus = "Có mặt";

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
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  
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

 // 5. Tổng thu trong ngày
  const { data: bhtoday } = await supabase
    .from("tbl_billhanghoa")
    .select("dadong")
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", today)
    .lte("ngaylap", tomorrow);
  
const { data: hdtoday } = await supabase
    .from("tbl_hd")
    .select("dadong")
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", today)
    .lte("ngaylap", tomorrow);
  
  const { data: pcctoday } = await supabase
    .from("tbl_phieuchamcong")
    .select("tongcong")
    .or("daxoa.is.null,daxoa.neq.Đã Xóa")
    .gte("ngaylap", today)
    .lte("ngaylap", tomorrow)
    .eq("daxacnhan", true);
  
  const sumBHtoday =
    bhtoday
      ?.map((x) => Number(x.dadong.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;
  const sumHDtoday =
    hdtoday
      ?.map((x) => Number(x.dadong.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;
    const sumPCCtoday =
    pcctoday
      ?.map((x) => Number(x.tongcong.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;
  
  setTkThuTrongNgay(sumBHtoday + sumHDtoday + sumPCCtoday);

  // 6. Số học viên học trong ngày
  const { data: ddcomat } = await supabase
    .from("tbl_diemdanh")
    .select("id")
    .eq("trangthai", "Có mặt")
    .eq("ngay", today)

  setTkHVHoctrongngay(ddcomat?.length || 0);

// 7. Tổng thu trong ngày
  const { data: ddvangmat } = await supabase
    .from("tbl_diemdanh")
    .select("id")
    .neq("trangthai", "Có mặt")
    .eq("ngay", today)

  setTkHVNghitrongngay(ddvangmat?.length || 0);
  
}

  // --- STATE BỔ SUNG ---
const [viewMode, setViewMode] = useState("login"); // "login", "staff", "parent"
const [parentSearchMahv, setParentSearchMahv] = useState(""); // Lưu mã HV phụ huynh gõ
const [tuitionData, setTuitionData] = useState([]); // Lưu dữ liệu học phí trả về

// --- HÀM TRA CỨU DÀNH CHO PHỤ HUYNH (KHÔNG CẦN LOGIN) ---
async function handleParentLookup(mahv) {
  const code = mahv || parentSearchMahv;
  if (!code) return alert("Vui lòng nhập mã học viên!");

  // 1. Kiểm tra học viên có tồn tại không
  const { data: student, error } = await supabase
    .from("tbl_hv") // Tên bảng học viên 
    .select("*")
    .eq("mahv", code)
    .neq("trangthai", "Đã Nghỉ")
    .single();

  if (error || !student) {
    alert("❌ Không tìm thấy học viên hoặc mã HV không chính xác!");
    return;
  }

  // 2. Nếu tìm thấy, chuyển sang chế độ Phụ huynh
  setRole("Phụ huynh");
  setLoggedIn(true);
  setViewMode("parent");
  
  // 3. Tự động lấy dữ liệu học phí
  fetchTuitionForParent(code);
}

// Hàm lấy dữ liệu học phí từ bảng hóa đơn
async function fetchTuitionForParent(mahv) {
  const { data, error } = await supabase
    .from("tbl_hd") // Tên bảng hóa đơn từ file của bạn 
    .select("*")
    .eq("mahv", mahv)
    .or("daxoa.is.null,daxoa.neq.Đã Xóa") // Lọc đơn chưa xóa 
    .order("ngaylap", { ascending: false });

  if (!error && data) {
    setTuitionData(data);
  }
}
  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------

return (
    <div className="container-wrapper" style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      {!loggedIn ? (
        /* SỬA LỖI: Sử dụng <> để bao 2 thẻ div cạnh nhau */
        <>
          {/* LOGIN UI - NHÂN VIÊN */}
          <div className="glass-card" style={{ maxWidth: "400px", margin: "20px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: "24px" }}>👨‍🏫 Nhân viên Đăng nhập</h2>
            <div className="form-group" style={{ marginBottom: "15px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <input
                type="password"
                className="form-control"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleLogin}>
              Đăng nhập
            </button>
          </div>

          {/* PHẦN PHỤ HUYNH */}
          <div className="glass-card" style={{ maxWidth: "400px", margin: "20px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: "24px" }}>👪 Dành cho Phụ huynh</h2>
            <div className="form-group" style={{ marginBottom: "15px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập mã học viên..."
                value={parentSearchMahv}
                onChange={(e) => setParentSearchMahv(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleParentLookup()}
              />
            </div>
            {/* SỬA LỖI: Nút này phải gọi handleParentLookup, không phải handleLogin */}
            <button className="btn btn-success" style={{ width: "100%" }} onClick={() => handleParentLookup()}>
              Tra cứu
            </button>
          </div>
        </>
      ) : (
        /* KHI ĐÃ VÀO HỆ THỐNG */
        <>
          {/* PHẦN PHỤ HUYNH DASHBOARD */}
          {role === "Phụ huynh" ? (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>💰 Học phí: {parentSearchMahv}</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setLoggedIn(false)}>Thoát</button>
              </div>
              
              {tuitionData.length > 0 ? tuitionData.map((item, idx) => (
                <div key={idx} className="student-item" style={{ borderLeft: "5px solid var(--success)", padding: '15px', marginBottom: '10px', background: '#fff' }}>
                  <div><strong>Mã HD: {item.mahd}</strong> - Ngày: {item.ngaylap}</div>
                  <div style={{ color: "var(--success)", fontWeight: "bold", fontSize: '1.1rem' }}>Số tiền: {item.dadong}đ</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Nội dung: {item.ghichu || 'Không có ghi chú'}</div>
                </div>
              )) : <p className="text-muted">Chưa có dữ liệu học phí cho học viên này.</p>}
            </div>
          ) : (
            /* GIAO DIỆN NHÂN VIÊN (QUẢN LÝ / GIÁO VIÊN) */
            <>
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Chào <strong>{username}</strong> ({role})</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setLoggedIn(false)}>Đăng xuất</button>
              </div>

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
                    
                    <div className="stat-card" style={{ borderColor: "var(--warning)" }}>
                      <div className="stat-label">Số HV đi học trong ngày:</div>
                      <div className="stat-value">{tkHVHoctrongngay.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ borderColor: "var(--warning)" }}>
                      <div className="stat-label">Số HV nghỉ học trong ngày:</div>
                      <div className="stat-value">{tkHVNghitrongngay.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ borderColor: "var(--danger)" }}>
                      <div className="stat-label">Tổng Thu hôm nay</div>
                      <div className="stat-value">{tkThuTrongNgay.toLocaleString()}đ</div>
                    </div>
                    
                  </div>
                </div>
              )}

              <div className="glass-card">
                <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>📘 Điểm danh theo lớp</h2>
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                  {role === "Quản lý" && (
                    <input type="date" className="form-control" style={{ width: "160px" }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  )}
                  <select className="form-control" value={selectedLop} onChange={(e) => setSelectedLop(e.target.value)}>
                    <option value="">-- Chọn lớp --</option>
                    {lopList.map((lop) => <option key={lop.malop} value={lop.malop}>{lop.tenlop}</option>)}
                  </select>
                </div>
                {students.map((s) => (
                  <div key={s.mahv} className="student-item">
                    <div style={{ fontWeight: "700" }}>{s.tenhv}</div>
                    <div className="radio-group">
                      {["Có mặt", "Nghỉ phép", "Nghỉ không phép"].map((st) => (
                        <label key={st}>
                          <input type="radio" name={`att-${s.mahv}`} checked={attendance[s.mahv] === st} onChange={() => setAttendance((prev) => ({ ...prev, [s.mahv]: st }))} /> {st}
                        </label>
                      ))}
                    </div>
                    <input type="text" className="form-control" placeholder="Ghi chú..." value={notes[s.mahv] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [s.mahv]: e.target.value }))} />
                  </div>
                ))}
                {students.length > 0 && <button className="btn btn-success" style={{ width: "100%" }} onClick={handleSubmit}>✅ Lưu điểm danh</button>}
              </div>

              <div className="glass-card">
                <h2>🔎 Điểm danh nhanh</h2>
                <input type="text" className="form-control" placeholder="Tìm tên..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                {searchResults.map((s) => (
            <div key={s.mahv} style={{
              padding: "16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fff", borderLeft: "5px solid #3498db", marginBottom: "12px"
            }}>
              <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px", color: "#34495e" }}>
                {s.tenhv}
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
                {["Có mặt","Nghỉ phép","Nghỉ không phép"].map(status => (
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
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
