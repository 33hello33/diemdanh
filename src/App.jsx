import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
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

    //if (role === "Giáo viên") q = q.eq("manv", manv);

    const { data } = await q;
    setLopList(data || []);
  }

  // LẤY DANH SÁCH HỌC VIÊN + ĐIỂM DANH NGÀY ĐÓ
  async function fetchStudents(maLop) {
    if (!maLop) return;
    
  const mapThu = {
    0: "cn",
    1: "t2",
    2: "t3",
    3: "t4",
    4: "t5",
    5: "t6",
    6: "t7",
  };

  const thuHienTai = mapThu[new Date(selectedDate).getDay()];
    
    const { data: hv, error } = await supabase
      .from("tbl_hv")
      .select("*")
      .eq("malop", maLop)
      .neq("trangthai", "Đã Nghỉ")
      .order("tenhv", { ascending: true });
    
  if (error) {
    console.error(error);
    return;
  }
    
    const hvTheoNgayHoc = hv.filter((item) => {
      if (!item.lichhoc) return false;
  
      const dsThu = item.lichhoc
        .toLowerCase()
        .split(",")
        .map((s) => s.trim());
  
      return dsThu.includes(thuHienTai);
    });

    setStudents(hvTheoNgayHoc || []);
    setSoLuongHocVien(hvTheoNgayHoc?.length || 0);

    // Set mặc định
    const att = {};
    const note = {};
    const defaultStatus = "Vắng mặt";

    (hvTheoNgayHoc || []).forEach((s) => {
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

    // 3️⃣ Lấy mã lớp hiện tại
  const currentLop = lopList.find((x) => x.malop === selectedLop);
  if (!currentLop) {
    alert("❌ Không xác định được lớp!");
    return;
  }

  // 4️⃣ Upsert nội dung dạy (hoặc log ngày dạy)
  const payloadNoiDung = {
    ngay: selectedDate,
    malop: currentLop.malop,
    manv: manv,
  };

  const { error: errNoiDung } = await supabase
    .from("tbl_lichsudiemdanh")
    .upsert(payloadNoiDung, { onConflict: "malop,ngay" });

  if (errNoiDung) {
    console.error(errNoiDung);
    alert("⚠️ Điểm danh đã lưu, nhưng lỗi lưu nội dung dạy!");
    return;
  }

  // 5️⃣ OK hết
  alert("✅ Lưu thành công!");
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
    .gte("ngaylap", firstDayStr + " 00:00:00")
    .lte("ngaylap", today+ " 23:59:59");

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
    .gte("ngaylap", firstDayStr + " 00:00:00")
    .lte("ngaylap", today+ " 23:59:59")

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
    .gte("ngaylap", firstDayStr + " 00:00:00")
    .lte("ngaylap", today+ " 23:59:59")

  const sumChi =
    pc
      ?.map((x) => Number(x.chiphi.replace(/,/g, "")))
      .reduce((a, b) => a + b, 0) || 0;

  setTkChi(sumChi);
}
  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------

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
        // LOGIN UI
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
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginBottom: "16px",
            }}
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginBottom: "16px",
            }}
          />

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
          {/* -------------------------------------------------- */}
          {/*        PHẦN 0: THỐNG KÊ              */}
          {/* -------------------------------------------------- */}
          {role === "Quản lý" && (
  <div
    style={{
      background: "#eef6ff",
      padding: "20px",
      borderRadius: "12px",
      marginBottom: "25px",
      boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
      borderLeft: "6px solid #3498db",
    }}
  >
    <h2 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>
      📊 Thống kê tháng {new Date().getMonth() + 1}
    </h2>

    <p>👨‍🎓 Tổng học viên đang học: <b>{tkHocVien}</b></p>
    <p>💰 Tổng thu HP tháng này: <b>{tkThuHP.toLocaleString()}đ</b></p>
    <p>🛒 Tông thu BH tháng này: <b>{tkThuBH.toLocaleString()}đ</b></p>
    <p>📉 Tổng phiếu chi tháng này: <b>{tkChi.toLocaleString()}đ</b></p>
  </div>
)}

          {/* -------------------------------------------------- */}
          {/*        PHẦN 1: ĐIỂM DANH THEO LỚP                */}
          {/* -------------------------------------------------- */}
          <div style={boxStyle}>
            <h2 style={{ color: "#2c3e50" }}>📘 Điểm danh theo lớp</h2>

            {role === "Quản lý" && (
              <div style={{ margin: "12px 0" }}>
                <label>📅 Chọn ngày:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ marginLeft: 10, padding: 6 }}
                />
              </div>
            )}

            <select
              value={selectedLop}
              onChange={(e) => setSelectedLop(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">-- Chọn lớp --</option>
              {lopList.map((lop) => (
                <option key={lop.malop} value={lop.malop}>
                  {lop.tenlop}
                </option>
              ))}
            </select>
  
            <p>Tổng số học viên: {soLuongHocVien}</p>

            {students.map((s) => (
              <div
                key={s.mahv}
                style={{
                  background: "#fff",
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 12,
                  borderLeft: "5px solid #3498db",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontWeight: "600" }}>{s.tenhv}</div>

                <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                  {["Có mặt", "Vắng mặt"].map((st) => (
                    <label key={st}>
                      <input
                        type="radio"
                        name={`att-${s.mahv}`}
                        value={st}
                        checked={attendance[s.mahv] === st}
                        onChange={() =>
                          setAttendance((prev) => ({
                            ...prev,
                            [s.mahv]: st,
                          }))
                        }
                      />{" "}
                      {st}
                    </label>
                  ))}
                </div>
                
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "6px"
                }}>
                                <input
                                  type="text"
                                  placeholder="Nhận xét..."
                                  value={notes[s.mahv] || ""}
                                  onChange={(e) =>
                                    setNotes((prev) => ({
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
                                 <button
                    onClick={async () => {
                      const note = notes[s.mahv]?.trim() || "";
                      if (!note) {
                        alert("⚠️ Vui lòng nhập ghi chú trước khi gửi cảnh báo!");
                        return;
                      }
                      const now = new Date().toISOString();
                    
                   //lấy tên lớp đúng
                    const currentLop = lopList.find(x => x.malop === selectedLop);
                    
                    const { error } = await supabase.from("tbl_alert").insert([
                      {
                        tenlop: currentLop?.tenlop || "",
                        tennv: username,         // tên giáo viên
                        tenhv: s.tenhv,      // tên học viên
                        ghichu: note,            // ghi chú
                        time: now,               // thời gian gửi
                        tinhtrang: 'Chưa làm',
                      },
                    ]);
                
                    if (error) {
                      alert("❌ Có lỗi khi gửi cảnh báo!");
                    } else {
                      alert("🔴 Cảnh báo đã được gửi!");
                    }
                    }}
                    title="Gửi cảnh báo"
                    style={{
                      backgroundColor: "#e74c3c",
                      color: "white",
                      border: "none",
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    ⚠️
                  </button>
                </div>
              </div>
            ))}

            {students.length > 0 && (
              <button
                onClick={handleSubmit}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "#2ecc71",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                ✅ Lưu điểm danh
              </button>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/*        PHẦN 2: TÌM THEO TÊN                      */}
          {/* -------------------------------------------------- */}
          <div style={boxStyle}>
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
                  {["Có mặt", "Vắng mặt"].map((st) => (
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
                  placeholder="Nhận xét..."
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
          <div style={boxStyle}>
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
                  {["Có mặt", "Vắng mặt"].map((st) => (
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
                  placeholder="Nhận xét..."
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
