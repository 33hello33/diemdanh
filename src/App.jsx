<div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
  <input
    type="text"
    placeholder="Ghi chú..."
    value={notes[student.mahv] || ""}
    onChange={(e) =>
      setNotes((prev) => ({ ...prev, [student.mahv]: e.target.value }))
    }
    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc" }}
  />

  <button
    onClick={async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("tbl_alert").insert([
        {
          manv: manv,
          mahv: student.mahv,
          ghichu: notes[student.mahv] || "",
          time: now,
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
