let rawData = [];
let reportData = [];

document.getElementById("fileInput").addEventListener("change", handleFile);

function handleFile(event) {
  const file = event.target.files[0];

  if (!file) {
    alert("Chưa chọn file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    // Tạm thời đọc sheet đầu tiên
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    alert("Đã đọc file thành công. Số dòng dữ liệu: " + rawData.length);

    showPreview(rawData.slice(0, 20));
    loadPeriods();
  };

  reader.readAsArrayBuffer(file);
}

function showPreview(data) {
  if (!data || data.length === 0) {
    document.getElementById("preview").innerHTML = "Không có dữ liệu.";
    return;
  }

  const columns = Object.keys(data[0]);

  let html = "<table><thead><tr>";
  columns.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";
    columns.forEach(col => {
      html += `<td>${row[col]}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";

  document.getElementById("preview").innerHTML = html;
}

function loadPeriods() {
  const select = document.getElementById("periodSelect");
  select.innerHTML = '<option value="">-- Chọn kỳ báo cáo --</option>';

  // Tạm thời tự dò các cột có thể là kỳ báo cáo
  const possibleColumns = [
    "Kỳ báo cáo",
    "KY BAO CAO",
    "Ky bao cao",
    "Tháng báo cáo",
    "THANG_BAO_CAO",
    "Tháng",
    "thang"
  ];

  let periodColumn = null;

  if (rawData.length > 0) {
    const columns = Object.keys(rawData[0]);
    periodColumn = columns.find(col => possibleColumns.includes(col));
  }

  if (!periodColumn) {
    alert("Chưa tìm thấy cột kỳ báo cáo. Cần kiểm tra lại tên cột dữ liệu.");
    return;
  }

  const periods = [...new Set(rawData.map(row => row[periodColumn]).filter(x => x !== ""))];

  periods.forEach(period => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    select.appendChild(option);
  });

  select.setAttribute("data-period-column", periodColumn);
}

function renderReport() {
  const select = document.getElementById("periodSelect");
  const selectedPeriod = select.value;
  const periodColumn = select.getAttribute("data-period-column");

  if (!selectedPeriod) {
    alert("Vui lòng chọn kỳ báo cáo.");
    return;
  }

  const filtered = rawData.filter(row => String(row[periodColumn]) === String(selectedPeriod));

  // Bản thử nghiệm: chỉ đếm tổng số dòng theo kỳ báo cáo
  reportData = [
    {
      "Chỉ số": "Tổng số dòng dữ liệu trong kỳ báo cáo",
      "Kỳ báo cáo": selectedPeriod,
      "Số lượng": filtered.length
    }
  ];

  showSummary(reportData);
}

function showSummary(data) {
  let html = "<table><thead><tr>";
  html += "<th>Chỉ số</th><th>Kỳ báo cáo</th><th>Số lượng</th>";
  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";
    html += `<td>${row["Chỉ số"]}</td>`;
    html += `<td>${row["Kỳ báo cáo"]}</td>`;
    html += `<td>${row["Số lượng"]}</td>`;
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
