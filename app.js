'use strict';

const APP = {
  files: [],
  processed: null,
  selectedPeriod: '',
  lastOutput: null,
};

const AGE_GROUPS = ['<1', '1-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50+'];
const SEX_GROUPS = [
  { code: 2, label: 'Nữ' },
  { code: 1, label: 'Nam' },
];

const SUMMARY_ROWS = [
  { section: 'NHÓM CHỈ SỐ BÁO CÁO NHÀ TÀI TRỢ' },
  { section: 'Mô hình VCT (Tư vấn xét nghiệm tự nguyện)' },
  { key: 'HTS_TST_POSVCT', attribute: 'HTS_TST_POS', group: 'VCT', label: 'HTS_TST_POS (VCT)', desc: 'Số ca dương tính mới nhận kết quả trong tháng', byAge: true, source: 'TVXN' },
  { key: 'HTS_TST_NEGVCT', attribute: 'HTS_TST_NEG', group: 'VCT', label: 'HTS_TST_NEG (VCT)', desc: 'Số ca xét nghiệm âm tính nhận kết quả trong tháng', byAge: true, source: 'TVXN' },
  { section: 'Mô hình Index (Bạn tình bạn chích - BTBC)' },
  { key: 'HTS_TST_POSIndex', attribute: 'HTS_TST_POS', group: 'Index', label: 'HTS_TST_POS (Index)', desc: 'Số ca dương tính mới nhận kết quả trong tháng', byAge: true, source: 'TVXN' },
  { key: 'HTS_TST_NEGIndex', attribute: 'HTS_TST_NEG', group: 'Index', label: 'HTS_TST_NEG (Index)', desc: 'Số ca xét nghiệm âm tính nhận kết quả trong tháng', byAge: true, source: 'TVXN' },
  { key: 'Index_offered', attribute: 'Index_offered', group: 'Other', label: 'Index_offered', desc: 'Số khách hàng được tư vấn tham gia mô hình BTBC', byAge: true, source: 'TVXN' },
  { key: 'Index_accepted', attribute: 'Index_accepted', group: 'Other', label: 'Index_accepted', desc: 'Số khách hàng đồng ý tham gia mô hình BTBC', byAge: true, source: 'TVXN' },
  { key: 'Contact_elicited', attribute: 'Contact_elicited', group: 'BTBC', label: 'Contact_elicited', desc: 'Số BTBC được khách hàng chỉ dẫn cung cấp thông tin', byAge: true, source: 'BTBC' },
  { key: 'Known_positive', attribute: 'Known_positive', group: 'BTBC', label: 'Known_positive', desc: 'Số BTBC đã biết dương tính tại thời điểm liên hệ', byAge: true, source: 'BTBC' },
  { key: 'Documented_negative', label: 'Documented_negative', desc: 'Số BTBC dưới 15 tuổi có kết quả xét nghiệm âm tính đã được ghi nhận và không có nguy cơ phơi nhiễm HIV nào khác', manual: 'Chỉ số này cơ sở tự kiểm đếm' },
  { section: 'Tự xét nghiệm' },
  { key: 'HTS_SELF', attribute: 'HTS_SELF', group: 'Other', label: 'HTS_SELF', desc: 'Số sinh phẩm tự xét nghiệm đã phát trong tháng', byAge: true, source: 'TVXN', minAgeGroup: '10-14' },
  { section: 'NHÓM CHỈ SỐ THANH TOÁN' },
  { key: 'XNKD_EPIC', attribute: 'XNKD_EPIC', group: 'Payment', label: 'Confirmation_EPIC', desc: 'Số ca xét nghiệm khẳng định trong tháng nguồn Dự án EpiC', totalOnly: true, source: 'TVXN' },
  { key: 'CGTC', attribute: 'CGTC', group: 'Payment', label: 'CGTC_EPIC', desc: 'Số ca dương tính mới được kết nối điều trị thành công trong tháng', totalOnly: true, source: 'TVXN' },
  { section: 'NHÓM CHỈ SỐ THEO DÕI CHƯƠNG TRÌNH' },
  { key: 'XNKD_BHYT', attribute: 'XNKD_BHYT', group: 'Payment', label: 'Confirmation_BHYT', desc: 'Số ca xét nghiệm khẳng định trong tháng nguồn BHYT', totalOnly: true, source: 'TVXN' },
  { key: 'TT_Test', attribute: 'TT_Test', group: 'Payment', label: 'TT_Test', desc: 'Số ca xét nghiệm sàng lọc trong tháng', totalOnly: true, source: 'TVXN' },
  { key: 'XNKD', attribute: 'XNKD', group: 'Payment', label: 'Confirmation_ALL', desc: 'Số ca xét nghiệm khẳng định trong tháng tất cả các nguồn', totalOnly: true, source: 'TVXN' },

];

const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  const fileInput = $('fileInput');
  const dropZone = $('dropZone');
  const runBtn = $('runBtn');
  const downloadBtn = $('downloadBtn');
  const periodSelect = $('periodSelect');

  fileInput.addEventListener('change', async (event) => {
    await handleFiles([...event.target.files]);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', async (event) => {
    const files = [...event.dataTransfer.files].filter((file) => /\.xlsx?$/.test(file.name.toLowerCase()));
    await handleFiles(files);
  });

  periodSelect.addEventListener('change', () => {
    APP.selectedPeriod = periodSelect.value;
    if (APP.processed && APP.selectedPeriod) runSelectedPeriod();
  });

  runBtn.addEventListener('click', () => runSelectedPeriod());
  downloadBtn.addEventListener('click', () => downloadWorkbook());
});

async function handleFiles(files) {
  resetOutput();
  if (!files.length) {
    setStatus('Chưa chọn file Excel hợp lệ.', 'warn');
    return;
  }

  APP.files = files;
  $('fileList').innerHTML = files.map((file) => `<div>• ${escapeHtml(file.name)} (${formatBytes(file.size)})</div>`).join('');
  setStatus('Đang đọc file và chuyển đổi logic Power Query...', '');

  try {
    const workbooks = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });
      workbooks.push({ fileName: file.name, workbook });
    }

    APP.processed = processWorkbooks(workbooks);
    populatePeriodSelect(APP.processed.periods);

    const message = `Đã đọc ${files.length} file. TVXN: ${APP.processed.tvxnLong.length} dòng chỉ số; BTBC: ${APP.processed.btbcLong.length} dòng chỉ số. Hãy chọn kỳ báo cáo rồi bấm “Chạy tổng hợp”.`;
    setStatus(message, 'ok');
    $('runBtn').disabled = !APP.processed.periods.length;
    if (APP.processed.periods.length) runSelectedPeriod();
  } catch (error) {
    console.error(error);
    setStatus(`Lỗi đọc dữ liệu: ${error.message}`, 'error');
    $('runBtn').disabled = true;
  }
}

function processWorkbooks(workbooks) {
  const allKhcdRows = [];
  const allBtbcBaseRows = [];
  const allTvxnBaseRows = [];
  const warnings = [];

  for (const item of workbooks) {
    const { fileName, workbook } = item;

    const tvxnSheet = getSheetByName(workbook, 'DANH SACH KHACH HANG');
    const khcdSheet = getSheetByName(workbook, 'KHACH HANG CHI DAN');
    const btbcSheet = getSheetByName(workbook, 'BAN TINH - BAN CHICH');

    if (!tvxnSheet) warnings.push(`${fileName}: thiếu sheet DANH SACH KHACH HANG`);
    if (!khcdSheet) warnings.push(`${fileName}: thiếu sheet KHACH HANG CHI DAN`);
    if (!btbcSheet) warnings.push(`${fileName}: thiếu sheet BAN TINH - BAN CHICH`);

    if (khcdSheet) allKhcdRows.push(...readKhcdRows(khcdSheet, fileName));
    if (btbcSheet) allBtbcBaseRows.push(...readBtbcRows(btbcSheet, fileName));
    if (tvxnSheet) allTvxnBaseRows.push(...readTvxnRows(tvxnSheet, fileName));
  }

  const khcdByGuid = buildKhcdIndex(allKhcdRows);
  const btbcProcessed = processBtbc(allBtbcBaseRows);
  const btbcByMaSoXN = buildBtbcJoinIndex(btbcProcessed.rawRows);
  const tvxnProcessed = processTvxn(allTvxnBaseRows, khcdByGuid, btbcByMaSoXN);

  const tvxnLong = distinctRows(tvxnProcessed.longRows, rowKeyForLongTvxn);
  const btbcLong = distinctRows(btbcProcessed.longRows, rowKeyForLongBtbc);

  const periods = [...new Set([
    ...tvxnLong.map((row) => periodKey(row.Reporting_period_TVXN)).filter(Boolean),
    ...btbcLong.map((row) => periodKey(row.Reporting_period_BTBC)).filter(Boolean),
  ])].sort();

  return {
    tvxnBaseRows: allTvxnBaseRows,
    tvxnLong,
    btbcLong,
    btbcRawRows: btbcProcessed.rawRows,
    khcdRows: allKhcdRows,
    periods,
    warnings,
  };
}

function getSheetByName(workbook, exactName) {
  const foundName = workbook.SheetNames.find((name) => norm(name) === norm(exactName));
  return foundName ? workbook.Sheets[foundName] : null;
}

function sheetToAoa(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true, blankrows: false });
}

function readTvxnRows(sheet, fileName) {
  const aoa = sheetToAoa(sheet);
  const headerIndex = findHeaderRow(aoa, ['A3. Mã cơ sở', 'A4. Số thứ tự khách hàng']);
  if (headerIndex < 0) throw new Error(`${fileName}: không tìm thấy dòng tiêu đề trong sheet DANH SACH KHACH HANG.`);
  return rowsToObjects(aoa, headerIndex, fileName)
    .filter((row) => isNonEmpty(get(row, 'A3. Mã cơ sở')) && get(row, 'A3. Mã cơ sở') !== 'Mã cơ sở')
    .filter((row) => !['Phiên bản:', 'Đến ngày:'].includes(String(get(row, 'A3. Mã cơ sở') || '').trim()));
}

function readKhcdRows(sheet, fileName) {
  const aoa = sheetToAoa(sheet);
  let headerIndex = findHeaderRow(aoa, ['KHCD.Guid', 'KHCD.ketqua_ict']);
  if (headerIndex < 0) headerIndex = findHeaderRow(aoa, ['Guid', 'Kết quả tư vấn BT/BC']);
  if (headerIndex < 0) return [];
  return rowsToObjects(aoa, headerIndex, fileName)
    .filter((row) => {
      const guid = get(row, 'KHCD.Guid') || get(row, 'Guid');
      return isNonEmpty(guid) && !['2', 'Guid', 'KHCD.Guid'].includes(String(guid).trim());
    });
}

function readBtbcRows(sheet, fileName) {
  const aoa = sheetToAoa(sheet);
  let headerIndex = findHeaderRow(aoa, ['Ngày cung cấp', 'Mã số xét nghiệm']);
  if (headerIndex < 0) headerIndex = findHeaderRow(aoa, ['BTBC.ngay_cc', 'BTBC.ma_xn']);
  if (headerIndex < 0) return [];
  return rowsToObjects(aoa, headerIndex, fileName)
    .filter((row) => {
      const testCode = get(row, 'Mã số xét nghiệm') || get(row, 'BTBC.ma_xn');
      const providedDate = get(row, 'Ngày cung cấp') || get(row, 'BTBC.ngay_cc');
      const guid = get(row, 'Guid') || get(row, 'BTBC.Guid');
      return isNonEmpty(testCode) || isNonEmpty(providedDate) || isNonEmpty(guid);
    });
}

function rowsToObjects(aoa, headerIndex, fileName) {
  const headers = (aoa[headerIndex] || []).map((cell) => cleanHeader(cell));
  const rows = [];

  for (let r = headerIndex + 1; r < aoa.length; r++) {
    const arr = aoa[r] || [];
    if (!arr.some(isNonEmpty)) continue;

    const obj = { __fileName: fileName, __rowNumber: r + 1, __normMap: Object.create(null) };
    const seen = Object.create(null);

    headers.forEach((header, index) => {
      if (!header) return;
      const base = header;
      const n = norm(base);
      const count = seen[n] || 0;
      seen[n] = count + 1;
      const key = count === 0 ? base : `${base}.${count}`;
      obj[key] = arr[index];
      if (obj.__normMap[n] === undefined) obj.__normMap[n] = key;
      obj.__normMap[norm(key)] = key;
    });

    rows.push(obj);
  }
  return rows;
}

function findHeaderRow(aoa, requiredHeaders) {
  const required = requiredHeaders.map(norm);
  for (let i = 0; i < aoa.length; i++) {
    const rowNorms = new Set((aoa[i] || []).map((x) => norm(x)).filter(Boolean));
    if (required.every((key) => rowNorms.has(key))) return i;
  }
  return -1;
}

function buildKhcdIndex(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const guid = stringValue(get(row, 'KHCD.Guid') || get(row, 'Guid'));
    if (!guid) return;
    const result = toNum(get(row, 'KHCD.ketqua_ict') || get(row, 'Kết quả tư vấn BT/BC'));
    const mpi = get(row, 'KHCD.ma_mpi') || get(row, 'Mã MPI');
    const treatmentCode = get(row, 'KHCD.ma_so_dieu_tri') || get(row, 'Mã số điều trị');
    map.set(guid, {
      guid,
      Index_accepted: result === 1 ? 1 : null,
      ma_so_dieu_tri_KHCD: isNonEmpty(mpi) ? mpi : treatmentCode,
    });
  });
  return map;
}

function processBtbc(rows) {
  const rawRows = [];
  const longRows = [];

  rows.forEach((row) => {
    const ngayCungCap = parseDate(get(row, 'Ngày cung cấp') || get(row, 'BTBC.ngay_cc'));
    const ngayXetNghiem = parseDate(get(row, 'Ngày xét nghiệm') || get(row, 'BTBC.ngay_xn'));
    const namSinh = toNum(get(row, 'Năm sinh') || get(row, 'BTBC.nam_sinh'));
    const age = ngayCungCap && namSinh !== null ? ngayCungCap.getFullYear() - namSinh : null;
    const ageGroup = ageGroupFromAge(age);
    const sex = toNum(get(row, 'Giới tính') || get(row, 'BTBC.gioi_tinh'));
    const result = stringValue(get(row, 'Kết quả xét nghiệm') || get(row, 'BTBC.kq_xn'));
    const maSoXn = stringValue(get(row, 'Mã số xét nghiệm') || get(row, 'BTBC.ma_xn'));
    const maHtcElogRaw = stringValue(get(row, 'Mã HTC-Elog') || get(row, 'KHCD.ma_htcelog'));
    const maHtcElog = maHtcElogRaw.length > 3 ? maHtcElogRaw.slice(3) : maHtcElogRaw;

    const enriched = {
      ...row,
      Guid: stringValue(get(row, 'Guid') || get(row, 'BTBC.Guid')),
      'Mã số xét nghiệm': maSoXn,
      'Mã HTC-Elog': maHtcElog,
      ngay_cung_cap: ngayCungCap,
      'BTBC.ngay_xet_nghiem': ngayXetNghiem,
      'Age.BTBC': age,
      'Age group_INDEX': ageGroup,
      'Giới tính': sex,
    };
    rawRows.push(enriched);

    const indicators = [
      { Attribute: 'Contact_elicited', Value: ngayCungCap ? 1 : null, reportingDate: ngayCungCap },
      { Attribute: 'Known_positive', Value: (ngayXetNghiem && ngayCungCap && ngayXetNghiem < ngayCungCap && result === '2') ? 1 : null, reportingDate: ngayCungCap },
      { Attribute: 'Không có ca', Value: 1, reportingDate: null },
    ];

    indicators.forEach((item) => {
      if (item.Value !== 1) return;
      if (item.Attribute === 'Không có ca') return; // Web app hiển thị 0 khi không có ca, không cần chọn blank như Pivot Excel.
      longRows.push({
        ...enriched,
        Attribute: item.Attribute,
        Value: item.Value,
        Reporting_period_BTBC: endOfMonth(item.reportingDate),
        'Indicator Group': item.Attribute.startsWith('Contact') || item.Attribute.startsWith('Known') ? 'BTBC' : null,
      });
    });
  });

  return { rawRows, longRows };
}

function buildBtbcJoinIndex(btbcRows) {
  const map = new Map();
  btbcRows.forEach((row) => {
    const key = stringValue(row['Mã số xét nghiệm']);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function processTvxn(rows, khcdByGuid, btbcByMaSoXN) {
  const longRows = [];

  rows.forEach((row) => {
    const serviceType = stringValue(get(row, 'A2. Loại dịch vụ'));
    const nonProfessional = stringValue(get(row, 'A3.1 Nhân viên dịch vụ không chuyên'));
    const siteCode = stringValue(get(row, 'A3. Mã cơ sở')).slice(0, 3);
    const selfTestHcm = [serviceType, nonProfessional, siteCode].filter(Boolean).join('-');
    if (!(selfTestHcm === 'KC-88-HCM' || selfTestHcm.startsWith('CĐ'))) return;

    const maKh = [stringValue(get(row, 'A3. Mã cơ sở')), stringValue(get(row, 'A4. Số thứ tự khách hàng'))]
      .filter(Boolean).join('-');

    const lastHivTestQuarter = endOfQuarter(parseDate(get(row, 'Ngay XN HIV (LSXN)')));
    const screeningDateOriginal = get(row, ' A1. Ngày lấy máu xét nghiệm sàng lọc') || get(row, 'A1. Ngày lấy máu xét nghiệm sàng lọc');
    const screeningDate = parseDate(screeningDateOriginal);
    const screeningQuarter = endOfQuarter(screeningDate);

    const purpose = get(row, 'A2.1 Mục đích khách hàng đến cơ sở cố định');
    const sex = toNum(get(row, 'A9. Giới tính'));
    const birthYear = toNum(get(row, 'A10. Năm sinh'));
    const suspectedAids = toNum(get(row, 'A14.12Bệnh nhân nghi ngờ AIDS'));
    const indexChannel = toNum(get(row, 'A17.2 Kênh xét nghiệm theo dấu bạn tình/bạn chích'));
    const screeningDone = get(row, 'B. Xét nghiệm sàng lọc');
    const screeningResult = toNum(get(row, 'B1.Kết quả xét nghiệm sàng lọc'));
    const agreeContinue = toNum(get(row, 'B2. Khách hàng đồng ý tiếp tục XN tại cơ sở y tế'));
    const confirmType = toNum(get(row, 'C2. 1. Loại hình xét nghiệm khẳng định'));
    const confirmResult = toNum(get(row, 'C3. Kết quả xét nghiệm khẳng định'));
    const treatmentFacility = get(row, 'D4. Tên cơ sở mà khách hành đã đăng ký điều trị');
    const treatmentCode = get(row, 'D5. Mã số điều trị HIV');
    const prepGroup = toNum(get(row, 'Nhóm KP - KH PrEP'));
    const previousHiv = toNum(get(row, 'KQ XN HIV trước đây'));
    const mpi = get(row, 'Mã MPI');
    const projectCode = upper(get(row, 'Mã Dự án'));
    const paymentSource = upper(get(row, 'Nguồn kinh phí thanh toán XN'));
    const treatmentStatus = stringValue(get(row, 'Tinh trang DT'));
    const selfTestRegistered = toNum(get(row, 'Đăng ký tự XN (TXN)'));
    const oldPositive = toNum(get(row, 'Dương tính cũ'));
    const reagentSource = upper(get(row, 'Nguồn sinh phẩm XNSL'));
    const partnerOfHiv = toNum(get(row, 'A14.10 Vợ/chồng/ban tình của người nhiễm HIV'));
    const guid = stringValue(get(row, 'GUID'));

    const fundFinal = paymentSource === 'EPIC'
      ? 'EPIC'
      : (reagentSource === 'EPIC' && paymentSource === 'DVU')
        ? 'EPIC'
        : paymentSource === 'BHYT'
          ? 'BHYT'
          : 'OTHER';

    const age = screeningDate && birthYear !== null ? screeningDate.getFullYear() - birthYear : null;
    const firstTester = isBlank(purpose) ? 1 : 0;
    const maDieuTri = isNonEmpty(mpi) ? mpi : (isNonEmpty(treatmentCode) ? treatmentCode : null);

    const caDuongCu = oldPositive === 1 || previousHiv === 2 || (treatmentStatus === 'c' && previousHiv !== 1) || suspectedAids === 1 ? 1 : null;
    const caLapLaiXn = prepGroup === 1 || (previousHiv === 1 && sameDay(screeningQuarter, lastHivTestQuarter)) || suspectedAids === 1 ? 1 : null;

    let testResult = null;
    if (isNonEmpty(screeningDone) && screeningResult === 1) testResult = 'Negative';
    else if (screeningResult === 2 && agreeContinue === 1 && confirmResult === 2) testResult = 'Positive';
    else if (screeningResult === 2 && agreeContinue === 1 && confirmResult === 1) testResult = 'Negative';
    else if (screeningResult === 2 && agreeContinue === 1 && confirmResult === 3) testResult = 'Unknown';

    const funded = fundFinal === 'EPIC' || fundFinal === 'BHYT';
    const htsTst = (funded && caLapLaiXn !== 1 && testResult === 'Negative' && firstTester === 1 ) || 
      (funded && caDuongCu !== 1 && testResult === 'Positive' && firstTester === 1 ) ? 1 : null;

    const khcd = khcdByGuid.get(guid);
    const indexOffered = isNonEmpty(get(row, 'Ngày thực hiện tư vấn BT/BC')) && funded ? 1 : null;
    const indexAccepted = indexOffered === 1 && khcd && khcd.Index_accepted === 1 && funded ? 1 : null;

    const xnkdep = isNonEmpty(screeningResult) && confirmType === 3 && fundFinal === 'EPIC' ? 1 : null;
    const xnkd = isNonEmpty(screeningResult) && confirmType === 3 ? 1 : null;
    const xnkdbhyt = testResult !== null && confirmType === 3 && fundFinal === 'BHYT' ? 1 : null;

    const ttTest = (maKh.startsWith('HCM') && prepGroup !== 1 && isNonEmpty(screeningDone))
      ? 1
      : (prepGroup !== 1 && isNonEmpty(screeningDone) && caDuongCu !== 1 && caLapLaiXn !== 1 && fundFinal !== 'OTHER' && firstTester === 1)
        ? 1
        : null;

    const btbcMatched = btbcByMaSoXN.has(maKh);
    const modality = btbcMatched || indexChannel === 1 || partnerOfHiv === 1 ? 'Index' : 'VCT';

    const enriched = {
      ...row,
      Ma_KH: maKh,
      Ngay_LSXN: lastHivTestQuarter,
      ngay_lay_mau_xnsl: screeningDate,
      ' A1. Ngày lấy máu xét nghiệm sàng lọc.origin': screeningDateOriginal,
      Ca_duong_cu: caDuongCu,
      Ca_lap_lai_XN: caLapLaiXn,
      nguon_kinh_phi_FINAL: fundFinal,
      Age: age,
      'First tester': firstTester,
      ma_dieu_tri: maDieuTri,
      Test_result: testResult,
      Modality: modality,
      'Age group': ageGroupFromAge(age),
      'A9. Giới tính': sex,
      HTS_TST: htsTst,
      HTS_TST_POS: htsTst === 1 && testResult === 'Positive' ? 1 : null,
      HTS_TST_NEG: htsTst === 1 && testResult === 'Negative' ? 1 : null,
      HTS_SELF: selfTestRegistered === 1 && fundFinal === 'EPIC' ? 1 : null,
      CGTC: caDuongCu !== 1 && testResult === 'Positive' && isNonEmpty(maDieuTri) && isNonEmpty(treatmentFacility) && funded && firstTester === 1 ? 1 : null,
      CGTC_LIFE: testResult === 'Positive' && caDuongCu !== 1 && isNonEmpty(maDieuTri) && isNonEmpty(treatmentFacility) && projectCode === 'LIFE' && firstTester === 0 ? 1 : null,
      Index_offered: indexOffered,
      Index_accepted: indexAccepted,
      XNKD_EPIC: xnkdep,
      XNKD : xnkd,
      XNKD_BHYT: xnkdbhyt,
      TT_Test: ttTest,
    };

    const indicatorNames = ['HTS_TST', 'HTS_TST_NEG', 'HTS_TST_POS', 'HTS_SELF', 'CGTC', 'CGTC_LIFE', 'Index_offered', 'Index_accepted', 'XNKD_EPIC',  'XNKD', 'XNKD_BHYT', 'TT_Test'];
    indicatorNames.forEach((attribute) => {
      if (enriched[attribute] !== 1) return;
      const reportingDate = reportingDateForTvxn(attribute, row, enriched);
      const reportingPeriod = endOfMonth(reportingDate);
      if (!reportingPeriod) return;

      longRows.push({
        ...enriched,
        Attribute: attribute,
        Value: 1,
        Reporting_period_TVXN: reportingPeriod,
        'Indicator Group': indicatorGroupForTvxn(attribute, modality),
      });
    });
  });

  return { longRows };
}

function reportingDateForTvxn(attribute, originalRow, enriched) {
  if (attribute.includes('HTS_TST')) return parseDate(get(originalRow, '(B1.2+C7) . Ngày khách hàng nhận kết quả xét nghiệm'));
  if (attribute === 'Index_offered') return parseDate(get(originalRow, 'Ngày thực hiện tư vấn BT/BC'));
  if (attribute === 'Index_accepted') return parseDate(get(originalRow, 'Ngày đồng ý ICT'));
  if (attribute.includes('XNKD')) return parseDate(enriched[' A1. Ngày lấy máu xét nghiệm sàng lọc.origin']);
  if (attribute.includes('CGTC')) return parseDate(get(originalRow, 'D3. Ngày đăng ký điều trị ARV'));
  if (attribute.includes('HTS_SELF')) return parseDate(get(originalRow, 'Ngày nhận TXN'));
  if (attribute.startsWith('TT')) return enriched.ngay_lay_mau_xnsl;
  return null;
}

function indicatorGroupForTvxn(attribute, modality) {
  if (attribute.startsWith('HTS_TST') && modality === 'VCT') return 'VCT';
  if (attribute.startsWith('HTS_TST') && modality === 'Index') return 'Index';
  if (attribute.startsWith('Index')) return 'Other';
  if (attribute.startsWith('CGTC')) return 'Payment';
  if (attribute.startsWith('XNKD')) return 'Payment';
  if (attribute.startsWith('TT')) return 'Payment';
  if (attribute === 'HTS_SELF') return 'Other';
  return null;
}

function populatePeriodSelect(periods) {
  const select = $('periodSelect');
  select.innerHTML = '';

  if (!periods.length) {
    select.innerHTML = '<option value="">Không có kỳ báo cáo</option>';
    select.disabled = true;
    return;
  }

  periods.forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = formatPeriodLabel(key);
    select.appendChild(option);
  });

  select.value = periods[periods.length - 1];
  APP.selectedPeriod = select.value;
  select.disabled = false;
}

function runSelectedPeriod() {
  if (!APP.processed || !APP.selectedPeriod) return;

  const period = APP.selectedPeriod;
  const output = buildOutputForPeriod(APP.processed, period);
  APP.lastOutput = output;

  renderSummary(output.summaryRows, period);
  renderDetailTable('cgtcEpicTable', output.cgtcEpicRows);
  renderDetailTable('cgtcLifeTable', output.cgtcLifeRows);

  $('summarySection').classList.remove('hidden');
  $('detailSection').classList.remove('hidden');
  $('downloadBtn').disabled = false;
  $('summaryMeta').textContent = `Kỳ báo cáo: ${formatPeriodLabel(period)} · Tổng TVXN ${output.tvxnRowsForPeriod.length} dòng chỉ số · Tổng BTBC ${output.btbcRowsForPeriod.length} dòng chỉ số.`;
  setStatus('Đã tổng hợp xong. Có thể kiểm tra bảng hoặc tải file Excel.', 'ok');
}

function buildOutputForPeriod(processed, period) {
  const tvxnRowsForPeriod = processed.tvxnLong.filter((row) => periodKey(row.Reporting_period_TVXN) === period);
  const btbcRowsForPeriod = processed.btbcLong.filter((row) => periodKey(row.Reporting_period_BTBC) === period);

  const summaryRows = SUMMARY_ROWS.map((config) => {
    if (config.section) return { section: config.section };

    const row = {
      key: config.key,
      label: config.label,
      desc: config.desc,
      values: {},
      total: 0,
      manual: config.manual || '',
    };

    if (config.manual) return row;

    const sourceRows = config.source === 'BTBC' ? btbcRowsForPeriod : tvxnRowsForPeriod;
    const matched = sourceRows.filter((item) => item.Attribute === config.attribute && (!config.group || item['Indicator Group'] === config.group));

    if (config.totalOnly) {
      row.total = matched.reduce((sum, item) => sum + toCount(item.Value), 0);
      return row;
    }

    SEX_GROUPS.forEach((sex) => {
      AGE_GROUPS.forEach((ageGroup) => {
        const colKey = `${sex.code}${ageGroup}`;
        if (config.minAgeGroup && ageGroupIndex(ageGroup) < ageGroupIndex(config.minAgeGroup)) {
          row.values[colKey] = '';
          return;
        }
        const sum = matched
          .filter((item) => Number(item['A9. Giới tính'] ?? item['Giới tính']) === sex.code)
          .filter((item) => (item['Age group'] || item['Age group_INDEX']) === ageGroup)
          .reduce((acc, item) => acc + toCount(item.Value), 0);
        row.values[colKey] = sum;
        row.total += sum;
      });
    });

    return row;
  });

  const cgtcEpicRows = tvxnRowsForPeriod
    .filter((row) => row.Attribute === 'CGTC')
    .map((row) => ({
      'Reporting period_TVXN': formatDate(row.Reporting_period_TVXN),
      Ma_KH: row.Ma_KH,
      ma_dieu_tri: stringValue(row.ma_dieu_tri),
      'D3. Ngày đăng ký điều trị ARV': formatDate(parseDate(get(row, 'D3. Ngày đăng ký điều trị ARV'))),
      'D4. Tên cơ sở mà khách hành đã đăng ký điều trị': stringValue(get(row, 'D4. Tên cơ sở mà khách hành đã đăng ký điều trị')),
      nguon_kinh_phi_FINAL: row.nguon_kinh_phi_FINAL,
      Total: 1,
    }));

  const cgtcLifeRows = tvxnRowsForPeriod
    .filter((row) => row.Attribute === 'CGTC_LIFE')
    .map((row) => ({
      'Reporting period_TVXN': formatDate(row.Reporting_period_TVXN),
      Ma_KH: row.Ma_KH,
      ma_dieu_tri: stringValue(row.ma_dieu_tri),
      'D3. Ngày đăng ký điều trị ARV': formatDate(parseDate(get(row, 'D3. Ngày đăng ký điều trị ARV'))),
      'D4. Tên cơ sở mà khách hành đã đăng ký điều trị': stringValue(get(row, 'D4. Tên cơ sở mà khách hành đã đăng ký điều trị')),
      Total: 1,
    }));

  return { summaryRows, cgtcEpicRows, cgtcLifeRows, tvxnRowsForPeriod, btbcRowsForPeriod };
}

function renderSummary(rows, period) {
  const table = $('summaryTable');
  const header = [
    'Mã chỉ số', 'Chỉ số', 'Mô tả',
    ...SEX_GROUPS.flatMap((sex) => AGE_GROUPS.map((age) => `${sex.label} ${age}`)),
    'Tổng',
  ];

  let html = '<thead><tr>' + header.map((h) => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
  rows.forEach((row) => {
    if (row.section) {
      html += `<tr class="section-row"><td colspan="${header.length}">${escapeHtml(row.section)}</td></tr>`;
      return;
    }

    html += '<tr>';
    html += `<td>${escapeHtml(row.key || '')}</td>`;
    html += `<td>${escapeHtml(row.label || '')}</td>`;
    html += `<td>${escapeHtml(row.desc || '')}</td>`;

    if (row.manual) {
      html += `<td colspan="${SEX_GROUPS.length * AGE_GROUPS.length}">${escapeHtml(row.manual)}</td>`;
      html += '<td class="total-col">0</td>';
    } else if (row.values && Object.keys(row.values).length) {
      SEX_GROUPS.forEach((sex) => {
        AGE_GROUPS.forEach((age) => {
          const value = row.values[`${sex.code}${age}`];
          html += `<td>${value === '' ? '' : value}</td>`;
        });
      });
      html += `<td class="total-col">${row.total || 0}</td>`;
    } else {
      html += `<td>${row.total || 0}</td>`;
      const blankCount = SEX_GROUPS.length * AGE_GROUPS.length - 1;
      for (let i = 0; i < blankCount; i++) html += '<td></td>';
      html += `<td class="total-col">${row.total || 0}</td>`;
    }

    html += '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function renderDetailTable(tableId, rows) {
  const table = $(tableId);
  if (!rows.length) {
    table.innerHTML = '<tbody><tr><td>Không có dữ liệu trong kỳ báo cáo đã chọn.</td></tr></tbody>';
    return;
  }
  const columns = Object.keys(rows[0]);
  let html = '<thead><tr>' + columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>';
  rows.forEach((row) => {
    html += '<tr>' + columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join('') + '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function downloadWorkbook() {
  if (!APP.lastOutput || !APP.selectedPeriod) return;

  const wb = XLSX.utils.book_new();
  const periodLabel = formatPeriodLabel(APP.selectedPeriod).replace(/[\\/:*?"<>|]/g, '-');
  const summaryAoa = buildSummaryAoa(APP.lastOutput.summaryRows);
  const cgtcEpicAoa = objectsToAoa(APP.lastOutput.cgtcEpicRows);
  const cgtcLifeAoa = objectsToAoa(APP.lastOutput.cgtcLifeRows);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 58 }, ...Array(24).fill({ wch: 9 }), { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Cong cu tong hop');

  const wsCgtc = XLSX.utils.aoa_to_sheet(cgtcEpicAoa);
  wsCgtc['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 16 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsCgtc, 'Danh sach CGTC_EPIC');

  const wsLife = XLSX.utils.aoa_to_sheet(cgtcLifeAoa);
  wsLife['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsLife, 'Danh sach CGTC_LIFE');

  XLSX.writeFile(wb, `Tong_hop_TVXN_${periodLabel}.xlsx`);
}

function buildSummaryAoa(rows) {
  const header = [
    'Mã chỉ số', 'Chỉ số', 'Mô tả',
    ...SEX_GROUPS.flatMap((sex) => AGE_GROUPS.map((age) => `${sex.label} ${age}`)),
    'Tổng',
  ];
  const aoa = [header];
  rows.forEach((row) => {
    if (row.section) {
      aoa.push(['', row.section, '', ...Array(SEX_GROUPS.length * AGE_GROUPS.length).fill(''), '']);
      return;
    }
    const line = [row.key || '', row.label || '', row.desc || ''];
    if (row.manual) {
      line.push(row.manual, ...Array(SEX_GROUPS.length * AGE_GROUPS.length - 1).fill(''), 0);
    } else if (row.values && Object.keys(row.values).length) {
      SEX_GROUPS.forEach((sex) => AGE_GROUPS.forEach((age) => line.push(row.values[`${sex.code}${age}`] === '' ? '' : row.values[`${sex.code}${age}`] || 0)));
      line.push(row.total || 0);
    } else {
      line.push(row.total || 0, ...Array(SEX_GROUPS.length * AGE_GROUPS.length - 1).fill(''), row.total || 0);
    }
    aoa.push(line);
  });
  return aoa;
}

function objectsToAoa(rows) {
  if (!rows.length) return [['Không có dữ liệu']];
  const columns = Object.keys(rows[0]);
  return [columns, ...rows.map((row) => columns.map((col) => row[col]))];
}

function resetOutput() {
  APP.processed = null;
  APP.lastOutput = null;
  $('summarySection').classList.add('hidden');
  $('detailSection').classList.add('hidden');
  $('downloadBtn').disabled = true;
  $('runBtn').disabled = true;
  $('periodSelect').disabled = true;
}

function get(row, label) {
  if (!row) return null;
  if (Object.prototype.hasOwnProperty.call(row, label)) return row[label];
  const key = row.__normMap ? row.__normMap[norm(label)] : undefined;
  return key !== undefined ? row[key] : null;
}

function cleanHeader(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function isNonEmpty(value) {
  return !isBlank(value);
}

function stringValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function upper(value) {
  return stringValue(value).toUpperCase();
}

function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).trim().replace(',', '.');
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function toCount(value) {
  const num = toNum(value);
  return num === null ? 0 : num;
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 20000 && value < 80000 && window.XLSX && XLSX.SSF) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    return null;
  }

  const text = String(value).trim();
  if (!text || text === '//' || /^\(blank\)$/i.test(text)) return null;

  let match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  match = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  return null;
}

function endOfMonth(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function endOfQuarter(date) {
  if (!date) return null;
  const endMonth = Math.floor(date.getMonth() / 3) * 3 + 2;
  return new Date(date.getFullYear(), endMonth + 1, 0);
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function periodKey(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  if (!date) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatPeriodLabel(key) {
  const date = parseDateFromKey(key);
  if (!date) return key;
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} (${formatDate(date)})`;
}

function parseDateFromKey(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function ageGroupFromAge(age) {
  if (age === null || age === undefined || Number.isNaN(Number(age))) return 'Unknown';
  const n = Number(age);
  if (n >= 50) return '50+';
  if (n < 50 && n > 44) return '45-49';
  if (n < 45 && n > 39) return '40-44';
  if (n < 40 && n > 34) return '35-39';
  if (n < 35 && n > 29) return '30-34';
  if (n < 30 && n > 24) return '25-29';
  if (n < 25 && n > 19) return '20-24';
  if (n < 20 && n > 14) return '15-19';
  if (n < 15 && n > 9) return '10-14';
  if (n < 10 && n > 4) return '5-9';
  if (n < 5 && n > 0) return '1-4';
  if (n < 1) return '<1';
  return 'Unknown';
}

function ageGroupIndex(group) {
  const idx = AGE_GROUPS.indexOf(group);
  return idx < 0 ? 999 : idx;
}

function distinctRows(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, row);
  });
  return [...map.values()];
}

function rowKeyForLongTvxn(row) {
  return [row.Attribute, row.Ma_KH, periodKey(row.Reporting_period_TVXN), row['A9. Giới tính'], row['Age group'], row.Modality, row.ma_dieu_tri || '', row.nguon_kinh_phi_FINAL || ''].join('|');
}

function rowKeyForLongBtbc(row) {
  return [row.Attribute, row['Mã số xét nghiệm'], periodKey(row.Reporting_period_BTBC), row['Giới tính'], row['Age group_INDEX'], row.Guid || ''].join('|');
}

function setStatus(message, type) {
  const el = $('status');
  el.textContent = message;
  el.className = `status ${type || 'muted'}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
