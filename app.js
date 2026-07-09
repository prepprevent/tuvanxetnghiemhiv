let workbookRef = null;
let rawData = [];
let reportData = [];

document.getElementById("fileInput").addEventListener("change", handleFile);
document.getElementById("sheetSelect").addEventListener("change", loadSelectedSheet);
document.getElementById("periodColumnSelect").addEventListener("change", loadPeriods);

function handleFile(event) {
  const file = event.target.files[0];

  if (!file) {
    alert("Chưa chọn file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    workbookRef = XLSX.read(data, {
      type: "array",
      cellDates: true
    });

    loadSheetNames();

    alert("Đã đọc file thành công. Vui lòng chọn sheet dữ liệu.");
  };

  reader.readAsArrayBuffer(file);
}

function loadSheetNames() {
  const sheetSelect = document.getElementById("sheetSelect");
  sheetSelect.innerHTML = '<option value="">-- Chọn sheet --</option>';

  workbookRef.SheetNames.forEach(sheetName => {
    const option = document.createElement("option");
    option.value = sheetName;
    option.textContent = sheetName;
    sheetSelect.appendChild(option);
  });

  // Tự chọn sheet đầu tiên có dữ liệu
  if (workbookRef.SheetNames.length > 0) {
    sheetSelect.value = workbookRef.SheetNames[0];
    loadSelectedSheet();
  }
}

function loadSelectedSheet() {
  const sheetName = document.getElementById("sheetSelect").value;

  if (!sheetName) {
    return;
  }

  const worksheet = workbookRef.Sheets[sheetName];

  rawData = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false
  });

  if (!rawData || rawData.length === 0) {
    document.getElementById("preview").innerHTML = "Sheet này không có dữ liệu dạng bảng.";
    clearDropdowns();
    return;
  }

  showPreview(rawData.slice(0, 20));
  loadPeriodColumnOptions();
}

function clearDropdowns() {
  document.getElementById("periodColumnSelect").innerHTML =
    '<option value="">-- Chọn cột kỳ báo cáo --</option>';
  document.getElementById("periodSelect").innerHTML =
    '<option value="">-- Chọn kỳ báo cáo --</option>';
}

function loadPeriodColumnOptions() {
  const select = document.getElementById("periodColumnSelect");
  select.innerHTML = '<option value="">-- Chọn cột kỳ báo cáo --</option>';

  const columns = Object.keys(rawData[0]);

  columns.forEach(col => {
    const option = document.createElement("option");
    option.value = col;
    option.textContent = col;
    select.appendChild(option);
  });

  // Tự đoán cột kỳ báo cáo nếu có tên gần đúng
  const guessedColumn = columns.find(col => {
    const n = normalizeText(col);
    return (
      n.includes("kybaocao") ||
      n.includes("thangbaocao") ||
      n.includes("thang") ||
      n.includes("thoigian") ||
      n.includes("ngaybaocao") ||
      n.includes("ngayxetnghiem") ||
      n.includes("ngaynhanketqua")
    );
  });

  if (guessedColumn) {
    select.value = guessedColumn;
    loadPeriods();
  }
}

function loadPeriods() {
  const periodColumn = document.getElementById("periodColumnSelect").value;
  const periodSelect = document.getElementById("periodSelect");

  periodSelect.innerHTML = '<option value="">-- Chọn kỳ báo cáo --</option>';

  if (!periodColumn) {
    return;
  }

  const periods = [...new Set(
    rawData
      .map(row => cleanValue(row[periodColumn]))
      .filter(value => value !== "")
  )];

  periods.sort();

  periods.forEach(period => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    periodSelect.appendChild(option);
  });

  if (periods.length === 0) {
    alert("Cột này không có dữ liệu kỳ báo cáo. Vui lòng chọn cột khác.");
  }
}

function renderReport() {
  const periodColumn = document.getElementById("periodColumnSelect").value;
  const selectedPeriod = document.getElementById("periodSelect").value;

  if (!periodColumn) {
    alert("Vui lòng chọn cột kỳ báo cáo.");
    return;
  }

  if (!selectedPeriod) {
    alert("Vui lòng chọn kỳ báo cáo.");
    return;
  }

  const filtered = rawData.filter(row => {
    return cleanValue(row[periodColumn]) === selectedPeriod;
  });

  reportData = [
    {
      "Chỉ số": "Tổng số dòng dữ liệu trong kỳ báo cáo",
      "Cột kỳ báo cáo": periodColumn,
      "Kỳ báo cáo": selectedPeriod,
      "Số lượng": filtered.length
    }
  ];

  showSummary(reportData);
}

function showPreview(data) {
  if (!data || data.length === 0) {
    document.getElementById("preview").innerHTML = "Không có dữ liệu.";
    return;
  }

  const columns = Object.keys(data[0]);

  let html = "<table><thead><tr>";

  columns.forEach(col => {
    html += `<th>${escapeHtml(col)}</th>`;
  });

  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";

    columns.forEach(col => {
      html += `<td>${escapeHtml(cleanValue(row[col]))}</td>`;
    });

    html += "</tr>";
  });

  html += "</tbody></table>";

  document.getElementById("preview").innerHTML = html;
}

function showSummary(data) {
  if (!data || data.length === 0) {
    document.getElementById("summary").innerHTML = "Chưa có kết quả.";
    return;
  }

  const columns = Object.keys(data[0]);

  let html = "<table><thead><tr>";

  columns.forEach(col => {
    html += `<th>${escapeHtml(col)}</th>`;
  });

  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";

    columns.forEach(col => {
      html += `<td>${escapeHtml(cleanValue(row[col]))}</td>`;
    });

    html += "</tr>";
  });

  html += "</tbody></table>";

  document.getElementById("summary").innerHTML = html;
}

function exportExcel() {
  if (!reportData || reportData.length === 0) {
    alert("Chưa có kết quả để xuất.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(reportData);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Ket qua tong hop");
  XLSX.writeFile(wb, "ket_qua_tong_hop_TVXN.xlsx");
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
