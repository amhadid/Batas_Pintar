// === Helper untuk ambil property dengan beberapa alias ===
function prop(p, ...keys) {
  if (!p) return 0;
  for (let k of keys) {
    if (k in p && p[k] !== null && p[k] !== undefined) return p[k];
  }
  return 0;
}

// === POPUP WELCOME ===
window.addEventListener('load', function() {
  const popup = document.getElementById('popupInfo');
  const btnClose = document.getElementById('popupCloseBtn');

  // Cek apakah popup sudah pernah ditutup sebelumnya (pakai localStorage)
  const hasSeenPopup = localStorage.getItem('popupSeen');

  if (!hasSeenPopup) {
    popup.style.display = 'flex';
  }

  btnClose.addEventListener('click', () => {
    popup.style.display = 'none';
    // Simpan status agar popup tidak muncul lagi saat reload
    localStorage.setItem('popupSeen', 'true');
  });
});

// === Inisialisasi Peta ===
const map = L.map('map').setView([-7.8014, 110.373], 15);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri World Imagery'
}).addTo(map);

let selectedLayer = null;
let rtLayers = [];

// === Palet warna kelurahan ===
const kelurahanColors = {
  "GUNUNGKETUR": "#b2e2e2",
  "NGUPASAN": "#66c2a4",
  "PRAWIRODIRJAN": "#41b6c4",
  "PURWOKINANTI": "#225ea8"
};

function getColorByKelurahan(namaKel) {
  if (!namaKel) return "#cfd8dc";
  const key = namaKel.trim().toUpperCase();
  return kelurahanColors[key] || "#a6bddb";
}

// === Style default RT ===
function styleFeature(feature) {
  const kel = feature?.properties?.kelurahan || feature?.properties?.Kelurahan;
  return {
    color: "#ffffff",
    weight: 1,
    fillColor: getColorByKelurahan(kel),
    fillOpacity: 0.7
  };
}

// === Style highlight RT ===
function highlightStyle() {
  return { color: "#0d47a1", weight: 2, fillColor: "#64b5f6", fillOpacity: 0.8 };
}

// === Chart.js Setup ===
let chartPenduduk, chartPendidikan, chartDarah, chartPajak;

function initCharts() {
  // === DATA PENDUDUK ===
  const ctx1 = document.getElementById('chartPenduduk').getContext('2d');
  chartPenduduk = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Penduduk', 'KK', 'Laki-laki', 'Perempuan'],
      datasets: [{
        label: 'Jumlah',
        data: [0, 0, 0, 0],
        backgroundColor: ['#4DD0E1', '#26C6DA', '#00ACC1', '#00838F'],
        borderColor: '#0d47a1',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 10, right: 10, top: 10, bottom: 10 }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#00838F', // ✅ warna label
            font: { size: 10 },
            generateLabels: (chart) => {
              const colors = chart.data.datasets[0].backgroundColor;
              const labels = chart.data.labels;
              return labels.map((label, i) => ({
                text: label,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                hidden: false
              }));
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#00838F' }, // ✅ garis sumbu X
          ticks: { color: '#00838F', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#00838F' }, // ✅ garis sumbu Y 
          ticks: { color: '#00838F', font: { size: 11 } }
        }
      }
    }
  });

  // === GOLONGAN DARAH ===
  const ctx3 = document.getElementById('chartDarah').getContext('2d');
  chartDarah = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: ['A', 'B', 'AB', 'O', 'Lainnya'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: ['#4DD0E1', '#26C6DA', '#00ACC1', '#00838F', '#01575fff'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 20,
            boxHeight: 20,
            padding: 10,
            color: '#080807',
            font: { size: 14 }
          }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.formattedValue}`
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        const xCenter = (left + right) / 2;
        const yCenter = (top + bottom) / 2;
        ctx.font = 'bold 20px Poppins';
        ctx.fillStyle = '#00838F';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, xCenter, yCenter);
        ctx.restore();
      }
    }]
  });

  // === PENDIDIKAN ===
  const ctx2 = document.getElementById('chartPendidikan').getContext('2d');
  chartPendidikan = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['SD', 'SMP', 'SMA', 'S1-S3'],
      datasets: [{
        label: 'Jumlah',
        data: [0, 0, 0, 0],
        backgroundColor: ['#4DD0E1', '#26C6DA', '#00ACC1', '#00838F'],
        borderColor: '#0d47a1',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 10, right: 10, top: 10, bottom: 10 }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#00838F',
            font: { size: 10 },
            generateLabels: (chart) => {
              const colors = chart.data.datasets[0].backgroundColor;
              const labels = chart.data.labels;
              return labels.map((label, i) => ({
                text: label,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                hidden: false
              }));
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#00838F' },
          ticks: { color: '#00838F', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#00838F' },
          ticks: { color: '#00838F', font: { size: 11 } }
        }
      }
    }
  });

  // === PERPAJAKAN ===
  const ctx4 = document.getElementById('chartPajak').getContext('2d');
  chartPajak = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: ['1–50', '51–100', '101–300', '>300'],
      datasets: [{
        label: 'Jumlah Objek Pajak',
        data: [0, 0, 0, 0],
        backgroundColor: ['#4DD0E1', '#26C6DA', '#00ACC1', '#00838F'],
        borderColor: '#ffffff',
        borderWidth: 1.2,
        barThickness: 'flex',
        maxBarThickness: 25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      layout: {
        padding: { top: 10, bottom: 10, left: 10, right: 10 }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: '#333', font: { size: 12, family: 'Poppins' } },
          grid: { color: '#e0e0e0', lineWidth: 0.5 }
        },
        y: {
          ticks: { color: '#333', font: { size: 13, weight: '600', family: 'Poppins' } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: false,
            pointStyle: 'rectRounded',
            boxWidth: 25,
            boxHeight: 15,
            padding: 10,
            color: '#0d47a1',
            font: { size: 14, family: 'Poppins', weight: '500' },
            generateLabels: (chart) => {
              const colors = ['#4DD0E1', '#26C6DA', '#00ACC1', '#00838F'];
              const labels = ['1–50', '51–100', '101–300', '>300'];
              return labels.map((text, i) => ({
                text,
                fillStyle: colors[i],
                strokeStyle: colors[i],
                lineWidth: 1,
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: '#0d47a1',
          titleColor: '#fff',
          bodyColor: '#fff',
          bodyFont: { size: 13, family: 'Poppins' },
          padding: 8,
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.formattedValue}`
          }
        }
      }
    }
  });
}

// === Update Panel Informasi ===
function updateAgamaFromProps(p) {
  const v = [
    prop(p,'agm_islam','agam_islam','islam'),
    prop(p,'agmkristen','agm_kristen','kristen'),
    prop(p,'agm_kathol','agm_katholik','katolik'),
    prop(p,'agm_hindu','hindu'),
    prop(p,'agm_budha','budha'),
    prop(p,'agm_lain','lain')
  ];
  document.querySelectorAll('.agama-box .angka').forEach((el,i)=> el.innerText = v[i] ?? 0);
}

function updateChartsFromProps(p) {
  chartPenduduk.data.datasets[0].data = [
    prop(p,'jml_pendud','jml_penduduk'),
    prop(p,'jml_kk'),
    prop(p,'pddk_lk','pddk_laki'),
    prop(p,'pddk_pr','pddk_perempuan')
  ];
  chartPenduduk.update();

  chartPendidikan.data.datasets[0].data = [
    prop(p,'tamat_sd'),
    prop(p,'tamat_slp','tamat_smp'),
    prop(p,'tamat_sma'),
    prop(p,'tamat_sarj','tamat_sarjana')
  ];
  chartPendidikan.update();

  chartDarah.data.datasets[0].data = [
    prop(p,'gol_dar_a','gol_a'),
    prop(p,'gol_dar_b','gol_b'),
    prop(p,'gol_dar_ab','gol_ab'),
    prop(p,'gol_dar_o','gol_o'),
    prop(p,'gol_d_lain','gol_lain')
  ];
  chartDarah.update();

  document.getElementById('infoObjekPajak').innerText = prop(p,'jmlobj_paj');
  chartPajak.data.datasets[0].data = [
    prop(p,'klop_1_50'),
    prop(p,'klop_51_10'),
    prop(p,'klop_101_3'),
    prop(p,'klop_300_l')
  ];
  chartPajak.update();

  document.getElementById('infoDisabilitas').innerText = prop(p,'jml_disabi');
}

// === TABEL INFORMASI LENGKAP ===
function updateDetailTable(p) {
  const tableContainer = document.getElementById('detailTableContainer');
  const placeholder = document.getElementById('detailPlaceholder');
  const tbody = document.querySelector('#detailTable tbody');
  if (!tbody || !tableContainer || !placeholder) return;

  // Jika tidak ada RT dipilih (misal p kosong)
  if (!p) {
    placeholder.style.display = 'flex';
    tableContainer.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  // Tampilkan tabel, sembunyikan placeholder
  placeholder.style.display = 'none';
  tableContainer.style.display = 'block';

  // Bersihkan isi tabel sebelumnya
  tbody.innerHTML = '';

  const rows = [
    ['RT', prop(p, 'rt')],
    ['Jumlah Penduduk', prop(p, 'jml_pendud', 'jml_penduduk')],
    ['Jumlah KK', prop(p, 'jml_kk')],
    ['Penduduk Laki-laki', prop(p, 'pddk_lk', 'pddk_laki')],
    ['Penduduk Perempuan', prop(p, 'pddk_pr', 'pddk_perempuan')],
    ['Tamat SD', prop(p, 'tamat_sd')],
    ['Tamat SMP', prop(p, 'tamat_sltp', 'tamat_smp')],
    ['Tamat SMA', prop(p, 'tamat_sma')],
    ['Tamat S1–S3', prop(p, 'tamat_sarj', 'tamat_sarjana')],
    ['Islam', prop(p, 'agm_islam')],
    ['Kristen', prop(p, 'agmkristen')],
    ['Katholik', prop(p, 'agm_kathol')],
    ['Hindu', prop(p, 'agm_hindu')],
    ['Budha', prop(p, 'agm_budha')],
    ['Khonghucu', prop(p, 'agm_khongh')],
    ['Kepercayaan', prop(p, 'agm_keperc')],
    ['Penyandang Disabilitas', prop(p, 'jml_disabi')],
    ['Gol Dar A', prop(p, 'gol_dar_a')],
    ['Gol Dar B', prop(p, 'gol_dar_b')],
    ['Gol Dar AB', prop(p, 'gol_dar_ab')],
    ['Gol Dar O', prop(p, 'gol_dar_o')],
    ['Gol Dar Lainnya', prop(p, 'gol_d_lain')],
    ['Jumlah Objek Pajak', prop(p, 'jmlobj_paj')],
    ['Luas Pajak 1–50', prop(p, 'klop_1_50')],
    ['Luas Pajak 51–100', prop(p, 'klop_51_10')],
    ['Luas Pajak 101–300', prop(p, 'klop_101_3')],
    ['Luas Pajak >300', prop(p, 'klop_300_l')]
  ];

  for (const [label, val] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${val ?? '-'}</td>`;
    tbody.appendChild(tr);
  }

  // Scroll ke atas setiap kali RT baru dipilih
  tableContainer.scrollTop = 0;
}

// === UPDATE PANEL UTAMA ===
function updateInfoPanel(feature) {
  const p = feature.properties || {};
  document.getElementById('infoKelurahan').innerText = prop(p,'kelurahan') || '-';
  document.getElementById('infoKampung').innerText = prop(p,'kampung') || '-';
  document.getElementById('infoKecamatan').innerText = prop(p,'kecamatan') || '-';
  document.getElementById('infoRW').innerText = prop(p,'rw') || '-';
  document.getElementById('infoRT').innerText = prop(p,'rt') || '-';
  updateAgamaFromProps(p);
  updateChartsFromProps(p);
  updateDetailTable(p); // sinkronisasi tabel setiap klik RT
}

// === Filter Dropdown ===
const filterKel = document.getElementById('filterKelurahan');
const filterKamp = document.getElementById('filterKampung');
const filterRW = document.getElementById('filterRW');
const filterRT = document.getElementById('filterRT');
const resetBtn = document.getElementById('resetButton');

function populateFilterOptions(features) {
  const kel = new Set(), kamp = new Set(), rw = new Set(), rt = new Set();
  features.forEach(f=>{
    const p = f.properties || {};
    if (prop(p,'kelurahan')) kel.add(prop(p,'kelurahan'));
    if (prop(p,'kampung')) kamp.add(prop(p,'kampung'));
    if (prop(p,'rw')) rw.add(String(prop(p,'rw')));
    if (prop(p,'rt')) rt.add(String(prop(p,'rt')));
  });

  function fill(sel,set,label){
    sel.innerHTML = `<option value="">${label}</option>`;
    Array.from(set).sort().forEach(v=> sel.innerHTML += `<option value="${v}">${v}</option>`);
  }
  fill(filterKel,kel,'Kelurahan');
  fill(filterKamp,kamp,'Kampung');
  fill(filterRW,rw,'RW');
  fill(filterRT,rt,'RT');
}

function findAndSelectByFilter() {
  const vKel = filterKel.value, vKamp = filterKamp.value, vRW = filterRW.value, vRT = filterRT.value;
  const match = rtLayers.find(l=>{
    const p = l.feature.properties || {};
    return (!vKel || String(prop(p,'kelurahan')).toUpperCase()===String(vKel).toUpperCase()) &&
           (!vKamp || String(prop(p,'kampung')).toUpperCase()===String(vKamp).toUpperCase()) &&
           (!vRW || String(prop(p,'rw'))===String(vRW)) &&
           (!vRT || String(prop(p,'rt'))===String(vRT));
  });
  if (match) {
    if (selectedLayer) selectedLayer.setStyle(styleFeature(selectedLayer.feature));
    match.setStyle(highlightStyle());
    selectedLayer = match;
    map.fitBounds(match.getBounds());
    updateInfoPanel(match.feature); // sinkron tabel & info
  }
}

[filterKel, filterKamp, filterRW, filterRT].forEach(s=> s.addEventListener('change', findAndSelectByFilter));

// === RESET DASHBOARD ===
function resetDashboard() {
  // Reset semua dropdown filter
  [filterKel, filterKamp, filterRW, filterRT].forEach(s => s.value = '');

  // Reset highlight RT di peta
  if (selectedLayer) {
    selectedLayer.setStyle(styleFeature(selectedLayer.feature));
    selectedLayer = null;
  }

  // Kosongkan tabel detail RT
  document.querySelector('#detailTable tbody').innerHTML = '';

  // Tampilkan placeholder default di kolom informasi lengkap
  const placeholder = document.getElementById('detailPlaceholder');
  const tableContainer = document.getElementById('detailTableContainer');
  if (placeholder && tableContainer) {
    placeholder.style.display = 'flex';
    tableContainer.style.display = 'none';
  }

  // Reset informasi wilayah dasar
  document.getElementById('infoKelurahan').innerText = '-';
  document.getElementById('infoKampung').innerText = '-';
  document.getElementById('infoKecamatan').innerText = '-';
  document.getElementById('infoRW').innerText = '-';
  document.getElementById('infoRT').innerText = '-';

  // Reset keagamaan & disabilitas
  document.querySelectorAll('.agama-box .angka').forEach(el => el.innerText = '0');
  document.getElementById('infoDisabilitas').innerText = '0';

  // Reset perpajakan
  document.getElementById('infoObjekPajak').innerText = '0';

  // Reset semua chart
  const zero = a => a.fill(0);
  chartPenduduk.data.datasets[0].data = zero([0, 0, 0, 0]);
  chartPendidikan.data.datasets[0].data = zero([0, 0, 0, 0]);
  chartDarah.data.datasets[0].data = zero([0, 0, 0, 0, 0]);
  chartPajak.data.datasets[0].data = zero([0, 0, 0, 0]);

  chartPenduduk.update();
  chartPendidikan.update();
  chartDarah.update();
  chartPajak.update();

  // Kembalikan tampilan peta ke posisi awal
  map.setView([-7.8014, 110.373], 15);
}

// Event listener tombol Reset
resetBtn.addEventListener('click', resetDashboard);

// === URL WFS ===
const geoUrl =
  "https://geoportal.jogjakota.go.id/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode:batas_rt_gondomanan_pakualaman_yogyakarta&outputFormat=application/json&srsName=EPSG:4326";

initCharts();

fetch(geoUrl)
  .then(r => r.json())
  .then(json => {
    const allFeatures = json.features;
    populateFilterOptions(allFeatures);

    // === Fungsi bantu: gabungkan berdasarkan atribut ===
    function unionByAttribute(features, attr) {
      const groups = {};
      features.forEach(f => {
        const key = (f.properties[attr] || "").toString().trim();
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      });

      const merged = [];
      for (const key in groups) {
        let unionGeom = groups[key][0];
        for (let i = 1; i < groups[key].length; i++) {
          try {
            unionGeom = turf.union(unionGeom, groups[key][i]);
          } catch (e) {
            console.warn("Union error:", key, e);
          }
        }
        if (unionGeom) {
          unionGeom.properties = { [attr]: key };
          merged.push(unionGeom);
        }
      }
      return merged;
    }

    // === Layer RT (Polygon, Interaktif) ===
    const layerRT = L.geoJSON(json, {
      style: styleFeature,
      onEachFeature: (feature, layerItem) => {
        const p = feature.properties || {};
        layerItem.on("click", function () {
          if (selectedLayer)
            selectedLayer.setStyle(styleFeature(selectedLayer.feature));
          layerItem.setStyle(highlightStyle());
          selectedLayer = layerItem;
          map.fitBounds(layerItem.getBounds());

          updateInfoPanel(feature);
          updateAgamaFromProps(p);
          updateChartsFromProps(p);
          updateDetailTable(p);

          // 🔄 Sinkronkan dropdown dengan RT terpilih
          filterKel.value = prop(p, "kelurahan") || "";
          filterKamp.value = prop(p, "kampung") || "";
          filterRW.value = prop(p, "rw") || "";
          filterRT.value = prop(p, "rt") || "";
        });
        rtLayers.push(layerItem);
      }
    }).addTo(map);

    // RT harus selalu paling atas
    layerRT.setZIndex(10);

    // === Gabungan per level administratif ===
    const rwMerged = turf.featureCollection(unionByAttribute(allFeatures, "rw"));
    const kampungMerged = turf.featureCollection(unionByAttribute(allFeatures, "kampung"));
    const kelurahanMerged = turf.featureCollection(unionByAttribute(allFeatures, "kelurahan"));
    const kecamatanMerged = turf.featureCollection(unionByAttribute(allFeatures, "kecamatan"));

    // === Konversi polygon ke polyline ===
    const toLine = fc => turf.featureCollection(fc.features.map(f => turf.polygonToLine(f)));

    const layerRW = L.geoJSON(toLine(rwMerged), {
      style: { color: "#fb8c00", weight: 1.3, dashArray: "3,2" },
      interactive: false
    }).addTo(map); // default aktif
    layerRW.setZIndex(5);

    const layerKampung = L.geoJSON(toLine(kampungMerged), {
      style: { color: "#43a047", weight: 1.6, dashArray: "4,3" },
      interactive: false
    });
    layerKampung.setZIndex(4);

    const layerKelurahan = L.geoJSON(toLine(kelurahanMerged), {
      style: { color: "#1e88e5", weight: 2.2 },
      interactive: false
    });
    layerKelurahan.setZIndex(3);

    const layerKemantren = L.geoJSON(toLine(kecamatanMerged), {
      style: { color: "#0d47a1", weight: 3.0 },
      interactive: false
    });
    layerKemantren.setZIndex(2);

    // === Layer Control ===
    const overlayMaps = {
      "Batas Kemantren": layerKemantren,
      "Batas Kelurahan": layerKelurahan,
      "Batas Kampung": layerKampung,
      "Batas RW": layerRW,
      "Batas RT": layerRT,
    };
    const layerControl = L.control.layers(null, overlayMaps, {
      collapsed: false,
      position: "topright"
    }).addTo(map);

    // === Pastikan layer RT tetap klik-able walau layer lain aktif ===
    map.on('overlayadd', e => {
      layerRT.bringToFront();
    });
    map.on('overlayremove', e => {
      layerRT.bringToFront();
    });

    // === Label RT ===
    allFeatures.forEach(f => {
      const rt = f.properties?.rt;
      if (!rt) return;

      const center = L.geoJSON(f).getBounds().getCenter();

      L.marker(center, {
        icon: L.divIcon({
          className: "rt-label",
          html: `<div class="rt-label-box">${rt}</div>`
        }),
        interactive: false
      }).addTo(map);
    });

    // === Legenda Peta ===
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend legend-scroll");
      div.innerHTML += "<h4>Kelurahan</h4>";
      for (const [nama, warna] of Object.entries(kelurahanColors)) {
        div.innerHTML += `
          <div class="legend-item">
            <span class="legend-color" style="background:${warna}"></span>
            <span>${nama}</span>
          </div>`;
      }

      div.innerHTML += "<hr><h4>Batas Administrasi</h4>";
      const garis = [
        { nama: "Kemantren", warna: "#0d47a1", dash: "solid" },
        { nama: "Kelurahan", warna: "#1e88e5", dash: "solid" },
        { nama: "Kampung", warna: "#43a047", dash: "dashed" },
        { nama: "RW", warna: "#fb8c00", dash: "dashed" },
        { nama: "RT", warna: "#757575", dash: "solid" }
      ];
      garis.forEach(g => {
        div.innerHTML += `
          <div class="legend-item">
            <span style="display:inline-block;width:30px;height:0;border-top:3px ${g.dash} ${g.warna};margin-right:8px;"></span>
            <span>${g.nama}</span>
          </div>`;
      });

      div.style.maxHeight = "160px";
      div.style.overflowY = "auto";
      div.addEventListener("mouseenter", () => map.scrollWheelZoom.disable());
      div.addEventListener("mouseleave", () => map.scrollWheelZoom.enable());
      return div;
    };
    legend.addTo(map);
  })
  .catch(err => {
    console.error("Gagal memuat GeoJSON/WFS:", err);
    alert("Gagal memuat data WFS.\nDetail: " + err.message);
  });
