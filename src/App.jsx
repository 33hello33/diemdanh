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
                {["Có mặt","Nghỉ phép","Nghỉ không phép"].map(status => (
                  <label key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name={`attendance-${student.mahv}`}
                      value={status}
                      checked={attendance[student.mahv] === status}
                      onChange={() => handleAttendanceChange(student.mahv, status)}
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
                {["Có mặt","Nghỉ phép","Nghỉ không phép"].map(status => (
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
