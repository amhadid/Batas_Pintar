// === Helper untuk ambil property dengan beberapa alias ===
function prop(p, ...keys) {
  if (!p) return 0;
  for (let k of keys) {
    if (k in p && p[k] !== null && p[k] !== undefined) return p[k];
  }
  return 0;
}

// === Inisialisasi Peta ===
const map = L.map('map').setView([-7.8014, 110.373], 15);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri World Imagery'
}).addTo(map);

let selectedLayer = null;
let rtLayers = [];

// === Palet warna PuBuGn per kelurahan ===
const kelurahanColors = {
  "GUNUNGKETUR": "#b2e2e2",
  "NGUPASAN": "#66c2a4",
  "PRAWIRODIRJAN": "#41b6c4",
  "PURWOKINANTI": "#225ea8"
};

// Pilih warna berdasarkan nama kelurahan
function getColorByKelurahan(namaKel) {
  if (!namaKel) return "#cfd8dc";
  const key = namaKel.trim().toUpperCase();
  return kelurahanColors[key] || "#a6bddb";
}

// Style default RT berdasarkan kelurahan
function styleFeature(feature) {
  const kel = feature?.properties?.kelurahan || feature?.properties?.Kelurahan;
  return {
    color: "#ffffff",
    weight: 1,
    fillColor: getColorByKelurahan(kel),
    fillOpacity: 0.7
  };
}

// Style highlight saat diklik
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
      labels: ['Penduduk','KK','Laki-laki','Perempuan'],
      datasets: [{
        label: 'Jumlah',
        data: [0, 0, 0, 0],
        backgroundColor: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a']
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#080807',
            font: { size: 11 },
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
      scales: { y: { beginAtZero: true } }
    }
  });

  // === PENDIDIKAN ===
  const ctx2 = document.getElementById('chartPendidikan').getContext('2d');
  chartPendidikan = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['SD','SMP','SMA','S1-S3'],
      datasets: [{
        label: 'Jumlah',
        data: [0, 0, 0, 0],
        backgroundColor: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c']
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#080807',
            font: { size: 11 },
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
      scales: { y: { beginAtZero: true } }
    }
  });

  // === GOLONGAN DARAH (Doughnut + Total Tengah) ===
  const ctx3 = document.getElementById('chartDarah').getContext('2d');
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height } } = chart;
      const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
      ctx.save();
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#0d47a1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(total, width / 2, height / 2 - 5);
      ctx.font = 'normal 12px Arial';
      ctx.fillStyle = '#37474f';
      ctx.fillText('Total', width / 2, height / 2 + 15);
      ctx.restore();
    }
  };
  chartDarah = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: ['A','B','AB','O','Lainnya'],
      datasets:[{
        data:[0,0,0,0,0],
        backgroundColor:['#1e88e5','#43a047','#fbc02d','#e53935','#8e24aa'],
        borderColor:'#fff', borderWidth:2, cutout:'70%'
      }]
    },
    options: {
      responsive:true,
      plugins:{
        legend:{position:'bottom',labels:{font:{size:11},color:'#080807'}},
        tooltip:{
          enabled:true,
          callbacks:{
            label:(ctx)=>`${ctx.label}: ${ctx.raw||0}`
          }
        }
      }
    },
    plugins:[centerTextPlugin]
  });

  // === PERPAJAKAN ===
  const ctx4 = document.getElementById('chartPajak').getContext('2d');
  chartPajak = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: ['1–50','51–100','101–300','>300'],
      datasets: [{
        label: 'Jumlah Objek Pajak',
        data: [0,0,0,0],
        backgroundColor:['#90caf9','#64b5f6','#42a5f5','#1e88e5']
      }]
    },
    options: {
      indexAxis:'y',
      plugins:{
        legend:{
          display:true,
          position:'bottom',
          labels:{
            color:'#080807',
            font:{size:11},
            generateLabels:(chart)=>{
              const c=chart.data.datasets[0].backgroundColor;
              const l=chart.data.labels;
              return l.map((label,i)=>({text:label,fillStyle:c[i],strokeStyle:c[i]}));
            }
          }
        }
      },
      scales:{x:{beginAtZero:true}}
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

// === UPDATE TABEL INFORMASI LENGKAP (sinkron langsung) ===
function updateDetailTable(p) {
  const tbody = document.querySelector('#detailTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = [
    ['RT', prop(p,'rt')],
    ['Jumlah Penduduk', prop(p,'jml_pendud','jml_penduduk')],
    ['Jumlah KK', prop(p,'jml_kk')],
    ['Penduduk Laki-laki', prop(p,'pddk_lk','pddk_laki')],
    ['Penduduk Perempuan', prop(p,'pddk_pr','pddk_perempuan')],
    ['Tamat SD', prop(p,'tamat_sd')],
    ['Tamat SMP', prop(p,'tamat_sltp','tamat_smp')],
    ['Tamat SMA', prop(p,'tamat_sma')],
    ['Tamat S1–S3', prop(p,'tamat_sarj','tamat_sarjana')],
    ['Islam', prop(p,'agm_islam')],
    ['Kristen', prop(p,'agmkristen')],
    ['Katholik', prop(p,'agm_kathol')],
    ['Hindu', prop(p,'agm_hindu')],
    ['Budha', prop(p,'agm_budha')],
    ['Khonghucu', prop(p,'agm_khongh')],
    ['Kepercayaan', prop(p,'agm_keperc')],
    ['Penyandang Disabilitas', prop(p,'jml_disabi')],
    ['Gol Dar A', prop(p,'gol_dar_a')],
    ['Gol Dar B', prop(p,'gol_dar_b')],
    ['Gol Dar AB', prop(p,'gol_dar_ab')],
    ['Gol Dar O', prop(p,'gol_dar_o')],
    ['Gol Dar Lainnya', prop(p,'gol_d_lain')],
    ['Jumlah Objek Pajak', prop(p,'jmlobj_paj')],
    ['Luas Pajak 1–50', prop(p,'klop_1_50')],
    ['Luas Pajak 51–100', prop(p,'klop_51_10')],
    ['Luas Pajak 101–300', prop(p,'klop_101_3')],
    ['Luas Pajak >300', prop(p,'klop_300_l')]
  ];

  for (const [label, val] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${val ?? '-'}</td>`;
    tbody.appendChild(tr);
  }
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
  updateDetailTable(p); // 🔥 sinkronisasi tabel setiap klik RT
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
    updateInfoPanel(match.feature); // 🔥 sinkron tabel & info
  }
}

[filterKel, filterKamp, filterRW, filterRT].forEach(s=> s.addEventListener('change', findAndSelectByFilter));

// === RESET DASHBOARD ===
function resetDashboard() {
  [filterKel,filterKamp,filterRW,filterRT].forEach(s=>s.value='');
  if (selectedLayer) {
    selectedLayer.setStyle(styleFeature(selectedLayer.feature));
    selectedLayer=null;
  }
  document.querySelector('#detailTable tbody').innerHTML = ''; // kosongkan tabel
  document.getElementById('infoKelurahan').innerText='-';
  document.getElementById('infoKampung').innerText='-';
  document.getElementById('infoKecamatan').innerText='-';
  document.getElementById('infoRW').innerText='-';
  document.getElementById('infoRT').innerText='-';
  document.querySelectorAll('.agama-box .angka').forEach(el=>el.innerText='0');
  document.getElementById('infoDisabilitas').innerText='0';
  document.getElementById('infoObjekPajak').innerText='0';
  const zero=a=>a.fill(0);
  chartPenduduk.data.datasets[0].data=zero([0,0,0,0]);
  chartPendidikan.data.datasets[0].data=zero([0,0,0,0]);
  chartDarah.data.datasets[0].data=zero([0,0,0,0,0]);
  chartPajak.data.datasets[0].data=zero([0,0,0,0]);
  chartPenduduk.update(); chartPendidikan.update(); chartDarah.update(); chartPajak.update();
  map.setView([-7.8014,110.373],15);
}
resetBtn.addEventListener('click', resetDashboard);

// === Load WFS GeoJSON ===
const geoUrl = "https://geoportal.jogjakota.go.id/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode:batas_rt_gondomanan_pakualaman_yogyakarta&outputFormat=application/json&srsName=EPSG:4326";

initCharts();

fetch(geoUrl)
  .then(r => r.json())
  .then(json => {
    const layer = L.geoJSON(json, {
      style: styleFeature,
      onEachFeature: (feature, layerItem) => {
        layerItem.on('click', function () {
          const p = feature.properties || {};
          console.log('Klik RT:', p.rt, p); // 🔍 Debug, pastikan RT terbaca

          // Reset highlight RT lain
          if (selectedLayer) selectedLayer.setStyle(styleFeature(selectedLayer.feature));
          layerItem.setStyle(highlightStyle());
          selectedLayer = layerItem;

          // Zoom ke RT yang diklik
          map.fitBounds(layerItem.getBounds());

          // Update semua panel & chart
          updateInfoPanel(feature);
          updateAgamaFromProps(p);
          updateChartsFromProps(p);
          updateDetailTable(p); // 🔥 Pastikan tabel diperbarui di sini

          // Isi filter dropdown otomatis sesuai RT yang diklik
          filterKel.value = prop(p, 'kelurahan') || '';
          filterKamp.value = prop(p, 'kampung') || '';
          filterRW.value = prop(p, 'rw') || '';
          filterRT.value = prop(p, 'rt') || '';
        });

        rtLayers.push(layerItem);
      }
    }).addTo(map);

    populateFilterOptions(json.features || []);

    // === Tambahkan legenda peta ===
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend");
      div.innerHTML += "<h4>Kelurahan</h4>";
      for (const [nama, warna] of Object.entries(kelurahanColors)) {
        div.innerHTML += `
          <div class="legend-item">
            <span class="legend-color" style="background:${warna}"></span>
            <span>${nama}</span>
          </div>`;
      }
      return div;
    };
    legend.addTo(map);
  })
  .catch(err => {
    console.error('Gagal memuat GeoJSON/WFS:', err);
    alert('Gagal memuat data WFS.\nDetail: ' + err.message);
  });

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

